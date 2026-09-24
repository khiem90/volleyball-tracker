import { describe, expect, it } from "vitest";
import { calculateStandings } from "@/lib/roundRobin";
import type { Match } from "@/types/game";
import { draftWorld, find, NOW, OWNER, playThrough, run, started, win } from "./helpers";

const pairing = (home: string, away: string) => [home, away].sort().join(" v ");

describe("round robin", () => {
  it("start schedules every pairing once and makes the tournament live", () => {
    const world = started("round_robin", 4);

    expect(world.tournament.status).toBe("live");
    expect(world.tournament.startedAt).toBeDefined();
    expect(world.matches).toHaveLength(6);
    expect(world.matches.every((m) => m.status === "pending")).toBe(true);
    expect(world.matches.map((m) => pairing(m.homeTeamId, m.awayTeamId)).sort()).toEqual([
      "t1 v t2",
      "t1 v t3",
      "t1 v t4",
      "t2 v t3",
      "t2 v t4",
      "t3 v t4",
    ]);
  });

  it("refuses to start a tournament that is not a draft", () => {
    const world = started("round_robin", 4);
    expect(() => run(world, { type: "start" })).toThrow(/draft/);
  });

  it("refuses to start with fewer than three entries", () => {
    expect(() => run(draftWorld("round_robin", 2), { type: "start" })).toThrow(/at least 3/);
  });

  it("completing a match records the result and leaves the rest untouched", () => {
    const live = started("round_robin", 4);
    const match = find(live, { homeTeamId: "t1", awayTeamId: "t4" });

    const world = run(live, {
      type: "complete_match",
      matchId: match.id,
      homeScore: 25,
      awayScore: 18,
    });

    expect(find(world, { id: match.id })).toMatchObject({
      status: "completed",
      winnerId: "t1",
      homeScore: 25,
      awayScore: 18,
      completedAt: NOW,
    });
    expect(world.tournament.status).toBe("live");
    expect(world.matches.filter((m) => m.status === "completed")).toHaveLength(1);
  });

  it("refuses a tied score", () => {
    const live = started("round_robin", 3);
    const match = live.matches[0];
    expect(() =>
      run(live, { type: "complete_match", matchId: match.id, homeScore: 21, awayScore: 21 }),
    ).toThrow(/cannot end in a tie/);
  });

  it("refuses to complete a match twice", () => {
    const live = started("round_robin", 3);
    const match = live.matches[0];
    const world = win(live, match.id, match.homeTeamId);
    expect(() => win(world, match.id, match.awayTeamId)).toThrow(/already/);
  });

  it("refuses to score a match in a tournament that is not live", () => {
    const draft = draftWorld("round_robin", 3);
    expect(() =>
      run(draft, { type: "complete_match", matchId: "nope", homeScore: 1, awayScore: 0 }),
    ).toThrow(/live/);
  });

  it("completes on its own when the last match ends, naming the standings leader", () => {
    // t1 wins every match it plays; the away team wins the rest.
    const world = playThrough(started("round_robin", 4), (m) =>
      m.homeTeamId === "t1" || m.awayTeamId === "t1" ? "t1" : m.awayTeamId,
    );

    expect(world.matches.every((m) => m.status === "completed")).toBe(true);
    expect(world.tournament.status).toBe("completed");
    expect(world.tournament.winnerId).toBe("t1");
    expect(world.tournament.completedAt).toBe(NOW);
  });

  it("stays live while any match is still to play", () => {
    const live = started("round_robin", 3);
    const world = win(win(live, live.matches[0].id, live.matches[0].homeTeamId), live.matches[1].id, live.matches[1].homeTeamId);
    expect(world.tournament.status).toBe("live");
    expect(world.tournament.winnerId).toBeUndefined();
  });

  describe("best-of series", () => {
    it("a game win that does not decide the series resets the score for the next game", () => {
      const live = started("round_robin", 3, { seriesLength: 3 });
      const match = live.matches[0];
      expect(match).toMatchObject({ seriesLength: 3, homeWins: 0, awayWins: 0, seriesGame: 1 });

      const world = run(live, {
        type: "complete_match",
        matchId: match.id,
        homeScore: 25,
        awayScore: 20,
      });

      expect(find(world, { id: match.id })).toMatchObject({
        status: "in_progress",
        homeWins: 1,
        awayWins: 0,
        seriesGame: 2,
        homeScore: 0,
        awayScore: 0,
      });
      expect(find(world, { id: match.id }).winnerId).toBeUndefined();
    });

    it("the match completes once a team has won enough games", () => {
      const live = started("round_robin", 3, { seriesLength: 3 });
      const match = live.matches[0];
      const afterOne = win(live, match.id, match.homeTeamId);
      const afterTwo = win(afterOne, match.id, match.awayTeamId);
      const done = win(afterTwo, match.id, match.awayTeamId);

      expect(find(done, { id: match.id })).toMatchObject({
        status: "completed",
        winnerId: match.awayTeamId,
        homeWins: 1,
        awayWins: 2,
      });
    });
  });

  describe("standings", () => {
    const completed = (
      id: string,
      home: string,
      away: string,
      homeScore: number,
      awayScore: number,
      extra: Partial<Match> = {},
    ): Match => ({
      id,
      ownerId: OWNER,
      tournamentId: "tournament-1",
      homeTeamId: home,
      awayTeamId: away,
      homeScore,
      awayScore,
      status: "completed",
      winnerId: homeScore > awayScore ? home : away,
      round: 1,
      position: 1,
      createdAt: NOW,
      completedAt: NOW,
      ...extra,
    });

    it("counts a forfeit as a win and a loss with no effect on points for, against, or difference", () => {
      const standings = calculateStandings(
        ["t1", "t2", "t3"],
        [
          completed("m1", "t1", "t2", 25, 20),
          completed("m2", "t1", "t3", 0, 0, { winnerId: "t1", forfeitedBy: "t3" }),
        ],
        { pointsForWin: 3, pointsForLoss: 0 },
      );

      const t1 = standings.find((s) => s.teamId === "t1")!;
      const t3 = standings.find((s) => s.teamId === "t3")!;
      expect(t1).toMatchObject({ played: 2, won: 2, lost: 0, forfeitWins: 1, pointsFor: 25, pointsAgainst: 20, pointsDiff: 5, competitionPoints: 6 });
      expect(t3).toMatchObject({ played: 1, won: 0, lost: 1, pointsFor: 0, pointsAgainst: 0, pointsDiff: 0, competitionPoints: 0 });
    });

    it("ranks by competition points, then point difference, then points for", () => {
      const standings = calculateStandings(
        ["t1", "t2", "t3"],
        [
          completed("m1", "t1", "t2", 25, 20),
          completed("m2", "t3", "t2", 25, 15),
          completed("m3", "t1", "t3", 20, 25),
        ],
        { pointsForWin: 3, pointsForLoss: 0 },
      );
      expect(standings.map((s) => s.teamId)).toEqual(["t3", "t1", "t2"]);
    });
  });
});
