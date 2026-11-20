import { describe, expect, it } from "vitest";
import { EngineError } from "@/lib/engine";
import type { Entry, TournamentFormat } from "@/types/game";
import { draftWorld, entryOf, find, openOn, run, win, withdraw, type World } from "./helpers";

/** The players of each mixed team, by team id. No roster team exists for any of them. */
const PLAYERS: Record<string, string[]> = {
  t1: ["Ana", "Ben"],
  t2: ["Cy", "Dee"],
  t3: ["Eve", "Fay"],
  t4: ["Gus", "Hal"],
  t5: ["Ida", "Jo"],
};

/** A live tournament whose every entry is a mixed team. */
const startedWithMixedTeams = (format: TournamentFormat, teamCount: number): World => {
  const draft = draftWorld(format, teamCount);
  const entries: Entry[] = draft.tournament.entries.map((entry) => ({
    ...entry,
    players: PLAYERS[entry.teamId],
  }));
  return run({ ...draft, tournament: { ...draft.tournament, entries } }, { type: "start" });
};

/** Bring a withdrawn team back the way the console does: under the name and color its entry has. */
const bringBack = (world: World, teamId: string): World => {
  const entry = entryOf(world, teamId);
  return run(world, {
    type: "add_team",
    teamId,
    name: entry.name,
    ...(entry.color !== undefined && { color: entry.color }),
  });
};

describe("a mixed team in a rotation tournament", () => {
  it("keeps its players when it is withdrawn and leaves the queue", () => {
    const live = startedWithMixedTeams("win2out", 5);
    expect(live.tournament.win2outState?.queue).toEqual(["t3", "t4", "t5"]);

    const after = withdraw(live, "t4");

    expect(entryOf(after, "t4")).toMatchObject({ players: ["Gus", "Hal"] });
    expect(entryOf(after, "t4").withdrawnAt).toBeDefined();
    expect(after.tournament.win2outState?.queue).toEqual(["t3", "t5"]);
  });

  it("comes back with its name, color, and players, at the back of the queue", () => {
    const live = startedWithMixedTeams("win2out", 5);
    const before = entryOf(live, "t4");

    const back = bringBack(withdraw(live, "t4"), "t4");

    expect(entryOf(back, "t4")).toEqual(before);
    expect(back.tournament.win2outState?.queue).toEqual(["t3", "t5", "t4"]);
    expect(back.tournament.teamIds).toEqual(["t1", "t2", "t3", "t4", "t5"]);
  });

  it("keeps every team's players through a result", () => {
    const live = startedWithMixedTeams("two_match_rotation", 4);

    const after = win(live, openOn(live, 1).id, "t1");

    expect(after.tournament.entries.map((entry) => entry.players)).toEqual([
      ["Ana", "Ben"],
      ["Cy", "Dee"],
      ["Eve", "Fay"],
      ["Gus", "Hal"],
    ]);
  });
});

describe("a mixed team in a bracket", () => {
  it("keeps its players when it is withdrawn, and its opponent goes through", () => {
    const live = startedWithMixedTeams("single_elimination", 4);
    const first = find(live, { homeTeamId: "t1" });
    const opponent = first.awayTeamId;

    const after = withdraw(live, "t1");

    expect(entryOf(after, "t1")).toMatchObject({ name: "Team t1", players: ["Ana", "Ben"] });
    expect(entryOf(after, "t1").withdrawnAt).toBeDefined();
    expect(find(after, { id: first.id })).toMatchObject({
      status: "completed",
      winnerId: opponent,
      forfeitedBy: "t1",
    });
  });

  it("cannot come back once the bracket is drawn, like any other team", () => {
    const withdrawn = withdraw(startedWithMixedTeams("single_elimination", 4), "t1");

    expect(() => bringBack(withdrawn, "t1")).toThrow(EngineError);
    expect(entryOf(withdrawn, "t1").players).toEqual(["Ana", "Ben"]);
  });
});

describe("a mixed team in a round robin", () => {
  it("comes back with its players and has its forfeited matches reopened", () => {
    const live = startedWithMixedTeams("round_robin", 3);
    const before = entryOf(live, "t2");

    const withdrawn = withdraw(live, "t2");
    expect(withdrawn.matches.filter((m) => m.forfeitedBy === "t2")).toHaveLength(2);

    const back = bringBack(withdrawn, "t2");

    expect(entryOf(back, "t2")).toEqual(before);
    expect(back.matches.filter((m) => m.forfeitedBy === "t2")).toEqual([]);
  });
});
