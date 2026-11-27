// @vitest-environment node
import { describe, expect, it } from "vitest";
import { quickMatchData } from "@/lib/quickMatchData";
import type { Match, PersistentTeam } from "@/types/game";

const roster: PersistentTeam[] = [
  { id: "t1", name: "Riptide", color: "#3b82f6", createdAt: 1 },
  { id: "t2", name: "Block Party", createdAt: 2 },
];

/** Noon on a day of September 2026, in the zone the test runs in. */
const noonOn = (day: number) => new Date(2026, 8, day, 12).getTime();

/** A finished quick match between the two roster teams. */
const finished = (overrides: Partial<Match> = {}): Match => ({
  id: "q1",
  ownerId: "owner-uid",
  tournamentId: null,
  homeTeamId: "t1",
  awayTeamId: "t2",
  homeScore: 21,
  awayScore: 15,
  status: "completed",
  winnerId: "t1",
  round: 1,
  position: 1,
  createdAt: noonOn(1),
  completedAt: noonOn(1),
  ...overrides,
});

describe("the Quick Match page's recent results", () => {
  it("draw each team from the roster, with its color, and name the winner", () => {
    const data = quickMatchData(roster, [
      finished({ id: "home-won", completedAt: noonOn(27) }),
      finished({ id: "away-won", homeScore: 18, awayScore: 21, winnerId: "t2", completedAt: noonOn(26) }),
    ]);

    expect(data.recentQuickMatches).toEqual([
      {
        id: "home-won",
        date: "Sep 27",
        home: { name: "Riptide", color: "#3b82f6" },
        homeScore: 21,
        awayScore: 15,
        away: { name: "Block Party" },
        winner: "home",
      },
      {
        id: "away-won",
        date: "Sep 26",
        home: { name: "Riptide", color: "#3b82f6" },
        homeScore: 18,
        awayScore: 21,
        away: { name: "Block Party" },
        winner: "away",
      },
    ]);
  });
});

describe("the Quick Match page's counts", () => {
  it("number the next quick match and count every finished match, a tournament's too", () => {
    const data = quickMatchData(roster, [
      finished({ id: "quick-done" }),
      finished({ id: "quick-waiting", status: "pending", winnerId: undefined, completedAt: undefined }),
      finished({ id: "tournament-done", tournamentId: "tourn-1" }),
    ]);

    expect(data.nextMatchNumber).toBe(3);
    expect(data.matchesCompleted).toBe(2);
  });
});

describe("a team's form on the Quick Match page", () => {
  const data = quickMatchData(roster, [
    finished({ id: "first", completedAt: noonOn(1), homeScore: 21, awayScore: 15, winnerId: "t1" }),
    finished({ id: "second", completedAt: noonOn(2), homeScore: 19, awayScore: 21, winnerId: "t2" }),
    finished({ id: "third", completedAt: noonOn(3), homeScore: 21, awayScore: 10, winnerId: "t1" }),
  ]);

  /* The record is written with an en dash, and the form runs from the oldest result to the newest. */
  it("is the team's mark, its record, its totals, and its last results in order", () => {
    expect(data.summaryFor("t1")).toEqual({
      team: { name: "Riptide", color: "#3b82f6" },
      form: ["W", "L", "W"],
      record: "2–1",
      won: 2,
      lost: 1,
      pointsFor: 61,
      pointsAgainst: 46,
    });
    expect(data.summaryFor("t2")?.form).toEqual(["L", "W", "L"]);
  });

  it("is empty for a team that has not played, and nothing while no team is picked", () => {
    expect(quickMatchData(roster, []).summaryFor("t2")).toEqual({
      team: { name: "Block Party" },
      form: [],
      record: "0–0",
      won: 0,
      lost: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    });
    expect(data.summaryFor(null)).toBeNull();
  });
});

describe("the quick matches left mid-way", () => {
  it("can be resumed while both teams are on the roster", () => {
    const data = quickMatchData(roster, [
      finished({
        id: "left",
        status: "in_progress",
        homeScore: 7,
        awayScore: 5,
        winnerId: undefined,
        completedAt: undefined,
        createdAt: new Date(2026, 8, 27, 19, 42).getTime(),
      }),
    ]);

    expect(data.abandonedQuickMatches).toEqual([
      {
        id: "left",
        home: { name: "Riptide", color: "#3b82f6" },
        homeScore: 7,
        awayScore: 5,
        away: { name: "Block Party" },
        started: expect.stringMatching(/^Sep 27, 7:42\sPM$/),
        resumable: true,
      },
    ]);
  });

  /* The scoring page cannot show a match whose team is gone, so the row offers Discard alone. */
  it("cannot be resumed once a team has left the roster, and that team reads Unknown", () => {
    const [left] = quickMatchData(roster, [
      finished({ status: "in_progress", awayTeamId: "gone", winnerId: undefined, completedAt: undefined }),
    ]).abandonedQuickMatches;

    expect(left.away).toEqual({ name: "Unknown" });
    expect(left.resumable).toBe(false);
  });
});
