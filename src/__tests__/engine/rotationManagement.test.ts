import { describe, expect, it } from "vitest";
import type { Match, TournamentFormat } from "@/types/game";
import { addTeam, draftWorld, entryOf, find, NOW, openOn, run, started, win, withdraw, type World } from "./helpers";

/** The rotation state of whichever rotation format the world is. */
const stateOf = (world: World) => {
  const state = world.tournament.win2outState ?? world.tournament.twoMatchRotationState;
  if (!state) throw new Error("The tournament has no rotation state");
  return state;
};

const statusOf = (world: World, teamId: string) => {
  const status = stateOf(world).teamStatuses.find((s) => s.teamId === teamId);
  if (!status) throw new Error(`No status for ${teamId}`);
  return status;
};


const courtTeams = (world: World) =>
  [...stateOf(world).courts]
    .sort((a, b) => a.courtNumber - b.courtNumber)
    .map((court) => [court.courtNumber, ...court.teamIds]);

const setCourts = (world: World, courts: number): World =>
  run(world, { type: "change_courts", courts });

const swap = (world: World, teamId: string, withTeamId: string): World =>
  run(world, { type: "swap_teams", teamId, withTeamId });

const move = (world: World, teamId: string, position: number): World =>
  run(world, { type: "reorder_queue", teamId, position });

/** The world with one match changed, the way a per-match score write would. */
const withMatch = (world: World, matchId: string, changes: Partial<Match>): World => ({
  ...world,
  matches: world.matches.map((m) => (m.id === matchId ? { ...m, ...changes } : m)),
});

const addsATeam = (format: TournamentFormat) => {
  it("enters the team and puts it at the back of the queue", () => {
    // Court 1: t1 v t2. Queue: t3, t4.
    const live = started(format, 4);

    const world = addTeam(live, "t5");

    expect(stateOf(world).queue).toEqual(["t3", "t4", "t5"]);
    expect(world.tournament.entries.at(-1)).toEqual({
      teamId: "t5",
      name: "Team t5",
      color: "#111111",
    });
    expect(world.tournament.teamIds).toEqual(["t1", "t2", "t3", "t4", "t5"]);
    expect(statusOf(world, "t5").currentCourt).toBeUndefined();
    expect(world.matches).toEqual(live.matches);
  });

  it("refuses a team that is already in the tournament", () => {
    const live = started(format, 4);

    expect(() => addTeam(live, "t3")).toThrow(/already in this tournament/);
  });

  it("refuses to add a team before the tournament starts", () => {
    expect(() => addTeam(draftWorld(format, 4), "t5")).toThrow(/live/);
  });
};

