// @vitest-environment node
import {
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import { expect, it } from "vitest";
import { homeListRows, listSetupOf, type AccountLists, type ListSetup } from "@/lib/rsvpList";
import {
  createRsvpList,
  deleteRsvpList,
  markListNoticesRead,
  postListNotice,
  saveListSettings,
  sendListRsvp,
  subscribeToAccountLists,
  withdrawFromList,
} from "@/lib/rsvpListData";
import type { RsvpList } from "@/types/game";
import { describeFirestoreRules, minutesFromNow, modularFirestore } from "../rules/emulator";

const owner = "owner-uid";
const dan = "dan-uid";
const eve = "eve-uid";

/**
 * A long-lived Home subscription, watched across several writes. `until`
 * resolves with the first delivery, or the latest one, that satisfies
 * `ready`, and fails the test if one never comes.
 */
const watchAccountLists = (db: Firestore, uid: string) => {
  let latest: AccountLists | null = null;
  let failure: Error | null = null;
  let waiting: { ready: (read: AccountLists) => boolean; resolve: (read: AccountLists) => void } | null =
    null;
  const unsubscribe: Unsubscribe = subscribeToAccountLists(
    db,
    uid,
    (read) => {
      latest = read;
      if (waiting?.ready(read)) {
        waiting.resolve(read);
        waiting = null;
      }
    },
    (error) => {
      failure = error;
    },
  );
  const until = (ready: (read: AccountLists) => boolean) =>
    new Promise<AccountLists>((resolve, reject) => {
      if (failure) return reject(failure);
      if (latest && ready(latest)) return resolve(latest);
      const timer = setTimeout(
        () => reject(failure ?? new Error("the lists never reached the expected state")),
        5000,
      );
      waiting = {
        ready,
        resolve: (read) => {
          clearTimeout(timer);
          resolve(read);
        },
      };
    });
  return { until, stop: unsubscribe, failure: () => failure };
};

describeFirestoreRules("Home's lists on Firestore", (env) => {
  const accountDb = (uid: string) => modularFirestore(env().authenticatedContext(uid));

  /** One of the owner's by-person lists, open since a minute ago and scheduled for tomorrow unless changed. */
  const openList = (name: string, changes: Partial<ListSetup> = {}): Promise<RsvpList> =>
    createRsvpList(
      accountDb(owner),
      owner,
      {
        name,
        takes: "people",
        capacity: 12,
        scheduledAt: minutesFromNow(60 * 24),
        opensAt: minutesFromNow(-1),
        enabled: true,
        ...changes,
      },
      "America/New_York",
    );

  const rowNames = (uid: string, read: AccountLists) =>
    homeListRows(uid, read, Date.now()).map((row) => row.list.name);

  it("returns the lists the account is on, with its standing on each, and drops one on withdrawal", async () => {
    const friday = await openList("Friday");
    const saturday = await openList("Saturday", { capacity: 1 });
    const sunday = await openList("Sunday");
    await sendListRsvp(accountDb(eve), saturday.id, eve, { name: "Eve", note: "" });
    await sendListRsvp(accountDb(dan), friday.id, dan, { name: "Dan", note: "" });
    await sendListRsvp(accountDb(dan), saturday.id, dan, { name: "Dan", note: "" });
    await sendListRsvp(accountDb(eve), sunday.id, eve, { name: "Eve", note: "" });
    const danDb = accountDb(dan);
    const watcher = watchAccountLists(danDb, dan);

    try {
      // The cache can deliver Saturday's RSVPs holding only Dan before the
      // server adds Eve, who arrived first, so wait for both.
      const both = await watcher.until(
        (read) =>
          homeListRows(dan, read, Date.now()).length === 2 && read.rsvps[saturday.id]?.length === 2,
      );
      expect(both.mine.map((rsvp) => rsvp.listId).sort()).toEqual([friday.id, saturday.id].sort());
      expect(Object.keys(both.lists).sort()).toEqual([friday.id, saturday.id].sort());
      const rows = homeListRows(dan, both, Date.now());
      expect(rows.find((row) => row.list.id === friday.id)).toMatchObject({
        list: { name: "Friday" },
        standing: { kind: "confirmed", position: 1 },
        href: `/rsvp/${friday.id}`,
      });
      expect(rows.find((row) => row.list.id === saturday.id)?.standing).toEqual({
        kind: "waitlisted",
        position: 1,
      });

      await withdrawFromList(danDb, friday.id, dan);

      const after = await watcher.until((read) => read.mine.length === 1);
      expect(after.mine.map((rsvp) => rsvp.listId)).toEqual([saturday.id]);
      expect(Object.keys(after.lists)).toEqual([saturday.id]);
      expect(rowNames(dan, after)).toEqual(["Saturday"]);
      expect(watcher.failure()).toBeNull();
    } finally {
      watcher.stop();
    }
  });

  it("passes over an RSVP left under an old tournament, which is not on a list", async () => {
    const friday = await openList("Friday");
    // The path is spelled out, since nothing writes an RSVP under a tournament any more.
    await env().withSecurityRulesDisabled((unrestricted) =>
      setDoc(doc(modularFirestore(unrestricted), "tournaments", "old-1", "rsvps", dan), {
        uid: dan,
        name: "Dan",
        createdAt: serverTimestamp(),
      }),
    );
    await sendListRsvp(accountDb(dan), friday.id, dan, { name: "Dan", note: "" });
    const watcher = watchAccountLists(accountDb(dan), dan);

    try {
      const read = await watcher.until((latest) => homeListRows(dan, latest, Date.now()).length === 1);
      expect(read.mine.map((rsvp) => rsvp.listId)).toEqual([friday.id]);
      expect(Object.keys(read.lists)).toEqual([friday.id]);
      expect(watcher.failure()).toBeNull();
    } finally {
      watcher.stop();
    }
  });

  it("drops a list whose link the owner turns off, and keeps the rest of the panel", async () => {
    const friday = await openList("Friday");
    const saturday = await openList("Saturday");
    await sendListRsvp(accountDb(dan), friday.id, dan, { name: "Dan", note: "" });
    await sendListRsvp(accountDb(dan), saturday.id, dan, { name: "Dan", note: "" });
    const watcher = watchAccountLists(accountDb(dan), dan);

    try {
      await watcher.until((read) => homeListRows(dan, read, Date.now()).length === 2);

      await saveListSettings(
        accountDb(owner),
        friday,
        { ...listSetupOf(friday), enabled: false },
        "America/New_York",
      );

      const after = await watcher.until((read) => !(friday.id in read.lists));
      // The account's own RSVP is still there. Only the list's reads are refused.
      expect(after.mine).toHaveLength(2);
      expect(friday.id in after.rsvps).toBe(false);
      expect(rowNames(dan, after)).toEqual(["Saturday"]);
      expect(watcher.failure()).toBeNull();
    } finally {
      watcher.stop();
    }
  });

  it("drops a list the owner deletes", async () => {
    const friday = await openList("Friday");
    const saturday = await openList("Saturday");
    await sendListRsvp(accountDb(dan), friday.id, dan, { name: "Dan", note: "" });
    await sendListRsvp(accountDb(dan), saturday.id, dan, { name: "Dan", note: "" });
    const watcher = watchAccountLists(accountDb(dan), dan);

    try {
      await watcher.until((read) => homeListRows(dan, read, Date.now()).length === 2);

      await deleteRsvpList(accountDb(owner), friday.id);

      // The list's reads are refused at once. The account's own query can
      // go on holding the deleted RSVP until the server next answers it.
      const after = await watcher.until((read) => !(friday.id in read.lists));
      expect(friday.id in after.rsvps).toBe(false);
      expect(rowNames(dan, after)).toEqual(["Saturday"]);
      expect(watcher.failure()).toBeNull();
    } finally {
      watcher.stop();
    }
  });

  /**
   * Move a list's times into the past, around the rules: scheduled
   * `hoursAgo` hours back and opened an hour before that. Nobody RSVPs to
   * a list that is over, so the RSVPs go on first and the times move after.
   */
  const moveBack = (listId: string, hoursAgo: number) =>
    env().withSecurityRulesDisabled((unrestricted) =>
      updateDoc(doc(modularFirestore(unrestricted), "rsvpLists", listId), {
        scheduledAt: minutesFromNow(-hoursAgo * 60),
        opensAt: minutesFromNow(-(hoursAgo + 1) * 60),
      }),
    );

  it("reads only the list itself once it is 24 hours past its scheduled time, and still reads a newer one whole", async () => {
    const lastNight = await openList("Last night");
    const lastWeek = await openList("Last week");
    for (const list of [lastNight, lastWeek]) {
      await sendListRsvp(accountDb(dan), list.id, dan, { name: "Dan", note: "" });
      await postListNotice(accountDb(owner), list.id, "Thanks for coming.");
    }
    await moveBack(lastNight.id, 1);
    await moveBack(lastWeek.id, 25);
    const watcher = watchAccountLists(accountDb(dan), dan);

    try {
      await watcher.until(
        (read) =>
          lastWeek.id in read.lists &&
          read.rsvps[lastNight.id]?.length === 1 &&
          read.notices[lastNight.id]?.length === 1,
      );
      // One more answer about the old list, by which time a read of its
      // RSVPs or notices would have answered too.
      await saveListSettings(
        accountDb(owner),
        lastWeek,
        { ...listSetupOf(lastWeek), name: "Last week, renamed" },
        "America/New_York",
      );

      const after = await watcher.until(
        (read) => read.lists[lastWeek.id]?.name === "Last week, renamed",
      );
      expect(lastWeek.id in after.rsvps).toBe(false);
      expect(lastWeek.id in after.notices).toBe(false);
      expect(rowNames(dan, after)).toEqual(["Last night"]);
      expect(watcher.failure()).toBeNull();
    } finally {
      watcher.stop();
    }
  });

  it("lets go of a list's RSVPs and notices when its document comes to say it is 24 hours past", async () => {
    const friday = await openList("Friday");
    await sendListRsvp(accountDb(dan), friday.id, dan, { name: "Dan", note: "" });
    await postListNotice(accountDb(owner), friday.id, "Thanks for coming.");
    const watcher = watchAccountLists(accountDb(dan), dan);

    try {
      await watcher.until(
        (read) => read.rsvps[friday.id]?.length === 1 && read.notices[friday.id]?.length === 1,
      );

      await moveBack(friday.id, 25);

      const after = await watcher.until(
        (read) => !(friday.id in read.rsvps) && !(friday.id in read.notices),
      );
      expect(friday.id in after.lists).toBe(true);
      expect(after.mine).toHaveLength(1);
      expect(watcher.failure()).toBeNull();
    } finally {
      watcher.stop();
    }
  });

  it("marks a new notice until the account opens the list's page", async () => {
    const friday = await openList("Friday");
    await sendListRsvp(accountDb(dan), friday.id, dan, { name: "Dan", note: "" });
    const danDb = accountDb(dan);
    const watcher = watchAccountLists(danDb, dan);
    const unread = (read: AccountLists) => homeListRows(dan, read, Date.now())[0]?.unread;

    try {
      const before = await watcher.until((read) => homeListRows(dan, read, Date.now()).length === 1);
      expect(unread(before)).toBe(false);

      await postListNotice(accountDb(owner), friday.id, "Bring a dark and a light shirt.");
      await postListNotice(accountDb(owner), friday.id, "We moved to 7:30.");
      // Home reads the newest notice alone, however many the list has.
      const marked = await watcher.until(
        (read) => read.notices[friday.id]?.[0]?.body === "We moved to 7:30.",
      );
      expect(marked.notices[friday.id]).toHaveLength(1);
      expect(unread(marked)).toBe(true);

      await markListNoticesRead(danDb, friday.id, dan);
      // Until the server answers, the time read is this phone's estimate,
      // which can fall before the notice. The server's own time does not.
      const read = await watcher.until((latest) => unread(latest) === false);
      expect(read.mine[0].noticesReadAt).toBeDefined();
    } finally {
      watcher.stop();
    }
  });
});
