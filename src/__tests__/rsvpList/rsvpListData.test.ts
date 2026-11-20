// @vitest-environment node
import { doc, getDoc, updateDoc, type Firestore } from "firebase/firestore";
import { expect, it } from "vitest";
import type { ListSetup } from "@/lib/rsvpList";
import {
  createRsvpList,
  saveListSettings,
  subscribeToOwnLists,
  subscribeToRsvpList,
} from "@/lib/rsvpListData";
import type { RsvpList } from "@/types/game";
import { describeFirestoreRules, modularFirestore, when } from "../rules/emulator";

const owner = "owner-uid";
const friend = "friend-uid";

const friday7pm = Date.UTC(2026, 10, 7, 0, 0);
const thursday6pm = Date.UTC(2026, 10, 5, 23, 0);

const setup = (changes: Partial<ListSetup> = {}): ListSetup => ({
  name: "Friday pickup",
  takes: "people",
  capacity: 12,
  scheduledAt: friday7pm,
  opensAt: thursday6pm,
  enabled: true,
  ...changes,
});

describeFirestoreRules("RSVP lists on Firestore", (env) => {
  const ownerDb = () => modularFirestore(env().authenticatedContext(owner));
  const friendDb = () => modularFirestore(env().authenticatedContext(friend));

  /** The list as stored, read around the rules. The path is spelled out, not taken from the module. */
  const stored = async (id: string): Promise<Record<string, unknown> | undefined> => {
    let data: Record<string, unknown> | undefined;
    await env().withSecurityRulesDisabled(async (unrestricted) => {
      data = (await getDoc(doc(modularFirestore(unrestricted), "rsvpLists", id))).data();
    });
    return data;
  };

  /** A change made on another phone, which this phone's copy of the list has not seen. */
  const changedElsewhere = (id: string, fields: Record<string, unknown>) =>
    env().withSecurityRulesDisabled((unrestricted) =>
      updateDoc(doc(modularFirestore(unrestricted), "rsvpLists", id), fields),
    );

  const read = (db: Firestore, id: string) =>
    when<RsvpList | null>(
      (onChange, onError) => subscribeToRsvpList(db, id, onChange, onError),
      (list) => list !== null,
    );

  it("creates a list in its own collection, owned by its account, with nobody on it and no tournament", async () => {
    const before = Date.now();
    const list = await createRsvpList(
      ownerDb(),
      owner,
      setup({ name: "  Friday pickup  ", takes: "teams", capacity: 8 }),
      "America/New_York",
    );

    const after = await stored(list.id);
    expect(after).toEqual({
      ownerId: owner,
      name: "Friday pickup",
      takes: "teams",
      capacity: 8,
      scheduledAt: friday7pm,
      scheduledZone: "America/New_York",
      opensAt: thursday6pm,
      enabled: true,
      closed: false,
      tournamentIds: [],
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    });
    expect(after!.createdAt).toBeGreaterThanOrEqual(before);
    expect(list).toEqual({ ...after, id: list.id });
  });

  it("creates a private list with no times, and stores neither a time nor a zone", async () => {
    const list = await createRsvpList(
      ownerDb(),
      owner,
      setup({ enabled: false, scheduledAt: null, opensAt: null }),
      "America/New_York",
    );

    const after = await stored(list.id);
    expect(after).toMatchObject({ enabled: false, capacity: 12 });
    expect(after).not.toHaveProperty("scheduledAt");
    expect(after).not.toHaveProperty("scheduledZone");
    expect(after).not.toHaveProperty("opensAt");
  });

  it("refuses to create a list with a problem, before anything is written", async () => {
    await expect(
      createRsvpList(ownerDb(), owner, setup({ opensAt: null }), "America/New_York"),
    ).rejects.toThrow("Set the open time before turning the RSVP link on.");

    const lists = await when<RsvpList[]>(
      (onChange, onError) => subscribeToOwnLists(ownerDb(), owner, onChange, onError),
      () => true,
    );
    expect(lists).toEqual([]);
  });

  it("changes a list's settings and moves its updated time", async () => {
    const db = ownerDb();
    const list = await createRsvpList(db, owner, setup(), "America/New_York");

    await saveListSettings(
      db,
      list,
      setup({ name: "Friday pickup, court 2", capacity: 16 }),
      "America/New_York",
    );

    const after = await stored(list.id);
    expect(after).toMatchObject({
      name: "Friday pickup, court 2",
      capacity: 16,
      scheduledAt: friday7pm,
      opensAt: thursday6pm,
      enabled: true,
    });
    expect(after!.updatedAt).toBeGreaterThanOrEqual(list.updatedAt);
    expect(after!.createdAt).toBe(list.createdAt);
  });

  it("names only the fields it changes, so a change from another phone to a different field survives", async () => {
    const db = ownerDb();
    const list = await createRsvpList(db, owner, setup(), "America/New_York");
    await changedElsewhere(list.id, { capacity: 20, closed: true, tournamentIds: ["tourn-1"] });

    // This phone still holds the list as it was created, capacity 12.
    await saveListSettings(db, list, setup({ name: "Friday at 7:30" }), "America/New_York");

    expect(await stored(list.id)).toMatchObject({
      name: "Friday at 7:30",
      capacity: 20,
      closed: true,
      tournamentIds: ["tourn-1"],
    });
  });

  it("keeps the zone a scheduled time was set in when the time stays, and takes the new zone when it moves", async () => {
    const db = ownerDb();
    const list = await createRsvpList(db, owner, setup(), "America/New_York");

    await saveListSettings(db, list, setup({ capacity: 14 }), "Europe/London");
    expect(await stored(list.id)).toMatchObject({ scheduledZone: "America/New_York", capacity: 14 });

    const halfPast = friday7pm + 30 * 60_000;
    await saveListSettings(db, list, setup({ scheduledAt: halfPast }), "Europe/London");
    expect(await stored(list.id)).toMatchObject({
      scheduledAt: halfPast,
      scheduledZone: "Europe/London",
    });
  });

  it("turns the link off and takes the times away, leaving no time or zone stored", async () => {
    const db = ownerDb();
    const list = await createRsvpList(db, owner, setup(), "America/New_York");

    await saveListSettings(
      db,
      list,
      setup({ enabled: false, scheduledAt: null, opensAt: null }),
      "America/New_York",
    );

    const after = await stored(list.id);
    expect(after).toMatchObject({ enabled: false });
    expect(after).not.toHaveProperty("scheduledAt");
    expect(after).not.toHaveProperty("scheduledZone");
    expect(after).not.toHaveProperty("opensAt");
  });

  it("refuses a settings change with a problem, before anything is written", async () => {
    const db = ownerDb();
    const list = await createRsvpList(db, owner, setup(), "America/New_York");

    await expect(
      saveListSettings(db, list, setup({ name: "Renamed", capacity: 0 }), "America/New_York"),
    ).rejects.toThrow("Capacity must be at least 1.");

    expect(await stored(list.id)).toMatchObject({ name: "Friday pickup", capacity: 12 });
  });

  it("is refused for anyone but the owner", async () => {
    const list = await createRsvpList(ownerDb(), owner, setup(), "America/New_York");

    await expect(
      saveListSettings(friendDb(), list, setup({ capacity: 99 }), "America/New_York"),
    ).rejects.toMatchObject({ code: "permission-denied" });

    expect(await stored(list.id)).toMatchObject({ capacity: 12 });
  });

  it("lets a second account read a list while its link is on, and not once it is off", async () => {
    const list = await createRsvpList(ownerDb(), owner, setup(), "America/New_York");

    const seen = await read(friendDb(), list.id);
    expect(seen).toMatchObject({
      id: list.id,
      name: "Friday pickup",
      scheduledAt: friday7pm,
      scheduledZone: "America/New_York",
      capacity: 12,
    });

    await saveListSettings(ownerDb(), list, setup({ enabled: false }), "America/New_York");

    await expect(read(friendDb(), list.id)).rejects.toMatchObject({ code: "permission-denied" });
    expect(await read(ownerDb(), list.id)).toMatchObject({ id: list.id, enabled: false });
  });

  it("ends a second account's open subscription when the owner turns the link off", async () => {
    const list = await createRsvpList(ownerDb(), owner, setup(), "America/New_York");

    const refused = new Promise<Error>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("the subscription was never refused")), 5000);
      const unsubscribe = subscribeToRsvpList(
        friendDb(),
        list.id,
        () => {},
        (error) => {
          clearTimeout(timer);
          unsubscribe();
          resolve(error);
        },
      );
    });
    await read(friendDb(), list.id);
    await saveListSettings(ownerDb(), list, setup({ enabled: false }), "America/New_York");

    expect(await refused).toMatchObject({ code: "permission-denied" });
  });

  it("refuses a second account a list that was created private", async () => {
    const list = await createRsvpList(
      ownerDb(),
      owner,
      setup({ enabled: false }),
      "America/New_York",
    );

    await expect(read(friendDb(), list.id)).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("delivers an owner's own lists, and none of another account's", async () => {
    const first = await createRsvpList(ownerDb(), owner, setup({ name: "Friday" }), "UTC");
    const second = await createRsvpList(
      ownerDb(),
      owner,
      setup({ name: "Saturday", enabled: false }),
      "UTC",
    );
    await createRsvpList(friendDb(), friend, setup({ name: "Theirs" }), "UTC");

    const lists = await when<RsvpList[]>(
      (onChange, onError) => subscribeToOwnLists(ownerDb(), owner, onChange, onError),
      (delivered) => delivered.length === 2,
    );

    expect(lists.map((list) => list.id).sort()).toEqual([first.id, second.id].sort());
    expect(lists.map((list) => list.ownerId)).toEqual([owner, owner]);
  });
});
