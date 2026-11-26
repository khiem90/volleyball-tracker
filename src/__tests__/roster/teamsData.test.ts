// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildTeamsData } from "@/lib/teamsData";
import type { Match, PersistentTeam } from "@/types/game";
import { NOW, OWNER, started, withId } from "../engine/helpers";

const RED = "#ef4444";
const YELLOW = "#eab308";

/* Ids match the engine helpers' teams, so a helper tournament enters the first three. */
const roster: PersistentTeam[] = [
  { id: "t1", name: "Aces", createdAt: 1, color: RED },
  { id: "t2", name: "Blockers", createdAt: 2, color: YELLOW },
  { id: "t3", name: "Chasers", createdAt: 3 },
  { id: "t4", name: "Diggers", createdAt: 4 },
  { id: "t5", name: "Eagles", createdAt: 5 },
];

let quickCount = 0;

/** A finished quick match, the winner on 21 and the loser on 15. */
const quickResult = (winnerId: string, loserId: string): Match => ({
  id: `quick-${++quickCount}`,
  ownerId: OWNER,
  tournamentId: null,
  homeTeamId: winnerId,
  awayTeamId: loserId,
  homeScore: 21,
  awayScore: 15,
  status: "completed",
  winnerId,
  round: 1,
  position: 1,
  createdAt: NOW,
  completedAt: NOW + quickCount,
});

/* Chasers win two, Blockers win one and lose one, Aces lose two. Diggers and Eagles have not played. */
const results = [
  quickResult("t3", "t1"),
  quickResult("t3", "t2"),
  quickResult("t2", "t1"),
];

describe("the Teams tab's rows", () => {
  it("lists the roster with the most wins first, then the fewest losses, then by name", () => {
    const { rows } = buildTeamsData([], results, roster);

    expect(rows.map((row) => row.team.name)).toEqual([
      "Chasers",
      "Blockers",
      "Diggers",
      "Eagles",
      "Aces",
    ]);
  });

  it("gives a row its team's record", () => {
    const { rows } = buildTeamsData([], results, roster);

    expect(rows.find((row) => row.id === "t2")).toMatchObject({
      played: 2,
      won: 1,
      lost: 1,
      pointsFor: 36,
      pointsAgainst: 36,
      form: ["L", "W"],
    });
  });

  it("draws a team from its name and its color, and nothing else", () => {
    const { rows } = buildTeamsData([], results, roster);

    expect(rows.find((row) => row.id === "t1")?.team).toEqual({ name: "Aces", color: RED });
    /* No stored color: the mark picks one from the name. */
    expect(rows.find((row) => row.id === "t4")?.team).toEqual({ name: "Diggers" });
  });

  it("names the tournaments a team is entered in and its next match, and calls that team active", () => {
    const cup = withId(started("round_robin", 3), "cup", { name: "Summer Cup" });
    const [first] = cup.matches;
    expect([first.homeTeamId, first.awayTeamId]).not.toContain("");

    const { rows } = buildTeamsData([cup.tournament], cup.matches, roster);
    const home = rows.find((row) => row.id === first.homeTeamId);
    const away = roster.find((team) => team.id === first.awayTeamId);

    expect(home).toMatchObject({
      competitions: ["Summer Cup"],
      status: "ACTIVE",
      nextMatch: { isHome: true, competition: "Summer Cup", opponent: { name: away?.name } },
    });
    /* Diggers are in no tournament and have no match waiting. */
    expect(rows.find((row) => row.id === "t4")).toMatchObject({
      competitions: [],
      status: "IDLE",
      nextMatch: null,
    });
  });

  it("leaves a completed tournament out of what a team is entered in", () => {
    const done = withId(started("round_robin", 3), "done", { status: "completed" });

    const { rows } = buildTeamsData([done.tournament], [], roster);

    expect(rows.find((row) => row.id === "t1")?.competitions).toEqual([]);
  });

  it("counts the roster and the matches completed for the page's header", () => {
    const data = buildTeamsData([], results, roster);

    expect(data.teamCount).toBe(5);
    expect(data.matchesCompleted).toBe(3);
  });
});
