import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
  type Unsubscribe,
  type WriteBatch,
} from "firebase/firestore";
import { isRefused, stripUndefined } from "@/lib/firestoreData";
import { noticeProblem, rsvpEntryProblems, type RsvpEntry } from "@/lib/rsvp";
import {
  duplicateListSetup,
  firstListProblem,
  isListOver,
  LIST_IS_OVER,
  listSetupProblems,
  refusedListRsvpMessage,
  type AccountListRsvp,
  type AccountLists,
  type ListSetup,
  type RememberedNames,
} from "@/lib/rsvpList";
import { subscribeToTournament } from "@/lib/tournaments";
import type { Notice, Rsvp, RsvpList, RsvpTakes, Tournament } from "@/types/game";

/**
 * RSVP lists on Firestore: one document per list in the top-level
 * `rsvpLists` collection, owned by the account in `ownerId` (ADR-0005),
 * the RSVPs in the list's `rsvps` subcollection, and the names an account
 * last RSVP'd under on its own `users/{uid}` document. The pure
 * derivations are in src/lib/rsvpList.ts and src/lib/rsvp.ts.
 */

export const rsvpListsCollection = (db: Firestore) => collection(db, "rsvpLists");
export const rsvpListDoc = (db: Firestore, listId: string) => doc(db, "rsvpLists", listId);
export const listRsvpsCollection = (db: Firestore, listId: string) =>
  collection(db, "rsvpLists", listId, "rsvps");
/** An account's own RSVP to a list. Its id is the account's uid. */
export const listRsvpDoc = (db: Firestore, listId: string, uid: string) =>
  doc(db, "rsvpLists", listId, "rsvps", uid);
/** The owner's notices to everyone on a list. Deleting the list sweeps them with its RSVPs. */
export const listNoticesCollection = (db: Firestore, listId: string) =>
  collection(db, "rsvpLists", listId, "notices");
/** The account's own document. Only that account can read or write it. */
export const accountDoc = (db: Firestore, uid: string) => doc(db, "users", uid);

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
 * A list that is deleted while it is watched also ends in `onError`, with
 * a refusal, since the read rule cannot judge a document that is gone.
 * The phone that deleted it gets null first, from its own write. Treat
 * null and a refusal alike, as a list that is not there.
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

/**
 * Duplicate a list for `ownerId`: a new list with the source's by-person
 * or by-team choice and its capacity, named as its duplicate, with no
 * times, nobody on it, its RSVP link off, and no tournament imported from
 * it. The source is left as it is. Resolves with the new list.
 */
export const duplicateRsvpList = (
  db: Firestore,
  ownerId: string,
  source: Pick<RsvpList, "name" | "takes" | "capacity">,
): Promise<RsvpList> =>
  // A duplicate has no scheduled time, so no zone is stored with it.
  createRsvpList(db, ownerId, duplicateListSetup(source), "");

/**
 * Close the list, or reopen it. A close stops new RSVPs and leaves
 * withdrawals working. The scheduled time ends the list for good, so a
 * change is refused before anything is written once `list`, the copy this
 * phone holds, is over on this phone's clock. Only `closed` is written, so
 * a capacity saved from another phone at the same moment survives. Owner
 * only.
 */
export const setListClosed = async (
  db: Firestore,
  list: Pick<RsvpList, "id" | "scheduledAt">,
  closed: boolean,
): Promise<void> => {
  if (isListOver(list, Date.now())) throw new Error(LIST_IS_OVER);
  await updateDoc(rsvpListDoc(db, list.id), { closed, updatedAt: Date.now() });
};

/**
 * Add a held spot: an RSVP by name for someone without an account. It has
 * a generated id and no uid, so no account can change or withdraw it, and
 * the server writes its arrival time, so it takes the next place in order
 * like any other RSVP. A name the rules would refuse is thrown before
 * anything is written. Owner only, until the scheduled time, or on a list
 * that has none yet.
 */
export const addListHeldSpot = async (db: Firestore, listId: string, name: string): Promise<void> => {
  const problem = rsvpEntryProblems({ name, note: "" }).name;
  if (problem) throw new Error(problem);
  await addDoc(listRsvpsCollection(db, listId), {
    uid: null,
    held: true,
    name: name.trim(),
    createdAt: serverTimestamp(),
  });
};

