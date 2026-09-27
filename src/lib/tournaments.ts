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
import {
  applyCommand,
  type EngineCommand,
  type EngineResult,
  type MatchWrite,
} from "@/lib/engine";
import { createdMatches } from "@/lib/engine/writes";
import {
  isOffline,
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
 * Every write to a tournament document goes through `commitTournament`, which
 * checks inside a transaction that the tournament's revision is still the one
 * the caller built on. Two scorers finishing matches on two courts at the
 * same moment therefore cannot overwrite each other: the loser of the race
 * gets a StaleTournamentError, and engine commands reload and try again.
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
 * Rename a tournament. Writes only the name, so a result landing on a court
 * at the same moment is never overwritten; the revision moves so an engine
 * command built on the old copy reloads instead of writing the old name
 * back. Works offline like any field update.
 */
export const renameTournament = async (
  db: Firestore,
  tournamentId: string,
  name: string,
): Promise<void> => {
  const trimmed = name.trim();
  if (trimmed.length === 0) throw new Error("A tournament needs a name.");
  await updateDoc(tournamentDoc(db, tournamentId), {
    name: trimmed,
    revision: newToken(),
    updatedAt: Date.now(),
  });
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
  await commitTournament(
    db,
    expectedRevision,
    { ...tournament, revision: newToken(), updatedAt: Date.now() },
    [],
  );
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

export interface CommandOutcome extends EngineResult {
  /** Ids of the matches the command created, in the order the engine made them. */
  createdMatchIds: string[];
}

/** The stored tournament moved on while a write was being prepared. */
export class StaleTournamentError extends Error {
  constructor() {
    super("The tournament changed while the change was being saved. Try again.");
    this.name = "StaleTournamentError";
  }
}

const MAX_ATTEMPTS = 5;

interface Writer {
  set: (ref: ReturnType<typeof matchDoc>, data: Match) => void;
  update: (ref: ReturnType<typeof matchDoc>, data: Record<string, unknown>) => void;
  delete: (ref: ReturnType<typeof matchDoc>) => void;
}

const writeMatches = (
  db: Firestore,
  tournamentId: string,
  writes: MatchWrite[],
  writer: Writer,
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
 * tournament still carries `expectedRevision`. With no network the writes go
 * out as a batch instead, queued by the offline cache until the connection
 * is back, so a phone with no signal keeps scoring; the revision check is
 * then left to the server on reconnect, which is the best offline allows.
 */
const commitTournament = async (
  db: Firestore,
  expectedRevision: string,
  tournament: Tournament,
  matchWrites: MatchWrite[],
): Promise<void> => {
  const ref = tournamentDoc(db, tournament.id);
  try {
    await runTransaction(
      db,
      async (tx) => {
        const current = await tx.get(ref);
        if (!current.exists() || current.data().revision !== expectedRevision) {
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

/**
 * Apply an engine command to a tournament.
 *
 * Reads the tournament and its matches, runs the engine, then commits the
 * result against the revision it read. If the tournament changed in between,
 * the whole thing runs again on the fresh state, up to a few times.
 *
 * Rejects with an EngineError when the command is not allowed, in which case
 * nothing is written.
 */
export const applyTournamentCommand = async (
  db: Firestore,
  tournamentId: string,
  command: EngineCommand,
  options: { now?: number } = {},
): Promise<CommandOutcome> => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const loaded = await loadTournament(db, tournamentId);
    if (!loaded) throw new Error("That tournament no longer exists.");

    const now = options.now ?? Date.now();
    const result = applyCommand(loaded, command, {
      now,
      newId: () => doc(matchesCollection(db, tournamentId)).id,
    });
    const tournament: Tournament = { ...result.tournament, revision: newToken(), updatedAt: now };

    try {
      await commitTournament(db, loaded.tournament.revision, tournament, result.matchWrites);
    } catch (error) {
      if (error instanceof StaleTournamentError) {
        lastError = error;
        continue;
      }
      throw error;
    }

    return {
      tournament,
      matchWrites: result.matchWrites,
      createdMatchIds: createdMatches(result.matchWrites).map((match) => match.id),
    };
  }

  throw lastError ?? new Error("The tournament kept changing; try again.");
};
