import {
  addDoc,
  collectionGroup,
  deleteDoc,
  deleteField,
  doc,
  getCountFromServer,
  getDoc,
  getDocFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import { isRefused } from "@/lib/firestoreData";
import {
  noticeProblem,
  refusedRsvpMessage,
  rsvpEntryProblems,
  rsvpPageState,
  rsvpProblems,
  type AccountNights,
  type AccountRsvp,
  type RsvpEntry,
  type RsvpSetup,
} from "@/lib/rsvp";
import {
  noticesCollection,
  rsvpsCollection,
  subscribeToTournament,
  tournamentDoc,
  updateTournamentFields,
} from "@/lib/tournaments";
import type { Notice, Rsvp, RsvpSettings, Tournament } from "@/types/game";

/**
 * RSVPs on Firestore: the owner's RSVP settings on the tournament document,
 * the RSVPs in the tournament's `rsvps` subcollection, and the name an
 * account last RSVP'd under on its own `users/{uid}` document. The pure
 * derivations are in src/lib/rsvp.ts.
 */

// The path builder sits in tournaments.ts, which deletes the list with the
// tournament and cannot import this module without a cycle.
export { rsvpsCollection };
export const rsvpDoc = (db: Firestore, tournamentId: string, uid: string) =>
  doc(db, "tournaments", tournamentId, "rsvps", uid);
/** The account's own document. Only that account can read or write it. */
export const accountDoc = (db: Firestore, uid: string) => doc(db, "users", uid);

// ============================================
// The owner
// ============================================

/**
 * Save a tournament's scheduled time and RSVP settings through the same
 * revision-carrying field write a rename uses, so a result racing it is
 * never overwritten (ADR-0003). A scheduled time that changes is stored
 * with `zone`, the zone it was entered in; one that stays keeps the zone it
 * was set in. Throws the first problem with the setup, before anything is
 * written, so the link cannot go on without both times. Only the owner can
 * write these fields; anyone else is refused by the rules.
 */
export const saveRsvpSettings = async (
  db: Firestore,
  tournament: Pick<Tournament, "id" | "scheduledAt" | "scheduledZone" | "rsvp">,
  setup: RsvpSetup,
  zone: string,
): Promise<void> => {
  const [problem] = Object.values(rsvpProblems(setup));
  if (problem) throw new Error(problem);

  const rsvp: RsvpSettings = {
    enabled: setup.enabled,
    capacity: setup.capacity,
    ...(setup.opensAt !== null && { opensAt: setup.opensAt }),
    closed: tournament.rsvp?.closed ?? false,
  };
  const fields: Record<string, unknown> = { rsvp };
  if (setup.scheduledAt === null) {
    fields.scheduledAt = deleteField();
    fields.scheduledZone = deleteField();
  } else if (setup.scheduledAt !== tournament.scheduledAt || !tournament.scheduledZone) {
    fields.scheduledAt = setup.scheduledAt;
    fields.scheduledZone = zone;
  }
  await updateTournamentFields(db, tournament.id, fields);
};

/**
 * Turn the RSVP link off, writing `rsvp.enabled` and nothing else, so it
 * works whatever the RSVP tab's form holds, and a capacity saved from
 * another phone at the same moment survives. Owner only.
 */
export const turnRsvpLinkOff = (db: Firestore, tournamentId: string): Promise<void> =>
  updateTournamentFields(db, tournamentId, { "rsvp.enabled": false });

/**
 * Close the list early, or reopen it. A close stops new RSVPs and leaves
 * withdrawals open; starting the tournament closes the list for good, so a
 * reopen is refused before anything is written once it has left draft.
 * Only `rsvp.closed` is written, through the revision-carrying field write,
 * so a capacity saved from another phone at the same moment survives.
 */
export const setRsvpClosed = async (
  db: Firestore,
  tournamentId: string,
  closed: boolean,
): Promise<void> => {
  const snapshot = await getDoc(tournamentDoc(db, tournamentId));
  const tournament = snapshot.data() as Tournament | undefined;
  if (!tournament?.rsvp) throw new Error("This tournament has no RSVP list to close.");
  if (!closed && tournament.status !== "draft") {
    throw new Error("The list can only be reopened while the tournament is a draft.");
  }
  await updateTournamentFields(db, tournamentId, { "rsvp.closed": closed });
};

/**
 * Add a held spot: an RSVP by name for someone without an account. It has
 * a generated id and no uid, so no account can change or withdraw it, and
 * the server writes its arrival time, so it takes the next place in order
 * like anyone else's RSVP. A name the rules would refuse is thrown before
 * anything is written. Owner only, while the tournament is a draft or live.
 */
export const addHeldSpot = async (db: Firestore, tournamentId: string, name: string): Promise<void> => {
  const problem = rsvpEntryProblems({ name, note: "" }).name;
  if (problem) throw new Error(problem);
  await addDoc(rsvpsCollection(db, tournamentId), {
    uid: null,
    held: true,
    name: name.trim(),
    createdAt: serverTimestamp(),
  });
};

/**
 * Take anyone off the list, a held spot included. As with a withdrawal,
 * the first person waiting moves up with no write of their own. Owner
 * only, at any status.
 */
export const removeRsvp = (db: Firestore, tournamentId: string, rsvpId: string): Promise<void> =>
  deleteDoc(doc(rsvpsCollection(db, tournamentId), rsvpId));

/**
 * How many people are on a tournament's list, held spots included, counted
 * by the server without reading the list, for a delete confirmation on a
 * screen that does not hold it. Rejects offline. Owner, or anyone while
 * the RSVP link is on.
 */
export const countRsvps = async (db: Firestore, tournamentId: string): Promise<number> =>
  (await getCountFromServer(rsvpsCollection(db, tournamentId))).data().count;

// ============================================
// The list
// ============================================

/**
 * A tournament's RSVPs in arrival order, for the owner, or for any signed-in
 * account while the RSVP link is on. Firestore orders equal arrival times
 * by document id, so the order is the same on every phone. A pending write
 * of this phone's own shows with the server time estimated until the
 * server answers. Calls `onError` when the rules refuse the list, as they
 * do once the owner turns the link off.
 */
export const subscribeToRsvps = (
  db: Firestore,
  tournamentId: string,
  onChange: (rsvps: Rsvp[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe =>
  onSnapshot(
    query(rsvpsCollection(db, tournamentId), orderBy("createdAt")),
    (snapshot) => {
      onChange(
        snapshot.docs.map((d) => ({
          ...(d.data({ serverTimestamps: "estimate" }) as Omit<Rsvp, "id">),
          id: d.id,
        })),
      );
    },
    (error) => onError?.(error),
  );

// ============================================
// RSVPing
// ============================================

/** The rules refused an RSVP; the message says why, as the RSVP page shows it. */
export class RsvpRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RsvpRefusedError";
  }
}

/**
 * Why the rules refused an RSVP to this tournament, from the tournament as
 * the server has it now. A refused read means the owner turned the link
 * off. The phone's clock is used only to tell a closed or started night
 * from one that is not open yet; a night this phone thinks is open was
 * refused by the server's clock, so it reads as not open yet.
 */
const whyRefused = async (db: Firestore, tournamentId: string): Promise<string> => {
  try {
    const snapshot = await getDocFromServer(tournamentDoc(db, tournamentId));
    if (!snapshot.exists()) return refusedRsvpMessage({ kind: "link_off" });
    return refusedRsvpMessage(rsvpPageState(snapshot.data() as Tournament, Date.now()));
  } catch (error) {
    if (isRefused(error)) return refusedRsvpMessage({ kind: "link_off" });
    throw error;
  }
};

/**
 * RSVP to a tournament as the signed-in account `uid`, under the name and
 * note given, and remember the name on the account for next time. Both
 * land in one batch or neither does. The server writes the arrival time,
 * and the rules refuse the RSVP before the open time by the server's
 * clock, after a close, once the tournament has started, or with the link
 * off; that refusal rejects with an RsvpRefusedError saying which. A name
 * or note the rules would refuse is thrown before anything is written.
 */
export const rsvp = async (
  db: Firestore,
  tournamentId: string,
  uid: string,
  entry: RsvpEntry,
): Promise<void> => {
  const [problem] = Object.values(rsvpEntryProblems(entry));
  if (problem) throw new Error(problem);
  const name = entry.name.trim();

  const batch = writeBatch(db);
  batch.set(rsvpDoc(db, tournamentId, uid), {
    uid,
    name,
    note: entry.note.trim(),
    createdAt: serverTimestamp(),
  });
  batch.set(accountDoc(db, uid), { rsvpName: name }, { merge: true });
  try {
    await batch.commit();
  } catch (error) {
    if (!isRefused(error)) throw error;
    throw new RsvpRefusedError(await whyRefused(db, tournamentId));
  }
};

/** The name this account last RSVP'd under, or null before its first RSVP. */
export const readRememberedName = async (db: Firestore, uid: string): Promise<string | null> => {
  const snapshot = await getDoc(accountDoc(db, uid));
  const name: unknown = snapshot.data()?.rsvpName;
  return typeof name === "string" && name.length > 0 ? name : null;
};

// ============================================
// Changing and withdrawing
// ============================================

/**
 * Change the name and note on the account's own RSVP, and remember the
 * name, in one batch. The arrival time is left alone, so the person keeps
 * their place. The note is stored trimmed, as an RSVP stores it. A name or
 * note the rules would refuse is thrown before anything is written.
 */
export const updateRsvp = async (
  db: Firestore,
  tournamentId: string,
  uid: string,
  entry: RsvpEntry,
): Promise<void> => {
  const [problem] = Object.values(rsvpEntryProblems(entry));
  if (problem) throw new Error(problem);
  const name = entry.name.trim();

  const batch = writeBatch(db);
  batch.update(rsvpDoc(db, tournamentId, uid), { name, note: entry.note.trim() });
  batch.set(accountDoc(db, uid), { rsvpName: name }, { merge: true });
  await batch.commit();
};

/**
 * Take the account's RSVP off the list. The first person waiting moves up
 * with no write of their own: every phone's split changes when this one
 * lands (ADR-0004). The rules allow it until the tournament starts, even
 * after the owner closes the list. RSVPing again later is a new arrival.
 */
export const withdraw = async (db: Firestore, tournamentId: string, uid: string): Promise<void> => {
  await deleteDoc(rsvpDoc(db, tournamentId, uid));
};

// ============================================
// Notices
// ============================================

/**
 * A tournament's notices, newest first, for the owner, or for any signed-in
 * account while the RSVP link is on. A notice this phone has just posted
 * shows with the server time estimated until the server answers. Calls
 * `onError` when the rules refuse the list, as they do once the owner
 * turns the link off.
 */
export const subscribeToNotices = (
  db: Firestore,
  tournamentId: string,
  onChange: (notices: Notice[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe =>
  onSnapshot(
    query(noticesCollection(db, tournamentId), orderBy("createdAt", "desc")),
    (snapshot) => {
      onChange(
        snapshot.docs.map((d) => ({
          ...(d.data({ serverTimestamps: "estimate" }) as Omit<Notice, "id">),
          id: d.id,
        })),
      );
    },
    (error) => onError?.(error),
  );

/**
 * Post a notice on a tournament, trimmed, at the server's time. A body the
 * rules would refuse is thrown before anything is written. Owner only.
 */
export const postNotice = async (db: Firestore, tournamentId: string, body: string): Promise<void> => {
  const problem = noticeProblem(body);
  if (problem) throw new Error(problem);
  await addDoc(noticesCollection(db, tournamentId), {
    body: body.trim(),
    createdAt: serverTimestamp(),
  });
};

/** Delete a notice posted by mistake. Owner only. */
export const deleteNotice = (db: Firestore, tournamentId: string, noticeId: string): Promise<void> =>
  deleteDoc(doc(noticesCollection(db, tournamentId), noticeId));

/**
 * Record on the account's own RSVP that it has seen the tournament's
 * notices up to now, by the server's clock, which Home compares with the
 * newest notice. Refused for an account without an RSVP to the tournament.
 */
export const markNoticesRead = (db: Firestore, tournamentId: string, uid: string): Promise<void> =>
  updateDoc(rsvpDoc(db, tournamentId, uid), { noticesReadAt: serverTimestamp() });

// ============================================
// Home
// ============================================

/**
 * The account's own RSVPs across every tournament, oldest first: a
 * collection group query on `uid`, which the wildcard rule proves from the
 * filter and which needs the `rsvps` entry in firestore.indexes.json.
 */
const subscribeToAccountRsvps = (
  db: Firestore,
  uid: string,
  onChange: (rsvps: AccountRsvp[]) => void,
  onError: (error: Error) => void,
): Unsubscribe =>
  onSnapshot(
    query(collectionGroup(db, "rsvps"), where("uid", "==", uid), orderBy("createdAt")),
    (snapshot) => {
      onChange(
        snapshot.docs.map((d) => ({
          ...(d.data({ serverTimestamps: "estimate" }) as Omit<Rsvp, "id">),
          id: d.id,
          // An RSVP sits at tournaments/{id}/rsvps/{uid}.
          tournamentId: d.ref.parent.parent!.id,
        })),
      );
    },
    onError,
  );

/** A tournament's newest notice, as a list of at most one, which is all Home reads. */
const subscribeToNewestNotice = (
  db: Firestore,
  tournamentId: string,
  onChange: (notices: Notice[]) => void,
  onError: (error: Error) => void,
): Unsubscribe =>
  onSnapshot(
    query(noticesCollection(db, tournamentId), orderBy("createdAt", "desc"), limit(1)),
    (snapshot) => {
      onChange(
        snapshot.docs.map((d) => ({
          ...(d.data({ serverTimestamps: "estimate" }) as Omit<Notice, "id">),
          id: d.id,
        })),
      );
    },
    onError,
  );

/**
 * Everything Home needs about the nights the account `uid` has RSVP'd to:
 * its own RSVPs across tournaments, and for each tournament they point at,
 * the tournament, its list, and its newest notice. Delivers once the
 * account's RSVPs arrive and again with every change; homeRsvpRows turns a
 * delivery into rows.
 *
 * A night whose reads the rules refuse, as they do once the owner turns
 * its link off, is dropped from the delivery rather than failing it, and
 * read again the next time the account's RSVPs change. A withdrawal drops
 * its night and stops its reads. Only the account's own query failing
 * calls `onError`, which ends the subscription.
 */
export const subscribeToAccountNights = (
  db: Firestore,
  uid: string,
  onChange: (nights: AccountNights) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  let mine: AccountRsvp[] | null = null;
  const tournaments: Record<string, Tournament> = {};
  const lists: Record<string, Rsvp[]> = {};
  const notices: Record<string, Notice[]> = {};
  const nights = new Map<string, Unsubscribe[]>();
  let stopped = false;

  const deliver = () => {
    if (stopped || mine === null) return;
    onChange({ mine, tournaments: { ...tournaments }, lists: { ...lists }, notices: { ...notices } });
  };

  const forget = (tournamentId: string) => {
    nights.get(tournamentId)?.forEach((unsubscribe) => unsubscribe());
    nights.delete(tournamentId);
    delete tournaments[tournamentId];
    delete lists[tournamentId];
    delete notices[tournamentId];
  };

  const drop = (tournamentId: string) => {
    if (!nights.has(tournamentId)) return;
    forget(tournamentId);
    deliver();
  };

  const watch = (tournamentId: string) => {
    const refused = () => drop(tournamentId);
    nights.set(tournamentId, [
      subscribeToTournament(
        db,
        tournamentId,
        (tournament) => {
          if (tournament) tournaments[tournamentId] = tournament;
          else delete tournaments[tournamentId];
          deliver();
        },
        refused,
      ),
      subscribeToRsvps(
        db,
        tournamentId,
        (rsvps) => {
          lists[tournamentId] = rsvps;
          deliver();
        },
        refused,
      ),
      subscribeToNewestNotice(
        db,
        tournamentId,
        (newest) => {
          notices[tournamentId] = newest;
          deliver();
        },
        refused,
      ),
    ]);
  };

  const unsubscribeMine = subscribeToAccountRsvps(
    db,
    uid,
    (rsvps) => {
      mine = rsvps;
      const wanted = new Set(rsvps.map((r) => r.tournamentId));
      for (const tournamentId of [...nights.keys()]) {
        if (!wanted.has(tournamentId)) forget(tournamentId);
      }
      for (const tournamentId of wanted) {
        if (!nights.has(tournamentId)) watch(tournamentId);
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
    for (const tournamentId of [...nights.keys()]) forget(tournamentId);
  }

  return stop;
};
