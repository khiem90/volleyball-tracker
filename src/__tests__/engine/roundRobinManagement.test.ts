import { describe, expect, it } from "vitest";
import { calculateStandings } from "@/lib/roundRobin";
import { draftWorld, find, NOW, run, started, win, type World } from "./helpers";

const pairing = (home: string, away: string) => [home, away].sort().join(" v ");

const addTeam = (world: World, teamId: string): World =>
  run(world, { type: "add_team", teamId, name: `Team ${teamId}`, color: "#111111" });

const withdraw = (world: World, teamId: string): World =>
  run(world, { type: "withdraw", teamId });

const correct = (world: World, matchId: string, homeScore: number, awayScore: number): World =>
  run(world, { type: "correct_result", matchId, homeScore, awayScore });

const entryOf = (world: World, teamId: string) => {
  const entry = world.tournament.entries.find((e) => e.teamId === teamId);
  if (!entry) throw new Error(`No entry for ${teamId}`);
  return entry;
};

/** The match between two teams, whichever is home. */
const between = (world: World, a: string, b: string) => {
  const match = world.matches.find((m) => pairing(m.homeTeamId, m.awayTeamId) === pairing(a, b));
  if (!match) throw new Error(`No match between ${a} and ${b}`);
  return match;
};

const standingOf = (world: World, teamId: string) => {
  const standing = calculateStandings(
    world.tournament.teamIds,
    world.matches,
    world.tournament.settings,
  ).find((s) => s.teamId === teamId);
  if (!standing) throw new Error(`No standing for ${teamId}`);
  return standing;
};