/**
 * Take any RSVP off the list, a held spot included. As with a withdrawal,
 * the first RSVP waiting moves up with no write of its own (ADR-0004).
 * Owner only, at any time, after the scheduled time too.
 */
export const removeListRsvp = (db: Firestore, listId: string, rsvpId: string): Promise<void> =>
  deleteDoc(listRsvpDoc(db, listId, rsvpId));

/**
 * Delete a list with every RSVP on it, held spots included, and every
 * notice, in one cleanup batch, so nobody watching sees it half gone. The
 * rules judge each write in the batch against the list as it stood before
 * the batch, so the list goes in the same batch as the RSVPs and notices
 * under it. A tournament imported from the list is not touched. Owner
 * only, at any time.
 */
export const deleteRsvpList = async (db: Firestore, listId: string): Promise<void> => {
  const [rsvps, notices] = await Promise.all([
    getDocs(listRsvpsCollection(db, listId)),
    getDocs(listNoticesCollection(db, listId)),
  ]);
  const batch = writeBatch(db);
  for (const snapshot of [rsvps, notices]) {
    snapshot.docs.forEach((d) => batch.delete(d.ref));
  }
  batch.delete(rsvpListDoc(db, listId));
  await batch.commit();
};

// ============================================
// The RSVPs on a list
// ============================================

/**
 * A list's RSVPs in arrival order, for the owner, or for any real account
 * while the RSVP link is on. Firestore orders equal arrival times by
 * document id, so the order is the same on every phone. A pending write of
 * this phone's own shows with the server time estimated until the server
 * answers. Calls `onError` when the rules refuse the read, as they do once
 * the owner turns the link off.
 */
