import { describe, expect, it } from "vitest";
import type { Match } from "@/types/game";
import { draftWorld, find, playable, playThrough, run, started, win, type World } from "./helpers";

const played = (world: World) => world.matches.filter((m) => m.status === "completed" && !m.isBye);
const losers = (world: World, round: number, position: number) =>
  find(world, { bracket: "losers", round, position });
const winners = (world: World, round: number, position: number) =>
  find(world, { bracket: "winners", round, position });
const grandFinal = (world: World) => find(world, { bracket: "grand_finals" });

describe("double elimination", () => {
  it("start lays out winners, losers, and a grand final for four teams", () => {
    const world = started("double_elimination", 4);

    expect(world.tournament.status).toBe("live");
    expect(world.matches).toHaveLength(6);
    expect(winners(world, 1, 1)).toMatchObject({ homeTeamId: "t1", awayTeamId: "t4" });
    expect(winners(world, 1, 2)).toMatchObject({ homeTeamId: "t2", awayTeamId: "t3" });
    expect(world.matches.filter((m) => m.bracket === "losers")).toHaveLength(2);
    expect(grandFinal(world)).toMatchObject({ homeTeamId: "", awayTeamId: "", status: "pending" });
  });

  it("refuses to start with fewer than four teams", () => {
    expect(() => run(draftWorld("double_elimination", 3), { type: "start" })).toThrow(/at least 4/);
  });

  it("first-round losers meet in the losers bracket and winners meet in the winners final", () => {
    const live = started("double_elimination", 4);
    const world = win(win(live, winners(live, 1, 1).id, "t1"), winners(live, 1, 2).id, "t2");

    expect(winners(world, 2, 1)).toMatchObject({ homeTeamId: "t1", awayTeamId: "t2" });
    expect(losers(world, 1, 1)).toMatchObject({ homeTeamId: "t4", awayTeamId: "t3" });
  });

  it("the winners final loser drops into the losers final against the losers bracket survivor", () => {
    const live = started("double_elimination", 4);
    let world = win(win(live, winners(live, 1, 1).id, "t1"), winners(live, 1, 2).id, "t2");
    world = win(world, losers(world, 1, 1).id, "t3");
    world = win(world, winners(world, 2, 1).id, "t1");

    expect(losers(world, 2, 1)).toMatchObject({ homeTeamId: "t3", awayTeamId: "t2" });
    expect(grandFinal(world)).toMatchObject({ homeTeamId: "t1", awayTeamId: "" });
    expect(world.tournament.status).toBe("live");
  });

  it("the grand final decides the champion", () => {
    const live = started("double_elimination", 4);
    let world = win(win(live, winners(live, 1, 1).id, "t1"), winners(live, 1, 2).id, "t2");
    world = win(world, losers(world, 1, 1).id, "t3");
    world = win(world, winners(world, 2, 1).id, "t1");
    world = win(world, losers(world, 2, 1).id, "t2");
    expect(grandFinal(world)).toMatchObject({ homeTeamId: "t1", awayTeamId: "t2" });
    expect(world.tournament.status).toBe("live");

    world = win(world, grandFinal(world).id, "t2");

    expect(world.tournament.status).toBe("completed");
    expect(world.tournament.winnerId).toBe("t2");
    expect(played(world)).toHaveLength(6);
  });

  it.each([
    [4, 6],
    [5, 8],
    [6, 10],
    [7, 12],
    [8, 14],
  ])("with %i teams, %i matches are played and the grand final decides the champion", (teamCount, expectedPlayed) => {
    const live = started("double_elimination", teamCount);
    const world = playThrough(live);

    expect(playable(world)).toHaveLength(0);
    expect(played(world)).toHaveLength(expectedPlayed);
    expect(world.tournament.status).toBe("completed");
    expect(world.tournament.winnerId).toBe(grandFinal(world).winnerId);
    expect(live.tournament.teamIds).toContain(world.tournament.winnerId);
  });

  it("every team except the champion loses exactly twice, or once if it lost the grand final", () => {
    const world = playThrough(started("double_elimination", 8), (m) => m.awayTeamId);
    const lossesOf = new Map<string, number>();
    for (const m of played(world)) {
      const loser = m.winnerId === m.homeTeamId ? m.awayTeamId : m.homeTeamId;
      lossesOf.set(loser, (lossesOf.get(loser) ?? 0) + 1);
    }
    const champion = world.tournament.winnerId!;
    const runnerUp = grandFinal(world).winnerId === grandFinal(world).homeTeamId
      ? grandFinal(world).awayTeamId
      : grandFinal(world).homeTeamId;

    expect(lossesOf.get(champion) ?? 0).toBeLessThanOrEqual(1);
    // The runner-up lost the grand final, and one match before it if it came
    // through the losers bracket.
    expect([1, 2]).toContain(lossesOf.get(runnerUp));
    for (const teamId of world.tournament.teamIds) {
      if (teamId === champion || teamId === runnerUp) continue;
      expect(lossesOf.get(teamId)).toBe(2);
    }
  });

  it.each([
    [5, 8],
    [6, 10],
    [7, 12],
    [9, 16],
  ])("with %i teams played latest-scheduled first, %i matches are played and the grand final decides it", (teamCount, expectedPlayed) => {
    // Playing later rounds first, where the byes allow it, chains several
    // settlements into one pass of the bye resolver.
    const world = playThrough(
      started("double_elimination", teamCount),
      (m) => m.awayTeamId,
      (open) => open[open.length - 1],
    );

    expect(playable(world)).toHaveLength(0);
    expect(played(world)).toHaveLength(expectedPlayed);
    expect(world.tournament.status).toBe("completed");
    expect(world.tournament.winnerId).toBe(grandFinal(world).winnerId);
  });

  it("with five teams, a losers match with no possible opponents is settled at start", () => {
    const live = started("double_elimination", 5);
    // Three first-round byes leave one losers-round-one match with nobody to feed it.
    const settledAtStart = live.matches.filter((m) => m.bracket === "losers" && m.isBye);
    expect(settledAtStart.length).toBeGreaterThanOrEqual(1);
    expect(live.tournament.status).toBe("live");
  });

  it("a losers match that can only ever have one team is won by that team", () => {
    const live = started("double_elimination", 5);
    let world = live;
    // Play the only real first-round match; its loser reaches a losers match
    // whose other feeder was a bye.
    const firstRound = live.matches.filter((m) => m.bracket === "winners" && m.round === 1 && !m.isBye);
    expect(firstRound).toHaveLength(1);
    world = win(world, firstRound[0].id, firstRound[0].homeTeamId);
    const loser = firstRound[0].awayTeamId;

    const settledByBye = world.matches.find(
      (m): m is Match => m.bracket === "losers" && m.isBye === true && m.winnerId === loser,
    );
    expect(settledByBye).toBeDefined();
    // And the loser has moved on to the next losers round.
    const onward = world.matches.find(
      (m) => m.bracket === "losers" && !m.isBye && (m.homeTeamId === loser || m.awayTeamId === loser),
    );
    expect(onward).toBeDefined();
  });
});