describe("round robin management", () => {
  describe("adding a team while live", () => {
    it("enters the team and appends a match against every active entry", () => {
      const live = started("round_robin", 4);

      const world = addTeam(live, "t5");

      expect(world.tournament.entries.at(-1)).toEqual({
        teamId: "t5",
        name: "Team t5",
        color: "#111111",
      });
      expect(world.tournament.teamIds).toEqual(["t1", "t2", "t3", "t4", "t5"]);
      const added = world.matches.filter((m) => !live.matches.some((was) => was.id === m.id));
      expect(added.map((m) => pairing(m.homeTeamId, m.awayTeamId)).sort()).toEqual([
        "t1 v t5",
        "t2 v t5",
        "t3 v t5",
        "t4 v t5",
      ]);
      expect(added.every((m) => m.status === "pending")).toBe(true);
      expect(world.matches.filter((m) => live.matches.some((was) => was.id === m.id))).toEqual(
        live.matches,
      );
    });

    it("puts each new match in its own round after the last, played as the tournament's best-of", () => {
      // Four teams play three rounds; the newcomer's matches follow them.
      const live = started("round_robin", 4, { seriesLength: 3 });

      const world = addTeam(live, "t5");

      const added = world.matches.filter((m) => m.awayTeamId === "t5");
      expect(added.map((m) => [m.round, m.position])).toEqual([
        [4, 1],
        [5, 1],
        [6, 1],
        [7, 1],
      ]);
      expect(added.every((m) => m.seriesLength === 3 && m.seriesGame === 1)).toBe(true);
    });
  });

  describe("withdrawing a team", () => {
    it("forfeits the team's pending matches to their opponents with no points, and marks the entry", () => {
      const live = started("round_robin", 4);

      const world = withdraw(live, "t2");

      expect(entryOf(world, "t2").withdrawnAt).toBe(NOW);
      expect(world.tournament.teamIds).toEqual(["t1", "t2", "t3", "t4"]);
      const forfeits = world.matches.filter((m) => m.homeTeamId === "t2" || m.awayTeamId === "t2");
      expect(forfeits).toHaveLength(3);
      for (const match of forfeits) {
        expect(match).toMatchObject({
          status: "completed",
          forfeitedBy: "t2",
          winnerId: match.homeTeamId === "t2" ? match.awayTeamId : match.homeTeamId,
          homeScore: 0,
          awayScore: 0,
          completedAt: NOW,
        });
      }
      const others = world.matches.filter((m) => m.homeTeamId !== "t2" && m.awayTeamId !== "t2");
      expect(others).toEqual(live.matches.filter((m) => others.some((o) => o.id === m.id)));
      expect(world.tournament.status).toBe("live");
    });

    it("keeps the team's played results and forfeits a match it is in the middle of, points and all", () => {
      const live = started("round_robin", 4);
      const played = win(live, find(live, { homeTeamId: "t1", awayTeamId: "t2" }).id, "t2");
      const inPlay = find(played, { homeTeamId: "t2", awayTeamId: "t3" });
      const scoring: World = {
        ...played,
        matches: played.matches.map((m) =>
          m.id === inPlay.id ? { ...m, status: "in_progress", homeScore: 20, awayScore: 15 } : m,
        ),
      };

      const world = withdraw(scoring, "t2");

      expect(find(world, { homeTeamId: "t1", awayTeamId: "t2" })).toMatchObject({
        status: "completed",
        winnerId: "t2",
        homeScore: 20,
        awayScore: 25,
      });
      expect(find(world, { homeTeamId: "t1", awayTeamId: "t2" }).forfeitedBy).toBeUndefined();
      expect(find(world, { id: inPlay.id })).toMatchObject({
        status: "completed",
        winnerId: "t3",
        forfeitedBy: "t2",
        homeScore: 0,
        awayScore: 0,
      });
    });

    it("completes the tournament when the forfeits settle its last matches, naming the standings leader", () => {
      // t1 beats t2 and t3; t2 beats t3. Only t4's matches are left.
      const live = started("round_robin", 4);
      let played = win(live, between(live, "t1", "t2").id, "t1");
      played = win(played, between(played, "t1", "t3").id, "t1");
      played = win(played, between(played, "t2", "t3").id, "t2");

      const world = withdraw(played, "t4");

      expect(world.matches.every((m) => m.status === "completed")).toBe(true);
      expect(world.tournament).toMatchObject({
        status: "completed",
        completedAt: NOW,
        winnerId: "t1",
      });
    });

    it("gives each opponent a forfeit win and the team a forfeit loss, none of which touch the points", () => {
      const live = started("round_robin", 3);
      const played = win(live, find(live, { homeTeamId: "t1", awayTeamId: "t2" }).id, "t1");

      const world = withdraw(played, "t2");

      expect(standingOf(world, "t3")).toMatchObject({
        played: 1,
        won: 1,
        lost: 0,
        forfeitWins: 1,
        forfeitLosses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        pointsDiff: 0,
        competitionPoints: 3,
      });
      expect(standingOf(world, "t2")).toMatchObject({
        played: 2,
        won: 0,
        lost: 2,
        forfeitWins: 0,
        forfeitLosses: 1,
        pointsFor: 20,
        pointsAgainst: 25,
        pointsDiff: -5,
      });
      expect(standingOf(world, "t1")).toMatchObject({ forfeitWins: 0, forfeitLosses: 0 });
    });

    it("refuses to withdraw a team twice", () => {
      const world = withdraw(started("round_robin", 4), "t2");

      expect(() => withdraw(world, "t2")).toThrow(/already withdrawn/);
    });

    it("a team added afterwards gets no match against the withdrawn team", () => {
      const world = addTeam(withdraw(started("round_robin", 4), "t2"), "t5");

      const added = world.matches.filter((m) => m.awayTeamId === "t5");
      expect(added.map((m) => m.homeTeamId).sort()).toEqual(["t1", "t3", "t4"]);
    });
  });

  describe("bringing a withdrawn team back", () => {
    it("reopens the matches its withdrawal forfeited, keeps its played results, and gives it a match against any team that joined meanwhile", () => {
      // t2 beats t1, withdraws, t5 joins, then t2 comes back.
      const live = started("round_robin", 4);
      const played = win(live, between(live, "t1", "t2").id, "t2");
      const away = addTeam(withdraw(played, "t2"), "t5");
      expect(away.matches.filter((m) => m.forfeitedBy === "t2")).toHaveLength(2);

      const world = addTeam(away, "t2");

      expect(entryOf(world, "t2")).toEqual({ teamId: "t2", name: "Team t2", color: "#111111" });
      expect(world.tournament.teamIds).toEqual(["t1", "t2", "t3", "t4", "t5"]);
      expect(between(world, "t1", "t2")).toMatchObject({ status: "completed", winnerId: "t2" });
      for (const opponent of ["t3", "t4"]) {
        const match = between(world, "t2", opponent);
        expect(match).toMatchObject({ status: "pending", homeScore: 0, awayScore: 0 });
        expect(match.winnerId).toBeUndefined();
        expect(match.forfeitedBy).toBeUndefined();
        expect(match.completedAt).toBeUndefined();
        expect(match.id).toBe(between(away, "t2", opponent).id);
      }
      // Six matches to start, three for t5, and one more for t2 against t5.
      expect(between(world, "t2", "t5")).toMatchObject({ status: "pending", round: 7 });
      expect(world.matches).toHaveLength(10);
      expect(standingOf(world, "t2")).toMatchObject({ played: 1, won: 1, forfeitLosses: 0 });
    });

    it("awards a match against a team that has since withdrawn to the team coming back", () => {
      // t2 withdraws, then t3; t2 comes back while t3 is still out.
      const live = started("round_robin", 4);
      const bothOut = withdraw(withdraw(live, "t2"), "t3");
      expect(between(bothOut, "t2", "t3")).toMatchObject({ forfeitedBy: "t2", winnerId: "t3" });

      const world = addTeam(bothOut, "t2");

      expect(between(world, "t2", "t3")).toMatchObject({
        status: "completed",
        forfeitedBy: "t3",
        winnerId: "t2",
        homeScore: 0,
        awayScore: 0,
        completedAt: NOW,
      });
      expect(between(world, "t2", "t1")).toMatchObject({ status: "pending" });
      expect(between(world, "t2", "t4")).toMatchObject({ status: "pending" });
    });

    it("resumes a best-of the withdrawal cut short, with the games already won kept", () => {
      const live = started("round_robin", 3, { seriesLength: 3 });
      const match = between(live, "t1", "t2");
      const oneGame = win(live, match.id, "t1");
      expect(find(oneGame, { id: match.id })).toMatchObject({ homeWins: 1, awayWins: 0, seriesGame: 2 });

      const world = addTeam(withdraw(oneGame, "t2"), "t2");

      expect(find(world, { id: match.id })).toMatchObject({
        status: "pending",
        homeWins: 1,
        awayWins: 0,
        seriesGame: 2,
        homeScore: 0,
        awayScore: 0,
      });
      expect(find(world, { id: match.id }).forfeitedBy).toBeUndefined();
    });

    it("leaves a forfeit that has since been corrected into a played result alone", () => {
      const live = started("round_robin", 3);
      const forfeited = withdraw(live, "t2");
      const corrected = correct(forfeited, between(forfeited, "t1", "t2").id, 25, 20);

      const world = addTeam(corrected, "t2");

      expect(between(world, "t1", "t2")).toMatchObject({ status: "completed", winnerId: "t1" });
      expect(between(world, "t2", "t3")).toMatchObject({ status: "pending" });
    });
  });

  describe("correcting a completed result", () => {
    it("records the corrected score and winner, and the standings follow", () => {
      const live = started("round_robin", 3);
      const match = find(live, { homeTeamId: "t1", awayTeamId: "t2" });
      const played = win(live, match.id, "t1");
      expect(standingOf(played, "t1")).toMatchObject({ won: 1, pointsDiff: 5 });

      const world = correct(played, match.id, 18, 25);

      expect(find(world, { id: match.id })).toMatchObject({
        status: "completed",
        winnerId: "t2",
        homeScore: 18,
        awayScore: 25,
        completedAt: NOW,
      });
      expect(standingOf(world, "t1")).toMatchObject({ won: 0, lost: 1, pointsDiff: -7 });
      expect(standingOf(world, "t2")).toMatchObject({ won: 1, lost: 0, pointsDiff: 7 });
      expect(world.matches.filter((m) => m.id !== match.id)).toEqual(
        played.matches.filter((m) => m.id !== match.id),
      );
      expect(world.tournament).toEqual(played.tournament);
    });

    it("refuses a tie", () => {
      const live = started("round_robin", 3);
      const played = win(live, live.matches[0].id, live.matches[0].homeTeamId);

      expect(() => correct(played, live.matches[0].id, 21, 21)).toThrow(/tie/);
    });

    it("refuses a match that has not been completed", () => {
      const live = started("round_robin", 3);

      expect(() => correct(live, live.matches[0].id, 25, 20)).toThrow(/not been completed/);
    });

    it("refuses a match that is not in the tournament", () => {
      const live = started("round_robin", 3);

      expect(() => correct(live, "nope", 25, 20)).toThrow(/not in this tournament/);
    });

    it("refuses once the tournament is completed", () => {
      const live = started("round_robin", 3);
      const done = run(win(live, live.matches[0].id, live.matches[0].homeTeamId), { type: "end" });

      expect(() => correct(done, live.matches[0].id, 20, 25)).toThrow(/live/);
      expect(() => correct(draftWorld("round_robin", 3), "nope", 20, 25)).toThrow(/live/);
    });

    it("is not offered by the other formats", () => {
      const rotation = started("win2out", 4);
      const played = win(rotation, rotation.matches[0].id, "t1");
      expect(() => correct(played, rotation.matches[0].id, 20, 25)).toThrow(/Round Robin/);

      const bracket = started("single_elimination", 4);
      const semi = find(bracket, { round: 1, position: 1 });
      expect(() => correct(win(bracket, semi.id, semi.homeTeamId), semi.id, 20, 25)).toThrow(
        /Round Robin/,
      );
    });

    it("turns a forfeit into a played result", () => {
      const live = started("round_robin", 3);
      const forfeited = withdraw(live, "t2");
      const match = between(forfeited, "t1", "t2");
      expect(match.forfeitedBy).toBe("t2");

      const world = correct(forfeited, match.id, 23, 25);

      expect(find(world, { id: match.id })).toMatchObject({
        status: "completed",
        winnerId: "t2",
        homeScore: 23,
        awayScore: 25,
      });
      expect(find(world, { id: match.id }).forfeitedBy).toBeUndefined();
      // t2's other match, against t3, is still the forfeit the withdrawal made it.
      expect(standingOf(world, "t2")).toMatchObject({
        won: 1,
        lost: 1,
        forfeitLosses: 1,
        pointsDiff: 2,
      });
      expect(standingOf(world, "t1")).toMatchObject({ forfeitWins: 0, pointsDiff: -2 });
    });

    describe("in a best-of series", () => {
      /** A best-of-3 with its first match won 2-1 by the home team. */
      const decidedTwoOne = () => {
        const live = started("round_robin", 3, { seriesLength: 3 });
        const match = live.matches[0];
        let world = win(live, match.id, match.homeTeamId);
        world = win(world, match.id, match.awayTeamId);
        world = win(world, match.id, match.homeTeamId);
        expect(find(world, { id: match.id })).toMatchObject({ homeWins: 2, awayWins: 1 });
        return { world, match };
      };

      it("corrects the deciding game's score and keeps the games won when the winner stays", () => {
        const { world: played, match } = decidedTwoOne();

        const world = correct(played, match.id, 26, 24);

        expect(find(world, { id: match.id })).toMatchObject({
          winnerId: match.homeTeamId,
          homeScore: 26,
          awayScore: 24,
          homeWins: 2,
          awayWins: 1,
        });
      });

      it("moves the deciding game to the other side when the winner changes", () => {
        const { world: played, match } = decidedTwoOne();

        const world = correct(played, match.id, 20, 25);

        expect(find(world, { id: match.id })).toMatchObject({
          winnerId: match.awayTeamId,
          homeScore: 20,
          awayScore: 25,
          homeWins: 1,
          awayWins: 2,
        });
      });

      it("records a corrected forfeit as a series won in the games it needs, either way round", () => {
        const live = started("round_robin", 3, { seriesLength: 3 });
        const match = between(live, "t1", "t2");
        const forfeited = withdraw(win(live, match.id, "t1"), "t2");
        expect(find(forfeited, { id: match.id })).toMatchObject({ forfeitedBy: "t2", homeWins: 1, awayWins: 0 });

        const homeWins = correct(forfeited, match.id, 25, 20);
        expect(find(homeWins, { id: match.id })).toMatchObject({
          winnerId: "t1",
          homeWins: 2,
          awayWins: 0,
          seriesGame: 2,
        });
        expect(find(homeWins, { id: match.id }).forfeitedBy).toBeUndefined();

        const awayWins = correct(forfeited, match.id, 20, 25);
        expect(find(awayWins, { id: match.id })).toMatchObject({
          winnerId: "t2",
          homeWins: 1,
          awayWins: 2,
          seriesGame: 3,
        });
      });

      it("refuses a change of winner that would leave the series undecided", () => {
        const live = started("round_robin", 3, { seriesLength: 3 });
        const match = live.matches[0];
        const played = win(win(live, match.id, match.homeTeamId), match.id, match.homeTeamId);
        expect(find(played, { id: match.id })).toMatchObject({ homeWins: 2, awayWins: 0 });

        expect(() => correct(played, match.id, 20, 25)).toThrow(/undecided/);
      });
    });
  });
});
