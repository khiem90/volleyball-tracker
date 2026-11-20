// @vitest-environment node
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  type Firestore,
  type Timestamp,
} from "firebase/firestore";
import { expect, it } from "vitest";
import { splitRsvps, standingIn } from "@/lib/rsvp";
import { listSetupOf, type ListSetup } from "@/lib/rsvpList";
import {
  createRsvpList,
  readRememberedName,
  RsvpRefusedError,
  saveListSettings,
  sendListRsvp,
  subscribeToListRsvps,
  subscribeToRsvpList,
  updateListRsvp,
  withdrawFromList,
} from "@/lib/rsvpListData";
import type { Rsvp, RsvpList } from "@/types/game";
import { describeFirestoreRules, minutesFromNow, modularFirestore, when } from "../rules/emulator";

const owner = "owner-uid";
const dan = "dan-uid";
const eve = "eve-uid";

describeFirestoreRules("RSVPing to a list on Firestore", (env) => {
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

  const listWhere = (db: Firestore, listId: string, ready: (list: RsvpList) => boolean) =>
    when<RsvpList | null>(
      (onChange, onError) => subscribeToRsvpList(db, listId, onChange, onError),
      (list) => list !== null && ready(list),
    ) as Promise<RsvpList>;

  /** A list's RSVP documents as stored, read around the rules. The path is spelled out, not taken from the module. */
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

  /** A change the owner makes that this ticket has no function for yet, written around the rules. */
  const ownerSets = (listId: string, fields: Record<string, unknown>) =>
    env().withSecurityRulesDisabled((unrestricted) =>
      updateDoc(doc(modularFirestore(unrestricted), "rsvpLists", listId), fields),
    );

  /** Dan RSVPs, then Eve, one after the other so the order is certain. */
  const danThenEve = async (listId: string) => {
    await sendListRsvp(accountDb(dan), listId, dan, { name: "Dan", note: "" });
    await sendListRsvp(accountDb(eve), listId, eve, { name: "Eve", note: "" });
  };

  it("stores an RSVP under the list with the account's uid as its id, trimmed, at the server's time", async () => {
    const list = await openList();
    const before = Date.now();

    await sendListRsvp(accountDb(dan), list.id, dan, { name: "  Dan from Tuesdays ", note: " Late " });

    const stored = await storedRsvps(list.id);
    expect(Object.keys(stored)).toEqual([dan]);
    expect(stored[dan]).toEqual({
      uid: dan,
      name: "Dan from Tuesdays",
      note: "Late",
      createdAt: expect.anything(),
    });
    const arrivedAt = (stored[dan].createdAt as Timestamp).toMillis();
    expect(arrivedAt).toBeGreaterThanOrEqual(before - 1000);
    expect(arrivedAt).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it("remembers the name on the account for its next RSVP", async () => {
    const list = await openList();
    const db = accountDb(dan);
    expect(await readRememberedName(db, dan)).toBeNull();

    await sendListRsvp(db, list.id, dan, { name: "  Dan from Tuesdays ", note: "" });

    expect(await readRememberedName(db, dan)).toBe("Dan from Tuesdays");
  });

  it("lands two accounts that RSVP at the same moment on a capacity-one list in the server's order, and confirms the second when capacity goes up, with no write to it", async () => {
    const list = await openList({ capacity: 1 });

    await Promise.all([
      sendListRsvp(accountDb(dan), list.id, dan, { name: "Dan", note: "" }),
      sendListRsvp(accountDb(eve), list.id, eve, { name: "Eve", note: "Bringing a ball" }),
    ]);

    const delivered = await rsvpsWhere(accountDb(owner), list.id, (rsvps) => rsvps.length === 2);

    // The server's order, read with the rules off: arrival time, then
    // document id for a tie.
    const stored = await storedRsvps(list.id);
    const serverOrder = Object.entries(stored)
      .map(([id, data]) => ({ id, at: data.createdAt as Timestamp }))
      .sort(
        (a, b) =>
          a.at.seconds - b.at.seconds ||
          a.at.nanoseconds - b.at.nanoseconds ||
          (a.id < b.id ? -1 : 1),
      )
      .map((r) => r.id);
    expect(delivered.map((r) => r.id)).toEqual(serverOrder);
    expect([...serverOrder].sort()).toEqual([dan, eve]);

    const [first, second] = serverOrder;
    const split = splitRsvps(delivered, 1);
    expect(standingIn(split, first)).toEqual({ kind: "confirmed", position: 1 });
    expect(standingIn(split, second)).toEqual({ kind: "waitlisted", position: 1 });

    await saveListSettings(
      accountDb(owner),
      list,
      { ...listSetupOf(list), capacity: 2 },
      "America/New_York",
    );

    const secondDb = accountDb(second);
    const raised = await listWhere(secondDb, list.id, (l) => l.capacity === 2);
    const after = await rsvpsWhere(secondDb, list.id, (rsvps) => rsvps.length === 2);
    expect(standingIn(splitRsvps(after, raised.capacity), second)).toEqual({
      kind: "confirmed",
      position: 2,
    });
    expect((await storedRsvps(list.id))[second]).toEqual(stored[second]);
  });

  it("promotes the first person waiting when the first confirmed withdraws, with no write to them, and puts a returning account behind", async () => {
    const list = await openList({ capacity: 1 });
    await danThenEve(list.id);
    const eveDb = accountDb(eve);

    const before = await rsvpsWhere(eveDb, list.id, (rsvps) => rsvps.length === 2);
    expect(standingIn(splitRsvps(before, 1), dan)).toEqual({ kind: "confirmed", position: 1 });
    expect(standingIn(splitRsvps(before, 1), eve)).toEqual({ kind: "waitlisted", position: 1 });
    const eveStored = (await storedRsvps(list.id))[eve];

    await withdrawFromList(accountDb(dan), list.id, dan);

    const afterWithdrawal = await rsvpsWhere(eveDb, list.id, (rsvps) => rsvps.length === 1);
    expect(standingIn(splitRsvps(afterWithdrawal, 1), eve)).toEqual({ kind: "confirmed", position: 1 });
    expect((await storedRsvps(list.id))[eve]).toEqual(eveStored);

    await sendListRsvp(accountDb(dan), list.id, dan, { name: "Dan", note: "Back again" });

    const afterReturn = await rsvpsWhere(eveDb, list.id, (rsvps) => rsvps.length === 2);
    expect(afterReturn.map((r) => r.uid)).toEqual([eve, dan]);
    expect(standingIn(splitRsvps(afterReturn, 1), dan)).toEqual({ kind: "waitlisted", position: 1 });
  });

  it("keeps a person's place when they change their name and note, and remembers the new name", async () => {
    const list = await openList({ capacity: 1 });
    await danThenEve(list.id);
    const danDb = accountDb(dan);
    const arrived = (await storedRsvps(list.id))[dan].createdAt;

    await updateListRsvp(danDb, list.id, dan, { name: " Daniel ", note: " Late " });

    const after = await rsvpsWhere(danDb, list.id, (rsvps) => rsvps[0]?.name === "Daniel");
    expect(after.map((r) => r.uid)).toEqual([dan, eve]);
    expect(after[0].note).toBe("Late");
    expect((await storedRsvps(list.id))[dan].createdAt).toEqual(arrived);
    expect(await readRememberedName(danDb, dan)).toBe("Daniel");
  });

  it("refuses a name or note the rules would refuse before writing anything", async () => {
    const list = await openList();
    const db = accountDb(dan);

    await expect(sendListRsvp(db, list.id, dan, { name: "   ", note: "" })).rejects.toThrow(
      "Enter the name the owner will see.",
    );
    await expect(
      sendListRsvp(db, list.id, dan, { name: "Dan", note: "x".repeat(141) }),
    ).rejects.toThrow("Keep the note to 140 characters.");
    expect(await storedRsvps(list.id)).toEqual({});
    expect(await readRememberedName(db, dan)).toBeNull();

    await sendListRsvp(db, list.id, dan, { name: "Dan", note: "" });
    await expect(updateListRsvp(db, list.id, dan, { name: "", note: "" })).rejects.toThrow(
      "Enter the name the owner will see.",
    );
    expect((await storedRsvps(list.id))[dan].name).toBe("Dan");
  });

  it("reads a refusal before the open time as not open yet, and remembers nothing", async () => {
    const list = await openList({ opensAt: minutesFromNow(5) });
    const db = accountDb(dan);

    const refusal = await sendListRsvp(db, list.id, dan, { name: "Dan", note: "" }).catch(
      (error: unknown) => error,
    );

    expect(refusal).toBeInstanceOf(RsvpRefusedError);
    expect((refusal as Error).message).toBe("Not open yet");
    expect(await storedRsvps(list.id)).toEqual({});
    expect(await readRememberedName(db, dan)).toBeNull();
  });

  it("reads a refusal on a closed list, on a list that is over, and on a link turned off, for what it is", async () => {
    const closed = await openList();
    await ownerSets(closed.id, { closed: true });
    const over = await openList({ opensAt: minutesFromNow(-60), scheduledAt: minutesFromNow(-1) });
    const off = await openList({ enabled: false });
    const db = accountDb(dan);
    const refusalOn = (listId: string) =>
      sendListRsvp(db, listId, dan, { name: "Dan", note: "" }).catch((error: unknown) => error);

    for (const [listId, message] of [
      [closed.id, "The owner has closed RSVPs."],
      [over.id, "This list is over."],
      [off.id, "This RSVP link is off."],
      ["no-such-list", "This RSVP link is off."],
    ]) {
      const refusal = await refusalOn(listId);
      expect(refusal).toBeInstanceOf(RsvpRefusedError);
      expect((refusal as Error).message).toBe(message);
    }
  });

  it("lets a person withdraw from a closed list, and refuses once the scheduled time has passed", async () => {
    const closed = await openList();
    await sendListRsvp(accountDb(dan), closed.id, dan, { name: "Dan", note: "" });
    await ownerSets(closed.id, { closed: true });

    await withdrawFromList(accountDb(dan), closed.id, dan);
    expect(await storedRsvps(closed.id)).toEqual({});

    const over = await openList();
    await sendListRsvp(accountDb(dan), over.id, dan, { name: "Dan", note: "" });
    await ownerSets(over.id, { opensAt: minutesFromNow(-60), scheduledAt: minutesFromNow(-1) });

    await expect(withdrawFromList(accountDb(dan), over.id, dan)).rejects.toThrow();
    expect(Object.keys(await storedRsvps(over.id))).toEqual([dan]);
  });

  it("lets the owner RSVP to their own list like anyone else", async () => {
    const list = await openList({ capacity: 1 });
    await sendListRsvp(accountDb(dan), list.id, dan, { name: "Dan", note: "" });

    await sendListRsvp(accountDb(owner), list.id, owner, { name: "The organiser", note: "" });

    const rsvps = await rsvpsWhere(accountDb(owner), list.id, (found) => found.length === 2);
    expect(standingIn(splitRsvps(rsvps, 1), owner)).toEqual({ kind: "waitlisted", position: 1 });
  });

  it("shows the RSVPs to another account holding the link, and refuses them once the link is off", async () => {
    const list = await openList();
    await sendListRsvp(accountDb(dan), list.id, dan, { name: "Dan", note: "" });

    const seen = await rsvpsWhere(accountDb(eve), list.id, (rsvps) => rsvps.length === 1);
    expect(seen.map((r) => r.name)).toEqual(["Dan"]);

    await saveListSettings(
      accountDb(owner),
      list,
      { ...listSetupOf(list), enabled: false },
      "America/New_York",
    );

    await expect(rsvpsWhere(accountDb(eve), list.id, () => true)).rejects.toThrow();
  });
});
