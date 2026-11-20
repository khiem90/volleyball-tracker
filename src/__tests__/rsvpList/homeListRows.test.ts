import { describe, expect, it } from "vitest";
import { homeListRows, type AccountListRsvp, type AccountLists } from "@/lib/rsvpList";
import type { Notice, Rsvp, RsvpList } from "@/types/game";

// Friday 6 November 2026, 19:00 in UTC, looked at on the Tuesday before.
const friday7pm = Date.UTC(2026, 10, 6, 19, 0);
const DAY = 86_400_000;
const tuesday = friday7pm - 3 * DAY;
const me = "me-uid";

const listOf = (id: string, changes: Partial<RsvpList> = {}): RsvpList => ({
  id,
  ownerId: "owner-uid",
  name: `List ${id}`,
  takes: "people",
  capacity: 2,
  scheduledAt: friday7pm,
  scheduledZone: "America/New_York",
  opensAt: friday7pm - 7 * DAY,
  enabled: true,
  closed: false,
  tournamentIds: [],
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
  ...changes,
});

/** A server time `seconds` after Tuesday, to the nanosecond. */
const at = (seconds: number, nanoseconds = 0) => ({ seconds: tuesday / 1000 + seconds, nanoseconds });

const rsvpBy = (uid: string, seconds: number, changes: Partial<Rsvp> = {}): Rsvp => ({
  id: uid,
  uid,
  name: uid,
  createdAt: at(seconds),
  ...changes,
});

const notice = (id: string, seconds: number, nanoseconds = 0): Notice => ({
  id,
  body: `Notice ${id}`,
  createdAt: at(seconds, nanoseconds),
});

/**
 * What Home has read: each list with its RSVPs and its notices, and the
 * account's own RSVP picked out of each list.
 */
const accountLists = (
  ...entries: { list: RsvpList; rsvps: Rsvp[]; notices?: Notice[] }[]
): AccountLists => ({
  mine: entries.flatMap(({ list, rsvps }) =>
    rsvps.filter((r) => r.uid === me).map((r): AccountListRsvp => ({ ...r, listId: list.id })),
  ),
  lists: Object.fromEntries(entries.map((e) => [e.list.id, e.list])),
  rsvps: Object.fromEntries(entries.map((e) => [e.list.id, e.rsvps])),
  notices: Object.fromEntries(entries.filter((e) => e.notices).map((e) => [e.list.id, e.notices!])),
});

describe("homeListRows", () => {
  it("lists a list the account is on with its name, scheduled time, standing, and the list's page", () => {
    const list = listOf("friday");

    const rows = homeListRows(me, accountLists({ list, rsvps: [rsvpBy("dan", 1), rsvpBy(me, 2)] }), tuesday);

    expect(rows).toEqual([
      { list, standing: { kind: "confirmed", position: 2 }, unread: false, href: "/rsvp/friday" },
    ]);
    expect(rows[0].list).toMatchObject({ name: "List friday", scheduledAt: friday7pm });
  });

  it("keeps a list until 24 hours after its scheduled time, and not a millisecond longer", () => {
    const read = accountLists({ list: listOf("friday"), rsvps: [rsvpBy(me, 1)] });
    const ids = (now: number) => homeListRows(me, read, now).map((row) => row.list.id);

    expect(ids(friday7pm - 1)).toEqual(["friday"]);
    // The list is over from here on, and stays while people play.
    expect(ids(friday7pm)).toEqual(["friday"]);
    expect(ids(friday7pm + DAY - 1)).toEqual(["friday"]);
    expect(ids(friday7pm + DAY)).toEqual([]);
    expect(ids(friday7pm + 7 * DAY)).toEqual([]);
  });

  it("leaves out a list whose link is off, one that cannot be read, and one whose RSVPs have not arrived", () => {
    const read = accountLists(
      { list: listOf("off", { enabled: false }), rsvps: [rsvpBy(me, 1)] },
      { list: listOf("refused"), rsvps: [rsvpBy(me, 1)] },
      { list: listOf("waiting"), rsvps: [rsvpBy(me, 1)] },
      { list: listOf("fine"), rsvps: [rsvpBy(me, 1)] },
    );
    delete read.lists.refused;
    delete read.rsvps.waiting;

    expect(homeListRows(me, read, tuesday).map((row) => row.list.id)).toEqual(["fine"]);
  });

  it("leaves out a list the account is not on, even while its RSVPs still show the old one", () => {
    const read = accountLists(
      { list: listOf("never"), rsvps: [rsvpBy("dan", 1)] },
      // The account withdrew, and the list's RSVPs have not caught up yet.
      { list: listOf("stale"), rsvps: [rsvpBy(me, 1)] },
    );
    read.mine = [];

    expect(homeListRows(me, read, tuesday)).toEqual([]);
  });

  it("shows a waiting account its place on the waitlist, counting held spots and arrival ties as the list does", () => {
    const heldSpot: Rsvp = { ...rsvpBy("held-1", 2), uid: null, held: true };
    const rsvps = [
      rsvpBy("dan", 1),
      heldSpot,
      rsvpBy("eve", 3),
      // The same instant as Eve. The id breaks the tie, and "eve" sorts before "me-uid".
      rsvpBy(me, 3),
    ];

    const [row] = homeListRows(me, accountLists({ list: listOf("full"), rsvps }), tuesday);

    expect(row.standing).toEqual({ kind: "waitlisted", position: 2 });
  });

  it("marks a notice posted after the account last opened the list's page, to the nanosecond", () => {
    const read = at(100, 500);
    const unread = (notices: Notice[] | undefined, noticesReadAt: Rsvp["noticesReadAt"] = read) => {
      const [row] = homeListRows(
        me,
        accountLists({ list: listOf("n"), rsvps: [rsvpBy(me, 1, { noticesReadAt })], notices }),
        tuesday,
      );
      return row.unread;
    };

    expect(unread([notice("new", 100, 501), notice("old", 50)])).toBe(true);
    // Newest first is how they arrive, but any order reads the same.
    expect(unread([notice("old", 50), notice("new", 101)])).toBe(true);
    expect(unread([notice("seen", 100, 500)])).toBe(false);
    expect(unread([notice("old", 99, 999_999_999)])).toBe(false);
    expect(unread([])).toBe(false);
    // Notices that have not arrived yet mark nothing.
    expect(unread(undefined)).toBe(false);
  });

  it("marks any notice as new to an account that has never opened the page since RSVPing", () => {
    const [row] = homeListRows(
      me,
      accountLists({ list: listOf("n"), rsvps: [rsvpBy(me, 1)], notices: [notice("first", 0)] }),
      tuesday,
    );

    expect(row.unread).toBe(true);
  });

  it("puts the soonest list first, and a list without a scheduled time last", () => {
    const rows = homeListRows(
      me,
      accountLists(
        { list: listOf("unscheduled", { scheduledAt: undefined }), rsvps: [rsvpBy(me, 1)] },
        { list: listOf("later", { scheduledAt: friday7pm + DAY }), rsvps: [rsvpBy(me, 1)] },
        { list: listOf("sooner-b"), rsvps: [rsvpBy(me, 1)] },
        { list: listOf("sooner-a"), rsvps: [rsvpBy(me, 1)] },
      ),
      tuesday,
    );

    expect(rows.map((row) => row.list.id)).toEqual(["sooner-a", "sooner-b", "later", "unscheduled"]);
  });
});
