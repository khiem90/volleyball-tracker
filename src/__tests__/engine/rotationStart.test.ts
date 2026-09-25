import { describe, expect, it } from "vitest";
import { draftWorld, find, run, started, win } from "./helpers";

describe("rotation formats", () => {
  it("Win 2 & Out starts one match per court, numbered, and queues the rest", () => {
    const world = started("win2out", 5, { courts: 2 });

    expect(world.tournament.status).toBe("live");
    expect(world.matches).toHaveLength(2);
    expect(find(world, { court: 1 })).toMatchObject({ homeTeamId: "t1", awayTeamId: "t2", position: 1 });
    expect(find(world, { court: 2 })).toMatchObject({ homeTeamId: "t3", awayTeamId: "t4", position: 2 });
    expect(world.tournament.win2outState).toMatchObject({ queue: ["t5"], numberOfCourts: 2 });
  });

  it("Two Match Rotation starts with the first match flagged on each court", () => {
    const world = started("two_match_rotation", 3);

    expect(world.matches).toHaveLength(1);
    expect(world.tournament.twoMatchRotationState).toMatchObject({
      queue: ["t3"],
      courts: [{ courtNumber: 1, teamIds: ["t1", "t2"], isFirstMatch: true }],
    });
  });

  it("refuses to start with fewer teams than the courts need", () => {
    expect(() => run(draftWorld("win2out", 3, { courts: 2 }), { type: "start" })).toThrow(/at least 4/);
  });

  it("completing a Win 2 & Out match keeps the winner on court against the next in the queue", () => {
    const live = started("win2out", 3);
    const world = win(live, live.matches[0].id, "t2");

    const next = find(world, { status: "pending" });
    expect(next).toMatchObject({ homeTeamId: "t2", awayTeamId: "t3", court: 1, tournamentId: "tournament-1" });
    expect(world.tournament.win2outState?.queue).toEqual(["t1"]);
    expect(world.tournament.status).toBe("live");
  });
});
