import { describe, expect, it } from "vitest";
import {
  deleteListDescription,
  firstListProblem,
  listLocks,
  listSetupOf,
  listSetupProblems,
} from "@/lib/rsvpList";
import type { RsvpList } from "@/types/game";

describe("deleteListDescription", () => {
  it("names how many RSVPs go with the list when there are any", () => {
    expect(deleteListDescription("Friday pickup", 14)).toBe(
      'This removes "Friday pickup" and the 14 RSVPs on it. It cannot be undone.',
    );
    expect(deleteListDescription("Friday pickup", 1)).toBe(
      'This removes "Friday pickup" and the 1 RSVP on it. It cannot be undone.',
    );
  });

  it("says nothing of RSVPs for a list with nobody on it", () => {
    expect(deleteListDescription("Friday pickup", 0)).toBe(
      'This removes "Friday pickup". It cannot be undone.',
    );
  });

  it("warns without a number while the RSVPs could not be counted", () => {
    expect(deleteListDescription("Friday pickup", null)).toBe(
      'This removes "Friday pickup" and every RSVP on it. It cannot be undone.',
    );
  });
});

// Friday 6 November 2026, 19:00 in UTC.
const friday7pm = Date.UTC(2026, 10, 6, 19, 0);
const thursday6pm = Date.UTC(2026, 10, 5, 18, 0);
const thursdayNoon = Date.UTC(2026, 10, 5, 12, 0);

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

