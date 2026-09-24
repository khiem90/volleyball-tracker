import {
  collection,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import { stripUndefined, toUpdatePayload } from "@/lib/firestoreData";
import type { Match } from "@/types/game";

/**
 * Quick matches: standalone matches between two roster teams that belong to
 * no tournament. Each is one document at `users/{uid}/matches/{id}`. The
 * collection shares its name with the tournament match subcollection so the
 * account-wide query in src/lib/tournaments.ts returns both kinds.
 */

export const quickMatchesCollection = (db: Firestore, uid: string) =>
  collection(db, "users", uid, "matches");
export const quickMatchDoc = (db: Firestore, uid: string, matchId: string) =>
  doc(db, "users", uid, "matches", matchId);

export interface QuickMatchInput {
  homeTeamId: string;
  awayTeamId: string;
}

/** A quick match with its id assigned, ready to save. */
export const buildQuickMatch = (db: Firestore, uid: string, input: QuickMatchInput): Match => ({
  id: doc(quickMatchesCollection(db, uid)).id,
  ownerId: uid,
  tournamentId: null,
  homeTeamId: input.homeTeamId,
  awayTeamId: input.awayTeamId,
  homeScore: 0,
  awayScore: 0,
  status: "pending",
  round: 1,
  position: 1,
  createdAt: Date.now(),
});

/** Write a quick match. Resolves once the server has accepted it. */
export const saveQuickMatch = async (db: Firestore, uid: string, match: Match): Promise<void> => {
  await setDoc(quickMatchDoc(db, uid, match.id), stripUndefined(match));
};

/** Build and save a quick match. Resolves once the server has accepted the write. */
export const addQuickMatch = async (
  db: Firestore,
  uid: string,
  input: QuickMatchInput,
): Promise<Match> => {
  const match = buildQuickMatch(db, uid, input);
  await saveQuickMatch(db, uid, match);
  return match;
};

export const updateQuickMatch = async (
  db: Firestore,
  uid: string,
  matchId: string,
  changes: Partial<Match>,
): Promise<void> => {
  await updateDoc(quickMatchDoc(db, uid, matchId), toUpdatePayload(changes));
};

export const deleteQuickMatch = async (
  db: Firestore,
  uid: string,
  matchId: string,
): Promise<void> => {
  await deleteDoc(quickMatchDoc(db, uid, matchId));
};
