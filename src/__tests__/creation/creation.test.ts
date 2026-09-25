import { describe, expect, it } from "vitest";
import { emptySetup, setupInput, setupProblems, type TournamentSetup } from "@/lib/creation";
import { DEFAULT_TERMINOLOGY } from "@/types/competition-config";
import type { PersistentTeam } from "@/types/game";

const roster: PersistentTeam[] = [
  { id: "t1", name: "Aces", color: "#ef4444", createdAt: 1 },
  { id: "t2", name: "Blockers", color: "#3b82f6", createdAt: 2 },
  { id: "t3", name: "Chasers", color: "#22c55e", createdAt: 3 },
  { id: "t4", name: "Diggers", color: "#f59e0b", createdAt: 4 },
];

const setup = (changes: Partial<TournamentSetup>): TournamentSetup => ({
  ...emptySetup(),
  ...changes,
});

describe("setupProblems on the untouched page", () => {
  it("asks for a name and a format", () => {
    expect(setupProblems(emptySetup(), roster)).toEqual({
      name: "Give the tournament a name.",
      format: "Pick a format.",
    });
  });
});

describe("setupProblems and the teams", () => {
  it("says how many teams the format needs when too few are ticked", () => {
    const problems = setupProblems(
      setup({ name: "Tuesday night", format: "round_robin", teamIds: ["t1", "t2"] }),
      roster,
    );

    expect(problems).toEqual({ teams: "Round Robin needs at least 3 teams." });
  });

  it("needs two teams per court for a rotation format, in the tournament's own word for a court", () => {
    const base = { name: "Rotation night", format: "win2out" as const, teamIds: ["t1", "t2", "t3"] };

    expect(setupProblems(setup({ ...base, courts: 2 }), roster)).toEqual({
      teams: "Win 2 & Out on 2 courts needs at least 4 teams.",
    });
    expect(setupProblems(setup({ ...base, courts: 2, courtWord: "field" }), roster)).toEqual({
      teams: "Win 2 & Out on 2 fields needs at least 4 teams.",
    });
    expect(setupProblems(setup({ ...base, courts: 1 }), roster)).toEqual({});
  });

  it("does not count a ticked team that has since left the roster", () => {
    const problems = setupProblems(
      setup({ name: "Tuesday night", format: "round_robin", teamIds: ["t1", "t2", "gone"] }),
      roster,
    );

    expect(problems).toEqual({ teams: "Round Robin needs at least 3 teams." });
  });
});

describe("setupInput", () => {
  it("enters the ticked teams in tick order with the trimmed name", () => {
    const input = setupInput(
      setup({
        name: "  Rotation night ",
        format: "two_match_rotation",
        teamIds: ["t3", "t1", "t4", "t2"],
      }),
      roster,
    );

    expect(input.name).toBe("Rotation night");
    expect(input.format).toBe("two_match_rotation");
    expect(input.teams).toEqual([roster[2], roster[0], roster[3], roster[1]]);
  });

  it("keeps only the settings the format uses", () => {
    const rotation = setupInput(
      setup({
        name: "Rotation night",
        format: "two_match_rotation",
        teamIds: ["t1", "t2", "t3", "t4"],
        courts: 2,
        seriesLength: 5,
        instantWin: true,
        pointsForWin: 2,
        pointsForLoss: 1,
        courtWord: " Field ",
      }),
      roster,
    );

    expect(rotation.settings).toEqual({
      courts: 2,
      seriesLength: 1,
      instantWin: true,
      pointsForWin: 3,
      pointsForLoss: 0,
      terminology: { ...DEFAULT_TERMINOLOGY, venue: "field", venuePlural: "fields" },
    });

    const league = setupInput(
      setup({
        name: "League",
        format: "round_robin",
        teamIds: ["t1", "t2", "t3"],
        courts: 3,
        seriesLength: 3,
        instantWin: true,
        pointsForWin: 2,
        pointsForLoss: 1,
        courtWord: "",
      }),
      roster,
    );

    expect(league.settings).toEqual({
      courts: 1,
      seriesLength: 3,
      instantWin: false,
      pointsForWin: 2,
      pointsForLoss: 1,
      terminology: DEFAULT_TERMINOLOGY,
    });
  });

  it("gives the court word its plural, so a pitch has pitches", () => {
    const input = setupInput(
      setup({ name: "Cup", format: "single_elimination", teamIds: ["t1", "t2"], courtWord: "Pitch" }),
      roster,
    );

    expect(input.settings.terminology).toEqual({
      ...DEFAULT_TERMINOLOGY,
      venue: "pitch",
      venuePlural: "pitches",
    });
  });

  it("refuses a setup that still has a problem, naming it", () => {
    expect(() =>
      setupInput(setup({ name: "Tuesday night", format: "round_robin", teamIds: ["t1"] }), roster),
    ).toThrow("Round Robin needs at least 3 teams.");
    expect(() => setupInput(setup({ teamIds: ["t1", "t2", "t3"] }), roster)).toThrow(
      "Pick a format.",
    );
  });
});
