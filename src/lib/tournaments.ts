import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import { applyCommand, type MatchWrite } from "@/lib/engine";
import { createdMatches } from "@/lib/engine/writes";
import {
  isOffline,
  isRefused,
  lostRace,
  newToken,
  stripUndefined,
  toUpdatePayload,
} from "@/lib/firestoreData";
import type {
  Entry,
  Match,
  PersistentTeam,
  Tournament,
  TournamentFormat,
  TournamentSettings,
} from "@/types/game";

/**
 * Tournaments on Firestore. A tournament is one document at
 * `tournaments/{id}` and each of its matches is one document under
 * `tournaments/{id}/matches`. Every function takes the Firestore instance so
 * the same code runs in the app and against the rules test emulator.
 *
 * Every write that moves a tournament's revision says in `basedOn` which
 * revision it was built on, and the rules refuse it when that is no longer
 * the stored revision (ADR-0003). Two scorers finishing matches on two
 * courts at the same moment therefore cannot overwrite each other: the loser
 * of the race is refused and builds again on the fresh copy. Engine commands
 * still commit in a transaction that checks the same thing client side and
 * reloads on a StaleTournamentError; field updates such as a rename re-read
 * and retry when the rules refuse them.
 */

export const tournamentsCollection = (db: Firestore) => collection(db, "tournaments");
export const tournamentDoc = (db: Firestore, tournamentId: string) =>
  doc(db, "tournaments", tournamentId);
export const matchesCollection = (db: Firestore, tournamentId: string) =>
  collection(db, "tournaments", tournamentId, "matches");
export const matchDoc = (db: Firestore, tournamentId: string, matchId: string) =>
  doc(db, "tournaments", tournamentId, "matches", matchId);

/**
 * The scorer key behind a tournament's scorer link, in a subdocument only
 * the owner can read; a spectator can read the tournament and must never
 * see the key. Scorers prove they hold the link by writing the key under
 * their own uid in the `scorers` subcollection (see src/lib/sharing.ts).
 */
export const scorerKeyDoc = (db: Firestore, tournamentId: string) =>
  doc(db, "tournaments", tournamentId, "private", "scorerKey");
export const scorerProofsCollection = (db: Firestore, tournamentId: string) =>
  collection(db, "tournaments", tournamentId, "scorers");
export const scorerProofDoc = (db: Firestore, tournamentId: string, uid: string) =>
  doc(scorerProofsCollection(db, tournamentId), uid);

export interface ScorerKey {
  key: string;
  updatedAt: number;
}

/** A fresh, unguessable scorer key. */
export const newScorerKey = (): ScorerKey => ({ key: newToken(), updatedAt: Date.now() });

/** How many times a write is rebuilt on the fresh copy after the tournament moved past its base. */
export const MAX_ATTEMPTS = 5;

/** A tournament whose write names the revision it was built on. */
export type BasedTournament = Tournament & { basedOn: string };

/**
 * `tournament` as its next revision: a fresh revision token, the revision
 * it was built on in `basedOn`, and the time of the write.
 */
export const nextRevision = (tournament: Tournament, basedOn: string, now: number): BasedTournament => ({
  ...tournament,
  basedOn,
  revision: newToken(),
  updatedAt: now,
});

// ============================================
// Subscriptions
// ============================================

