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

    expect(input.teams.map((team) => "id" in team && team.id)).toEqual(["t1", "t3", "t4"]);
  });

  it("carries nothing about RSVPs from a tournament that still stores RSVP settings and a scheduled time", () => {
    // What a tournament saved before RSVP lists can still hold (ADR-0005).
    const source = {
      ...started("round_robin", 3).tournament,
      scheduledAt: 1_800_000_000_000,
      scheduledZone: "America/New_York",
      rsvp: { enabled: true, capacity: 16, opensAt: 1_799_000_000_000, closed: true },
    } as Tournament;

    const input = duplicateInput(source, rosterOf(source));

    expect(Object.keys(input).sort()).toEqual(["format", "name", "settings", "teams"]);
  });

  it("does not remember the RSVP list the source was imported from", () => {
    const source: Tournament = { ...started("round_robin", 3).tournament, rsvpListId: "list-1" };

    const input = duplicateInput(source, rosterOf(source));

    expect("rsvpListId" in input).toBe(false);
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

    expect(input.teams.map((team) => "id" in team && team.id)).toEqual(["t1", "t2", "t3", "t4"]);
  });
});

describe("duplicateInput for a tournament with mixed teams", () => {
  /**
   * Four teams entered: t1 and t3 from the roster, t2 and t4 dealt from a
   * by-person list as "Sharks" and "Team 2". Sharks withdrew.
   */
  const mixedSource = (): Tournament => {
    const live = started("round_robin", 4);
    return {
      ...live.tournament,
      rsvpListId: "list-1",
      entries: live.tournament.entries.map((entry) => {
        if (entry.teamId === "t2") {
          return { ...entry, name: "Sharks", color: "#f97316", players: ["Ana", "Ben"], withdrawnAt: 5 };
        }
        if (entry.teamId === "t4") return { ...entry, name: "Team 2", players: ["Cy"] };
        return entry;
      }),
    };
  };
  /** The roster holds the two roster teams and no mixed team. */
  const rosterFor = (source: Tournament) =>
    rosterOf(source).filter((team) => team.id === "t1" || team.id === "t3");

  it("carries each mixed team with its name, color, and players, in its place among the roster teams", () => {
    const source = mixedSource();
    const [t1, t3] = rosterFor(source);

    const input = duplicateInput(source, [t1, t3]);

    expect(input.teams).toEqual([
      t1,
      { name: "Sharks", color: "#f97316", players: ["Ana", "Ben"] },
      t3,
      { name: "Team 2", color: "#3b82f6", players: ["Cy"] },
    ]);
  });

  it("leaves the source's ids behind, so the new tournament gives each mixed team an id of its own", () => {
    const source = mixedSource();

    const input = duplicateInput(source, rosterFor(source));

    const mixed = input.teams.filter((team) => "players" in team);
    expect(mixed).toHaveLength(2);
    expect(mixed.some((team) => "id" in team || "teamId" in team)).toBe(false);
  });

  it("gives the copy a players list of its own", () => {
    const source = mixedSource();

    const input = duplicateInput(source, rosterFor(source));

    const sharks = input.teams[1] as { players: string[] };
    expect(sharks.players).toEqual(["Ana", "Ben"]);
    expect(sharks.players).not.toBe(source.entries[1].players);
  });

  it("does not carry the list the source was imported from", () => {
    const source = mixedSource();

    const input = duplicateInput(source, rosterFor(source));

    expect(Object.keys(input).sort()).toEqual(["format", "name", "settings", "teams"]);
  });

  it("still drops a roster team that has left the roster, and keeps the mixed teams", () => {
    const source = mixedSource();
    const roster = rosterFor(source).filter((team) => team.id !== "t1");

    const input = duplicateInput(source, roster);

    expect(input.teams.map((team) => team.name)).toEqual(["Sharks", "Team t3", "Team 2"]);
  });

  it("never takes a roster team for a mixed team, even one with the same name", () => {
    const source = mixedSource();
    const roster = [
      ...rosterFor(source),
      { id: "roster-sharks", name: "Sharks", color: "#000000", createdAt: 9 },
    ];

    const input = duplicateInput(source, roster);

    expect(input.teams[1]).toEqual({ name: "Sharks", color: "#f97316", players: ["Ana", "Ben"] });
  });

  it("gives a mixed team stored without a color the palette color the source's teams use least", () => {
    const source = mixedSource();
    const entries = source.entries.map((entry) => {
      if (entry.teamId !== "t4") return entry;
      const { color: _color, ...colorless } = entry;
      return colorless;
    });

    const input = duplicateInput({ ...source, entries }, rosterFor(source));

    // Red is the first palette color none of the others has.
    expect(input.teams[3]).toEqual({ name: "Team 2", color: "#ef4444", players: ["Cy"] });
  });
});
