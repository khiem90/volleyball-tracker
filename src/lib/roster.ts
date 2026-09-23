import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
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

export const rosterCollection = (db: Firestore, uid: string) =>
  collection(db, "users", uid, "teams");

// Teams added in the same millisecond, as Quick Add does, would otherwise tie
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

/** Add a team to the roster. Resolves once the server has accepted the write. */
export const addRosterTeam = async (
  db: Firestore,
  uid: string,
  input: TeamInput,
): Promise<PersistentTeam> => {
  const ref = doc(rosterCollection(db, uid));
  const team: PersistentTeam = {
    id: ref.id,
    name: input.name,
    createdAt: nextCreatedAt(),
    ...(input.color !== undefined && { color: input.color }),
  };
  await setDoc(ref, team);
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
