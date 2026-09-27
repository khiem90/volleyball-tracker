import { onSnapshot, setDoc, updateDoc, type Firestore, type Unsubscribe } from "firebase/firestore";
import { newToken } from "@/lib/firestoreData";
import { STALE_SCORER_LINK } from "@/lib/shareLinks";
import {
  newScorerKey,
  scorerKeyDoc,
  scorerProofDoc,
  tournamentDoc,
  type ScorerKey,
} from "@/lib/tournaments";

/**
 * Share links on Firestore. The owner turns the spectator link on or off,
 * which is a flag on the tournament the rules read, and regenerates the
 * scorer key, which lives where only the owner can read it. A phone that
 * opens the scorer link proves it holds the key by writing the key under
 * its own uid; the rules accept the proof only while the key is current,
 * and compare it against the current key on every write after that, so
 * regenerating the key locks every old phone out at its next write.
 */

// ============================================
// The owner
// ============================================

/** The key behind the scorer link, or null while the tournament has none. Owner only. */
export const subscribeToScorerKey = (
  db: Firestore,
  tournamentId: string,
  onChange: (key: string | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe =>
  onSnapshot(
    scorerKeyDoc(db, tournamentId),
    (snapshot) => onChange(snapshot.exists() ? (snapshot.data() as ScorerKey).key : null),
    (error) => onError?.(error),
  );

/**
 * Replace the scorer key, so every phone on the old link is refused on its
 * next write. Also makes the key for a tournament that has none. Resolves
 * with the new key once the server has it.
 */
export const regenerateScorerKey = async (db: Firestore, tournamentId: string): Promise<string> => {
  const next = newScorerKey();
  await setDoc(scorerKeyDoc(db, tournamentId), next);
  return next.key;
};

/**
 * Turn the spectator link on or off. Like a rename, this writes the one
 * field with a fresh revision, so a result landing at the same moment is
 * never overwritten and an engine command built on the old copy reloads
 * rather than writing the old flag back.
 */
export const setSpectatorEnabled = async (
  db: Firestore,
  tournamentId: string,
  enabled: boolean,
): Promise<void> => {
  await updateDoc(tournamentDoc(db, tournamentId), {
    spectatorEnabled: enabled,
    revision: newToken(),
    updatedAt: Date.now(),
  });
};

// ============================================
// The scorer
// ============================================

/** The owner has replaced the scorer link this phone holds, so the rules refused its write. */
export class StaleScorerLinkError extends Error {
  constructor() {
    super(STALE_SCORER_LINK);
    this.name = "StaleScorerLinkError";
  }
}

/**
 * Prove that this identity holds the tournament's scorer link. Rejects
 * with a permission error when the key is not the current one, which is
 * how a phone on a regenerated link learns that its link is stale.
 */
export const proveScorer = async (
  db: Firestore,
  tournamentId: string,
  uid: string,
  key: string,
): Promise<void> => {
  await setDoc(scorerProofDoc(db, tournamentId, uid), { key, updatedAt: Date.now() });
};
