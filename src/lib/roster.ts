import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  updateDoc,
  writeBatch,
  type Firestore,
  type Transaction,
  type Unsubscribe,
} from "firebase/firestore";
import {
  draftOrLiveTournamentsWith,
  fanOutTeamChange,
  planTeamDeletion,
  type EntriesUpdate,
  type KeptTeam,
  type TeamChange,
} from "@/lib/entries";
import { isOffline, isRefused, lostRace, newToken, stripUndefined } from "@/lib/firestoreData";
import { leastUsedColors, TEAM_COLORS } from "@/lib/teamColors";
import { MAX_ATTEMPTS, tournamentDoc } from "@/lib/tournaments";
import { nameKey } from "@/lib/utils";
import type { PersistentTeam, Tournament } from "@/types/game";

/**
 * The roster: the teams an account keeps between tournaments. Each team is one
 * document under `users/{uid}/teams`, and the rules let only that account read
 * or write there. Every function takes the Firestore instance so the same code
 * runs against the app's database and the rules test emulator.
 *
 * A team's entries in draft and live tournaments copy its name and color, so
 * renaming, recoloring, and deleting a team also write to those tournaments.
 * The caller passes the account's tournaments as it knows them; the write
 * reads the ones it touches again inside a transaction, so a withdrawal or a
 * result saved on a court a moment ago is kept.
 */

export interface TeamInput {
  name: string;
  color?: string;
}

export { TEAM_COLORS };

export interface ParsedTeamNames {
  /** The teams to add, in the order they were written, each with a color. */
  teams: TeamInput[];
  /** Names left out because the roster, or an earlier line, already has them. */
  alreadyOnRoster: string[];
}

/** What came of adding teams from typed or pasted text. */
export interface AddedTeams {
  /** The teams now on the roster, in the order they were written. */
  added: PersistentTeam[];
  alreadyOnRoster: ParsedTeamNames["alreadyOnRoster"];
}

/**
 * The teams to add for these names, one each. Blank names are dropped and
 * names are trimmed. A name the roster already has, or that came earlier
 * in the names, is reported and not added again. Each new team gets the
 * palette color the roster uses least, so teams stay easy to tell apart on
 * the court.
 */
const namedTeams = (names: string[], roster: PersistentTeam[]): ParsedTeamNames => {
  const taken = new Set(roster.map((team) => nameKey(team.name)));
  const nextColor = leastUsedColors(roster.map((team) => team.color));

  const teams: TeamInput[] = [];
  const alreadyOnRoster: string[] = [];
  for (const written of names) {
    const name = written.trim();
    if (name.length === 0) continue;
    if (taken.has(nameKey(name))) {
      alreadyOnRoster.push(name);
      continue;
    }
    taken.add(nameKey(name));
    teams.push({ name, color: nextColor() });
  }
  return { teams, alreadyOnRoster };
};

/** Turn typed or pasted text, one team per line, into the teams to add. See namedTeams. */
export const parseTeamNames = (text: string, roster: PersistentTeam[]): ParsedTeamNames =>
  namedTeams(text.split(/\r?\n/), roster);

export const rosterCollection = (db: Firestore, uid: string) =>
  collection(db, "users", uid, "teams");

export const rosterTeamDoc = (db: Firestore, uid: string, teamId: string) =>
  doc(rosterCollection(db, uid), teamId);

// Teams added in the same millisecond, as a pasted list does, would otherwise tie
// on createdAt and come back in document-id order.
let lastCreatedAt = 0;
const nextCreatedAt = (): number => {
  lastCreatedAt = Math.max(Date.now(), lastCreatedAt + 1);
  return lastCreatedAt;
};

/**
 * Subscribe to an account's roster in creation order. Fires with the local
 * cache first when offline persistence is on, then with every change.
 */