const withdrawsATeam = (format: TournamentFormat) => {
  it("takes a waiting team out of the queue and marks its entry withdrawn", () => {
    // Court 1: t1 v t2. Queue: t3, t4, t5.
    const live = started(format, 5);

    const world = withdraw(live, "t4");

    expect(stateOf(world).queue).toEqual(["t3", "t5"]);
    expect(entryOf(world, "t4").withdrawnAt).toBe(NOW);
    expect(world.tournament.teamIds).toEqual(["t1", "t2", "t3", "t4", "t5"]);
    expect(courtTeams(world)).toEqual([[1, "t1", "t2"]]);
    expect(world.matches).toEqual(live.matches);
    expect(statusOf(world, "t4").currentCourt).toBeUndefined();
  });

  it("takes a team off its court: the team it was playing stays, and the next in the queue comes on", () => {
    // t1 beats t2 and stays on court 1 against t3; queue: t4, t5, t2.
    const live = started(format, 5);
    const played = win(live, live.matches[0].id, "t1");
    const open = openOn(played, 1);

    const world = withdraw(played, "t3");

    expect(courtTeams(world)).toEqual([[1, "t1", "t4"]]);
    expect(stateOf(world).queue).toEqual(["t5", "t2"]);
    expect(find(world, { id: open.id })).toMatchObject({
      homeTeamId: "t1",
      awayTeamId: "t4",
      status: "pending",
      homeScore: 0,
      awayScore: 0,
      court: 1,
    });
    expect(world.matches).toHaveLength(2);
    expect(statusOf(world, "t1")).toEqual(statusOf(played, "t1"));
    expect(statusOf(world, "t4").currentCourt).toBe(1);
    expect(entryOf(world, "t3").withdrawnAt).toBe(NOW);
  });

  it("closes the court when nobody is waiting, and the team left on it goes to the front of the queue", () => {
    // Court 1: t1 v t2. Court 2: t3 v t4. Queue: empty.
    const live = started(format, 4, { courts: 2 });
    const court2 = find(live, { court: 2 });

    const world = withdraw(live, "t4");

    expect(courtTeams(world)).toEqual([[1, "t1", "t2"]]);
    expect(stateOf(world).queue).toEqual(["t3"]);
    expect(world.matches.map((m) => m.id)).toEqual(
      live.matches.filter((m) => m.id !== court2.id).map((m) => m.id),
    );
    expect(statusOf(world, "t3").currentCourt).toBeUndefined();
    expect(stateOf(world).numberOfCourts).toBe(2);
  });

  it("abandons a match in play when one of its teams withdraws: the court starts over with the next team", () => {
    const live = started(format, 4);
    const matchId = live.matches[0].id;
    const scoring = withMatch(live, matchId, { status: "in_progress", homeScore: 21, awayScore: 18 });

    const world = withdraw(scoring, "t2");

    expect(find(world, { id: matchId })).toMatchObject({
      homeTeamId: "t1",
      awayTeamId: "t3",
      status: "pending",
      homeScore: 0,
      awayScore: 0,
    });
    expect(stateOf(world).queue).toEqual(["t4"]);
  });

  it("lets a withdrawn team rejoin at the back of the queue with its record kept", () => {
    const live = started(format, 5);
    const played = win(live, live.matches[0].id, "t1");
    const left = withdraw(played, "t1");

    const world = addTeam(left, "t1");

    expect(entryOf(world, "t1").withdrawnAt).toBeUndefined();
    expect(world.tournament.entries).toHaveLength(5);
    expect(world.tournament.teamIds).toEqual(live.tournament.teamIds);
    expect(stateOf(world).queue.at(-1)).toBe("t1");
    expect(statusOf(world, "t1")).toEqual(statusOf(left, "t1"));
    expect(statusOf(world, "t1")).toMatchObject(
      format === "win2out" ? { matchesPlayed: 1 } : { totalMatches: 1, totalWins: 1 },
    );
  });

  it("reopens a court that had closed once a new team lets the queue fill it", () => {
    // Court 2 closes when t4 withdraws with nobody waiting; t3 waits alone.
    const live = started(format, 4, { courts: 2 });
    const short = withdraw(live, "t4");
    expect(courtTeams(short)).toEqual([[1, "t1", "t2"]]);

    const world = addTeam(short, "t5");

    expect(courtTeams(world)).toEqual([
      [1, "t1", "t2"],
      [2, "t3", "t5"],
    ]);
    expect(stateOf(world).queue).toEqual([]);
    expect(openOn(world, 2)).toMatchObject({ homeTeamId: "t3", awayTeamId: "t5", status: "pending" });
    expect(world.matches).toHaveLength(2);
    expect(statusOf(world, "t3").currentCourt).toBe(2);
    expect(statusOf(world, "t5").currentCourt).toBe(2);
  });

  it("means a result that queued the team can no longer be undone", () => {
    const live = started(format, 5);
    const matchId = live.matches[0].id;
    const played = win(live, matchId, "t1");

    const world = withdraw(played, "t2");

    expect(() => run(world, { type: "undo_result", matchId })).toThrow(/undone/);
  });

  it("refuses a team that is not in the tournament, or has already withdrawn", () => {
    const live = started(format, 4);

    expect(() => withdraw(live, "t9")).toThrow(/not in this tournament/);
    expect(() => withdraw(withdraw(live, "t3"), "t3")).toThrow(/already withdrawn/);
  });

  it("refuses to withdraw before the tournament starts", () => {
    expect(() => withdraw(draftWorld(format, 4), "t3")).toThrow(/live/);
  });
};

