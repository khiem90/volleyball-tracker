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
import { millisOf } from "@/lib/rsvp";
import type { ListSetup } from "@/lib/rsvpList";
import {
  createRsvpList,
  deleteListNotice,
  markListNoticesRead,
  postListNotice,
  sendListRsvp,
  subscribeToListNotices,
  subscribeToListRsvps,
} from "@/lib/rsvpListData";
import type { Notice, Rsvp, RsvpList } from "@/types/game";
import { describeFirestoreRules, minutesFromNow, modularFirestore, when } from "../rules/emulator";

const owner = "owner-uid";
const dan = "dan-uid";

describeFirestoreRules("Notices on a list on Firestore", (env) => {
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

  /** The first delivery of a list's notices that satisfies `ready`. */
  const noticesWhere = (db: Firestore, listId: string, ready: (notices: Notice[]) => boolean) =>
    when<Notice[]>((onChange, onError) => subscribeToListNotices(db, listId, onChange, onError), ready);

  /** The first delivery of a list's RSVPs that satisfies `ready`. */
  const rsvpsWhere = (db: Firestore, listId: string, ready: (rsvps: Rsvp[]) => boolean) =>
    when<Rsvp[]>((onChange, onError) => subscribeToListRsvps(db, listId, onChange, onError), ready);

  /** A list's notice documents as stored, read around the rules. The path is spelled out, not taken from the module. */
  const storedNotices = async (listId: string): Promise<Record<string, unknown>[]> => {
    const found: Record<string, unknown>[] = [];
    await env().withSecurityRulesDisabled(async (unrestricted) => {
      const snapshot = await getDocs(
        collection(modularFirestore(unrestricted), "rsvpLists", listId, "notices"),
      );
      for (const d of snapshot.docs) found.push(d.data());
    });
    return found;
  };

  it("stores a notice under the list with its body, trimmed, and the server's posting time", async () => {
    const list = await openList();
    const before = Date.now();

    await postListNotice(accountDb(owner), list.id, "  We moved to 7:30.  ");

    const stored = await storedNotices(list.id);
    expect(stored).toEqual([{ body: "We moved to 7:30.", createdAt: expect.anything() }]);
    const postedAt = (stored[0].createdAt as Timestamp).toMillis();
    expect(postedAt).toBeGreaterThanOrEqual(before - 1000);
    expect(postedAt).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it("delivers the notices newest first to a person on the list", async () => {
    const list = await openList();
    await sendListRsvp(accountDb(dan), list.id, dan, { name: "Dan", note: "" }, "people");
    await postListNotice(accountDb(owner), list.id, "Bring a dark and a light shirt.");
    await postListNotice(accountDb(owner), list.id, "We moved to 7:30.");

    const notices = await noticesWhere(accountDb(dan), list.id, (all) => all.length === 2);

    expect(notices.map((notice) => notice.body)).toEqual([
      "We moved to 7:30.",
      "Bring a dark and a light shirt.",
    ]);
    expect(notices.every((notice) => notice.id.length > 0)).toBe(true);
  });

  it("stops delivering to an account once the link is off, and keeps delivering to the owner", async () => {
    const list = await openList({ enabled: false });
    await postListNotice(accountDb(owner), list.id, "We moved to 7:30.");

    await expect(noticesWhere(accountDb(dan), list.id, () => true)).rejects.toThrow();
    const notices = await noticesWhere(accountDb(owner), list.id, (all) => all.length === 1);
    expect(notices[0].body).toBe("We moved to 7:30.");
  });

  it("refuses a notice from anyone but the owner, and an empty or overlong one before anything is written", async () => {
    const list = await openList();
    await sendListRsvp(accountDb(dan), list.id, dan, { name: "Dan", note: "" }, "people");

    await expect(postListNotice(accountDb(dan), list.id, "Courts are free.")).rejects.toThrow();
    await expect(postListNotice(accountDb(owner), list.id, "   ")).rejects.toThrow(
      "Write the notice first.",
    );
    await expect(postListNotice(accountDb(owner), list.id, "x".repeat(501))).rejects.toThrow(
      "Keep the notice to 500 characters.",
    );

    expect(await storedNotices(list.id)).toEqual([]);
  });

  it("lets the owner post after the scheduled time has passed", async () => {
    const list = await openList({ opensAt: minutesFromNow(-60), scheduledAt: minutesFromNow(-1) });

    await postListNotice(accountDb(owner), list.id, "Courts are running late.");

    const notices = await noticesWhere(accountDb(dan), list.id, (all) => all.length === 1);
    expect(notices[0].body).toBe("Courts are running late.");
  });

  it("takes a deleted notice off the page for a person on the list", async () => {
    const list = await openList();
    await sendListRsvp(accountDb(dan), list.id, dan, { name: "Dan", note: "" }, "people");
    await postListNotice(accountDb(owner), list.id, "We moved to 7:30.");
    await postListNotice(accountDb(owner), list.id, "We moved to 6:30.");
    const [mistake] = await noticesWhere(accountDb(owner), list.id, (all) => all.length === 2);

    await deleteListNotice(accountDb(owner), list.id, mistake.id);

    const left = await noticesWhere(accountDb(dan), list.id, (all) => all.length === 1);
    expect(left.map((notice) => notice.body)).toEqual(["We moved to 7:30."]);
    await expect(deleteListNotice(accountDb(dan), list.id, left[0].id)).rejects.toThrow();
  });

  it("records on the viewer's own RSVP when they last read the notices, at the server's time", async () => {
    const list = await openList();
    await sendListRsvp(accountDb(dan), list.id, dan, { name: "Dan", note: "Late" }, "people");
    await postListNotice(accountDb(owner), list.id, "We moved to 7:30.");
    const before = Date.now();

    await markListNoticesRead(accountDb(dan), list.id, dan);

    const [mine] = await rsvpsWhere(accountDb(dan), list.id, (all) => !!all[0]?.noticesReadAt);
    expect(mine).toMatchObject({ uid: dan, name: "Dan", note: "Late" });
    const readAt = millisOf(mine.noticesReadAt!);
    expect(readAt).toBeGreaterThanOrEqual(before - 1000);
    expect(readAt).toBeLessThanOrEqual(Date.now() + 1000);
    expect(readAt).toBeGreaterThanOrEqual(millisOf(mine.createdAt));
  });

  it("still records the read time once the scheduled time has passed", async () => {
    const list = await openList({ scheduledAt: minutesFromNow(60) });
    await sendListRsvp(accountDb(dan), list.id, dan, { name: "Dan", note: "" }, "people");
    await env().withSecurityRulesDisabled((unrestricted) =>
      updateDoc(doc(modularFirestore(unrestricted), "rsvpLists", list.id), {
        opensAt: minutesFromNow(-60),
        scheduledAt: minutesFromNow(-1),
      }),
    );
    await postListNotice(accountDb(owner), list.id, "Courts are running late.");

    await markListNoticesRead(accountDb(dan), list.id, dan);

    const [mine] = await rsvpsWhere(accountDb(dan), list.id, (all) => !!all[0]?.noticesReadAt);
    expect(mine.uid).toBe(dan);
  });

  it("refuses the read time for an account with no RSVP on the list", async () => {
    const list = await openList();

    await expect(markListNoticesRead(accountDb(dan), list.id, dan)).rejects.toThrow();
  });
});
