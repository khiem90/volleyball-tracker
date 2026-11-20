import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import { stripUndefined } from "@/lib/firestoreData";
import { firstListProblem, listSetupProblems, type ListSetup } from "@/lib/rsvpList";
import type { RsvpList } from "@/types/game";

/**
 * RSVP lists on Firestore: one document per list in the top-level
 * `rsvpLists` collection, owned by the account in `ownerId` (ADR-0005).
 * The pure derivations are in src/lib/rsvpList.ts.
 */

export const rsvpListsCollection = (db: Firestore) => collection(db, "rsvpLists");
export const rsvpListDoc = (db: Firestore, listId: string) => doc(db, "rsvpLists", listId);

const throwFirstProblem = (setup: ListSetup): void => {
  const problem = firstListProblem(listSetupProblems(setup));
  if (problem) throw new Error(problem);
};

// ============================================
// Subscriptions
// ============================================

/**
 * An account's own lists, newest first. The query filters on `ownerId`,
 * which is what lets the rules allow it, and needs the `rsvpLists` entry in
 * firestore.indexes.json. ownListsInOrder puts them in the RSVP tab's order.
 */
export const subscribeToOwnLists = (
  db: Firestore,
  ownerId: string,
  onChange: (lists: RsvpList[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe =>
  onSnapshot(
    query(rsvpListsCollection(db), where("ownerId", "==", ownerId), orderBy("createdAt", "desc")),
    (snapshot) => onChange(snapshot.docs.map((d) => ({ ...(d.data() as RsvpList), id: d.id }))),
    (error) => onError?.(error),
  );

/**
 * One list, for its owner or for a real account holding its RSVP link.
 * Calls `onError` when the rules refuse it, as they do while the link is
 * off, once the owner turns it off, and for a list that does not exist.
 * Delivers null when a list the reader could see is deleted.
 */
export const subscribeToRsvpList = (
  db: Firestore,
  listId: string,
  onChange: (list: RsvpList | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe =>
  onSnapshot(
    rsvpListDoc(db, listId),
    (snapshot) =>
      onChange(snapshot.exists() ? { ...(snapshot.data() as RsvpList), id: snapshot.id } : null),
    (error) => onError?.(error),
  );

// ============================================
// The owner
// ============================================

/**
 * Create a list owned by `ownerId` from a setup, open for RSVPs or not as
 * the setup says, with nobody on it and no tournament imported from it. A
 * scheduled time is stored with `zone`, the zone it was entered in. The
 * name is stored trimmed. Throws the first problem with the setup before
 * anything is written. Resolves with the list once the server has it.
 */
export const createRsvpList = async (
  db: Firestore,
  ownerId: string,
  setup: ListSetup,
  zone: string,
): Promise<RsvpList> => {
  throwFirstProblem(setup);
  const now = Date.now();
  const reference = doc(rsvpListsCollection(db));
  const fields: Omit<RsvpList, "id"> = {
    ownerId,
    name: setup.name.trim(),
    takes: setup.takes,
    capacity: setup.capacity,
    ...(setup.scheduledAt !== null && { scheduledAt: setup.scheduledAt, scheduledZone: zone }),
    ...(setup.opensAt !== null && { opensAt: setup.opensAt }),
    enabled: setup.enabled,
    closed: false,
    tournamentIds: [],
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(reference, stripUndefined(fields));
  return { ...fields, id: reference.id };
};

/**
 * Save a list's settings from the form. The write names only the fields
 * that differ from `list`, the copy this phone holds, so a change another
 * phone made to a different field is never overwritten. A scheduled time
 * that moves is stored with `zone`, the zone it was entered in. One that
 * stays keeps the zone it was set in. A time that is cleared is removed,
 * along with its zone. Throws the first problem with the setup before
 * anything is written. A setup that changes nothing writes nothing. Only
 * the owner can write a list. The rules refuse anyone else.
 */
export const saveListSettings = async (
  db: Firestore,
  list: RsvpList,
  setup: ListSetup,
  zone: string,
): Promise<void> => {
  throwFirstProblem(setup);

  const changes: Record<string, unknown> = {};
  const name = setup.name.trim();
  if (name !== list.name) changes.name = name;
  if (setup.takes !== list.takes) changes.takes = setup.takes;
  if (setup.capacity !== list.capacity) changes.capacity = setup.capacity;
  if (setup.scheduledAt !== (list.scheduledAt ?? null)) {
    changes.scheduledAt = setup.scheduledAt ?? deleteField();
    changes.scheduledZone = setup.scheduledAt === null ? deleteField() : zone;
  }
  if (setup.opensAt !== (list.opensAt ?? null)) changes.opensAt = setup.opensAt ?? deleteField();
  if (setup.enabled !== list.enabled) changes.enabled = setup.enabled;
  if (Object.keys(changes).length === 0) return;

  await updateDoc(rsvpListDoc(db, list.id), { ...changes, updatedAt: Date.now() });
};
