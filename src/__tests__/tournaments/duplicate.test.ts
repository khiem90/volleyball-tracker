import { describe, expect, it } from "vitest";
import { duplicateInput } from "@/lib/tournaments";
import type { PersistentTeam, Tournament } from "@/types/game";
import { playThrough, run, started, win } from "../engine/helpers";

/** The roster as the source tournament's entries remember it. */
const rosterOf = (tournament: Tournament): PersistentTeam[] =>
  tournament.entries.map((entry, i) => ({
    id: entry.teamId,
    name: entry.name,
    ...(entry.color !== undefined && { color: entry.color }),
    createdAt: i,
  }));

describe("duplicateInput", () => {
  it("describes a draft with the same format, settings, and teams, named as its duplicate", () => {
    const live = started("win2out", 5, { courts: 2, instantWin: true });
    const done = run(win(live, live.matches[0].id, "t1"), { type: "end" });
    const roster = rosterOf(done.tournament);

    const input = duplicateInput(done.tournament, roster);

    expect(input).toEqual({
      name: "Test night (duplicate)",
      format: "win2out",
      teams: roster,
      settings: done.tournament.settings,
    });
    expect(input.settings).not.toBe(done.tournament.settings);
  });

  it("takes each team's current roster name and color rather than what the source kept", () => {
    const done = playThrough(started("round_robin", 3));
    const roster = rosterOf(done.tournament).map((team) =>
      team.id === "t2" ? { ...team, name: "Renamed", color: "#000000" } : team,
    );

    const input = duplicateInput(done.tournament, roster);

    expect(input.teams.map((team) => [team.name, team.color])).toEqual([
      ["Team t1", "#3b82f6"],
      ["Renamed", "#000000"],
      ["Team t3", "#3b82f6"],
    ]);
  });

  it("leaves out a team that has left the roster and keeps the rest in entry order", () => {
    const done = playThrough(started("single_elimination", 4));
    const roster = rosterOf(done.tournament).filter((team) => team.id !== "t2");

    const input = duplicateInput(done.tournament, roster);

    expect(input.teams.map((team) => team.id)).toEqual(["t1", "t3", "t4"]);
  });

  it("brings a team that withdrew from the source back in", () => {
    const live = started("round_robin", 4);
    const source: Tournament = {
      ...live.tournament,
      entries: live.tournament.entries.map((entry) =>
        entry.teamId === "t3" ? { ...entry, withdrawnAt: 5 } : entry,
      ),
    };

    const input = duplicateInput(source, rosterOf(source));

    expect(input.teams.map((team) => team.id)).toEqual(["t1", "t2", "t3", "t4"]);
  });
});