const changesCourts = (format: TournamentFormat) => {
  it("closing a court sends its teams to the front of the queue, ahead of everyone waiting", () => {
    // Court 1: t1 v t2. Court 2: t3 v t4. Queue: t5, t6.
    const live = started(format, 6, { courts: 2 });
    const court2 = find(live, { court: 2 });

    const world = setCourts(live, 1);

    expect(courtTeams(world)).toEqual([[1, "t1", "t2"]]);
    expect(stateOf(world).queue).toEqual(["t3", "t4", "t5", "t6"]);
    expect(world.tournament.settings.courts).toBe(1);
    expect(stateOf(world).numberOfCourts).toBe(1);
    expect(world.matches.map((m) => m.id)).toEqual(
      live.matches.filter((m) => m.id !== court2.id).map((m) => m.id),
    );
    expect(statusOf(world, "t3").currentCourt).toBeUndefined();
    expect(statusOf(world, "t4").currentCourt).toBeUndefined();
  });

  it("closing several courts queues their teams in court order and ends their runs", () => {
    const live = started(format, 6, { courts: 3 });
    // t3 beats t4 on court 2 and is mid-run there when the court closes; with
    // nobody waiting, t4 came straight back on as its challenger.
    const played = win(live, find(live, { court: 2 }).id, "t3");
    expect(courtTeams(played)[1]).toEqual([2, "t3", "t4"]);

    const world = setCourts(played, 1);

    expect(courtTeams(world)).toEqual([[1, "t1", "t2"]]);
    expect(stateOf(world).queue).toEqual(["t3", "t4", "t5", "t6"]);
    expect(statusOf(world, "t3")).toMatchObject(
      format === "win2out" ? { winStreak: 0, matchesPlayed: 1 } : { sessionMatches: 0, totalWins: 1 },
    );
    expect(world.matches.filter((m) => m.status !== "completed")).toHaveLength(1);
  });

  it("opening a court fills it from the front of the queue", () => {
    // Court 1: t1 v t2. Queue: t3, t4, t5, t6.
    const live = started(format, 6);

    const world = setCourts(live, 2);

    expect(courtTeams(world)).toEqual([
      [1, "t1", "t2"],
      [2, "t3", "t4"],
    ]);
    expect(stateOf(world).queue).toEqual(["t5", "t6"]);
    expect(world.tournament.settings.courts).toBe(2);
    expect(openOn(world, 2)).toMatchObject({
      homeTeamId: "t3",
      awayTeamId: "t4",
      status: "pending",
      court: 2,
    });
    expect(find(world, { id: live.matches[0].id })).toEqual(live.matches[0]);
    expect(statusOf(world, "t3").currentCourt).toBe(2);
    expect(statusOf(world, "t4").currentCourt).toBe(2);
  });

  it("closing a court means a result that had queued one of its teams can no longer be undone", () => {
    // Court 1: t1 v t2. Court 2: t3 v t4. Queue: t5. t1 wins, so t2 queues
    // and t5 comes on; t3 wins, so t4 queues and t2 comes onto court 2.
    const live = started(format, 5, { courts: 2 });
    const court1Id = find(live, { court: 1 }).id;
    const afterCourt1 = win(live, court1Id, "t1");
    const afterCourt2 = win(afterCourt1, find(afterCourt1, { court: 2 }).id, "t3");
    expect(courtTeams(afterCourt2)[1]).toEqual([2, "t3", "t2"]);

    const world = setCourts(afterCourt2, 1);

    expect(stateOf(world).queue).toEqual(["t3", "t2", "t4"]);
    expect(() => run(world, { type: "undo_result", matchId: court1Id })).toThrow(/undone/);
  });

  it("refuses more courts than the teams can fill, and fewer than one", () => {
    const live = started(format, 5);

    expect(() => setCourts(live, 3)).toThrow(/at least 6 teams/);
    expect(() => setCourts(live, 0)).toThrow(/at least one court/);
  });

  it("counts withdrawn teams out when deciding how many courts the teams can fill", () => {
    const live = started(format, 6, { courts: 2 });
    const short = withdraw(withdraw(live, "t5"), "t6");

    expect(() => setCourts(short, 3)).toThrow(/at least 6 teams/);
  });

  it("refuses to change courts before the tournament starts", () => {
    expect(() => setCourts(draftWorld(format, 4), 2)).toThrow(/live/);
  });
};