describe("listSetupProblems against what the list already holds", () => {
  it("refuses a capacity below the confirmed count, and takes one at it", () => {
    const stored = list({ capacity: 8 });
    const locks = listLocks(stored, 5, thursdayNoon);
    const setup = listSetupOf(stored);

    expect(listSetupProblems({ ...setup, capacity: 4 }, locks)).toEqual({
      capacity: "5 RSVPs are confirmed, so capacity cannot go below 5.",
    });
    expect(listSetupProblems({ ...setup, capacity: 5 }, locks)).toEqual({});
    expect(listSetupProblems({ ...setup, capacity: 20 }, locks)).toEqual({});
  });

  it("counts as confirmed only the RSVPs the stored capacity holds, not the waitlist", () => {
    const stored = list({ capacity: 2 });
    const setup = listSetupOf(stored);

    // Five have RSVP'd to a list of two, so two are confirmed and three wait.
    expect(listSetupProblems({ ...setup, capacity: 1 }, listLocks(stored, 5, thursdayNoon))).toEqual({
      capacity: "2 RSVPs are confirmed, so capacity cannot go below 2.",
    });
    expect(listSetupProblems({ ...setup, capacity: 1 }, listLocks(stored, 1, thursdayNoon))).toEqual({});
  });

  it("refuses a changed open time once the first RSVP has arrived, a held spot included", () => {
    const stored = list();
    const setup = listSetupOf(stored);
    const earlier = { ...setup, opensAt: thursdayNoon };
    const locked = { opensAt: "The list has RSVPs, so the open time cannot change." };

    expect(listSetupProblems(earlier, listLocks(stored, 0, thursdayNoon))).toEqual({});
    expect(listSetupProblems(earlier, listLocks(stored, 1, thursdayNoon))).toEqual(locked);
    expect(
      listSetupProblems({ ...setup, opensAt: null, enabled: false }, listLocks(stored, 1, thursdayNoon)),
    ).toEqual(locked);
    expect(listSetupProblems(setup, listLocks(stored, 1, thursdayNoon))).toEqual({});
  });

  it("refuses a change of by-person or by-team once the first RSVP has arrived, a held spot included", () => {
    const stored = list({ takes: "people" });
    const setup = listSetupOf(stored);
    const byTeam = { ...setup, takes: "teams" as const };
    const locked = {
      takes: "The list has RSVPs, so its by-person or by-team choice cannot change.",
    };

    expect(listSetupProblems(byTeam, listLocks(stored, 0, thursdayNoon))).toEqual({});
    expect(listSetupProblems(byTeam, listLocks(stored, 1, thursdayNoon))).toEqual(locked);
    expect(listSetupProblems(setup, listLocks(stored, 1, thursdayNoon))).toEqual({});
    expect(firstListProblem(listSetupProblems(byTeam, listLocks(stored, 1, thursdayNoon)))).toBe(
      locked.takes,
    );

    // A by-team list is held to its choice the same way.
    const teams = list({ takes: "teams" });
    expect(
      listSetupProblems({ ...listSetupOf(teams), takes: "people" }, listLocks(teams, 3, thursdayNoon)),
    ).toEqual(locked);
  });

  it("lets everything but the open time change on a list with RSVPs", () => {
    const stored = list();
    const changed = {
      ...listSetupOf(stored),
      name: "Friday at 7:30",
      capacity: 16,
      scheduledAt: friday7pm + 30 * 60_000,
    };

    expect(listSetupProblems(changed, listLocks(stored, 4, thursdayNoon))).toEqual({});
  });

  it("refuses any settings change on a list that is over, from the scheduled time on", () => {
    const stored = list();
    const setup = listSetupOf(stored);
    const over = { over: "This list is over, so its settings cannot change." };
    const aMinuteBefore = listLocks(stored, 0, friday7pm - 60_000);
    const atTheTime = listLocks(stored, 0, friday7pm);

    for (const change of [
      { name: "Friday at 7:30" },
      { takes: "teams" as const },
      { capacity: 16 },
      { scheduledAt: friday7pm + 7 * 24 * 3_600_000 },
      { opensAt: thursdayNoon },
      { enabled: false },
    ]) {
      expect(listSetupProblems({ ...setup, ...change }, aMinuteBefore)).toEqual({});
      expect(listSetupProblems({ ...setup, ...change }, atTheTime)).toEqual(over);
    }
  });

  it("names only the list being over when a change to it has other problems too", () => {
    const stored = list({ capacity: 8 });
    const broken = { ...listSetupOf(stored), name: "", capacity: 2, opensAt: thursdayNoon };
    const problems = listSetupProblems(broken, listLocks(stored, 5, friday7pm + 60_000));

    expect(problems).toEqual({ over: "This list is over, so its settings cannot change." });
    expect(firstListProblem(problems)).toBe("This list is over, so its settings cannot change.");
  });

  it("finds nothing wrong with the stored settings of a list that is over", () => {
    const stored = list();

    expect(listSetupProblems(listSetupOf(stored), listLocks(stored, 3, friday7pm + 60_000))).toEqual({});
  });

  it("refuses any settings change while the RSVPs are unread, since nobody knows what the list holds", () => {
    const stored = list({ capacity: 8 });
    const setup = listSetupOf(stored);
    const unread = { unread: "The RSVPs have not loaded, so the settings cannot be saved yet." };
    const locks = listLocks(stored, null, thursdayNoon);

    for (const change of [
      { name: "Friday at 7:30" },
      { takes: "teams" as const },
      { capacity: 2 },
      { capacity: 16 },
      { opensAt: thursdayNoon },
      { enabled: false },
    ]) {
      expect(listSetupProblems({ ...setup, ...change }, locks)).toEqual(unread);
    }
    expect(firstListProblem(listSetupProblems({ ...setup, name: "" }, locks))).toBe(unread.unread);
    expect(listSetupProblems(setup, locks)).toEqual({});
    // Once they are read, with nobody on the list, the same changes go through.
    expect(listSetupProblems({ ...setup, capacity: 2 }, listLocks(stored, 0, thursdayNoon))).toEqual({});
  });

  it("never counts a list with no scheduled time as over", () => {
    const stored = list({ enabled: false });
    delete stored.scheduledAt;
    delete stored.scheduledZone;
    const renamed = { ...listSetupOf(stored), name: "Some Friday" };

    expect(listSetupProblems(renamed, listLocks(stored, 0, friday7pm * 2))).toEqual({});
  });
});
