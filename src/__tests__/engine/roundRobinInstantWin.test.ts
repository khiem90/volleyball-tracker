import { describe, expect, it } from "vitest";
import { calculateStandings } from "@/lib/roundRobin";
import type { Match } from "@/types/game";
import { correct, find, run, started, withdraw, type World } from "./helpers";

const tap = (world: World, matchId: string, winnerId: string): World =>
  run(world, { type: "instant_win", matchId, winnerId });

const undo = (world: World, matchId: string, winnerId?: string): World =>
  run(world, { type: "undo_result", matchId, winnerId });

const matchIn = (world: World, id: string): Match => find(world, { id });

describe("Round Robin instant win", () => {
  it("records the tap as 25 to 0 and the standings count it", () => {
    const live = started("round_robin", 4, { instantWin: true });
    const match = live.matches[0];

    const world = tap(live, match.id, match.awayTeamId);

    expect(matchIn(world, match.id)).toMatchObject({
      status: "completed",
      winnerId: match.awayTeamId,
      homeScore: 0,
      awayScore: 25,
    });
    const standings = calculateStandings(world.tournament.teamIds, world.matches);
    expect(standings[0]).toMatchObject({ teamId: match.awayTeamId, won: 1, pointsDiff: 25 });
  });

  it("records one game of a best-of per tap, and completes the match on the deciding one", () => {
    const live = started("round_robin", 3, { instantWin: true, seriesLength: 3 });
    const match = live.matches[0];

    const first = tap(live, match.id, match.homeTeamId);
    expect(matchIn(first, match.id)).toMatchObject({
      status: "in_progress",
      homeWins: 1,
      awayWins: 0,
      seriesGame: 2,
      homeScore: 0,
      awayScore: 0,
    });

    const second = tap(first, match.id, match.homeTeamId);
    expect(matchIn(second, match.id)).toMatchObject({
      status: "completed",
      winnerId: match.homeTeamId,
      homeWins: 2,
      homeScore: 25,
      awayScore: 0,
    });
  });

  it("completes the tournament on the last tap", () => {
    let world = started("round_robin", 3, { instantWin: true });
    for (const match of world.matches) world = tap(world, match.id, match.homeTeamId);

    expect(world.tournament.status).toBe("completed");
    expect(world.tournament.winnerId).toBeDefined();
  });
});

describe("Undo of a Round Robin instant win", () => {
  it("reopens a single-game match exactly as it was, leaving other matches alone", () => {
    const live = started("round_robin", 4, { instantWin: true });
    const [first, second] = live.matches;
    const played = tap(tap(live, first.id, first.homeTeamId), second.id, second.awayTeamId);

    const world = undo(played, first.id, first.homeTeamId);

    expect(matchIn(world, first.id)).toEqual(first);
    expect(matchIn(world, second.id)).toEqual(matchIn(played, second.id));
    expect(world.tournament.status).toBe("live");
  });

  it("puts a best-of back one game: the deciding game, then the first", () => {
    const live = started("round_robin", 3, { instantWin: true, seriesLength: 3 });
    const match = live.matches[0];
    const one = tap(live, match.id, match.awayTeamId);
    const two = tap(one, match.id, match.awayTeamId);

    const backOne = undo(two, match.id, match.awayTeamId);
    expect(matchIn(backOne, match.id)).toEqual(matchIn(one, match.id));

    const backTwo = undo(backOne, match.id, match.awayTeamId);
    expect(matchIn(backTwo, match.id)).toEqual(match);
  });

  it("refuses once the owner has corrected the score", () => {
    const live = started("round_robin", 3, { instantWin: true });
    const match = live.matches[0];
    const played = tap(live, match.id, match.homeTeamId);
    const corrected = correct(played, match.id, 25, 20);

    expect(() => undo(corrected, match.id, match.homeTeamId)).toThrow(/no longer be undone/);
  });

  it("refuses when the correction gave the match to the other team at the same score", () => {
    const live = started("round_robin", 3, { instantWin: true });
    const match = live.matches[0];
    const played = tap(live, match.id, match.homeTeamId);
    const swapped = correct(played, match.id, 0, 25);

    expect(() => undo(swapped, match.id, match.homeTeamId)).toThrow(/no longer be undone/);
    expect(matchIn(swapped, match.id).winnerId).toBe(match.awayTeamId);
  });

  it("refuses a game once the next game has points on the board", () => {
    const live = started("round_robin", 3, { instantWin: true, seriesLength: 3 });
    const match = live.matches[0];
    const one = tap(live, match.id, match.homeTeamId);
    const scoring: World = {
      ...one,
      matches: one.matches.map((m) => (m.id === match.id ? { ...m, homeScore: 3, awayScore: 1 } : m)),
    };

    expect(() => undo(scoring, match.id, match.homeTeamId)).toThrow(/no longer be undone/);
  });

  it("refuses a forfeit, an unplayed match, and a winner that is not in the match", () => {
    const live = started("round_robin", 3, { instantWin: true });
    const match = live.matches[0];
    const forfeited = withdraw(live, match.homeTeamId);

    expect(() => undo(forfeited, match.id, match.awayTeamId)).toThrow(/no longer be undone/);
    expect(() => undo(live, match.id, match.homeTeamId)).toThrow(/no longer be undone/);
    expect(() => undo(tap(live, match.id, match.homeTeamId), match.id, "nobody")).toThrow(
      /no longer be undone/,
    );
    expect(() => undo(tap(live, match.id, match.homeTeamId), match.id)).toThrow(
      /no longer be undone/,
    );
  });

  it("refuses a bye, a scheduled empty slot that was never tapped", () => {
    const live = started("round_robin", 3, { instantWin: true });
    const match = live.matches[0];
    // Round Robin schedules no bye row of its own, so the slot is built as the
    // engine settles a bye: completed without play, one team id missing.
    const withBye: World = {
      ...live,
      matches: live.matches.map((m) =>
        m.id === match.id
          ? { ...m, status: "completed", isBye: true, awayTeamId: "", winnerId: match.homeTeamId }
          : m,
      ),
    };

    expect(() => undo(withBye, match.id, match.homeTeamId)).toThrow(/no longer be undone/);
  });

  it("refuses once the tournament is completed", () => {
    let world = started("round_robin", 3, { instantWin: true });
    for (const match of world.matches) world = tap(world, match.id, match.homeTeamId);
    const last = world.matches[world.matches.length - 1];

    expect(() => undo(world, last.id, last.homeTeamId)).toThrow();
  });
});