const swapsTeams = (format: TournamentFormat) => {
  it("swaps two teams between courts, and both courts' matches take the new pairing", () => {
    // Court 1: t1 v t2. Court 2: t3 v t4. Queue: t5, t6.
    const live = started(format, 6, { courts: 2 });
    const court1 = find(live, { court: 1 });
    const court2 = find(live, { court: 2 });

    const world = swap(live, "t2", "t3");

    expect(courtTeams(world)).toEqual([
      [1, "t1", "t3"],
      [2, "t2", "t4"],
    ]);
    expect(stateOf(world).queue).toEqual(["t5", "t6"]);
    expect(find(world, { id: court1.id })).toMatchObject({ homeTeamId: "t1", awayTeamId: "t3", status: "pending" });
    expect(find(world, { id: court2.id })).toMatchObject({ homeTeamId: "t2", awayTeamId: "t4", status: "pending" });
    expect(world.matches).toHaveLength(2);
    expect(statusOf(world, "t2").currentCourt).toBe(2);
    expect(statusOf(world, "t3").currentCourt).toBe(1);
  });

  it("swaps a team on a court with one waiting in the queue", () => {
    const live = started(format, 6, { courts: 2 });
    const court1 = find(live, { court: 1 });

    const world = swap(live, "t2", "t5");

    expect(courtTeams(world)).toEqual([
      [1, "t1", "t5"],
      [2, "t3", "t4"],
    ]);
    expect(stateOf(world).queue).toEqual(["t2", "t6"]);
    expect(find(world, { id: court1.id })).toMatchObject({ homeTeamId: "t1", awayTeamId: "t5" });
    expect(statusOf(world, "t2").currentCourt).toBeUndefined();
    expect(statusOf(world, "t5").currentCourt).toBe(1);
  });

  it("keeps a team's run when it goes to another court, and ends it when it goes to the queue", () => {
    // t1 wins on court 1 and is one match into its run there.
    const live = started(format, 6, { courts: 2 });
    const played = win(live, find(live, { court: 1 }).id, "t1");
    const midRun = format === "win2out" ? { winStreak: 1 } : { sessionMatches: 1 };
    const fresh = format === "win2out" ? { winStreak: 0 } : { sessionMatches: 0 };
    expect(statusOf(played, "t1")).toMatchObject(midRun);

    const moved = swap(played, "t1", "t3");
    expect(statusOf(moved, "t1")).toMatchObject({ ...midRun, currentCourt: 2 });

    // t6 waits at the front of the queue, so t1 takes its place there.
    const benched = swap(moved, "t1", "t6");
    expect(statusOf(benched, "t1")).toMatchObject({ ...fresh, currentCourt: undefined });
    expect(stateOf(benched).queue).toEqual(["t1", "t2"]);
    expect(statusOf(benched, "t6").currentCourt).toBe(2);
  });

  it("means the last result on a swapped court can no longer be undone", () => {
    const live = started(format, 6, { courts: 2 });
    const matchId = find(live, { court: 1 }).id;
    const played = win(live, matchId, "t1");

    const world = swap(played, "t1", "t3");

    expect(() => run(world, { type: "undo_result", matchId })).toThrow(/undone/);
  });

  it("means a result that had queued a team now swapped back into the queue can no longer be undone", () => {
    // Court 1: t1 v t2. Court 2: t3 v t4. Queue: t5. t1 wins, so t2 queues
    // and t5 comes on; t3 wins, so t4 queues and t2 comes onto court 2.
    const live = started(format, 5, { courts: 2 });
    const court1Id = find(live, { court: 1 }).id;
    const afterCourt1 = win(live, court1Id, "t1");
    const afterCourt2 = win(afterCourt1, find(afterCourt1, { court: 2 }).id, "t3");
    expect(courtTeams(afterCourt2)[1]).toEqual([2, "t3", "t2"]);

    // t2 trades places with t4, who is waiting, and is back in the queue.
    const world = swap(afterCourt2, "t2", "t4");

    expect(stateOf(world).queue).toEqual(["t2"]);
    expect(() => run(world, { type: "undo_result", matchId: court1Id })).toThrow(/undone/);
  });

  it("refuses a swap on a court whose match is in play", () => {
    const live = started(format, 6, { courts: 2 });
    const scoring = withMatch(live, find(live, { court: 1 }).id, { status: "in_progress", homeScore: 3 });

    expect(() => swap(scoring, "t2", "t3")).toThrow(/in play/);
    expect(() => swap(scoring, "t5", "t1")).toThrow(/in play/);
  });

  it("refuses a team with itself, two teams on the same court, two waiting teams, and a team that is not playing", () => {
    const live = started(format, 6, { courts: 2 });

    expect(() => swap(live, "t1", "t1")).toThrow(/two different teams/);
    expect(() => swap(live, "t1", "t2")).toThrow(/same court/);
    expect(() => swap(live, "t5", "t6")).toThrow(/waiting in the queue/);
    expect(() => swap(live, "t1", "t9")).toThrow(/not in this tournament/);
    expect(() => swap(withdraw(live, "t5"), "t1", "t5")).toThrow(/withdrawn/);
  });

  it("refuses to swap before the tournament starts", () => {
    expect(() => swap(draftWorld(format, 4), "t1", "t3")).toThrow(/live/);
  });
};

