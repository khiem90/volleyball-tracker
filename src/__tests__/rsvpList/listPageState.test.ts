import { describe, expect, it } from "vitest";
import {
  listPageState,
  listShutMessage,
  listTakesRsvps,
  refusedListRsvpMessage,
  type ListPageState,
} from "@/lib/rsvpList";
import type { RsvpList } from "@/types/game";

// Friday 6 November 2026, 19:00 in UTC, with RSVPs opening the evening before.
const friday7pm = Date.UTC(2026, 10, 6, 19, 0);
const thursday6pm = Date.UTC(2026, 10, 5, 18, 0);
const MINUTE = 60_000;

const list = (changes: Partial<RsvpList> = {}): RsvpList => ({
  id: "list-1",
  ownerId: "owner-uid",
  name: "Friday pickup",
  takes: "people",
  capacity: 12,
  scheduledAt: friday7pm,
  scheduledZone: "America/New_York",
  opensAt: thursday6pm,
  enabled: true,
  closed: false,
  tournamentIds: [],
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
  ...changes,
});

describe("listPageState", () => {
  const notOpen: ListPageState = { kind: "not_open", opensAt: thursday6pm };

  // Each moment against the two times, then the state with the link on and
  // the list not closed, with it closed, and with the link off.
  it.each<[string, number, ListPageState, ListPageState]>([
    ["a minute before the open time", thursday6pm - MINUTE, notOpen, { kind: "closed" }],
    ["a millisecond before the open time", thursday6pm - 1, notOpen, { kind: "closed" }],
    ["at the open time", thursday6pm, { kind: "open" }, { kind: "closed" }],
    ["between the two times", friday7pm - MINUTE, { kind: "open" }, { kind: "closed" }],
    ["a millisecond before the scheduled time", friday7pm - 1, { kind: "open" }, { kind: "closed" }],
    ["at the scheduled time", friday7pm, { kind: "over" }, { kind: "over" }],
    ["a day after the scheduled time", friday7pm + 1440 * MINUTE, { kind: "over" }, { kind: "over" }],
  ])("reads %s", (_moment, now, whenOpen, whenClosed) => {
    expect(listPageState(list(), now)).toEqual(whenOpen);
    expect(listPageState(list({ closed: true }), now)).toEqual(whenClosed);
    expect(listPageState(list({ enabled: false }), now)).toEqual({ kind: "link_off" });
    expect(listPageState(list({ enabled: false, closed: true }), now)).toEqual({ kind: "link_off" });
  });

  it("is full once the RSVPs reach capacity, and open again when capacity goes up", () => {
    const now = friday7pm - MINUTE;
    expect(listPageState(list({ capacity: 2 }), now, 1)).toEqual({ kind: "open" });
    expect(listPageState(list({ capacity: 2 }), now, 2)).toEqual({ kind: "full" });
    expect(listPageState(list({ capacity: 2 }), now, 5)).toEqual({ kind: "full" });
    expect(listPageState(list({ capacity: 6 }), now, 5)).toEqual({ kind: "open" });
  });

  it("counts down on a full list before the open time, and is over when full at the scheduled time", () => {
    expect(listPageState(list({ capacity: 1 }), thursday6pm - 1, 1)).toEqual(notOpen);
    expect(listPageState(list({ capacity: 1 }), friday7pm, 1)).toEqual({ kind: "over" });
  });

  it("reads a list with the link on and no open time as not open, since the rules never store one", () => {
    const stored = list();
    delete stored.opensAt;
    expect(listPageState(stored, friday7pm - MINUTE)).toEqual({
      kind: "not_open",
      opensAt: Number.POSITIVE_INFINITY,
    });
  });
});

describe("listTakesRsvps", () => {
  it("takes RSVPs before the open time, once open, and onto the waitlist when full", () => {
    expect(listTakesRsvps({ kind: "not_open", opensAt: thursday6pm })).toBe(true);
    expect(listTakesRsvps({ kind: "open" })).toBe(true);
    expect(listTakesRsvps({ kind: "full" })).toBe(true);
  });

  it("takes none once the list is closed or over, or the link is off", () => {
    expect(listTakesRsvps({ kind: "closed" })).toBe(false);
    expect(listTakesRsvps({ kind: "over" })).toBe(false);
    expect(listTakesRsvps({ kind: "link_off" })).toBe(false);
  });
});

describe("listShutMessage", () => {
  it("says why a list takes no RSVPs: closed, over, or the link off", () => {
    expect(listShutMessage({ kind: "closed" })).toBe("The owner has closed RSVPs.");
    expect(listShutMessage({ kind: "over" })).toBe("This list is over.");
    expect(listShutMessage({ kind: "link_off" })).toBe("This RSVP link is off.");
  });

  it("says nothing about a list that takes RSVPs", () => {
    expect(listShutMessage({ kind: "not_open", opensAt: thursday6pm })).toBeNull();
    expect(listShutMessage({ kind: "open" })).toBeNull();
    expect(listShutMessage({ kind: "full" })).toBeNull();
  });
});

describe("refusedListRsvpMessage", () => {
  it("names a closed list, a list that is over, and a link turned off", () => {
    const now = friday7pm - MINUTE;
    expect(refusedListRsvpMessage(list({ closed: true }), now)).toBe("The owner has closed RSVPs.");
    expect(refusedListRsvpMessage(list(), friday7pm)).toBe("This list is over.");
    expect(refusedListRsvpMessage(list({ enabled: false }), now)).toBe("This RSVP link is off.");
  });

  it("reads a list the account can no longer read as the link off", () => {
    expect(refusedListRsvpMessage(null, friday7pm - MINUTE)).toBe("This RSVP link is off.");
  });

  it("says not open yet before the open time", () => {
    expect(refusedListRsvpMessage(list(), thursday6pm - MINUTE)).toBe("Not open yet");
  });

  it("says not open yet when the server refused a tap this phone's clock thought was just past the open time", () => {
    expect(refusedListRsvpMessage(list(), thursday6pm + 2000)).toBe("Not open yet");
    expect(refusedListRsvpMessage(list({ capacity: 1 }), thursday6pm + 2000)).toBe("Not open yet");
  });

  it("says the list is over when the server refused a tap this phone's clock thought was just before the scheduled time", () => {
    expect(refusedListRsvpMessage(list(), friday7pm - 2000)).toBe("This list is over.");
  });
});