export const subscribeToListRsvps = (
  db: Firestore,
  listId: string,
  onChange: (rsvps: Rsvp[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe =>
  onSnapshot(
    query(listRsvpsCollection(db, listId), orderBy("createdAt")),
    (snapshot) =>
      onChange(
        snapshot.docs.map(
          (d) => ({ ...d.data({ serverTimestamps: "estimate" }), id: d.id }) as Rsvp,
        ),
      ),
    (error) => onError?.(error),
  );

/**
 * A list's RSVPs in arrival order, read once from the server, for an
 * import. An import copies the list as it stands (ADR-0005), so the copy
 * has to be the server's and not whatever this phone last saw. With
 * `closeFirst` the list is closed before the read, which is what import
 * offers for a list that is still open. Owner only.
 *
 * With no connection this rejects with Firestore's error and changes
 * nothing. A close on its own would wait for a connection without end, so
 * the server is asked for the list first, which fails at once.
 */
export const readListForImport = async (
  db: Firestore,
  list: Pick<RsvpList, "id" | "scheduledAt">,
  { closeFirst }: { closeFirst: boolean },
): Promise<Rsvp[]> => {
  if (closeFirst) {
    await getDocFromServer(rsvpListDoc(db, list.id));
    await setListClosed(db, list, true);
  }
  const snapshot = await getDocsFromServer(
    query(listRsvpsCollection(db, list.id), orderBy("createdAt")),
  );
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as Rsvp);
};

// ============================================
// Notices
// ============================================

/** A list's notices, newest first: every one, or the newest alone, which is all Home reads. */
const watchListNotices = (
  db: Firestore,
  listId: string,
  newestOnly: boolean,
  onChange: (notices: Notice[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  const newestFirst = query(listNoticesCollection(db, listId), orderBy("createdAt", "desc"));
  return onSnapshot(
    newestOnly ? query(newestFirst, limit(1)) : newestFirst,
    (snapshot) =>
      onChange(
        snapshot.docs.map(
          (d) => ({ ...d.data({ serverTimestamps: "estimate" }), id: d.id }) as Notice,
        ),
      ),
    (error) => onError?.(error),
  );
};

/**
 * A list's notices, newest first, for the owner, or for any real account
 * while the RSVP link is on. A notice this phone has just posted shows
 * with the server time estimated until the server answers. Calls `onError`
 * when the rules refuse the read, as they do once the owner turns the link
 * off.
 */
export const subscribeToListNotices = (
  db: Firestore,
  listId: string,
  onChange: (notices: Notice[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => watchListNotices(db, listId, false, onChange, onError);

/**
 * Post a notice on a list, trimmed, at the server's time. The rules take
 * one from the owner alone, at any time, after the scheduled time too. A
 * body the rules would refuse is thrown before anything is written.
 */
export const postListNotice = async (db: Firestore, listId: string, body: string): Promise<void> => {
  const problem = noticeProblem(body);
  if (problem) throw new Error(problem);
  await setDoc(doc(listNoticesCollection(db, listId)), {
    body: body.trim(),
    createdAt: serverTimestamp(),
  });
};

/** Delete a notice posted by mistake. The rules take this from the owner alone. */
export const deleteListNotice = (db: Firestore, listId: string, noticeId: string): Promise<void> =>
  deleteDoc(doc(listNoticesCollection(db, listId), noticeId));

/**
 * Record on the account's own RSVP that it has seen the list's notices up
 * to now, by the server's clock. Home compares that time with the newest
 * notice. The rules take it after the scheduled time too, and refuse it
 * for an account with no RSVP on the list.
 */
export const markListNoticesRead = (db: Firestore, listId: string, uid: string): Promise<void> =>
  updateDoc(listRsvpDoc(db, listId, uid), { noticesReadAt: serverTimestamp() });

// ============================================
// RSVPing
// ============================================

/** The rules refused an RSVP. The message says why, as the RSVP page shows it. */
export class RsvpRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RsvpRefusedError";
  }
}

/**
 * The field on the account's own document that remembers the name it last
 * gave a list of each kind. The rules allow these two fields and no other.
 */
const REMEMBERED_FIELD: Record<RsvpTakes, string> = {
  people: "rsvpName",
  teams: "rsvpTeamName",
};

const nameOrNull = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

/**
 * The names this account last RSVP'd under: one from a by-person list and
 * one from a by-team list. Each is null before its first RSVP of that kind.
 */
export const readRememberedNames = async (db: Firestore, uid: string): Promise<RememberedNames> => {
  const stored = (await getDoc(accountDoc(db, uid))).data();
  return {
    person: nameOrNull(stored?.[REMEMBERED_FIELD.people]),
    team: nameOrNull(stored?.[REMEMBERED_FIELD.teams]),
  };
};

/**
 * Why the rules refused an RSVP to this list, from the list as the server
 * has it now. A refused read, or no list at all, means the link is off.
 * The phone's clock only tells apart the reasons the server's clock gave.
 */
const whyRefused = async (db: Firestore, listId: string): Promise<string> => {
  try {
    const snapshot = await getDocFromServer(rsvpListDoc(db, listId));
    const list = snapshot.exists() ? (snapshot.data() as RsvpList) : null;
    return refusedListRsvpMessage(list, Date.now());
  } catch (error) {
    if (isRefused(error)) return refusedListRsvpMessage(null, Date.now());
    throw error;
  }
};

/**
 * A batch that remembers `name` on the account, for the RSVP write to join,
 * with the entry trimmed as it is stored. The name is remembered as a
 * person's or as a team's, by what the list takes, and the merge leaves
 * the other remembered name as it was. A name or note the rules would
 * refuse is thrown before anything is written.
 */
const rememberingBatch = (
  db: Firestore,
  uid: string,
  entry: RsvpEntry,
  takes: RsvpTakes,
): { batch: WriteBatch; name: string; note: string } => {
  const [problem] = Object.values(rsvpEntryProblems(entry));
  if (problem) throw new Error(problem);
  const name = entry.name.trim();
  const batch = writeBatch(db);
  batch.set(accountDoc(db, uid), { [REMEMBERED_FIELD[takes]]: name }, { merge: true });
  return { batch, name, note: entry.note.trim() };
};

/**
 * RSVP to a list as the real account `uid`, under the name and note given,
 * and remember the name on the account for next time. Both land in one
 * batch or neither does. The server writes the arrival time. The rules
 * refuse the RSVP before the open time and from the scheduled time on, by
 * the server's clock, after a close, and with the link off. That refusal
 * rejects with an RsvpRefusedError saying which. A name or note the rules
 * would refuse is thrown before anything is written.
 *
 * `takes` is what the list takes. On a by-team list the name is a team's,
 * the one RSVP stands for the whole team, and the name is remembered as
 * the account's team name. The RSVP's id is the account's uid either way,
 * so an account holds one person or one team per list, and the rules
 * refuse a second RSVP from it.
 */
export const sendListRsvp = async (
  db: Firestore,
  listId: string,
  uid: string,
  entry: RsvpEntry,
  takes: RsvpTakes = "people",
): Promise<void> => {
  const { batch, name, note } = rememberingBatch(db, uid, entry, takes);
  batch.set(listRsvpDoc(db, listId, uid), { uid, name, note, createdAt: serverTimestamp() });
  try {
    await batch.commit();
  } catch (error) {
    if (!isRefused(error)) throw error;
    throw new RsvpRefusedError(await whyRefused(db, listId));
  }
};

/**
 * Change the name and note on the account's own RSVP, and remember the
 * name, in one batch. The arrival time is left alone, so the account keeps
 * its place. `takes` is what the list takes, which says whether the name
 * is remembered as a person's or as a team's. A name or note the rules
 * would refuse is thrown before anything is written.
 */
export const updateListRsvp = async (
  db: Firestore,
  listId: string,
  uid: string,
  entry: RsvpEntry,
  takes: RsvpTakes = "people",
): Promise<void> => {
  const { batch, name, note } = rememberingBatch(db, uid, entry, takes);
  batch.update(listRsvpDoc(db, listId, uid), { name, note });
  await batch.commit();
};

/**
 * Take the account's RSVP off the list. The first RSVP waiting moves up
 * with no write of its own, since every phone's split changes when this
 * one lands (ADR-0004). The rules allow it until the scheduled time, even
 * after the owner closes the list. RSVPing again later is a new arrival.
 */
export const withdrawFromList = (db: Firestore, listId: string, uid: string): Promise<void> =>
  deleteDoc(listRsvpDoc(db, listId, uid));

// ============================================
// Tournaments imported from a list
// ============================================

/** How long a list's page waits before it asks again for a tournament it could not read. */
const LIST_TOURNAMENT_RETRY_MS = 30_000;

/**
 * The tournaments imported from a list that the viewer can read, in the
 * order of `tournamentIds`, which is the list's own record and so the order
 * they were imported in. Each is read by its id, so nothing here queries
 * across another account's tournaments. listTournamentRows turns a
 * delivery into the rows the list's page shows.
 *
 * A tournament the rules refuse is left out without failing the rest. That
 * is a draft for anyone but its owner, and a deleted one, whose id stays on
 * the list. A refused listener stays dead, so each refused id is asked for
 * again every `retryEvery` milliseconds. That is how a page left open on a
 * draft gets the tournament once the owner starts it.
 *
 * Delivers once every id has answered, then again only when what it would
 * deliver changes. With no ids it delivers an empty array.
 */
export const subscribeToListTournaments = (
  db: Firestore,
  tournamentIds: string[],
  onChange: (tournaments: Tournament[]) => void,
  { retryEvery = LIST_TOURNAMENT_RETRY_MS }: { retryEvery?: number } = {},
): Unsubscribe => {
  const read = new Map<string, Tournament>();
  const answered = new Set<string>();
  const watching = new Map<string, Unsubscribe>();
  let stopped = false;

  const deliver = () => {
    if (stopped || answered.size < tournamentIds.length) return;
    onChange(tournamentIds.flatMap((id) => read.get(id) ?? []));
  };

  /** Record that `id` has nothing to show, and say so only when that is news. */
  const leaveOut = (id: string) => {
    const isNews = read.delete(id) || !answered.has(id);
    answered.add(id);
    if (isNews) deliver();
  };

  const watch = (id: string) => {
    watching.set(
      id,
      subscribeToTournament(
        db,
        id,
        (tournament) => {
          if (!tournament) return leaveOut(id);
          read.set(id, tournament);
          answered.add(id);
          deliver();
        },
        () => {
          watching.delete(id);
          leaveOut(id);
        },
      ),
    );
  };

  for (const id of new Set(tournamentIds)) watch(id);
  // The first delivery never comes before this function returns, so the
  // caller always holds the unsubscribe by then.
  if (tournamentIds.length === 0) queueMicrotask(deliver);

  const retry = setInterval(() => {
    for (const id of new Set(tournamentIds)) {
      if (!watching.has(id)) watch(id);
    }
  }, retryEvery);

  return () => {
    stopped = true;
    clearInterval(retry);
    watching.forEach((unsubscribe) => unsubscribe());
    watching.clear();
  };
};

// ============================================
// Home
// ============================================

/**
 * The account's own RSVPs across every list, oldest first. This is a
 * collection group query on `uid`. The wildcard rule proves it from the
 * filter, and it needs the `rsvps` entry in firestore.indexes.json.
 *
 * An RSVP on a list sits at rsvpLists/{id}/rsvps/{uid}. The query also
 * finds any RSVP left under an old tournament, at
 * tournaments/{id}/rsvps/{uid}. Those are on no list, so they are left out
 * (ADR-0005).
 */
const subscribeToAccountListRsvps = (
  db: Firestore,
  uid: string,
  onChange: (rsvps: AccountListRsvp[]) => void,
  onError: (error: Error) => void,
): Unsubscribe =>
  onSnapshot(
    query(collectionGroup(db, "rsvps"), where("uid", "==", uid), orderBy("createdAt")),
    (snapshot) =>
      onChange(
        snapshot.docs.flatMap((d) => {
          const list = d.ref.parent.parent;
          if (list?.parent.path !== "rsvpLists") return [];
          const rsvp = { ...d.data({ serverTimestamps: "estimate" }), id: d.id } as Rsvp;
          return [{ ...rsvp, listId: list.id }];
        }),
      ),
    onError,
  );

/**
 * Everything Home needs about the lists the account `uid` has RSVP'd to:
 * its own RSVPs across lists, and for each list they point at, the list,
 * its RSVPs, and its newest notice. Each of those is read by the list's id,
 * which the rules can judge, so nothing here queries across other
 * accounts' lists. Delivers once the account's RSVPs arrive and again with
 * every change. homeListRows turns a delivery into rows.
 *
 * A list whose reads the rules refuse, as they do once the owner turns its
 * link off or deletes it, is dropped from the delivery without failing it,
 * and read again the next time the account's RSVPs change. A withdrawal
 * drops its list and stops its reads. Only the account's own query failing
 * calls `onError`, which ends the subscription.
 */
export const subscribeToAccountLists = (
  db: Firestore,
  uid: string,
  onChange: (read: AccountLists) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  let mine: AccountListRsvp[] | null = null;
  const lists: Record<string, RsvpList> = {};
  const rsvps: Record<string, Rsvp[]> = {};
  const notices: Record<string, Notice[]> = {};
  const watching = new Map<string, Unsubscribe[]>();
  let stopped = false;

  const deliver = () => {
    if (stopped || mine === null) return;
    onChange({ mine, lists: { ...lists }, rsvps: { ...rsvps }, notices: { ...notices } });
  };

  const forget = (listId: string) => {
    watching.get(listId)?.forEach((unsubscribe) => unsubscribe());
    watching.delete(listId);
    delete lists[listId];
    delete rsvps[listId];
    delete notices[listId];
  };

  const drop = (listId: string) => {
    if (!watching.has(listId)) return;
    forget(listId);
    deliver();
  };

  const watch = (listId: string) => {
    const refused = () => drop(listId);
    watching.set(listId, [
      subscribeToRsvpList(
        db,
        listId,
        (list) => {
          if (list) lists[listId] = list;
          else delete lists[listId];
          deliver();
        },
        refused,
      ),
      subscribeToListRsvps(
        db,
        listId,
        (all) => {
          rsvps[listId] = all;
          deliver();
        },
        refused,
      ),
      watchListNotices(
        db,
        listId,
        true,
        (newest) => {
          notices[listId] = newest;
          deliver();
        },
        refused,
      ),
    ]);
  };

  const unsubscribeMine = subscribeToAccountListRsvps(
    db,
    uid,
    (own) => {
      mine = own;
      const wanted = new Set(own.map((rsvp) => rsvp.listId));
      for (const listId of [...watching.keys()]) {
        if (!wanted.has(listId)) forget(listId);
      }
      for (const listId of wanted) {
        if (!watching.has(listId)) watch(listId);
      }
      deliver();
    },
    (error) => {
      stop();
      onError?.(error);
    },
  );

  function stop() {
    if (stopped) return;
    stopped = true;
    unsubscribeMine();
    for (const listId of [...watching.keys()]) forget(listId);
  }

  return stop;
};