const reordersTheQueue = (format: TournamentFormat) => {
  it("moves a waiting team to a place in the queue, counted from the front", () => {
    // Court 1: t1 v t2. Queue: t3, t4, t5, t6.
    const live = started(format, 6);

    const toFront = move(live, "t5", 0);
    expect(stateOf(toFront).queue).toEqual(["t5", "t3", "t4", "t6"]);

    const toBack = move(toFront, "t3", 3);
    expect(stateOf(toBack).queue).toEqual(["t5", "t4", "t6", "t3"]);

    const oneDown = move(toBack, "t5", 1);
    expect(stateOf(oneDown).queue).toEqual(["t4", "t5", "t6", "t3"]);

    expect(courtTeams(oneDown)).toEqual(courtTeams(live));
    expect(oneDown.matches).toEqual(live.matches);
    expect(stateOf(oneDown).teamStatuses).toEqual(stateOf(live).teamStatuses);
  });

  it("puts a team last when the place is past the end, and first when it is before the start", () => {
    const live = started(format, 6);

    expect(stateOf(move(live, "t3", 99)).queue).toEqual(["t4", "t5", "t6", "t3"]);
    expect(stateOf(move(live, "t6", -5)).queue).toEqual(["t6", "t3", "t4", "t5"]);
  });

  it("leaves the last result undoable: the team it queued goes back where it was", () => {
    // t1 beats t2: t2 joins the queue behind t4 and t5, and t3 comes on.
    const live = started(format, 5);
    const matchId = live.matches[0].id;
    const played = win(live, matchId, "t1");
    expect(stateOf(played).queue).toEqual(["t4", "t5", "t2"]);

    const reordered = move(played, "t2", 0);
    const world = run(reordered, { type: "undo_result", matchId });

    expect(stateOf(world).queue).toEqual(["t3", "t4", "t5"]);
    expect(courtTeams(world)).toEqual([[1, "t1", "t2"]]);
  });

  it("refuses a team that is not waiting in the queue", () => {
    const live = started(format, 6);

    expect(() => move(live, "t1", 0)).toThrow(/not in the queue/);
    expect(() => move(live, "t9", 0)).toThrow(/not in the queue/);
  });

  it("refuses to reorder before the tournament starts", () => {
    expect(() => move(draftWorld(format, 4), "t3", 0)).toThrow(/live/);
  });
};

describe("rotation management", () => {
  it("refuses to change courts, swap teams, or reorder for a format without a queue", () => {
    const live = started("round_robin", 3);

    expect(() => setCourts(live, 2)).toThrow(/Only Win 2 & Out and Two Match Rotation/);
    expect(() => swap(live, "t1", "t2")).toThrow(/Only Win 2 & Out and Two Match Rotation/);
    expect(() => move(live, "t1", 0)).toThrow(/Only Win 2 & Out and Two Match Rotation/);
  });

  describe("Win 2 & Out", () => {
    describe("add team", () => {
      addsATeam("win2out");
    });

    describe("withdraw", () => {
      withdrawsATeam("win2out");
    });

    describe("change courts", () => {
      changesCourts("win2out");
    });

    describe("swap teams", () => {
      swapsTeams("win2out");
    });

    describe("reorder queue", () => {
      reordersTheQueue("win2out");
    });
  });

  describe("Two Match Rotation", () => {
    describe("add team", () => {
      addsATeam("two_match_rotation");
    });

    describe("withdraw", () => {
      withdrawsATeam("two_match_rotation");
    });

    describe("change courts", () => {
      changesCourts("two_match_rotation");
    });

    describe("swap teams", () => {
      swapsTeams("two_match_rotation");

      it("a team that arrives mid-run on a court still in its first match goes to the queue after its second match", () => {
        // t1 beats t2 on court 1 and has one match of its run; court 2 has not played.
        const live = started("two_match_rotation", 6, { courts: 2 });
        const played = win(live, find(live, { court: 1 }).id, "t1");
        const moved = swap(played, "t1", "t3");
        expect(courtTeams(moved)[1]).toEqual([2, "t1", "t4"]);

        const world = win(moved, openOn(moved, 2).id, "t1");

        expect(statusOf(world, "t1")).toMatchObject({
          sessionMatches: 0,
          totalMatches: 2,
          totalWins: 2,
          currentCourt: undefined,
        });
        expect(stateOf(world).queue.at(-1)).toBe("t1");
        expect(courtTeams(world)[1]).toEqual([2, "t4", "t6"]);
      });
    });

    describe("reorder queue", () => {
      reordersTheQueue("two_match_rotation");
    });
  });
});
