import { describe, expect, it } from "vitest";
import { NOT_OPEN_YET, refusedRsvpMessage, rsvpPageState, splitRsvps, standingIn } from "@/lib/rsvp";
import type { Rsvp, RsvpSettings, Tournament, TournamentStatus } from "@/types/game";

/** An RSVP that arrived `second` seconds and `nanos` nanoseconds into the epoch. */
const arrived = (id: string, second: number, nanos = 0): Rsvp => ({
  id,
  uid: id,
  name: id.toUpperCase(),
  createdAt: { seconds: second, nanoseconds: nanos },
});

const ids = (rsvps: { id: string }[]) => rsvps.map((r) => r.id);

describe("splitRsvps", () => {
  it("has nobody confirmed or waiting on an empty list", () => {
    expect(splitRsvps([], 12)).toEqual({ confirmed: [], waitlisted: [] });
  });

  it("confirms everyone in arrival order while the list is under capacity, whatever order they come in", () => {
    const list = splitRsvps([arrived("cat", 30), arrived("ann", 10), arrived("bob", 20)], 4);
    expect(ids(list.confirmed)).toEqual(["ann", "bob", "cat"]);
    expect(list.confirmed.map((r) => r.position)).toEqual([1, 2, 3]);
    expect(list.waitlisted).toEqual([]);
  });

  it("confirms exactly the capacity when the list is at it", () => {
    const list = splitRsvps([arrived("ann", 10), arrived("bob", 20)], 2);
    expect(ids(list.confirmed)).toEqual(["ann", "bob"]);
    expect(list.waitlisted).toEqual([]);
  });

  it("puts everyone past capacity on the waitlist, numbered from one in arrival order", () => {
    const list = splitRsvps(
      [arrived("dee", 40), arrived("bob", 20), arrived("ann", 10), arrived("cat", 30)],
      2,
    );
    expect(ids(list.confirmed)).toEqual(["ann", "bob"]);
    expect(ids(list.waitlisted)).toEqual(["cat", "dee"]);
    expect(list.waitlisted.map((r) => r.position)).toEqual([1, 2]);
  });

  it("orders by the nanoseconds within a second, then breaks an exact tie by document id", () => {
    const list = splitRsvps(
      [arrived("zed", 10, 500), arrived("bob", 10, 900), arrived("amy", 10, 500)],
      1,
    );
    expect(ids(list.confirmed)).toEqual(["amy"]);
    expect(ids(list.waitlisted)).toEqual(["zed", "bob"]);
  });

  it("keeps each RSVP's own fields beside its position", () => {
    const [first] = splitRsvps([{ ...arrived("ann", 10), note: "Late" }], 1).confirmed;
    expect(first).toEqual({ ...arrived("ann", 10), note: "Late", position: 1 });
  });
});

describe("standingIn", () => {
  const four = [arrived("ann", 10), arrived("bob", 20), arrived("cat", 30), arrived("dee", 40)];

  it("is not on the list for an empty list, and for an account that has not RSVP'd", () => {
    expect(standingIn(splitRsvps([], 2), "ann")).toEqual({ kind: "none" });
    expect(standingIn(splitRsvps(four, 2), "eve")).toEqual({ kind: "none" });
  });

  it("is not on the list without an account", () => {
    expect(standingIn(splitRsvps(four, 2), null)).toEqual({ kind: "none" });
  });

  it("is in, at the account's place among the confirmed", () => {
    expect(standingIn(splitRsvps(four, 2), "bob")).toEqual({ kind: "confirmed", position: 2 });
    expect(standingIn(splitRsvps(four, 4), "dee")).toEqual({ kind: "confirmed", position: 4 });
  });

  it("is waiting at position n, counted from the first person waiting", () => {
    expect(standingIn(splitRsvps(four, 2), "cat")).toEqual({ kind: "waitlisted", position: 1 });
    expect(standingIn(splitRsvps(four, 2), "dee")).toEqual({ kind: "waitlisted", position: 2 });
  });

  it("finds the account by its uid, not by the document's id", () => {
    const mine = { ...arrived("doc-1", 10), uid: "ann-uid" };
    expect(standingIn(splitRsvps([mine], 1), "ann-uid")).toEqual({ kind: "confirmed", position: 1 });
  });
});

describe("a full night", () => {
  const opensAt = Date.UTC(2026, 10, 5, 18, 0);
  const night = (
    changes: { status?: TournamentStatus; rsvp?: Partial<RsvpSettings> } = {},
  ): Pick<Tournament, "status" | "rsvp"> => ({
    status: changes.status ?? "draft",
    rsvp: { enabled: true, capacity: 2, opensAt, closed: false, ...changes.rsvp },
  });

  it("is open with spots left, and full with the waitlist open once the list reaches capacity", () => {
    expect(rsvpPageState(night(), opensAt, 1)).toEqual({ kind: "open" });
    expect(rsvpPageState(night(), opensAt, 2)).toEqual({ kind: "full" });
    expect(rsvpPageState(night(), opensAt, 5)).toEqual({ kind: "full" });
  });

  it("is open again once capacity goes up past the list", () => {
    expect(rsvpPageState(night({ rsvp: { capacity: 3 } }), opensAt, 2)).toEqual({ kind: "open" });
  });

  it("reads as open without a count, as it did before the list was known", () => {
    expect(rsvpPageState(night(), opensAt)).toEqual({ kind: "open" });
  });

  it("still counts down, reads closed, live, or completed whatever the count", () => {
    expect(rsvpPageState(night(), opensAt - 1, 2)).toEqual({ kind: "not_open", opensAt });
    expect(rsvpPageState(night({ rsvp: { closed: true } }), opensAt, 2)).toEqual({ kind: "closed" });
    expect(rsvpPageState(night({ status: "live" }), opensAt, 2)).toEqual({ kind: "live" });
    expect(rsvpPageState(night({ status: "completed" }), opensAt, 2)).toEqual({ kind: "completed" });
  });

  it("reads a refused RSVP to a full night as not open yet, since a full night still takes RSVPs", () => {
    expect(refusedRsvpMessage({ kind: "full" })).toBe(NOT_OPEN_YET);
  });
});

describe("starting the tournament", () => {
  it("closes the list by its status alone, with the RSVP settings left as they were", () => {
    const rsvp: RsvpSettings = { enabled: true, capacity: 12, opensAt: 0, closed: false };
    expect(rsvpPageState({ status: "live", rsvp }, 1, 0)).toEqual({ kind: "live" });
  });
});
