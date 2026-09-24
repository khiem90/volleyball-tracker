import { describe, expect, it } from "vitest";
import { find, NOW, openOn, run, started, win, type World } from "./helpers";

const state = (world: World) => {
  const current = world.tournament.twoMatchRotationState;
  if (!current) throw new Error("The tournament has no Two Match Rotation state");
  return current;
};

const statusOf = (world: World, teamId: string) => {
  const status = state(world).teamStatuses.find((s) => s.teamId === teamId);
  if (!status) throw new Error(`No status for ${teamId}`);
  return status;
};

const courtOf = (world: World, courtNumber: number) => {
  const court = state(world).courts.find((c) => c.courtNumber === courtNumber);
  if (!court) throw new Error(`No court ${courtNumber}`);
  return court;
};

describe("Two Match Rotation", () => {
  describe("queue", () => {
    it("after a court's first match the winner stays for a second and the loser joins the queue", () => {
      // Court 1: t1 v t2. Queue: t3, t4.
      const live = started("two_match_rotation", 4);

      const world = win(live, live.matches[0].id, "t1");

      expect(state(world).queue).toEqual(["t4", "t2"]);
      expect(courtOf(world, 1)).toEqual({
        courtNumber: 1,
        teamIds: ["t1", "t3"],
        isFirstMatch: false,
      });
      expect(statusOf(world, "t1")).toMatchObject({
        sessionMatches: 1,
        totalMatches: 1,
        totalWins: 1,
        totalLosses: 0,
        currentCourt: 1,
      });
      expect(statusOf(world, "t2")).toMatchObject({
        sessionMatches: 0,
        totalMatches: 1,
        totalWins: 0,
        totalLosses: 1,
        currentCourt: undefined,
      });
      expect(openOn(world, 1)).toMatchObject({ homeTeamId: "t1", awayTeamId: "t3", round: 2 });
    });

    it("sends a team to the queue after its second match even when it wins, and the other team stays", () => {
      const live = started("two_match_rotation", 4);
      const first = win(live, live.matches[0].id, "t1");

      const world = win(first, openOn(first, 1).id, "t1");

      // Queue was t4, t2. t1 joins the back and t4 comes off the front to
      // play t3, who has one match on the court.
      expect(state(world).queue).toEqual(["t2", "t1"]);
      expect(courtOf(world, 1).teamIds).toEqual(["t3", "t4"]);
      expect(statusOf(world, "t1")).toMatchObject({
        sessionMatches: 0,
        totalMatches: 2,
        totalWins: 2,
        currentCourt: undefined,
      });
      expect(statusOf(world, "t3")).toMatchObject({
        sessionMatches: 1,
        totalMatches: 1,
        totalLosses: 1,
        currentCourt: 1,
      });
      expect(openOn(world, 1)).toMatchObject({ homeTeamId: "t3", awayTeamId: "t4", round: 3 });
    });

    it("sends a team to the queue after its second match when it loses too", () => {
      const live = started("two_match_rotation", 4);
      const first = win(live, live.matches[0].id, "t1");
      const second = win(first, openOn(first, 1).id, "t1");

      // t3 loses its second match to the fresh t4.
      const world = win(second, openOn(second, 1).id, "t4");

      expect(state(world).queue).toEqual(["t1", "t3"]);
      expect(courtOf(world, 1).teamIds).toEqual(["t4", "t2"]);
      expect(statusOf(world, "t3")).toMatchObject({ sessionMatches: 0, totalMatches: 2, totalLosses: 2 });
      expect(statusOf(world, "t4")).toMatchObject({ sessionMatches: 1, totalMatches: 1, totalWins: 1 });
      expect(openOn(world, 1)).toMatchObject({ homeTeamId: "t4", awayTeamId: "t2", round: 4 });
    });

    it("gives every team two matches per visit to the court over a night", () => {
      // Four teams, the home side wins every match. The rotation repeats every
      // four matches, so after eight each team has played four.
      let world = started("two_match_rotation", 4);
      for (let i = 0; i < 8; i++) {
        const open = openOn(world, 1);
        world = win(world, open.id, open.homeTeamId);
      }

      expect(
        state(world).teamStatuses.map((s) => [s.teamId, s.totalMatches, s.totalWins]),
      ).toEqual([
        ["t1", 4, 3],
        ["t2", 4, 1],
        ["t3", 4, 2],
        ["t4", 4, 2],
      ]);
      expect(state(world).queue).toEqual(["t3", "t4"]);
      expect(courtOf(world, 1).teamIds).toEqual(["t2", "t1"]);
      expect(world.tournament.status).toBe("live");
    });
  });

  describe("two courts", () => {
    it("advances each court on its own and shares one queue between them", () => {
      // Court 1: t1 v t2. Court 2: t3 v t4. Queue: t5, t6.
      const live = started("two_match_rotation", 6, { courts: 2 });

      const afterCourt2 = win(live, find(live, { court: 2 }).id, "t3");
      const afterCourt1 = win(afterCourt2, find(afterCourt2, { court: 1 }).id, "t2");

      expect(state(afterCourt1).queue).toEqual(["t4", "t1"]);
      expect(courtOf(afterCourt1, 1)).toEqual({
        courtNumber: 1,
        teamIds: ["t2", "t6"],
        isFirstMatch: false,
      });
      expect(courtOf(afterCourt1, 2)).toEqual({
        courtNumber: 2,
        teamIds: ["t3", "t5"],
        isFirstMatch: false,
      });
      expect(openOn(afterCourt1, 1)).toMatchObject({ homeTeamId: "t2", awayTeamId: "t6" });
      expect(openOn(afterCourt1, 2)).toMatchObject({ homeTeamId: "t3", awayTeamId: "t5" });
    });
  });

  describe("instant win", () => {
    it("records the tapped team as the winner and schedules the court's next match", () => {
      const live = started("two_match_rotation", 4);
      const matchId = live.matches[0].id;

      const world = run(live, { type: "instant_win", matchId, winnerId: "t2" });

      expect(find(world, { id: matchId })).toMatchObject({
        status: "completed",
        winnerId: "t2",
        completedAt: NOW,
      });
      expect(openOn(world, 1)).toMatchObject({ homeTeamId: "t2", awayTeamId: "t3", round: 2 });
      expect(statusOf(world, "t2")).toMatchObject({ sessionMatches: 1, totalWins: 1 });
    });
  });
});
