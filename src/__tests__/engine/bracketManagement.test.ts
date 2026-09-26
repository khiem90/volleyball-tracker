import { describe, expect, it } from "vitest";
import type { Match } from "@/types/game";
import {
  addTeam,
  correct,
  entryOf,
  find,
  NOW,
  playable,
  run,
  started,
  win,
  withdraw,
  type World,
} from "./helpers";

const winners = (world: World, round: number, position: number) =>
  find(world, { bracket: "winners", round, position });
const losers = (world: World, round: number, position: number) =>
  find(world, { bracket: "losers", round, position });

/** Play every match that can be played except the ones `isFinal` picks out; the home team wins each. */
const playAllBut = (world: World, isFinal: (match: Match) => boolean): World => {
  let current = world;
  for (let guard = 0; guard < 200; guard++) {
    const next = playable(current).find((m) => !isFinal(m));
    if (!next) return current;
    current = win(current, next.id, next.homeTeamId);
  }
  throw new Error("playAllBut did not finish");
};

/** The world with one match marked as in play at the given score. */
const inPlay = (world: World, matchId: string, homeScore = 0, awayScore = 0): World => ({
  ...world,
  matches: world.matches.map((m) =>
    m.id === matchId ? { ...m, status: "in_progress", homeScore, awayScore } : m,
  ),
});

