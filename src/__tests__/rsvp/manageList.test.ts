import { describe, expect, it } from "vitest";
import { listSoFar, rsvpProblems, type RsvpSetup } from "@/lib/rsvp";
import { deleteTournamentDescription, showsRsvpTab } from "@/lib/console";
import type { Rsvp } from "@/types/game";

// Friday 6 November 2026, 19:00 in UTC, and the Thursday before at 18:00.
const friday7pm = Date.UTC(2026, 10, 6, 19, 0);
const thursday6pm = Date.UTC(2026, 10, 5, 18, 0);

const setup = (changes: Partial<RsvpSetup> = {}): RsvpSetup => ({
  enabled: true,
  capacity: 12,
  scheduledAt: friday7pm,
  opensAt: thursday6pm,
  ...changes,
});

const arrived = (id: string, second: number, uid: string | null = id): Rsvp => ({
  id,
  uid,
  name: id.toUpperCase(),
  createdAt: { seconds: second, nanoseconds: 0 },
});

describe("rsvpProblems against the list so far", () => {
  const emptyList = { confirmed: 0, arrivals: 0, storedOpensAt: thursday6pm };

  it("finds nothing wrong while nobody has RSVP'd, whatever the capacity and open time", () => {
    expect(rsvpProblems(setup({ capacity: 1, opensAt: thursday6pm - 60_000 }), emptyList)).toEqual({});
  });

  it("refuses a capacity below the confirmed count, and says how many are confirmed", () => {
    const list = { confirmed: 8, arrivals: 10, storedOpensAt: thursday6pm };
    expect(rsvpProblems(setup({ capacity: 7 }), list)).toEqual({
      capacity: "8 people are confirmed, so capacity cannot go below 8.",
    });
    expect(rsvpProblems(setup({ capacity: 8 }), list)).toEqual({});
    expect(rsvpProblems(setup({ capacity: 20 }), list)).toEqual({});
  });

  it("says a capacity below one first, and holds the floor with the link off too", () => {
    expect(
      rsvpProblems(setup({ capacity: 0 }), { confirmed: 1, arrivals: 1, storedOpensAt: thursday6pm }),
    ).toEqual({ capacity: "Capacity must be at least 1." });
    expect(
      rsvpProblems(setup({ capacity: 1, enabled: false }), {
        confirmed: 2,
        arrivals: 2,
        storedOpensAt: thursday6pm,
      }),
    ).toEqual({ capacity: "2 people are confirmed, so capacity cannot go below 2." });
  });

  it("refuses a changed open time once the first RSVP has arrived, and lets an unchanged one stand", () => {
    const list = { confirmed: 1, arrivals: 1, storedOpensAt: thursday6pm };
    const locked = { opensAt: "People have RSVP'd, so the open time cannot change." };
    expect(rsvpProblems(setup({ opensAt: thursday6pm + 60_000 }), list)).toEqual(locked);
    expect(rsvpProblems(setup({ opensAt: null, enabled: false }), list)).toEqual(locked);
    expect(rsvpProblems(setup(), list)).toEqual({});
  });
});

describe("listSoFar", () => {
  it("counts a held spot as an arrival, so it locks the open time and holds the capacity", () => {
    const list = listSoFar({ rsvp: { enabled: true, capacity: 12, opensAt: thursday6pm, closed: false } }, [
      arrived("held-1", 10, null),
    ]);
    expect(list).toEqual({ confirmed: 1, arrivals: 1, storedOpensAt: thursday6pm });
  });

  it("counts the confirmed at the stored capacity and everyone who has arrived", () => {
    const rsvps = [arrived("ann", 10), arrived("bob", 20), arrived("cat", 30)];
    expect(
      listSoFar({ rsvp: { enabled: true, capacity: 2, opensAt: thursday6pm, closed: false } }, rsvps),
    ).toEqual({ confirmed: 2, arrivals: 3, storedOpensAt: thursday6pm });
  });

  it("reads a tournament from before RSVPs with no list as nothing to keep", () => {
    expect(listSoFar({}, [])).toEqual({ confirmed: 0, arrivals: 0, storedOpensAt: null });
  });
});

describe("deleteTournamentDescription", () => {
  it("names only the tournament and its matches while nobody is on the list", () => {
    expect(deleteTournamentDescription("Friday night", 0)).toBe(
      'This removes "Friday night" and every match in it. It cannot be undone.',
    );
  });

  it("names the number of people on the list when there are any", () => {
    expect(deleteTournamentDescription("Friday night", 1)).toBe(
      'This removes "Friday night", every match in it, and the 1 person on its RSVP list. It cannot be undone.',
    );
    expect(deleteTournamentDescription("Friday night", 14)).toBe(
      'This removes "Friday night", every match in it, and the 14 people on its RSVP list. It cannot be undone.',
    );
  });
});

describe("showsRsvpTab", () => {
  it("shows the tab to the owner while the tournament is a draft or live, with or without settings", () => {
    expect(showsRsvpTab("owner", "draft", false)).toBe(true);
    expect(showsRsvpTab("owner", "live", false)).toBe(true);
    expect(showsRsvpTab("owner", "live", true)).toBe(true);
  });

  it("shows the tab to the owner of a completed tournament that took RSVPs, and not of one that never did", () => {
    expect(showsRsvpTab("owner", "completed", true)).toBe(true);
    expect(showsRsvpTab("owner", "completed", false)).toBe(false);
  });

  it("never shows the tab to a scorer or a spectator", () => {
    for (const role of ["scorer", "spectator"] as const) {
      for (const status of ["draft", "live", "completed"] as const) {
        expect(showsRsvpTab(role, status, true)).toBe(false);
      }
    }
  });
});
