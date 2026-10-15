import {
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  writeBatch,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import { applyCommand, EngineError, type EngineCommand, type EngineResult } from "@/lib/engine";
import { applyMatchWrites, createdMatches } from "@/lib/engine/writes";
import { isRefused, stripUndefined } from "@/lib/firestoreData";
import { StaleScorerLinkError } from "@/lib/sharing";
import {
  MAX_ATTEMPTS,
  matchesCollection,
  nextRevision,
  tournamentDoc,
  writeMatches,
  type TournamentSnapshot,
} from "@/lib/tournaments";
import type { Match, Tournament } from "@/types/game";

/**
 * The command queue: how an engine command reaches Firestore (ADR-0003).
 *
 * A command is applied by the engine to the phone's copy of the tournament
 * and written as one batch, the tournament with `basedOn` naming the
 * revision it was built on plus its match writes. A batch shows from the
 * local cache at once, so the court moves on before the server answers,
 * and the rules refuse it when the stored revision has moved on.
 *
 * Each (Firestore instance, tournament) pair has one queue. It holds the
 * commands the server has not yet acknowledged, in order, and the copy of
 * the tournament and matches they produced. A new command builds on that
 * copy while the queue is non-empty, so a second tap builds on the first
 * before the subscription has caught up, and on the subscribed copy when
 * it is empty.
 *
 * The subscribed copy is the caller's when it passes one as `basis`, as
 * the app does from the copy it is already showing. Otherwise the queue
 * listens to the tournament document and its matches itself, which
 * Firestore shares with the app's listeners on the same targets, and
 * waits for the two listeners to show a copy in step: both from the
 * phone's cache, which is what a phone without signal has, or both from
 * the server. A listener's first snapshot comes from the cache whenever
 * the cache holds anything for it, and a cached "no such document" only
 * says the phone has no copy yet; only the server can say the tournament
 * is gone. The queue's listeners live while commands are pending or a
 * lost race is being recovered from, and are released once the queue is
 * empty, so a tournament the phone has stopped scoring is not watched for
 * the rest of the night.
 *
 * A refused write means the stored revision moved past the write's base,
 * or the phone's scorer link is stale, or the write is one this identity
 * may never make. A read of the tournament from the server tells them
 * apart: a refused read is a stale link, which fails every queued command
 * with the stale-link error; a read showing the base revision itself is a
 * write that is not allowed, rejected with Firestore's own error so the
 * app can run its own check; anything else is a lost race. After a lost
 * race the queue waits for the subscription to show the fresh copy, with
 * the refused writes rolled back, and replays every unacknowledged command
 * on it in order, each as a new write. A replayed command the engine
 * refuses, such as a win on a court another phone already recorded, is
 * dropped and its promise rejects with a ReversedCommandError, and so is
 * every command behind it on the same match, such as an undo of that win.
 * Nothing new is written while a replay is under way.
 */

export interface CommandOutcome extends EngineResult {
  /** Ids of the matches the command created, in the order the engine made them. */
  createdMatchIds: string[];
}

/** A command applied locally: what it produced, and the server's acknowledgement. */
export interface AppliedCommand {
  /** The engine's result, as the local cache now shows it. */
  outcome: CommandOutcome;
  /** Resolves once the server has accepted the write; rejects when the command was dropped. */
  done: Promise<void>;
}

export interface ApplyOptions {
  /** The moment the command is applied; defaults to now. */
  now?: number;
  /** The caller's copy of the tournament, used while the queue has none of its own yet. */
  basis?: TournamentSnapshot;
}

/**
 * A command that showed on the phone and was then taken back: another
 * phone's write got to the server first and, on the fresh copy, the
 * engine refused this one (or it ran out of attempts). `court` is the
 * court the command concerned, when it concerned one.
 */
export class ReversedCommandError extends Error {
  readonly reversed = true as const;
  readonly court: number | undefined;
  readonly cause: unknown;

  constructor(cause: unknown, court: number | undefined) {
    super("That change was taken back: another scorer got there first.");
    this.name = "ReversedCommandError";
    this.cause = cause;
    this.court = court;
  }
}

/** A command waiting for the server, with what its promise needs. */
interface Pending {
  command: EngineCommand;
  now: number;
  /** The copy the command was last built on. */
  basis: TournamentSnapshot;
  /** The revision its last write produced. */
  produced: string;
  /** The ids the engine was handed for the matches it created; a replay hands out the same ones. */
  createdMatchIds: string[];
  /** How many times it has been written. */
  attempts: number;
  /** The write the server is answering; an answer to an earlier write of the same command is ignored. */
  writeId: number;
  resolve: () => void;
  reject: (error: unknown) => void;
}

/** A listener's latest snapshot and what the SDK says about it. */
interface Delivered<T> {
  value: T;
  hasPendingWrites: boolean;
  fromCache: boolean;
}

/**
 * The queue's subscribed copy: the latest the tournament listener and the
 * matches listener have delivered, both started on first use.
 */
class Feed {
  private tournament: Delivered<Tournament | null> | null = null;
  private matches: Delivered<Match[]> | null = null;
  private failure: unknown = null;
  private unsubscribes: Unsubscribe[] | null = null;
  private waiters: Array<() => void> = [];

  constructor(
    private readonly db: Firestore,
    private readonly tournamentId: string,
  ) {}

  /**
   * The subscribed copy, or null while either listener has yet to deliver
   * or the two are out of step. The listeners sync with the server one at
   * a time, and until both have, the one that did would pair the server's
   * tournament with the matches the other still shows from the cache, a
   * copy no state of the tournament ever had. A copy is both listeners'
   * cached snapshots, as on a phone without signal, or both their
   * server-confirmed ones.
   */
  latest(): TournamentSnapshot | null {
    if (!this.tournament?.value || !this.matches) return null;
    if (this.tournament.fromCache !== this.matches.fromCache) return null;
    return { tournament: this.tournament.value, matches: this.matches.value };
  }

  /** Resolves once the subscribed copy is there; rejects when a listener failed or the tournament is gone. */
  async first(): Promise<void> {
    for (;;) {
      this.start();
      if (this.latest() !== null) return;
      this.check();
      await this.change();
    }
  }

  /** Stop listening, unless a command is still waiting on a snapshot. */
  release() {
    if (this.waiters.length === 0) this.stop();
  }

  /**
   * The subscribed copy once it is fresh after a lost race: the local
   * writes have been rolled back, both listeners are in step with the
   * server, and the tournament is at `serverRevision` or at a revision
   * that is not one of the `stale` ones. A cache-only snapshot from either
   * listener is not fresh: after a phone reconnects, the tournament can
   * arrive from the server while its matches are still the cached ones
   * from before the signal dropped, and a command replayed on that pair
   * would be judged against the wrong courts. Rejects when a listener
   * failed or the tournament is gone.
   */
  async fresh(serverRevision: string, stale: ReadonlySet<string>): Promise<TournamentSnapshot> {
    for (;;) {
      this.start();
      this.check();
      const { tournament, matches } = this;
      const revision = tournament?.value?.revision;
      if (
        tournament &&
        matches &&
        revision !== undefined &&
        !tournament.hasPendingWrites &&
        !matches.hasPendingWrites &&
        !tournament.fromCache &&
        !matches.fromCache &&
        (revision === serverRevision || !stale.has(revision))
      ) {
        // The two listeners deliver one after the other, each in its own
        // turn of the event loop. A breath lets the matches arrive with
        // the tournament they belong to before the copy is read.
        await new Promise((resolve) => setTimeout(resolve, 0));
        const copy = this.latest();
        if (copy) return copy;
      }
      await this.change();
    }
  }

  // Only the server can say the tournament is gone. A cached "no such
  // document" says that the phone holds no copy: a phone that never read
  // the tournament has none, and one whose only writes to it the server
  // has just refused is left with none once they are rolled back.
  private check() {
    if (this.failure !== null) throw this.failure;
    if (this.tournament && this.tournament.value === null && !this.tournament.fromCache) {
      throw new Error("That tournament no longer exists.");
    }
  }

  // A failed listener stays dead, so the next command starts them again.
  private start() {
    if (this.unsubscribes) return;
    this.failure = null;
    const fail = (error: Error) => {
      this.failure = error;
      this.stop();
      this.notify();
    };
    this.unsubscribes = [
      onSnapshot(
        tournamentDoc(this.db, this.tournamentId),
        { includeMetadataChanges: true },
        (snapshot) => {
          this.tournament = {
            value: snapshot.exists()
              ? { ...(snapshot.data() as Tournament), id: snapshot.id }
              : null,
            hasPendingWrites: snapshot.metadata.hasPendingWrites,
            fromCache: snapshot.metadata.fromCache,
          };
          this.notify();
        },
        fail,
      ),
      onSnapshot(
        query(matchesCollection(this.db, this.tournamentId), orderBy("createdAt", "asc")),
        { includeMetadataChanges: true },
        (snapshot) => {
          this.matches = {
            value: snapshot.docs.map((d) => ({ ...(d.data() as Match), id: d.id })),
            hasPendingWrites: snapshot.metadata.hasPendingWrites,
            fromCache: snapshot.metadata.fromCache,
          };
          this.notify();
        },
        fail,
      ),
    ];
  }

  private stop() {
    this.unsubscribes?.forEach((unsubscribe) => unsubscribe());
    this.unsubscribes = null;
    this.tournament = null;
    this.matches = null;
  }

  private change(): Promise<void> {
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  private notify() {
    const waiters = this.waiters;
    this.waiters = [];
    waiters.forEach((resolve) => resolve());
  }
}

/**
 * The stored tournament, read from the server with the rules applied to
 * this identity now, or null when it is gone. Rejects with Firestore's
 * permission error when this identity may not read it, which for a phone
 * on the scorer link means the owner has replaced the link. A one-shot
 * get from the server will not do here: the SDK answers it through any
 * live listener on the same document, and a listener opened while the
 * link was good stays open after the link goes stale, so it would hand
 * back the phone's own stale copy as if the server had. A transaction's
 * get is the one read the SDK always sends to the server.
 */
const readStoredTournament = (db: Firestore, tournamentId: string): Promise<Tournament | null> =>
  runTransaction(
    db,
    async (tx) => {
      const snapshot = await tx.get(tournamentDoc(db, tournamentId));
      return snapshot.exists() ? { ...(snapshot.data() as Tournament), id: snapshot.id } : null;
    },
    { maxAttempts: 1 },
  );

/** The match a command concerns, when it concerns one. */
const matchOf = (command: EngineCommand): string | undefined =>
  "matchId" in command ? command.matchId : undefined;

/** The court a command concerns, from the copy it was built on. */
const courtOf = (command: EngineCommand, basis: TournamentSnapshot): number | undefined => {
  const matchId = matchOf(command);
  return matchId === undefined ? undefined : basis.matches.find((match) => match.id === matchId)?.court;
};

class CommandQueue {
  private readonly pending: Pending[] = [];
  /** The copy the last pending command produced; null while the queue is empty. */
  private copy: TournamentSnapshot | null = null;
  private readonly feed: Feed;
  private nextWriteId = 0;
  /** Set while a lost race is being recovered from; nothing new is written until it settles. */
  private recovery: Promise<void> | null = null;

  constructor(
    private readonly db: Firestore,
    private readonly tournamentId: string,
  ) {
    this.feed = new Feed(db, tournamentId);
  }

  /**
   * Apply a command to the queue's copy, or the subscribed one, and write
   * it. Rejects with the engine's error, nothing written, when the command
   * is not allowed on that copy.
   */
  async apply(command: EngineCommand, options: ApplyOptions = {}): Promise<AppliedCommand> {
    // The copy to build on is chosen in the same turn as the write is
    // issued, since a command issued during any wait is what the next one
    // must build on.
    for (;;) {
      if (this.recovery) {
        await this.recovery;
        continue;
      }
      const basis = this.copy ?? this.feed.latest() ?? options.basis;
      if (!basis) {
        await this.feed.first();
        continue;
      }
      const now = options.now ?? Date.now();
      const createdMatchIds: string[] = [];
      const result = applyCommand(basis, command, {
        now,
        newId: () => {
          const id = doc(matchesCollection(this.db, this.tournamentId)).id;
          createdMatchIds.push(id);
          return id;
        },
      });
      let settle: Pick<Pending, "resolve" | "reject"> = { resolve: () => {}, reject: () => {} };
      const done = new Promise<void>((resolve, reject) => {
        settle = { resolve, reject };
      });
      const pending: Pending = {
        command,
        now,
        basis,
        produced: basis.tournament.revision,
        createdMatchIds,
        attempts: 0,
        writeId: 0,
        resolve: () => settle.resolve(),
        reject: (error) => settle.reject(error),
      };
      this.pending.push(pending);
      return { outcome: this.issue(pending, basis, result), done };
    }
  }

  /** Write a command's result as one batch and make it the queue's copy. */
  private issue(pending: Pending, basis: TournamentSnapshot, result: EngineResult): CommandOutcome {
    const tournament = nextRevision(result.tournament, basis.tournament.revision, pending.now);
    this.copy = { tournament, matches: applyMatchWrites(basis.matches, result.matchWrites) };
    pending.basis = basis;
    pending.produced = tournament.revision;
    pending.attempts += 1;
    const writeId = ++this.nextWriteId;
    pending.writeId = writeId;

    const batch = writeBatch(this.db);
    batch.set(tournamentDoc(this.db, this.tournamentId), stripUndefined(tournament));
    writeMatches(this.db, this.tournamentId, result.matchWrites, {
      set: (ref, data) => batch.set(ref, data),
      update: (ref, data) => batch.update(ref, data),
      delete: (ref) => batch.delete(ref),
    });
    batch.commit().then(
      () => this.settled(pending, writeId, null),
      (error: unknown) => this.settled(pending, writeId, error),
    );

    return {
      tournament,
      matchWrites: result.matchWrites,
      createdMatchIds: createdMatches(result.matchWrites).map((match) => match.id),
    };
  }

  private settled(pending: Pending, writeId: number, error: unknown) {
    if (pending.writeId !== writeId || !this.pending.includes(pending)) return;
    if (error === null) {
      this.drop(pending);
      pending.resolve();
      return;
    }
    if (!isRefused(error)) {
      this.drop(pending);
      pending.reject(error);
      return;
    }
    // A recovery under way replays this command too; its old write's
    // refusal is expected and needs nothing.
    if (this.recovery) return;
    this.recovery = this.recover(pending, error).finally(() => {
      this.recovery = null;
      this.settleDown();
    });
  }

  private drop(pending: Pending) {
    const index = this.pending.indexOf(pending);
    if (index !== -1) this.pending.splice(index, 1);
    this.settleDown();
  }

  private failAll(error: unknown) {
    const failed = this.pending.splice(0);
    failed.forEach((pending) => pending.reject(error));
    this.settleDown();
  }

  /** With nothing pending and no recovery under way, the queue holds no copy and listens to nothing. */
  private settleDown() {
    if (this.pending.length > 0) return;
    this.copy = null;
    if (!this.recovery) this.feed.release();
  }

  /** Tell what the refusal meant, then replay what is still pending on the fresh copy. */
  private async recover(refused: Pending, error: unknown): Promise<void> {
    let stored: Tournament | null;
    try {
      stored = await readStoredTournament(this.db, this.tournamentId);
    } catch (readError) {
      this.failAll(isRefused(readError) ? new StaleScorerLinkError() : readError);
      return;
    }
    if (stored === null) {
      this.failAll(new Error("That tournament no longer exists."));
      return;
    }

    const basedOn = refused.basis.tournament.revision;
    if (stored.revision === basedOn) {
      // Not a lost race: a write this identity may not make. The commands
      // behind it were built on its result and are rebuilt without it.
      this.drop(refused);
      refused.reject(error);
      if (this.pending.length === 0) return;
    }

    // Revisions the fresh copy cannot be at: the one the server moved past,
    // and the ones the pending writes produced, which were never stored.
    const stale = new Set([basedOn, ...this.pending.map((p) => p.produced)]);
    let copy: TournamentSnapshot;
    try {
      copy = await this.feed.fresh(stored.revision, stale);
    } catch (feedError) {
      this.failAll(isRefused(feedError) ? new StaleScorerLinkError() : feedError);
      return;
    }
    if (this.pending.length === 0) return;

    // A command behind a reversed one on the same match was built on a
    // result that no longer exists, so it goes with it: an undo of a win
    // another phone's result replaced must not undo that result, which the
    // engine cannot tell apart from the win it was tapped on.
    const reversedMatches = new Map<string, ReversedCommandError>();
    const reverse = (pending: Pending, cause: unknown, court: number | undefined) => {
      const reversed = new ReversedCommandError(cause, court);
      const matchId = matchOf(pending.command);
      if (matchId !== undefined) reversedMatches.set(matchId, reversed);
      this.drop(pending);
      pending.reject(reversed);
    };
    for (const pending of [...this.pending]) {
      const matchId = matchOf(pending.command);
      const before = matchId === undefined ? undefined : reversedMatches.get(matchId);
      if (before) {
        reverse(pending, before.cause, before.court);
        continue;
      }
      if (pending.attempts >= MAX_ATTEMPTS) {
        reverse(pending, error, courtOf(pending.command, pending.basis));
        continue;
      }
      let result: EngineResult;
      try {
        const ids = [...pending.createdMatchIds];
        result = applyCommand(copy, pending.command, {
          now: pending.now,
          newId: () => {
            const id = ids.shift() ?? doc(matchesCollection(this.db, this.tournamentId)).id;
            if (!pending.createdMatchIds.includes(id)) pending.createdMatchIds.push(id);
            return id;
          },
        });
      } catch (engineError) {
        if (engineError instanceof EngineError) {
          reverse(pending, engineError, courtOf(pending.command, pending.basis));
        } else {
          this.drop(pending);
          pending.reject(engineError);
        }
        continue;
      }
      this.issue(pending, copy, result);
      copy = this.copy!;
    }
  }
}

// One queue per tournament per Firestore instance, for as long as the
// instance lives. The rules test environment hands out compat wrappers
// around one instance, so the key is the instance itself.
const queues = new WeakMap<object, Map<string, CommandQueue>>();

const instanceOf = (db: Firestore): object =>
  ((db as unknown as { _delegate?: object })._delegate ?? db) as object;

const commandQueueFor = (db: Firestore, tournamentId: string): CommandQueue => {
  const instance = instanceOf(db);
  let byTournament = queues.get(instance);
  if (!byTournament) {
    byTournament = new Map();
    queues.set(instance, byTournament);
  }
  let queue = byTournament.get(tournamentId);
  if (!queue) {
    queue = new CommandQueue(db, tournamentId);
    byTournament.set(tournamentId, queue);
  }
  return queue;
};

/**
 * Apply an engine command and write it, resolving as soon as the local
 * cache shows the result, with the server's acknowledgement in `done`.
 * Rejects with the engine's error, nothing written, when the command is
 * not allowed on the copy it was built on.
 */
export const queueTournamentCommand = (
  db: Firestore,
  tournamentId: string,
  command: EngineCommand,
  options: ApplyOptions = {},
): Promise<AppliedCommand> => commandQueueFor(db, tournamentId).apply(command, options);

/**
 * Apply an engine command and wait for the server to accept it. The same
 * as queueTournamentCommand for callers that have nothing to show before
 * the acknowledgement.
 */
export const applyTournamentCommand = async (
  db: Firestore,
  tournamentId: string,
  command: EngineCommand,
  options: ApplyOptions = {},
): Promise<CommandOutcome> => {
  const applied = await queueTournamentCommand(db, tournamentId, command, options);
  await applied.done;
  return applied.outcome;
};
