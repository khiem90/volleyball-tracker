import { describe, expect, it } from "vitest";
import { selectedTournament, tournamentRows } from "@/lib/tournamentsPage";
import type { PersistentTeam } from "@/types/game";
import {
  NOW,
  draftWorld,
  playThrough,
  started,
  together,
  win,
  withId,
  withdraw,
} from "../engine/helpers";

describe("tournamentRows", () => {
  it("lists live tournaments, then drafts, the newest first in each, and leaves completed ones to History", () => {
    const liveOld = withId(started("round_robin", 4), "live-old", { createdAt: NOW });
    const liveNew = withId(started("win2out", 5), "live-new", { createdAt: NOW + 1000 });
    const draftOld = withId(draftWorld("round_robin", 3), "draft-old", { createdAt: NOW - 1000 });
    const draftNew = withId(draftWorld("single_elimination", 4), "draft-new", {
      createdAt: NOW + 5000,
    });
    const done = withId(playThrough(started("single_elimination", 4)), "done", {
      createdAt: NOW + 9000,
    });
    expect(done.tournament.status).toBe("completed");
    const { tournaments, matches } = together(draftOld, liveOld, done, draftNew, liveNew);

    expect(tournamentRows(tournaments, matches).map((row) => row.id)).toEqual([
      "live-new",
      "live-old",
      "draft-new",
      "draft-old",
    ]);
  });

  it("gives each row its format, its teams, and its matches played out of all scheduled", () => {
    const world = started("round_robin", 4);
    const [first] = world.matches;
    const afterOne = win(world, first.id, first.homeTeamId);

    expect(tournamentRows([afterOne.tournament], afterOne.matches)).toEqual([
      {
        id: "tournament-1",
        name: "Test night",
        typeLabel: "Round Robin",
        status: "live",
        teamCount: 4,
        completed: 1,
        total: 6,
      },
    ]);
  });
});

const roster: PersistentTeam[] = ["t1", "t2", "t3", "t4"].map((id, i) => ({
  id,
  name: `Roster ${id}`,
  color: "#22c55e",
  createdAt: i,
}));

describe("selectedTournament", () => {
  it("lists the latest results newest first, each naming the side that won", () => {
    const world = started("round_robin", 4);
    const [first, second] = world.matches;
    const played = win(win(world, first.id, first.homeTeamId), second.id, second.awayTeamId);
    const matches = played.matches.map((m) =>
      m.id === second.id ? { ...m, completedAt: NOW + 1000 } : m,
    );

    const { recent } = selectedTournament(played.tournament, matches, roster);

    expect(recent.map(({ line }) => [line.homeScore, line.awayScore, line.winner])).toEqual([
      [20, 25, "away"],
      [25, 20, "home"],
    ]);
    expect(recent[1].home).toEqual({ name: `Roster ${first.homeTeamId}`, color: "#22c55e" });
  });

  it("gives a match still to be played its round and no score, so its line reads vs", () => {
    const world = started("round_robin", 4);

    const { schedule } = selectedTournament(world.tournament, world.matches, roster);

    expect(schedule[0]).toEqual({
      label: "Round 1",
      home: { name: `Roster ${world.matches[0].homeTeamId}`, color: "#22c55e" },
      away: { name: `Roster ${world.matches[0].awayTeamId}`, color: "#22c55e" },
      line: { homeScore: null, awayScore: null, winner: null, decidedBy: null, live: false },
    });
  });

  it("lists a match being scored under its court, with its score and marked live", () => {
    const world = started("round_robin", 4);
    const [first] = world.matches;
    const matches = world.matches.map((m) =>
      m.id === first.id ? { ...m, status: "in_progress" as const, homeScore: 4, awayScore: 2 } : m,
    );

    const { liveCourts } = selectedTournament(world.tournament, matches, roster);

    expect(liveCourts).toHaveLength(1);
    expect(liveCourts[0]).toMatchObject({
      label: "Court 1",
      line: { homeScore: 4, awayScore: 2, winner: null, live: true },
    });
  });

  it("names the winner of a forfeit, which no score tells", () => {
    const world = withdraw(started("round_robin", 4), "t4");
    const forfeit = world.matches.find((m) => m.forfeitedBy === "t4");
    expect(forfeit).toBeDefined();

    const { recent } = selectedTournament(world.tournament, world.matches, roster);

    const row = recent.find((r) => r.home.name === "Roster t4" || r.away.name === "Roster t4");
    expect(row?.line).toMatchObject({
      decidedBy: "forfeit",
      winner: row?.home.name === "Roster t4" ? "away" : "home",
    });
  });
});

/* The small bracket reads each match by the rule the console's bracket reads it by. */
describe("selectedTournament's bracket", () => {
  it("reads a bye as a bye, with no score, no winner, and nobody on its empty side", () => {
    const world = started("single_elimination", 3);
    expect(world.matches.some((m) => m.isBye)).toBe(true);

    const { bracket } = selectedTournament(world.tournament, world.matches, roster);

    const bye = bracket[0].cells.find((cell) => cell.home === null || cell.away === null);
    expect(bye?.line).toEqual({
      homeScore: null,
      awayScore: null,
      winner: null,
      decidedBy: "bye",
      live: false,
    });
  });

  it("gives a match waiting on an earlier round no score, with the side nobody holds left empty", () => {
    const world = started("single_elimination", 4);

    const { bracket } = selectedTournament(world.tournament, world.matches, roster);

    expect(bracket.map((round) => round.label)).toEqual(["Semifinals", "Final"]);
    expect(bracket[1].cells).toEqual([
      {
        home: null,
        away: null,
        line: { homeScore: null, awayScore: null, winner: null, decidedBy: null, live: false },
      },
    ]);
  });

  it("names the winner of a result, of a forfeit, and nobody while a match is live", () => {
    const world = started("single_elimination", 4);
    const [first, second] = world.matches;
    const played = win(world, first.id, first.awayTeamId);
    const matches = played.matches.map((m) =>
      m.id === second.id ? { ...m, status: "in_progress" as const, homeScore: 3, awayScore: 1 } : m,
    );

    const { bracket } = selectedTournament(played.tournament, matches, roster);

    expect(bracket[0].cells.map((cell) => cell.line)).toEqual([
      { homeScore: 20, awayScore: 25, winner: "away", decidedBy: null, live: false },
      { homeScore: 3, awayScore: 1, winner: null, decidedBy: null, live: true },
    ]);

    const forfeited = withdraw(world, first.homeTeamId);
    const after = selectedTournament(forfeited.tournament, forfeited.matches, roster);
    expect(after.bracket[0].cells[0].line).toMatchObject({ winner: "away", decidedBy: "forfeit" });
  });
});