export const subscribeToRoster = (
  db: Firestore,
  uid: string,
  onChange: (teams: PersistentTeam[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe =>
  onSnapshot(
    query(rosterCollection(db, uid), orderBy("createdAt", "asc")),
    (snapshot) => {
      onChange(snapshot.docs.map((d) => ({ ...(d.data() as PersistentTeam), id: d.id })));
    },
    (error) => onError?.(error),
  );

/**
 * A new team with its id and creation time set, ready to save. The id is known
 * before the write, so a page can show or select the team without waiting for
 * the server, which matters on a phone with no signal.
 */
export const buildRosterTeam = (db: Firestore, uid: string, input: TeamInput): PersistentTeam => ({
  id: doc(rosterCollection(db, uid)).id,
  name: input.name,
  createdAt: nextCreatedAt(),
  ...(input.color !== undefined && { color: input.color }),
});

/**
 * New teams built for these names, in the order given, ready to save, each
 * with the palette color the roster uses least. A blank name, a name the
 * roster already has, and a second copy of a name are left out, as they
 * are from a pasted list.
 */
export const buildRosterTeamsNamed = (
  db: Firestore,
  uid: string,
  names: string[],
  roster: PersistentTeam[],
): PersistentTeam[] =>
  namedTeams(names, roster).teams.map((input) => buildRosterTeam(db, uid, input));

/**
 * Save built teams to the roster in one batch, so a pasted list lands whole.
 * Resolves once the server has accepted the write.
 */
export const saveRosterTeams = async (
  db: Firestore,
  uid: string,
  teams: PersistentTeam[],
): Promise<void> => {
  const batch = writeBatch(db);
  for (const team of teams) batch.set(rosterTeamDoc(db, uid,team.id), team);
  await batch.commit();
};

/** Add a team to the roster. Resolves once the server has accepted the write. */
export const addRosterTeam = async (
  db: Firestore,
  uid: string,
  input: TeamInput,
): Promise<PersistentTeam> => {
  const team = buildRosterTeam(db, uid, input);
  await saveRosterTeams(db, uid, [team]);
  return team;
};

// ============================================
// Writes that reach tournaments
// ============================================

/**
 * Run `write` in a transaction, and again if another write got in first.
 * Another write getting in first shows up as the transaction's own abort or,
 * when it moved a tournament's revision, as the rules refusing the base the
 * fan-out was built on. Rejects with Firestore's error when the client is
 * offline, so each caller can decide what a phone with no signal should do.
 */
const transact = async (
  db: Firestore,
  write: (tx: Transaction) => Promise<void>,
): Promise<void> => {
  for (let attempt = 1; ; attempt++) {
    try {
      // Firestore's own retries would wait out an offline client too; one
      // attempt per call keeps a phone with no signal from stalling.
      await runTransaction(db, write, { maxAttempts: 1 });
      return;
    } catch (error) {
      if ((lostRace(error) || isRefused(error)) && attempt < MAX_ATTEMPTS) continue;
      throw error;
    }
  }
};

/**
 * The tournament fields a roster change writes. The revision moves on, built
 * on the stored copy's revision as the rules require, so an engine command
 * built on the old copy is refused and replays on the fresh one instead of
 * writing over it.
 */
const tournamentFields = (update: EntriesUpdate, basedOn: string, now: number) => ({
  entries: stripUndefined(update.entries),
  teamIds: update.teamIds,
  basedOn,
  revision: newToken(),
  updatedAt: now,
});

/** The stored copies of these tournaments, read inside the transaction. */
const freshCopies = async (
  tx: Transaction,
  db: Firestore,
  tournaments: Tournament[],
): Promise<Tournament[]> => {
  const snapshots = await Promise.all(tournaments.map((t) => tx.get(tournamentDoc(db, t.id))));
  return snapshots
    .filter((snapshot) => snapshot.exists())
    .map((snapshot) => ({ ...(snapshot.data() as Tournament), id: snapshot.id }));
};

/** Write each update onto its tournament, based on the fresh copy it was planned from. */
const writeEntriesUpdates = (
  tx: Transaction,
  db: Firestore,
  updates: EntriesUpdate[],
  fresh: Tournament[],
  now: number,
) => {
  const revisionOf = new Map(fresh.map((t) => [t.id, t.revision]));
  for (const update of updates) {
    const basedOn = revisionOf.get(update.tournamentId);
    if (basedOn === undefined) continue;
    tx.update(tournamentDoc(db, update.tournamentId), tournamentFields(update, basedOn, now));
  }
};

/**
 * Rename a team and, when a color is given, recolor it. A stored color stays
 * as it is when none is given. The change reaches the team's entries in the
 * account's draft and live tournaments; completed ones keep the old name and
 * color. `tournaments` is the account's list as the caller knows it.
 *
 * With no network the transaction cannot run, so the team alone is updated,
 * queued by the offline cache, and its entries wait for the next rename made
 * online. The owner's own screens show the roster's current name while a
 * tournament is a draft or live (see entryTeams), so only a spectator sees
 * the old one in the meantime. Resolves once the server has accepted the
 * write.
 */
export const updateRosterTeam = async (
  db: Firestore,
  uid: string,
  teamId: string,
  changes: TeamChange,
  tournaments: Tournament[],
): Promise<void> => {
  const fields: Record<string, string> = { name: changes.name };
  if (changes.color !== undefined) fields.color = changes.color;
  const ref = rosterTeamDoc(db, uid,teamId);
  const candidates = draftOrLiveTournamentsWith([teamId], tournaments);
  if (candidates.length === 0) {
    await updateDoc(ref, fields);
    return;
  }

  try {
    await transact(db, async (tx) => {
      const fresh = await freshCopies(tx, db, candidates);
      writeEntriesUpdates(tx, db, fanOutTeamChange(teamId, changes, fresh), fresh, Date.now());
      tx.update(ref, fields);
    });
  } catch (error) {
    if (!isOffline(error)) throw error;
    await updateDoc(ref, fields);
  }
};

/** What came of deleting teams. */
export interface DeletedTeams {
  /** The teams that are gone from the roster. */
  deleted: string[];
  /** Teams kept because a live tournament still has them. Withdraw is the way out. */
  kept: KeptTeam[];
}

/**
 * Delete teams from the roster. A team in a live tournament is kept and
 * reported; the others go, and each draft tournament that had one of them
 * loses that entry. Completed tournaments are not touched. `tournaments` is
 * the account's list as the caller knows it.
 *
 * Teams in no draft or live tournament are deleted outright, which works
 * offline like any roster write. The others need the stored tournaments read
 * first, which a phone with no signal cannot do, so offline that delete is
 * refused with Firestore's error and nothing changes. Resolves once the
 * server has accepted the write.
 */
export const deleteRosterTeams = async (
  db: Firestore,
  uid: string,
  teamIds: string[],
  tournaments: Tournament[],
): Promise<DeletedTeams> => {
  const candidates = draftOrLiveTournamentsWith(teamIds, tournaments);
  if (candidates.length === 0) {
    const batch = writeBatch(db);
    for (const teamId of teamIds) batch.delete(rosterTeamDoc(db, uid,teamId));
    await batch.commit();
    return { deleted: teamIds, kept: [] };
  }

  let plan = planTeamDeletion(teamIds, candidates);
  await transact(db, async (tx) => {
    const fresh = await freshCopies(tx, db, candidates);
    plan = planTeamDeletion(teamIds, fresh);
    writeEntriesUpdates(tx, db, plan.draftUpdates, fresh, Date.now());
    for (const teamId of plan.deletable) tx.delete(rosterTeamDoc(db, uid,teamId));
  });
  return { deleted: plan.deletable, kept: plan.kept };
};
