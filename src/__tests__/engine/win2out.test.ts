import { describe, expect, it } from "vitest";
import { getChampionCount } from "@/lib/win2out";
import { find, NOW, openOn, playable, run, started, win, type World } from "./helpers";

const state = (world: World) => {
  const current = world.tournament.win2outState;
  if (!current) throw new Error("The tournament has no Win 2 & Out state");
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

describe("Win 2 & Out", () => {
  describe("queue", () => {
    it("sends the loser to the back of the queue and the front of the queue onto the court", () => {
      // Court 1: t1 v t2. Queue: t3, t4, t5.
      const live = started("win2out", 5);

      const world = win(live, live.matches[0].id, "t1");

      expect(state(world).queue).toEqual(["t4", "t5", "t2"]);
      expect(courtOf(world, 1)).toEqual({
        courtNumber: 1,
        teamIds: ["t1", "t3"],
        currentChampionId: "t1",
      });
      expect(openOn(world, 1)).toMatchObject({
        homeTeamId: "t1",
        awayTeamId: "t3",
        round: 2,
        court: 1,
        status: "pending",
      });
      expect(world.matches).toHaveLength(2);
    });

    it("hands the court to the next team from the queue when it beats the team that stayed", () => {
      const live = started("win2out", 5);
      const first = win(live, live.matches[0].id, "t1");

      const world = win(first, openOn(first, 1).id, "t3");

      expect(state(world).queue).toEqual(["t5", "t2", "t1"]);
      expect(courtOf(world, 1)).toMatchObject({ teamIds: ["t3", "t4"], currentChampionId: "t3" });
      expect(statusOf(world, "t3")).toMatchObject({ winStreak: 1, matchesPlayed: 1 });
      expect(statusOf(world, "t1")).toMatchObject({ winStreak: 0, matchesPlayed: 2 });
      expect(getChampionCount(state(world), "t1")).toBe(0);
    });
  });

  describe("champion streaks", () => {
    it("makes a team champion on its second straight win and sends it to the queue behind the loser", () => {
      const live = started("win2out", 5);
      const first = win(live, live.matches[0].id, "t1");

      const world = win(first, openOn(first, 1).id, "t1");

      // Queue was t4, t5, t2. The loser t3 joins, then the champion t1, then
      // t4 and t5 come off the front for a fresh match.
      expect(state(world).queue).toEqual(["t2", "t3", "t1"]);
      expect(courtOf(world, 1)).toEqual({
        courtNumber: 1,
        teamIds: ["t4", "t5"],
        currentChampionId: undefined,
      });
      expect(openOn(world, 1)).toMatchObject({ homeTeamId: "t4", awayTeamId: "t5", round: 3 });
      expect(statusOf(world, "t1")).toMatchObject({ winStreak: 0, matchesPlayed: 2 });
      expect(getChampionCount(state(world), "t1")).toBe(1);
    });

    it("counts every time a team becomes champion over a night", () => {
      // t1 wins every match it plays; everyone else loses to t1 and the home
      // team wins otherwise.
      const live = started("win2out", 4);
      let world = live;
      for (let i = 0; i < 12; i++) {
        const open = openOn(world, 1);
        const winner = [open.homeTeamId, open.awayTeamId].includes("t1") ? "t1" : open.homeTeamId;
        world = win(world, open.id, winner);
      }

      // t1 plays two, becomes champion, sits out two, and comes back: champion
      // three times in twelve matches.
      expect(getChampionCount(state(world), "t1")).toBe(3);
      expect(statusOf(world, "t1").matchesPlayed).toBe(6);
      expect(world.tournament.status).toBe("live");
    });
  });

  describe("two courts", () => {
    it("advances each court on its own and shares one queue between them", () => {
      // Court 1: t1 v t2. Court 2: t3 v t4. Queue: t5, t6.
      const live = started("win2out", 6, { courts: 2 });

      const afterCourt2 = win(live, find(live, { court: 2 }).id, "t4");

      expect(state(afterCourt2).queue).toEqual(["t6", "t3"]);
      expect(courtOf(afterCourt2, 2).teamIds).toEqual(["t4", "t5"]);
      expect(courtOf(afterCourt2, 1).teamIds).toEqual(["t1", "t2"]);
      expect(find(afterCourt2, { court: 1 })).toMatchObject({ status: "pending", homeTeamId: "t1" });

      const afterCourt1 = win(afterCourt2, find(afterCourt2, { court: 1 }).id, "t2");

      expect(state(afterCourt1).queue).toEqual(["t3", "t1"]);
      expect(courtOf(afterCourt1, 1).teamIds).toEqual(["t2", "t6"]);
      expect(courtOf(afterCourt1, 2).teamIds).toEqual(["t4", "t5"]);
      const open = playable(afterCourt1).sort((a, b) => (a.court ?? 0) - (b.court ?? 0));
      expect(open.map((m) => [m.court, m.homeTeamId, m.awayTeamId])).toEqual([
        [1, "t2", "t6"],
        [2, "t4", "t5"],
      ]);
    });
  });

  describe("instant win", () => {
    it("records the tapped team as the winner and schedules the court's next match", () => {
      const live = started("win2out", 4);
      const matchId = live.matches[0].id;

      const world = run(live, { type: "instant_win", matchId, winnerId: "t2" });

      expect(find(world, { id: matchId })).toMatchObject({
        status: "completed",
        winnerId: "t2",
        completedAt: NOW,
      });
      expect(openOn(world, 1)).toMatchObject({ homeTeamId: "t2", awayTeamId: "t3", round: 2 });
      expect(state(world).queue).toEqual(["t4", "t1"]);
    });

    it("refuses a winner who is not playing that match", () => {
      const live = started("win2out", 4);

      expect(() =>
        run(live, { type: "instant_win", matchId: live.matches[0].id, winnerId: "t4" }),
      ).toThrow(/not playing/);
    });
  });
});