describe("bracket management", () => {
  describe("withdrawing a team", () => {
    it("forfeits the team's next match to its opponent, who goes through", () => {
      // Four teams: t1 v t4 and t2 v t3, then the final.
      const live = started("single_elimination", 4);

      const world = withdraw(live, "t4");

      expect(entryOf(world, "t4").withdrawnAt).toBe(NOW);
      expect(find(world, { round: 1, position: 1 })).toMatchObject({
        status: "completed",
        winnerId: "t1",
        forfeitedBy: "t4",
        homeScore: 0,
        awayScore: 0,
        completedAt: NOW,
      });
      expect(find(world, { round: 2, position: 1 })).toMatchObject({
        homeTeamId: "t1",
        awayTeamId: "",
        status: "pending",
      });
      expect(find(world, { round: 1, position: 2 })).toEqual(find(live, { round: 1, position: 2 }));
      expect(world.tournament.status).toBe("live");
    });

    it("forfeits a match in play, points and all", () => {
      const live = started("single_elimination", 4);
      const match = find(live, { round: 1, position: 1 });

      const world = withdraw(inPlay(live, match.id, 20, 15), "t1");

      expect(find(world, { id: match.id })).toMatchObject({
        status: "completed",
        winnerId: "t4",
        forfeitedBy: "t1",
        homeScore: 0,
        awayScore: 0,
      });
      expect(find(world, { round: 2, position: 1 })).toMatchObject({ homeTeamId: "t4" });
    });

    it("waits for the opponent when the next match has none yet, then forfeits to it", () => {
      // t1 wins its semi and reaches the final alone, then withdraws.
      const live = started("single_elimination", 4);
      const alone = win(live, find(live, { round: 1, position: 1 }).id, "t1");

      const waiting = withdraw(alone, "t1");

      expect(find(waiting, { round: 2, position: 1 })).toMatchObject({
        homeTeamId: "t1",
        awayTeamId: "",
        status: "pending",
      });
      expect(waiting.tournament.status).toBe("live");

      const world = win(waiting, find(waiting, { round: 1, position: 2 }).id, "t2");

      expect(find(world, { round: 2, position: 1 })).toMatchObject({
        status: "completed",
        winnerId: "t2",
        forfeitedBy: "t1",
      });
      expect(world.tournament).toMatchObject({ status: "completed", winnerId: "t2" });
    });

    it("lets a team with a first-round bye withdraw before its opponent is known", () => {
      // Five teams: t1 sits out the first round and waits in the semi for
      // the winner of t4 v t5.
      const live = started("single_elimination", 5);
      const semi = find(live, { round: 2, position: 1 });
      expect(semi).toMatchObject({ homeTeamId: "t1", awayTeamId: "" });

      const waiting = withdraw(live, "t1");
      expect(find(waiting, { id: semi.id })).toMatchObject({ homeTeamId: "t1", status: "pending" });

      const quarter = find(waiting, { round: 1, homeTeamId: "t4" });
      const world = win(waiting, quarter.id, "t4");

      expect(find(world, { id: semi.id })).toMatchObject({
        awayTeamId: "t4",
        status: "completed",
        winnerId: "t4",
        forfeitedBy: "t1",
      });
      expect(find(world, { round: 3, position: 1 })).toMatchObject({ homeTeamId: "t4" });
      expect(world.tournament.status).toBe("live");
    });

    it("completes the tournament when the forfeit decides the final", () => {
      const live = started("single_elimination", 4);
      const semis = win(
        win(live, find(live, { round: 1, position: 1 }).id, "t1"),
        find(live, { round: 1, position: 2 }).id,
        "t2",
      );

      const world = withdraw(semis, "t2");

      expect(find(world, { round: 2, position: 1 })).toMatchObject({
        winnerId: "t1",
        forfeitedBy: "t2",
      });
      expect(world.tournament).toMatchObject({ status: "completed", completedAt: NOW, winnerId: "t1" });
    });

    it("only marks the entry of a team the bracket has already knocked out", () => {
      const live = started("single_elimination", 4);
      const played = win(live, find(live, { round: 1, position: 1 }).id, "t1");

      const world = withdraw(played, "t4");

      expect(entryOf(world, "t4").withdrawnAt).toBe(NOW);
      expect(world.matches).toEqual(played.matches);
      expect(world.tournament.status).toBe("live");
    });

    it("refuses to withdraw a team twice, or one that is not entered", () => {
      const world = withdraw(started("single_elimination", 4), "t4");

      expect(() => withdraw(world, "t4")).toThrow(/already withdrawn/);
      expect(() => withdraw(world, "t9")).toThrow(/not in this tournament/);
    });

    describe("in double elimination", () => {
      it("drops the withdrawn team into the losers bracket, where it forfeits again once it has an opponent", () => {
        const live = started("double_elimination", 4);

        const dropped = withdraw(live, "t4");

        expect(winners(dropped, 1, 1)).toMatchObject({ winnerId: "t1", forfeitedBy: "t4" });
        expect(winners(dropped, 2, 1)).toMatchObject({ homeTeamId: "t1", awayTeamId: "" });
        expect(losers(dropped, 1, 1)).toMatchObject({
          homeTeamId: "t4",
          awayTeamId: "",
          status: "pending",
        });

        const world = win(dropped, winners(dropped, 1, 2).id, "t2");

        expect(losers(world, 1, 1)).toMatchObject({
          homeTeamId: "t4",
          awayTeamId: "t3",
          status: "completed",
          winnerId: "t3",
          forfeitedBy: "t4",
        });
        expect(losers(world, 2, 1)).toMatchObject({ homeTeamId: "t3", status: "pending" });
      });

      it("forfeits a losers-bracket match to the opponent, who goes on", () => {
        const live = started("double_elimination", 4);
        const semis = win(win(live, winners(live, 1, 1).id, "t1"), winners(live, 1, 2).id, "t2");
        expect(losers(semis, 1, 1)).toMatchObject({ homeTeamId: "t4", awayTeamId: "t3" });

        const world = withdraw(semis, "t4");

        expect(losers(world, 1, 1)).toMatchObject({ winnerId: "t3", forfeitedBy: "t4" });
        expect(losers(world, 2, 1)).toMatchObject({ homeTeamId: "t3", awayTeamId: "" });
        expect(world.tournament.status).toBe("live");
      });
    });
  });

  describe("correcting a completed result", () => {
    it("records the corrected score and keeps the bracket as it is when the winner stays", () => {
      const live = started("single_elimination", 4);
      const semi = find(live, { round: 1, position: 1 });
      const played = win(live, semi.id, "t1");

      const world = correct(played, semi.id, 25, 23);

      expect(find(world, { id: semi.id })).toMatchObject({
        status: "completed",
        winnerId: "t1",
        homeScore: 25,
        awayScore: 23,
        completedAt: NOW,
      });
      expect(world.matches.filter((m) => m.id !== semi.id)).toEqual(
        played.matches.filter((m) => m.id !== semi.id),
      );
      expect(world.tournament).toEqual(played.tournament);
    });

    it("lets the score change even after the next match has started, as long as the winner stays", () => {
      const live = started("single_elimination", 4);
      const semi = find(live, { round: 1, position: 1 });
      const played = win(live, semi.id, "t1");
      const final = find(played, { round: 2, position: 1 });

      const world = correct(inPlay(played, final.id, 3, 1), semi.id, 25, 23);

      expect(find(world, { id: semi.id })).toMatchObject({ winnerId: "t1", homeScore: 25, awayScore: 23 });
      expect(find(world, { id: final.id })).toMatchObject({ status: "in_progress", homeScore: 3 });
    });

    it("sends the new winner through in place of the old one while the next match is still to start", () => {
      const live = started("single_elimination", 4);
      const semi = find(live, { round: 1, position: 1 });
      const played = win(live, semi.id, "t1");
      expect(find(played, { round: 2, position: 1 })).toMatchObject({ homeTeamId: "t1" });

      const world = correct(played, semi.id, 20, 25);

      expect(find(world, { id: semi.id })).toMatchObject({ winnerId: "t4", homeScore: 20, awayScore: 25 });
      expect(find(world, { round: 2, position: 1 })).toMatchObject({
        homeTeamId: "t4",
        awayTeamId: "",
        status: "pending",
      });
    });

    it("refuses a change of winner once the next match has started, naming that match", () => {
      const live = started("single_elimination", 4);
      const semi = find(live, { round: 1, position: 1 });
      const played = win(win(live, semi.id, "t1"), find(live, { round: 1, position: 2 }).id, "t2");
      const final = find(played, { round: 2, position: 1 });

      expect(() => correct(inPlay(played, final.id), semi.id, 20, 25)).toThrow(
        /Team t1 v Team t2 has started/,
      );
      expect(() => correct(played, semi.id, 20, 25)).not.toThrow();
    });

    it("refuses once the tournament is completed", () => {
      const live = started("single_elimination", 4);
      const semi = find(live, { round: 1, position: 1 });
      const done = run(win(live, semi.id, "t1"), { type: "end" });

      expect(() => correct(done, semi.id, 20, 25)).toThrow(/live/);
    });

    it("refuses a bye and a forfeit, which have no score to correct", () => {
      const withBye = started("single_elimination", 5);
      const bye = withBye.matches.find((m) => m.isBye);
      if (!bye) throw new Error("No bye");
      expect(() => correct(withBye, bye.id, 25, 20)).toThrow(/bye/);

      const withForfeit = withdraw(started("single_elimination", 4), "t4");
      const forfeit = find(withForfeit, { round: 1, position: 1 });
      expect(forfeit.forfeitedBy).toBe("t4");
      expect(() => correct(withForfeit, forfeit.id, 20, 25)).toThrow(/forfeit/);
    });

    it("re-settles a forfeit the old winner had been given, so the new winner takes it instead", () => {
      // Eight teams: t1 beats t8 and t4 beats t5, then t4 withdraws, so the
      // quarter-final between t1 and t4 is t1's by forfeit.
      const live = started("single_elimination", 8);
      const first = find(live, { round: 1, position: 1 });
      const second = find(live, { round: 1, position: 2 });
      expect([first, second].map((m) => [m.homeTeamId, m.awayTeamId])).toEqual([
        ["t1", "t8"],
        ["t4", "t5"],
      ]);
      const forfeited = withdraw(win(win(live, first.id, "t1"), second.id, "t4"), "t4");
      expect(find(forfeited, { round: 2, position: 1 })).toMatchObject({
        homeTeamId: "t1",
        awayTeamId: "t4",
        winnerId: "t1",
        forfeitedBy: "t4",
      });
      expect(find(forfeited, { round: 3, position: 1 })).toMatchObject({ homeTeamId: "t1" });

      const world = correct(forfeited, first.id, 20, 25);

      expect(find(world, { id: first.id })).toMatchObject({ winnerId: "t8" });
      expect(find(world, { round: 2, position: 1 })).toMatchObject({
        homeTeamId: "t8",
        awayTeamId: "t4",
        status: "completed",
        winnerId: "t8",
        forfeitedBy: "t4",
      });
      expect(find(world, { round: 3, position: 1 })).toMatchObject({
        homeTeamId: "t8",
        awayTeamId: "",
        status: "pending",
      });
    });

    it("reopens a forfeited match that had been in play as a fresh match for the new pairing", () => {
      // Eight teams in a best-of-3: t1 beats t8, t4 beats t5, and the
      // quarter-final between them is a game in with points on the board
      // when t4 withdraws. The forfeit has no play in it, so t5 can still
      // take t4's place, and the reopened match starts over.
      const live = started("single_elimination", 8, { seriesLength: 3 });
      const first = find(live, { round: 1, position: 1 });
      const second = find(live, { round: 1, position: 2 });
      let played = win(win(live, first.id, "t1"), first.id, "t1");
      played = win(win(win(played, second.id, "t4"), second.id, "t5"), second.id, "t4");
      const quarter = find(played, { round: 2, position: 1 });
      played = win(played, quarter.id, "t1");
      const forfeited = withdraw(inPlay(played, quarter.id, 20, 15), "t4");
      expect(find(forfeited, { id: quarter.id })).toMatchObject({
        forfeitedBy: "t4",
        winnerId: "t1",
        homeWins: 1,
      });

      const world = correct(forfeited, second.id, 20, 25);

      expect(find(world, { id: quarter.id })).toMatchObject({
        homeTeamId: "t1",
        awayTeamId: "t5",
        status: "pending",
        homeScore: 0,
        awayScore: 0,
        homeWins: 0,
        awayWins: 0,
        seriesGame: 1,
      });
      expect(find(world, { id: quarter.id }).forfeitedBy).toBeUndefined();
    });

    it("sends a new winner that has since withdrawn through, where it forfeits in turn", () => {
      const live = started("single_elimination", 4);
      const semi = find(live, { round: 1, position: 1 });
      const played = withdraw(win(live, semi.id, "t1"), "t4");

      const world = correct(played, semi.id, 20, 25);

      expect(find(world, { id: semi.id })).toMatchObject({ winnerId: "t4" });
      expect(find(world, { round: 2, position: 1 })).toMatchObject({
        homeTeamId: "t4",
        awayTeamId: "",
        status: "pending",
      });
      const done = win(world, find(world, { round: 1, position: 2 }).id, "t2");
      expect(find(done, { round: 2, position: 1 })).toMatchObject({ winnerId: "t2", forfeitedBy: "t4" });
      expect(done.tournament).toMatchObject({ status: "completed", winnerId: "t2" });
    });

    it("moves the deciding game of a best-of to the new winner, who goes through", () => {
      const live = started("single_elimination", 4, { seriesLength: 3 });
      const semi = find(live, { round: 1, position: 1 });
      let played = win(live, semi.id, "t1");
      played = win(played, semi.id, "t4");
      played = win(played, semi.id, "t1");
      expect(find(played, { id: semi.id })).toMatchObject({ winnerId: "t1", homeWins: 2, awayWins: 1 });

      const world = correct(played, semi.id, 20, 25);

      expect(find(world, { id: semi.id })).toMatchObject({
        winnerId: "t4",
        homeWins: 1,
        awayWins: 2,
        homeScore: 20,
        awayScore: 25,
      });
      expect(find(world, { round: 2, position: 1 })).toMatchObject({ homeTeamId: "t4" });
      expect(() => correct(win(live, semi.id, "t1"), semi.id, 20, 25)).toThrow(/not been completed/);
    });

    describe("in double elimination", () => {
      it("sends the new loser down to the losers bracket in place of the old one", () => {
        const live = started("double_elimination", 4);
        const played = win(live, winners(live, 1, 1).id, "t1");
        expect(losers(played, 1, 1)).toMatchObject({ homeTeamId: "t4" });

        const world = correct(played, winners(live, 1, 1).id, 20, 25);

        expect(winners(world, 2, 1)).toMatchObject({ homeTeamId: "t4" });
        expect(losers(world, 1, 1)).toMatchObject({ homeTeamId: "t1", awayTeamId: "", status: "pending" });
      });

      it("refuses a change of winner once the loser's next match has started", () => {
        const live = started("double_elimination", 4);
        const played = win(win(live, winners(live, 1, 1).id, "t1"), winners(live, 1, 2).id, "t2");
        const losersMatch = losers(played, 1, 1);
        expect(losersMatch).toMatchObject({ homeTeamId: "t4", awayTeamId: "t3" });

        expect(() => correct(inPlay(played, losersMatch.id), winners(live, 1, 1).id, 20, 25)).toThrow(
          /Team t4 v Team t3 has started/,
        );
      });

      it("re-settles a bye the old loser had been given, so the new loser gets it instead", () => {
        // Five teams: the only real first-round match is t4 v t5, whose
        // loser has nobody to meet in the losers bracket and gets a bye.
        const live = started("double_elimination", 5);
        const match = winners(live, 1, 2);
        expect(match).toMatchObject({ homeTeamId: "t4", awayTeamId: "t5" });
        const played = win(live, match.id, "t4");
        expect(losers(played, 1, 1)).toMatchObject({ isBye: true, winnerId: "t5" });
        expect(losers(played, 2, 1)).toMatchObject({ homeTeamId: "t5" });

        const world = correct(played, match.id, 20, 25);

        expect(winners(world, 2, 1)).toMatchObject({ homeTeamId: "t1", awayTeamId: "t5" });
        expect(losers(world, 1, 1)).toMatchObject({
          homeTeamId: "",
          awayTeamId: "t4",
          status: "completed",
          isBye: true,
          winnerId: "t4",
        });
        expect(losers(world, 2, 1)).toMatchObject({ homeTeamId: "t4", status: "pending" });
      });
    });
  });

  describe("adding a team after the start", () => {
    it("is refused, and a withdrawn team cannot come back either", () => {
      const single = started("single_elimination", 4);
      expect(() => addTeam(single, "t9")).toThrow(
        /cannot be added once the Single Elimination bracket is drawn/,
      );
      expect(() => addTeam(withdraw(single, "t4"), "t4")).toThrow(/bracket is drawn/);

      const double = started("double_elimination", 4);
      expect(() => addTeam(double, "t9")).toThrow(
        /cannot be added once the Double Elimination bracket is drawn/,
      );
    });
  });

  describe("completing on its own", () => {
    it.each([4, 5, 6, 8])(
      "a single elimination with %i teams stays live until the final ends, then names its winner",
      (teamCount) => {
        const live = started("single_elimination", teamCount);
        const lastRound = Math.max(...live.matches.map((m) => m.round));
        const isFinal = (match: Match) => match.round === lastRound;

        const beforeFinal = playAllBut(live, isFinal);
        expect(beforeFinal.tournament.status).toBe("live");
        expect(playable(beforeFinal).map(isFinal)).toEqual([true]);

        const final = playable(beforeFinal)[0];
        const world = win(beforeFinal, final.id, final.awayTeamId);
        expect(world.tournament).toMatchObject({
          status: "completed",
          completedAt: NOW,
          winnerId: final.awayTeamId,
        });
        expect(playable(world)).toHaveLength(0);
      },
    );

    it.each([4, 5, 6, 8])(
      "a double elimination with %i teams stays live until the grand final ends, then names its winner",
      (teamCount) => {
        const live = started("double_elimination", teamCount);
        const isFinal = (match: Match) => match.bracket === "grand_finals";

        const beforeFinal = playAllBut(live, isFinal);
        expect(beforeFinal.tournament.status).toBe("live");
        expect(playable(beforeFinal).map(isFinal)).toEqual([true]);

        const final = playable(beforeFinal)[0];
        const world = win(beforeFinal, final.id, final.awayTeamId);
        expect(world.tournament).toMatchObject({
          status: "completed",
          completedAt: NOW,
          winnerId: final.awayTeamId,
        });
        expect(playable(world)).toHaveLength(0);
      },
    );
  });
});
