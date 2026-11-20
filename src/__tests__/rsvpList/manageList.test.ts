// @vitest-environment node
import { collection, doc, getDoc, getDocs, updateDoc, type Firestore } from "firebase/firestore";
import { expect, it } from "vitest";
import { splitRsvps, standingIn } from "@/lib/rsvp";
import type { ListSetup } from "@/lib/rsvpList";
import {
  addListHeldSpot,
  createRsvpList,
  duplicateRsvpList,
  removeListRsvp,
  RsvpRefusedError,
  sendListRsvp,
  setListClosed,
  subscribeToListRsvps,
  withdrawFromList,
} from "@/lib/rsvpListData";
import type { Rsvp, RsvpList } from "@/types/game";
import { describeFirestoreRules, minutesFromNow, modularFirestore, when } from "../rules/emulator";

const owner = "owner-uid";
const dan = "dan-uid";
const eve = "eve-uid";

describeFirestoreRules("Managing a list on Firestore", (env) => {
  const accountDb = (uid: string) => modularFirestore(env().authenticatedContext(uid));

  /** The owner's by-person list, open since a minute ago and scheduled for tomorrow unless changed. */
  const openList = (changes: Partial<ListSetup> = {}): Promise<RsvpList> =>
    createRsvpList(
      accountDb(owner),
      owner,
      {
        name: "Friday pickup",
        takes: "people",
        capacity: 12,
        scheduledAt: minutesFromNow(60 * 24),
        opensAt: minutesFromNow(-1),
        enabled: true,
        ...changes,
      },
      "America/New_York",
    );

  /** The first delivery of a list's RSVPs that satisfies `ready`. */
  const rsvpsWhere = (db: Firestore, listId: string, ready: (rsvps: Rsvp[]) => boolean) =>
    when<Rsvp[]>((onChange, onError) => subscribeToListRsvps(db, listId, onChange, onError), ready);

  /** A list as stored, read around the rules. The path is spelled out, not taken from the module. */
  const storedList = async (listId: string): Promise<Record<string, unknown> | undefined> => {
    let data: Record<string, unknown> | undefined;
    await env().withSecurityRulesDisabled(async (unrestricted) => {
      data = (await getDoc(doc(modularFirestore(unrestricted), "rsvpLists", listId))).data();
    });
    return data;
  };

  /** A list's RSVP documents as stored, read around the rules. */
  const storedRsvps = async (listId: string): Promise<Record<string, Record<string, unknown>>> => {
    const found: Record<string, Record<string, unknown>> = {};
    await env().withSecurityRulesDisabled(async (unrestricted) => {
      const snapshot = await getDocs(
        collection(modularFirestore(unrestricted), "rsvpLists", listId, "rsvps"),
      );
      for (const d of snapshot.docs) found[d.id] = d.data();
    });
    return found;
  };

  /** The scheduled time passes: both times move into the past, written around the rules. */
  const scheduledTimePasses = (listId: string) =>
    env().withSecurityRulesDisabled((unrestricted) =>
      updateDoc(doc(modularFirestore(unrestricted), "rsvpLists", listId), {
        opensAt: minutesFromNow(-60),
        scheduledAt: minutesFromNow(-1),
      }),
    );

  /** Dan RSVPs, then Eve, one after the other so the order is certain. */
  const danThenEve = async (listId: string) => {
    await sendListRsvp(accountDb(dan), listId, dan, { name: "Dan", note: "" });
    await sendListRsvp(accountDb(eve), listId, eve, { name: "Eve", note: "" });
  };

  it("confirms the first RSVP waiting when the owner removes a confirmed one, with no write to it", async () => {
    const list = await openList({ capacity: 1 });
    await danThenEve(list.id);
    const eveDb = accountDb(eve);
    const before = await rsvpsWhere(eveDb, list.id, (rsvps) => rsvps.length === 2);
    expect(standingIn(splitRsvps(before, 1), eve)).toEqual({ kind: "waitlisted", position: 1 });
    const eveStored = (await storedRsvps(list.id))[eve];

    await removeListRsvp(accountDb(owner), list.id, dan);

    const after = await rsvpsWhere(eveDb, list.id, (rsvps) => rsvps.length === 1);
    expect(standingIn(splitRsvps(after, 1), eve)).toEqual({ kind: "confirmed", position: 1 });
    expect(await storedRsvps(list.id)).toEqual({ [eve]: eveStored });
  });

  it("lets the owner remove an RSVP once the list is over, and nobody else at any time", async () => {
    const list = await openList();
    await danThenEve(list.id);

    await expect(removeListRsvp(accountDb(eve), list.id, dan)).rejects.toMatchObject({
      code: "permission-denied",
    });
    expect(Object.keys(await storedRsvps(list.id)).sort()).toEqual([dan, eve]);

    await scheduledTimePasses(list.id);
    await removeListRsvp(accountDb(owner), list.id, dan);

    expect(Object.keys(await storedRsvps(list.id))).toEqual([eve]);
    expect(await storedList(list.id)).toMatchObject({ name: "Friday pickup" });
  });

  it("adds a held spot by name with no account behind it, in its place in arrival order", async () => {
    const list = await openList({ capacity: 2 });
    await sendListRsvp(accountDb(dan), list.id, dan, { name: "Dan", note: "" });

    await addListHeldSpot(accountDb(owner), list.id, "  Walk-in Sam ");
    await sendListRsvp(accountDb(eve), list.id, eve, { name: "Eve", note: "" });

    const rsvps = await rsvpsWhere(accountDb(eve), list.id, (found) => found.length === 3);
    expect(rsvps.map((r) => r.name)).toEqual(["Dan", "Walk-in Sam", "Eve"]);
    const held = rsvps[1];
    expect(held.id).not.toBe(owner);
    expect((await storedRsvps(list.id))[held.id]).toEqual({
      uid: null,
      held: true,
      name: "Walk-in Sam",
      createdAt: expect.anything(),
    });
    // The held spot counts against capacity, so Eve waits behind it.
    const split = splitRsvps(rsvps, list.capacity);
    expect(split.confirmed.map((r) => r.name)).toEqual(["Dan", "Walk-in Sam"]);
    expect(standingIn(split, eve)).toEqual({ kind: "waitlisted", position: 1 });
  });

  it("adds a held spot to a list with no scheduled time yet, and refuses one once the list is over", async () => {
    const untimed = await openList({ enabled: false, scheduledAt: null, opensAt: null });
    await addListHeldSpot(accountDb(owner), untimed.id, "Walk-in Sam");
    expect(Object.values(await storedRsvps(untimed.id)).map((r) => r.name)).toEqual(["Walk-in Sam"]);

    const over = await openList();
    await scheduledTimePasses(over.id);
    await expect(addListHeldSpot(accountDb(owner), over.id, "Walk-in Sam")).rejects.toThrow();
    expect(await storedRsvps(over.id)).toEqual({});
  });

  it("refuses a held spot with no name or too long a name before writing, and from anyone but the owner", async () => {
    const list = await openList();

    await expect(addListHeldSpot(accountDb(owner), list.id, "   ")).rejects.toThrow(
      "Enter the name the owner will see.",
    );
    await expect(addListHeldSpot(accountDb(owner), list.id, "x".repeat(41))).rejects.toThrow(
      "Keep the name to 40 characters.",
    );
    await expect(addListHeldSpot(accountDb(dan), list.id, "Walk-in Sam")).rejects.toMatchObject({
      code: "permission-denied",
    });
    expect(await storedRsvps(list.id)).toEqual({});
  });

  it("removes a held spot like any other RSVP", async () => {
    const list = await openList();
    await addListHeldSpot(accountDb(owner), list.id, "Walk-in Sam");
    const [heldId] = Object.keys(await storedRsvps(list.id));

    await removeListRsvp(accountDb(owner), list.id, heldId);

    expect(await storedRsvps(list.id)).toEqual({});
  });

  it("stops new RSVPs on a close, leaves withdrawals working, and lets RSVPs in again on a reopen", async () => {
    const list = await openList();
    const ownerDb = accountDb(owner);
    await sendListRsvp(accountDb(dan), list.id, dan, { name: "Dan", note: "" });

    await setListClosed(ownerDb, list, true);

    expect(await storedList(list.id)).toMatchObject({ closed: true });
    const refusal = await sendListRsvp(accountDb(eve), list.id, eve, { name: "Eve", note: "" }).catch(
      (error: unknown) => error,
    );
    expect(refusal).toBeInstanceOf(RsvpRefusedError);
    expect((refusal as Error).message).toBe("The owner has closed RSVPs.");
    expect(Object.keys(await storedRsvps(list.id))).toEqual([dan]);

    await withdrawFromList(accountDb(dan), list.id, dan);
    expect(await storedRsvps(list.id)).toEqual({});

    await setListClosed(ownerDb, list, false);

    expect(await storedList(list.id)).toMatchObject({ closed: false });
    await sendListRsvp(accountDb(eve), list.id, eve, { name: "Eve", note: "" });
    expect(Object.keys(await storedRsvps(list.id))).toEqual([eve]);
  });

  it("writes only the close, so a capacity saved from another phone at the same moment survives", async () => {
    const list = await openList({ capacity: 12 });
    await env().withSecurityRulesDisabled((unrestricted) =>
      updateDoc(doc(modularFirestore(unrestricted), "rsvpLists", list.id), { capacity: 20 }),
    );

    await setListClosed(accountDb(owner), list, true);

    const after = await storedList(list.id);
    expect(after).toMatchObject({ closed: true, capacity: 20, enabled: true });
    expect(after!.updatedAt).toBeGreaterThanOrEqual(list.updatedAt);
  });

  it("refuses to reopen a list that is over, before anything is written", async () => {
    const list = await openList({ opensAt: minutesFromNow(-60), scheduledAt: minutesFromNow(-1) });
    await env().withSecurityRulesDisabled((unrestricted) =>
      updateDoc(doc(modularFirestore(unrestricted), "rsvpLists", list.id), { closed: true }),
    );

    await expect(setListClosed(accountDb(owner), list, false)).rejects.toThrow("This list is over.");

    expect(await storedList(list.id)).toMatchObject({ closed: true, updatedAt: list.updatedAt });
  });

  it("refuses a close from anyone but the owner", async () => {
    const list = await openList();

    await expect(setListClosed(accountDb(dan), list, true)).rejects.toMatchObject({
      code: "permission-denied",
    });

    expect(await storedList(list.id)).toMatchObject({ closed: false });
  });

  it("duplicates a list with its by-team choice and capacity, named as a duplicate, with no times, nobody on it, and the link off", async () => {
    const source = await openList({ name: "Friday league", takes: "teams", capacity: 8 });
    await danThenEve(source.id);
    await addListHeldSpot(accountDb(owner), source.id, "Walk-in Sam");
    await env().withSecurityRulesDisabled((unrestricted) =>
      updateDoc(doc(modularFirestore(unrestricted), "rsvpLists", source.id), {
        closed: true,
        tournamentIds: ["tourn-1"],
      }),
    );
    const sourceStored = await storedList(source.id);
    const before = Date.now();

    const copy = await duplicateRsvpList(accountDb(owner), owner, source);

    expect(copy.id).not.toBe(source.id);
    const stored = await storedList(copy.id);
    expect(stored).toEqual({
      ownerId: owner,
      name: "Friday league (duplicate)",
      takes: "teams",
      capacity: 8,
      enabled: false,
      closed: false,
      tournamentIds: [],
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    });
    expect(stored!.createdAt).toBeGreaterThanOrEqual(before);
    expect(copy).toEqual({ ...stored, id: copy.id });
    expect(await storedRsvps(copy.id)).toEqual({});
    // The source keeps everything it had.
    expect(await storedList(source.id)).toEqual(sourceStored);
    expect(Object.keys(await storedRsvps(source.id))).toHaveLength(3);
  });

  it("duplicates a by-person list that is over, which is how a list comes back for next week", async () => {
    const source = await openList({
      capacity: 16,
      opensAt: minutesFromNow(-60),
      scheduledAt: minutesFromNow(-1),
    });

    const copy = await duplicateRsvpList(accountDb(owner), owner, source);

    expect(await storedList(copy.id)).toMatchObject({
      name: "Friday pickup (duplicate)",
      takes: "people",
      capacity: 16,
      enabled: false,
    });
    expect(copy.scheduledAt).toBeUndefined();
    expect(copy.opensAt).toBeUndefined();
  });
});
