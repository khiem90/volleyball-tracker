import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import type { PersistentTeam } from "@/types/game";

/**
 * The roster: the teams an account keeps between tournaments. Each team is one
 * document under `users/{uid}/teams`, and the rules let only that account read
 * or write there. Every function takes the Firestore instance so the same code
 * runs against the app's database and the rules test emulator.
 */

export interface TeamInput {
  name: string;
  color?: string;
}

/** The colors a team can have, in the order the color picker shows them. */
export const TEAM_COLORS = [
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#6366f1", // Indigo
  "#8b5cf6", // Purple
  "#ec4899", // Pink
];

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

// "Aces" and "aces" are the same team as far as the roster is concerned.
const nameKey = (name: string) => name.trim().toLowerCase();

/** The palette color with the fewest uses; palette order breaks ties. */
const leastUsedColor = (uses: Map<string, number>): string =>
  TEAM_COLORS.reduce((best, color) =>
    (uses.get(color) ?? 0) < (uses.get(best) ?? 0) ? color : best
  );

/**
 * Turn typed or pasted text, one team per line, into the teams to add. Blank
 * lines are dropped and names are trimmed. A name the roster already has is
 * reported rather than added again. Each new team gets the palette color the
 * roster uses least, so teams stay easy to tell apart on the court.
 */
export const parseTeamNames = (text: string, roster: PersistentTeam[]): ParsedTeamNames => {
  const taken = new Set(roster.map((team) => nameKey(team.name)));
  const colorUses = new Map<string, number>();
  for (const team of roster) {
    if (team.color) colorUses.set(team.color, (colorUses.get(team.color) ?? 0) + 1);
  }

  const teams: TeamInput[] = [];
  const alreadyOnRoster: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const name = line.trim();
    if (name.length === 0) continue;
    if (taken.has(nameKey(name))) {
      alreadyOnRoster.push(name);
      continue;
    }
    taken.add(nameKey(name));
    const color = leastUsedColor(colorUses);
    colorUses.set(color, (colorUses.get(color) ?? 0) + 1);
    teams.push({ name, color });
  }
  return { teams, alreadyOnRoster };
};

export const rosterCollection = (db: Firestore, uid: string) =>
  collection(db, "users", uid, "teams");

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
 * Save built teams to the roster in one batch, so a pasted list lands whole.
 * Resolves once the server has accepted the write.
 */
export const saveRosterTeams = async (
  db: Firestore,
  uid: string,
  teams: PersistentTeam[],
): Promise<void> => {
  const batch = writeBatch(db);
  for (const team of teams) batch.set(doc(rosterCollection(db, uid), team.id), team);
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

/**
 * Rename a team and, when a color is given, recolor it. A stored color stays
 * as it is when none is given. Resolves once the server has accepted the write.
 */
export const updateRosterTeam = async (
  db: Firestore,
  uid: string,
  teamId: string,
  changes: TeamInput,
): Promise<void> => {
  const fields: Record<string, string> = { name: changes.name };
  if (changes.color !== undefined) fields.color = changes.color;
  await updateDoc(doc(rosterCollection(db, uid), teamId), fields);
};

/** Remove a team from the roster. Resolves once the server has accepted the delete. */
export const deleteRosterTeam = async (
  db: Firestore,
  uid: string,
  teamId: string,
): Promise<void> => {
  await deleteDoc(doc(rosterCollection(db, uid), teamId));
};
