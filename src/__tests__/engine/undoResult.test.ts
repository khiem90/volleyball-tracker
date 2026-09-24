import { describe, expect, it } from "vitest";
import type { Match, TournamentFormat } from "@/types/game";
import { find, openOn, run, started, win, type World } from "./helpers";

/** The rotation state with its undo records taken out, for comparing before and after. */
const stateOf = (world: World) => {
  const state = world.tournament.win2outState ?? world.tournament.twoMatchRotationState;
  if (!state) throw new Error("The tournament has no rotation state");
  return { ...state, undoRecords: undefined };
};

const undo = (world: World, matchId: string): World =>
  run(world, { type: "undo_result", matchId });

/** The world with one match changed, the way a per-match score write would. */
const withMatch = (world: World, matchId: string, changes: Partial<Match>): World => ({
  ...world,
  matches: world.matches.map((m) => (m.id === matchId ? { ...m, ...changes } : m)),
});

const restoresPreviousState = (format: TournamentFormat) => {
  it("puts an instant win back: the match is unplayed, the scheduled match is gone, the state is as it was", () => {
    const live = started(format, 5);
    const matchId = live.matches[0].id;
    const played = run(live, { type: "instant_win", matchId, winnerId: "t1" });
    expect(played.matches).toHaveLength(2);

    const world = undo(played, matchId);

    expect(world.matches).toEqual(live.matches);
    expect(openOn(world, 1)).toMatchObject({ homeTeamId: "t1", awayTeamId: "t2", round: 1 });
    expect(stateOf(world)).toEqual(stateOf(live));
    expect(world.tournament.status).toBe("live");
  });

  it("puts a result back that sent both teams to the queue and pulled two fresh ones on", () => {
    const live = started(format, 5);
    const first = win(live, live.matches[0].id, "t1");
    const secondId = openOn(first, 1).id;
    const second = win(first, secondId, "t1");
    expect(stateOf(second).queue).toHaveLength(3);

    const world = undo(second, secondId);

    expect(world.matches).toEqual(first.matches);
    expect(stateOf(world)).toEqual(stateOf(first));
  });

  it("undoes a court's results one at a time in reverse order", () => {
    const live = started(format, 5);
    const firstId = live.matches[0].id;
    const first = win(live, firstId, "t1");
    const secondId = openOn(first, 1).id;
    // The team from the queue wins the second match, so the team that stayed
    // is the one queued this time.
    const second = win(first, secondId, openOn(first, 1).awayTeamId);

    expect(() => undo(second, firstId)).toThrow(/moved on/);

    const backOne = undo(second, secondId);
    expect(stateOf(backOne)).toEqual(stateOf(first));
    const backTwo = undo(backOne, firstId);
    expect(stateOf(backTwo)).toEqual(stateOf(live));
    expect(backTwo.matches).toEqual(live.matches);
  });

  it("restores the points a match had before it was completed from the scoring page", () => {
    const live = started(format, 4);
    const matchId = live.matches[0].id;
    const scoring = withMatch(live, matchId, { status: "in_progress", homeScore: 25, awayScore: 18 });
    const played = run(scoring, { type: "complete_match", matchId, homeScore: 25, awayScore: 18 });

    const world = undo(played, matchId);

    expect(find(world, { id: matchId })).toMatchObject({
      status: "in_progress",
      homeScore: 25,
      awayScore: 18,
    });
    expect(find(world, { id: matchId }).winnerId).toBeUndefined();
    expect(find(world, { id: matchId }).completedAt).toBeUndefined();
  });
};

