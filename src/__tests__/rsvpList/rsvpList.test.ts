import { describe, expect, it } from "vitest";
import {
  emptyListSetup,
  firstListProblem,
  isListOver,
  listSetupOf,
  listSetupProblems,
  ownListsInOrder,
  type ListSetup,
} from "@/lib/rsvpList";
import type { RsvpList } from "@/types/game";

// Friday 6 November 2026, 19:00 in UTC.
const friday7pm = Date.UTC(2026, 10, 6, 19, 0);
const thursday6pm = Date.UTC(2026, 10, 5, 18, 0);

const setup = (changes: Partial<ListSetup> = {}): ListSetup => ({
  name: "Friday pickup",
  takes: "people",
  capacity: 12,
  scheduledAt: friday7pm,
  opensAt: thursday6pm,
  enabled: true,
  ...changes,
});

const list = (id: string, changes: Partial<RsvpList> = {}): RsvpList => ({
  id,
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

/** A list as Firestore returns it when its times were never set. */
const untimed = (id: string, changes: Partial<RsvpList> = {}): RsvpList => {
  const { scheduledAt: _at, scheduledZone: _zone, opensAt: _opens, ...rest } = list(id, {
    enabled: false,
    ...changes,
  });
  return rest;
};

describe("emptyListSetup", () => {
  it("starts a new list by person, with the link off, no times, and a capacity that saves", () => {
    const setup = emptyListSetup();

    expect(setup).toEqual({
      name: "",
      takes: "people",
      capacity: 12,
      scheduledAt: null,
      opensAt: null,
      enabled: false,
    });
    expect(listSetupProblems({ ...setup, name: "Friday pickup" })).toEqual({});
  });
});

describe("listSetupOf", () => {
  it("reads a stored list's settings, with a time that was never set as null", () => {
    expect(listSetupOf(list("l1", { name: "Spring league", takes: "teams", capacity: 8 }))).toEqual({
      name: "Spring league",
      takes: "teams",
      capacity: 8,
      scheduledAt: friday7pm,
      opensAt: thursday6pm,
      enabled: true,
    });
    expect(listSetupOf(untimed("l2"))).toMatchObject({
      scheduledAt: null,
      opensAt: null,
      enabled: false,
    });
  });
});

describe("isListOver", () => {
  it("is over from the scheduled time on, and never without one", () => {
    expect(isListOver(list("l1"), friday7pm - 1)).toBe(false);
    expect(isListOver(list("l1"), friday7pm)).toBe(true);
    expect(isListOver(untimed("l2"), friday7pm * 2)).toBe(false);
  });
});

describe("ownListsInOrder", () => {
  const HOUR = 3_600_000;
  const now = friday7pm;

  it("puts upcoming lists first, soonest first, then the ones that are over, latest first", () => {
    const lists = [
      list("last-month", { scheduledAt: now - 700 * HOUR }),
      list("next-week", { scheduledAt: now + 168 * HOUR }),
      list("yesterday", { scheduledAt: now - 24 * HOUR }),
      list("tomorrow", { scheduledAt: now + 24 * HOUR }),
    ];

    const { upcoming, over } = ownListsInOrder(lists, now);

    expect(upcoming.map((l) => l.id)).toEqual(["tomorrow", "next-week"]);
    expect(over.map((l) => l.id)).toEqual(["yesterday", "last-month"]);
  });

  it("counts a list at its scheduled time as over", () => {
    const { upcoming, over } = ownListsInOrder([list("now", { scheduledAt: now })], now);

    expect(upcoming).toEqual([]);
    expect(over.map((l) => l.id)).toEqual(["now"]);
  });

  it("keeps a list with no scheduled time among the upcoming, after the ones that have one, newest first", () => {
    const lists = [
      untimed("older-draft", { createdAt: 1_000 }),
      list("tomorrow", { scheduledAt: now + 24 * HOUR }),
      untimed("newer-draft", { createdAt: 2_000 }),
    ];

    const { upcoming, over } = ownListsInOrder(lists, now);

    expect(upcoming.map((l) => l.id)).toEqual(["tomorrow", "newer-draft", "older-draft"]);
    expect(over).toEqual([]);
  });

  it("orders two lists at the same scheduled time by id, so every phone agrees", () => {
    const lists = [list("b"), list("a")];

    expect(ownListsInOrder(lists, now - HOUR).upcoming.map((l) => l.id)).toEqual(["a", "b"]);
    expect(ownListsInOrder(lists, now + HOUR).over.map((l) => l.id)).toEqual(["a", "b"]);
  });
});

describe("listSetupProblems", () => {
  it("finds nothing wrong with a named list that has its times, opens before it is scheduled, and takes at least one", () => {
    expect(listSetupProblems(setup())).toEqual({});
    expect(listSetupProblems(setup({ takes: "teams", capacity: 1 }))).toEqual({});
  });

  it("refuses to turn the link on without a scheduled time or an open time", () => {
    expect(listSetupProblems(setup({ scheduledAt: null }))).toEqual({
      scheduledAt: "Set the scheduled time before turning the RSVP link on.",
    });
    expect(listSetupProblems(setup({ opensAt: null }))).toEqual({
      opensAt: "Set the open time before turning the RSVP link on.",
    });
  });

  it("lets a list with the link off go without its times", () => {
    expect(listSetupProblems(setup({ enabled: false, scheduledAt: null, opensAt: null }))).toEqual({});
    expect(listSetupProblems(setup({ enabled: false, opensAt: null }))).toEqual({});
  });

  it("refuses an open time after the scheduled time, whether the link is on or off", () => {
    const late = { opensAt: friday7pm + 60_000 };
    const problem = { opensAt: "The open time must come before the scheduled time." };

    expect(listSetupProblems(setup(late))).toEqual(problem);
    expect(listSetupProblems(setup({ ...late, enabled: false }))).toEqual(problem);
  });

  it("refuses a capacity below one", () => {
    const problem = { capacity: "Capacity must be at least 1." };

    expect(listSetupProblems(setup({ capacity: 0 }))).toEqual(problem);
    expect(listSetupProblems(setup({ capacity: -3 }))).toEqual(problem);
    expect(listSetupProblems(setup({ capacity: Number.NaN }))).toEqual(problem);
  });

  it("refuses a list with no name, or a name of spaces", () => {
    const problem = { name: "Give the list a name." };

    expect(listSetupProblems(setup({ name: "" }))).toEqual(problem);
    expect(listSetupProblems(setup({ name: "   " }))).toEqual(problem);
  });
});

describe("firstListProblem", () => {
  it("names the first problem in the order the form shows its fields", () => {
    const everything = setup({ name: "", capacity: 0, scheduledAt: null, opensAt: null });

    expect(firstListProblem(listSetupProblems(everything))).toBe("Give the list a name.");
    expect(firstListProblem(listSetupProblems({ ...everything, name: "Friday pickup" }))).toBe(
      "Capacity must be at least 1.",
    );
    expect(
      firstListProblem(listSetupProblems({ ...everything, name: "Friday pickup", capacity: 12 })),
    ).toBe("Set the scheduled time before turning the RSVP link on.");
  });

  it("is undefined for a setup that can be saved", () => {
    expect(firstListProblem(listSetupProblems(setup()))).toBeUndefined();
  });
});