/** An account's tournaments, newest first. */
export const subscribeToTournaments = (
  db: Firestore,
  uid: string,
  onChange: (tournaments: Tournament[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe =>
  onSnapshot(
    query(tournamentsCollection(db), where("ownerId", "==", uid), orderBy("createdAt", "desc")),
    (snapshot) => {
      onChange(snapshot.docs.map((d) => ({ ...(d.data() as Tournament), id: d.id })));
    },
    (error) => onError?.(error),
  );

/**
 * Every match an account owns, across all of its tournaments plus its quick
 * matches, oldest first. A collection group query: quick matches sit in a
 * collection also called `matches` so they come back too. Fires from the
 * local cache first when offline persistence is on, then with every change.
 */
export const subscribeToAccountMatches = (
  db: Firestore,
  uid: string,
  onChange: (matches: Match[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe =>
  onSnapshot(
    query(collectionGroup(db, "matches"), where("ownerId", "==", uid), orderBy("createdAt", "asc")),
    (snapshot) => {
      onChange(snapshot.docs.map((d) => ({ ...(d.data() as Match), id: d.id })));
    },
    (error) => onError?.(error),
  );

/**
 * One tournament, for a phone that reached it by link rather than through
 * the account's list. Delivers null once the tournament is gone, and the
 * error when the rules refuse it, as they do once the spectator link is
 * turned off.
 */
export const subscribeToTournament = (
  db: Firestore,
  tournamentId: string,
  onChange: (tournament: Tournament | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe =>
  onSnapshot(
    tournamentDoc(db, tournamentId),
    (snapshot) => {
      onChange(snapshot.exists() ? { ...(snapshot.data() as Tournament), id: snapshot.id } : null);
    },
    (error) => onError?.(error),
  );

/** The matches of one tournament, oldest first, for the same phones. */
export const subscribeToTournamentMatches = (
  db: Firestore,
  tournamentId: string,
  onChange: (matches: Match[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe =>
  onSnapshot(
    query(matchesCollection(db, tournamentId), orderBy("createdAt", "asc")),
    (snapshot) => {
      onChange(snapshot.docs.map((d) => ({ ...(d.data() as Match), id: d.id })));
    },
    (error) => onError?.(error),
  );

// ============================================
// Create, update, delete
// ============================================

export interface NewTournamentInput {
  name: string;
  format: TournamentFormat;
  /** The roster teams entering, in seed order. Each becomes an entry. */
  teams: PersistentTeam[];
  settings: TournamentSettings;
}

/** A draft tournament with its id assigned, ready to save. */
export const buildTournament = (
  db: Firestore,
  uid: string,
  input: NewTournamentInput,
): Tournament => {
  const now = Date.now();
  const entries: Entry[] = input.teams.map((team) => ({
    teamId: team.id,
    name: team.name,
    ...(team.color !== undefined && { color: team.color }),
  }));
  return {
    id: doc(tournamentsCollection(db)).id,
    ownerId: uid,
    name: input.name,
    format: input.format,
    status: "draft",
    entries,
    teamIds: input.teams.map((team) => team.id),
    settings: input.settings,
    spectatorEnabled: false,
    revision: newToken(),
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * Write a new tournament. Resolves once the server has accepted it; the
 * local cache shows it at once, so callers that only need the id need not
 * wait.
 */
export const saveTournament = async (db: Firestore, tournament: Tournament): Promise<void> => {
  await setDoc(tournamentDoc(db, tournament.id), stripUndefined(tournament));
};

export interface CreateTournamentOptions {
  /** Start the tournament as it is created, so it goes out live with its first matches. */
  start?: boolean;
}

/**
 * A tournament and what it is saved with: its scorer key, and its matches,
 * none for a draft and its first ones when started.
 */
export interface TournamentToSave {
  tournament: Tournament;
  matches: Match[];
  scorerKey: ScorerKey;
}

/**
 * A new tournament ready to save: a draft, or with `start` that draft
 * already started, live with its first matches. The engine runs here on
 * the draft rather than after a save, so nothing is read back and a phone
 * with no signal can create and start a tournament. A bracket whose team
 * count is not a power of two starts with its lowest seeds playing in.
 * Throws the engine's error, before anything is written, when the format
 * cannot start with these teams.
 */
export const buildTournamentToSave = (
  db: Firestore,
  uid: string,
  input: NewTournamentInput,
  options: CreateTournamentOptions = {},
): TournamentToSave => {
  const draft = buildTournament(db, uid, input);
  const scorerKey = newScorerKey();
  if (!options.start) return { tournament: draft, matches: [], scorerKey };
  const result = applyCommand(
    { tournament: draft, matches: [] },
    { type: "start" },
    { now: draft.createdAt, newId: () => doc(matchesCollection(db, draft.id)).id },
  );
  return { tournament: result.tournament, matches: createdMatches(result.matchWrites), scorerKey };
};

/**
 * Save a new tournament with its scorer key and its matches. The rules for
 * the key and the matches read the stored tournament, so it goes out first
 * in its own write and the rest follows in one batch; the client sends
 * writes in the order they were issued, so the server has the tournament
 * before it checks the others against it. Both are queued when offline.
 * Resolves once the server has accepted them.
 */
export const saveTournamentAndMatches = async (
  db: Firestore,
  { tournament, matches, scorerKey }: TournamentToSave,
): Promise<void> => {
  const saved = saveTournament(db, tournament);
  const batch = writeBatch(db);
  batch.set(scorerKeyDoc(db, tournament.id), scorerKey);
  for (const match of matches) {
    batch.set(matchDoc(db, tournament.id, match.id), stripUndefined(match));
  }
  await Promise.all([saved, batch.commit()]);
};

/**
 * Build and save a draft, or with `start` a tournament that is already
 * live. Resolves once the server has accepted the write.
 */
export const createTournament = async (
  db: Firestore,
  uid: string,
  input: NewTournamentInput,
  options: CreateTournamentOptions = {},
): Promise<Tournament> => {
  const built = buildTournamentToSave(db, uid, input, options);
  await saveTournamentAndMatches(db, built);
  return built.tournament;
};

/**
 * What a duplicate of `source` is made from: the same format and settings,
 * and the same teams in the same order, named as its duplicate. The teams come
 * from the roster, so each entry takes the team's current name and color
 * and a team that has since left the roster is left out. A team that had
 * withdrawn from the source is back in; a new draft has no withdrawals.
 */
export const duplicateInput = (source: Tournament, roster: PersistentTeam[]): NewTournamentInput => {
  const rosterById = new Map(roster.map((team) => [team.id, team]));
  return {
    name: `${source.name} (duplicate)`,
    format: source.format,
    teams: source.entries.flatMap((entry) => rosterById.get(entry.teamId) ?? []),
    settings: { ...source.settings, terminology: { ...source.settings.terminology } },
  };
};

/**
 * Write a few fields of a tournament with a fresh revision, for edits made
 * outside the engine that touch nothing a result touches: a rename, the
 * spectator flag. Only those fields are written, so a result landing on a
 * court at the same moment is never overwritten, and the revision moves so
 * an engine command built on the old copy reloads instead of writing the
 * old fields back. The stored revision is read first and sent as the base;
 * when the rules refuse the write because the tournament moved on meanwhile,
 * the fields are rebuilt on the fresh copy, a bounded number of times. A
 * refusal that persists, such as a scorer's attempt at an owner-only field,
 * rejects with Firestore's error. Offline, the base comes from the cache and
 * the write waits for the connection like any field update.
 */
export const updateTournamentFields = async (
  db: Firestore,
  tournamentId: string,
  fields: Record<string, unknown>,
): Promise<void> => {
  const ref = tournamentDoc(db, tournamentId);
  let refused: { on: string; error: unknown } | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const current = await getDoc(ref);
    if (!current.exists()) throw new Error("That tournament no longer exists.");
    const basedOn = (current.data() as Tournament).revision;
    // A refusal on a base the tournament has not moved past is not a race
    // lost but a write the rules would never accept.
    if (refused !== null && refused.on === basedOn) throw refused.error;
    try {
      await updateDoc(ref, { ...fields, basedOn, revision: newToken(), updatedAt: Date.now() });
      return;
    } catch (error) {
      if (!isRefused(error)) throw error;
      refused = { on: basedOn, error };
    }
  }
  throw refused?.error ?? new Error("The tournament kept changing; try again.");
};

/** Rename a tournament. See updateTournamentFields for what a racing result means for it. */
export const renameTournament = async (
  db: Firestore,
  tournamentId: string,
  name: string,
): Promise<void> => {
  const trimmed = name.trim();
  if (trimmed.length === 0) throw new Error("A tournament needs a name.");
  await updateTournamentFields(db, tournamentId, { name: trimmed });
};

/**
 * Replace a tournament document with a new revision, for edits made outside
 * the engine such as reordering a queue or restoring an undo snapshot.
 * `expectedRevision` is the revision the caller's copy was built on; if the
 * stored tournament has moved past it the write is refused with a
 * StaleTournamentError and nothing changes.
 */
export const updateTournament = async (
  db: Firestore,
  tournament: Tournament,
  expectedRevision: string,
): Promise<void> => {
  await commitTournament(db, nextRevision(tournament, expectedRevision, Date.now()), []);
};

/**
 * Delete a tournament with every match under it, its scorer key, and the
 * proofs of every phone that opened its scorer link.
 */
export const deleteTournament = async (db: Firestore, tournamentId: string): Promise<void> => {
  const [matches, proofs] = await Promise.all([
    getDocs(matchesCollection(db, tournamentId)),
    getDocs(scorerProofsCollection(db, tournamentId)),
  ]);
  // The rules for everything under the tournament read the tournament
  // itself, so those go first and the tournament last, in its own write.
  const batch = writeBatch(db);
  matches.docs.forEach((d) => batch.delete(d.ref));
  proofs.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(scorerKeyDoc(db, tournamentId));
  await batch.commit();
  await deleteDoc(tournamentDoc(db, tournamentId));
};

// ============================================
// Match documents
// ============================================

export const updateMatch = async (
  db: Firestore,
  tournamentId: string,
  matchId: string,
  changes: Partial<Match>,
): Promise<void> => {
  await updateDoc(matchDoc(db, tournamentId, matchId), toUpdatePayload(changes));
};

// ============================================
// Commands
// ============================================

export interface TournamentSnapshot {
  tournament: Tournament;
  matches: Match[];
}

/**
 * Read a tournament and then its matches. The tournament comes first on
 * purpose: a change that lands between the two reads bumps the revision the
 * transaction later checks, so it can never be missed.
 */
export const loadTournament = async (
  db: Firestore,
  tournamentId: string,
): Promise<TournamentSnapshot | null> => {
  const tournamentSnapshot = await getDoc(tournamentDoc(db, tournamentId));
  if (!tournamentSnapshot.exists()) return null;
  const matchesSnapshot = await getDocs(matchesCollection(db, tournamentId));
  return {
    tournament: { ...(tournamentSnapshot.data() as Tournament), id: tournamentSnapshot.id },
    matches: matchesSnapshot.docs.map((d) => ({ ...(d.data() as Match), id: d.id })),
  };
};

/** The stored tournament moved on while a write was being prepared. */
export class StaleTournamentError extends Error {
  constructor() {
    super("The tournament changed while the change was being saved. Try again.");
    this.name = "StaleTournamentError";
  }
}

/** Where match writes go: a batch, or a transaction. */
export interface MatchWriter {
  set: (ref: ReturnType<typeof matchDoc>, data: Match) => void;
  update: (ref: ReturnType<typeof matchDoc>, data: Record<string, unknown>) => void;
  delete: (ref: ReturnType<typeof matchDoc>) => void;
}

/** Put the engine's match writes on a writer, in the engine's order. */
export const writeMatches = (
  db: Firestore,
  tournamentId: string,
  writes: MatchWrite[],
  writer: MatchWriter,
) => {
  for (const write of writes) {
    switch (write.kind) {
      case "create":
        writer.set(matchDoc(db, tournamentId, write.match.id), stripUndefined(write.match));
        break;
      case "update":
        writer.update(matchDoc(db, tournamentId, write.matchId), toUpdatePayload(write.changes));
        break;
      case "delete":
        writer.delete(matchDoc(db, tournamentId, write.matchId));
        break;
    }
  }
};

/**
 * Write a tournament and its match writes together, provided the stored
 * tournament still carries the revision in `tournament.basedOn`. With no
 * network the writes go out as a batch instead, queued by the offline cache
 * until the connection is back, so a phone with no signal keeps scoring; the
 * batch carries the same base, so the rules check it on reconnect like any
 * other write, and the cache rolls it back if it is refused.
 */
const commitTournament = async (
  db: Firestore,
  tournament: BasedTournament,
  matchWrites: MatchWrite[],
): Promise<void> => {
  const ref = tournamentDoc(db, tournament.id);
  try {
    await runTransaction(
      db,
      async (tx) => {
        const current = await tx.get(ref);
        if (!current.exists() || current.data().revision !== tournament.basedOn) {
          throw new StaleTournamentError();
        }
        tx.set(ref, stripUndefined(tournament));
        writeMatches(db, tournament.id, matchWrites, {
          set: (matchRef, data) => tx.set(matchRef, data),
          update: (matchRef, data) => tx.update(matchRef, data),
          delete: (matchRef) => tx.delete(matchRef),
        });
      },
      // Firestore's own retries would rerun the function on the same stale
      // input; callers reload and retry instead.
      { maxAttempts: 1 },
    );
  } catch (error) {
    if (lostRace(error)) throw new StaleTournamentError();
    if (!isOffline(error)) throw error;

    const batch = writeBatch(db);
    batch.set(ref, stripUndefined(tournament));
    writeMatches(db, tournament.id, matchWrites, {
      set: (matchRef, data) => batch.set(matchRef, data),
      update: (matchRef, data) => batch.update(matchRef, data),
      delete: (matchRef) => batch.delete(matchRef),
    });
    // The commit resolves when the server accepts it, which offline is
    // whenever the connection returns. The local cache has it at once.
    batch.commit().catch((commitError) => {
      console.error("Queued tournament write failed:", commitError);
    });
  }
};