const leavesOtherCourtsAlone = (format: TournamentFormat) => {
  it("undoing court 1's result leaves a result that landed on court 2 afterwards in place", () => {
    // Court 1: t1 v t2. Court 2: t3 v t4. Queue: t5, t6.
    const live = started(format, 6, { courts: 2 });
    const court1Id = find(live, { court: 1 }).id;
    const court2Id = find(live, { court: 2 }).id;
    // t1 wins on court 1: t2 queues, t5 comes on. Then t4 wins on court 2: t3
    // queues, t6 comes on.
    const afterCourt1 = win(live, court1Id, "t1");
    const afterCourt2 = win(afterCourt1, court2Id, "t4");
    expect(stateOf(afterCourt2).queue).toEqual(["t2", "t3"]);

    const world = undo(afterCourt2, court1Id);

    // t5 goes back to the head of the queue and t2 back onto court 1; court
    // 2's result, with t6 on it, stands.
    expect(stateOf(world).queue).toEqual(["t5", "t3"]);
    expect(stateOf(world).courts.map((c) => c.teamIds)).toEqual([
      ["t1", "t2"],
      ["t4", "t6"],
    ]);
    expect(find(world, { id: court1Id })).toMatchObject({ status: "pending", homeScore: 0, awayScore: 0 });
    expect(find(world, { id: court2Id })).toMatchObject({ status: "completed", winnerId: "t4" });
    expect(openOn(world, 2)).toMatchObject({ homeTeamId: "t4", awayTeamId: "t6" });
    expect(world.matches).toHaveLength(3);
    expect(stateOf(world).teamStatuses.find((s) => s.teamId === "t5")?.currentCourt).toBeUndefined();
    expect(stateOf(world).teamStatuses.find((s) => s.teamId === "t6")?.currentCourt).toBe(2);
  });

  it("is refused once a team the result queued has been pulled onto another court", () => {
    // Court 1: t1 v t2. Court 2: t3 v t4. Queue: t5.
    const live = started(format, 5, { courts: 2 });
    const court1Id = find(live, { court: 1 }).id;
    // t1 wins: t2 queues behind t5, t5 comes on. Then t3 wins on court 2 and
    // t2 is the next in line, so t2 is now playing on court 2.
    const afterCourt1 = win(live, court1Id, "t1");
    const afterCourt2 = win(afterCourt1, find(afterCourt1, { court: 2 }).id, "t3");
    expect(stateOf(afterCourt2).courts.find((c) => c.courtNumber === 2)?.teamIds).toContain("t2");

    expect(() => undo(afterCourt2, court1Id)).toThrow(/moved on/);
  });
};

const isRefusedWhenTheCourtHasMovedOn = (format: TournamentFormat) => {
  it("is refused once the court's next match has points on the board", () => {
    const live = started(format, 4);
    const matchId = live.matches[0].id;
    const played = run(live, { type: "instant_win", matchId, winnerId: "t1" });
    const scoring = withMatch(played, openOn(played, 1).id, { status: "in_progress", homeScore: 1 });

    expect(() => undo(scoring, matchId)).toThrow(/moved on/);
  });

  it("is refused for a match that was never completed", () => {
    const live = started(format, 4);

    expect(() => undo(live, live.matches[0].id)).toThrow(/no longer be undone/);
    expect(() => undo(live, "no-such-match")).toThrow(/no longer be undone/);
  });

  it("is refused twice for the same result", () => {
    const live = started(format, 4);
    const matchId = live.matches[0].id;
    const played = run(live, { type: "instant_win", matchId, winnerId: "t1" });
    const undone = undo(played, matchId);

    expect(() => undo(undone, matchId)).toThrow(/no longer be undone/);
  });

  it("is refused once the tournament has ended", () => {
    const live = started(format, 4);
    const matchId = live.matches[0].id;
    const played = run(live, { type: "instant_win", matchId, winnerId: "t1" });
    const ended = run(played, { type: "end" });

    expect(() => undo(ended, matchId)).toThrow(/live/);
  });

  it("keeps the last five results on a court undoable and no more", () => {
    let world = started(format, 4);
    const played: string[] = [];
    for (let i = 0; i < 6; i++) {
      const open = openOn(world, 1);
      played.push(open.id);
      world = win(world, open.id, open.homeTeamId);
    }

    for (const matchId of played.slice(1).reverse()) world = undo(world, matchId);
    expect(() => undo(world, played[0])).toThrow(/no longer be undone/);
  });
};

describe("undo result", () => {
  describe("Win 2 & Out", () => {
    restoresPreviousState("win2out");
    leavesOtherCourtsAlone("win2out");
    isRefusedWhenTheCourtHasMovedOn("win2out");
  });

  describe("Two Match Rotation", () => {
    restoresPreviousState("two_match_rotation");
    leavesOtherCourtsAlone("two_match_rotation");
    isRefusedWhenTheCourtHasMovedOn("two_match_rotation");
  });

  it("is refused for formats without a queue", () => {
    const live = started("round_robin", 3);
    const matchId = live.matches[0].id;
    const played = win(live, matchId, live.matches[0].homeTeamId);

    expect(() => undo(played, matchId)).toThrow(/Only Win 2 & Out and Two Match Rotation/);
  });
});
