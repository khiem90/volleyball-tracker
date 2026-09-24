import { describe, expect, it } from "vitest";
import { draftWorld, find, playable, playThrough, run, started, win, type World } from "./helpers";

const played = (world: World) => world.matches.filter((m) => m.status === "completed" && !m.isBye);

describe("single elimination", () => {
  it("start seeds four teams 1v4 and 2v3 with an empty final", () => {
    const world = started("single_elimination", 4);

    expect(world.tournament.status).toBe("live");
    expect(world.matches).toHaveLength(3);
    expect(find(world, { round: 1, position: 1 })).toMatchObject({ homeTeamId: "t1", awayTeamId: "t4", status: "pending" });
    expect(find(world, { round: 1, position: 2 })).toMatchObject({ homeTeamId: "t2", awayTeamId: "t3", status: "pending" });
    expect(find(world, { round: 2, position: 1 })).toMatchObject({ homeTeamId: "", awayTeamId: "", status: "pending" });
  });

  it("a first-round winner takes its slot in the final", () => {
    const live = started("single_elimination", 4);
    const first = find(live, { round: 1, position: 1 });
    const second = find(live, { round: 1, position: 2 });

    const afterFirst = win(live, first.id, "t4");
    expect(find(afterFirst, { round: 2, position: 1 })).toMatchObject({ homeTeamId: "t4", awayTeamId: "" });

    const afterSecond = win(afterFirst, second.id, "t3");
    expect(find(afterSecond, { round: 2, position: 1 })).toMatchObject({ homeTeamId: "t4", awayTeamId: "t3" });
    expect(afterSecond.tournament.status).toBe("live");
  });

  it("refuses to score a bracket match whose opponent is not known yet", () => {
    const live = started("single_elimination", 4);
    const final = find(live, { round: 2, position: 1 });
    expect(() => win(live, final.id, "")).toThrow(/Both teams/);
  });

  it("completes when the final ends, with the final's winner as champion", () => {
    const world = playThrough(started("single_elimination", 4), (m) => m.awayTeamId);

    expect(played(world)).toHaveLength(3);
    expect(world.tournament.status).toBe("completed");
    expect(world.tournament.winnerId).toBe(find(world, { round: 2, position: 1 }).winnerId);
    expect(world.tournament.winnerId).toBe("t3");
  });

  it("does not complete while the final is still to play", () => {
    const live = started("single_elimination", 4);
    const first = find(live, { round: 1, position: 1 });
    const second = find(live, { round: 1, position: 2 });
    const world = win(win(live, first.id, "t1"), second.id, "t2");
    expect(world.tournament.status).toBe("live");
    expect(world.tournament.winnerId).toBeUndefined();
  });

  it.each([
    [5, 4],
    [6, 5],
    [7, 6],
    [8, 7],
  ])("with %i teams, %i matches are played and the final decides the champion", (teamCount, expectedPlayed) => {
    const live = started("single_elimination", teamCount);
    const world = playThrough(live);

    expect(played(world)).toHaveLength(expectedPlayed);
    expect(playable(world)).toHaveLength(0);
    expect(world.tournament.status).toBe("completed");
    const final = world.matches.reduce((best, m) => (m.round > best.round ? m : best));
    expect(final.status).toBe("completed");
    expect(world.tournament.winnerId).toBe(final.winnerId);
    expect(live.tournament.teamIds).toContain(world.tournament.winnerId);
  });

  it.each([
    [5, 4],
    [6, 5],
    [9, 8],
  ])("with %i teams played latest-scheduled first, %i matches are played", (teamCount, expectedPlayed) => {
    const world = playThrough(
      started("single_elimination", teamCount),
      (m) => m.awayTeamId,
      (open) => open[open.length - 1],
    );

    expect(played(world)).toHaveLength(expectedPlayed);
    expect(world.tournament.status).toBe("completed");
    expect(world.tournament.teamIds).toContain(world.tournament.winnerId);
  });

  it("with five teams, three byes let the top seeds skip the first round", () => {
    const live = started("single_elimination", 5);
    const byes = live.matches.filter((m) => m.isBye);
    const firstRound = live.matches.filter((m) => m.round === 1 && !m.isBye);

    expect(byes).toHaveLength(3);
    expect(byes.every((m) => m.status === "completed" && m.winnerId)).toBe(true);
    expect(firstRound).toHaveLength(1);
    expect(live.matches.filter((m) => m.round === 2)).toHaveLength(2);
    // The lone first-round match is the only thing to play right now.
    expect(playable(live).map((m) => m.id)).toEqual([...firstRound.map((m) => m.id), ...live.matches.filter((m) => m.round === 2 && m.homeTeamId && m.awayTeamId).map((m) => m.id)]);
  });

  it("start honours the chosen bye teams", () => {
    const world = run(draftWorld("single_elimination", 5), { type: "start", byeTeamIds: ["t3", "t4", "t5"] });
    const playing = world.matches.filter((m) => m.round === 1 && !m.isBye).flatMap((m) => [m.homeTeamId, m.awayTeamId]);
    expect(playing.sort()).toEqual(["t1", "t2"]);
  });

  it("stays live after a bracket with six teams has only played the first round", () => {
    const live = started("single_elimination", 6);
    let world = live;
    for (const match of playable(live)) world = win(world, match.id, match.homeTeamId);
    expect(world.tournament.status).toBe("live");
  });
});
