import { describe, expect, it } from "vitest";
import {
  emptyRosterMessage,
  emptySetup,
  firstProblem,
  problemsInOrder,
  setupInput,
  setupProblems,
  type TournamentSetup,
} from "@/lib/creation";
import type { ListImport } from "@/lib/rsvpImport";
import { DEFAULT_TERMINOLOGY } from "@/types/competition-config";
import type { PersistentTeam } from "@/types/game";

const roster: PersistentTeam[] = [
  { id: "t1", name: "Aces", color: "#ef4444", createdAt: 1 },
  { id: "t2", name: "Blockers", color: "#3b82f6", createdAt: 2 },
  { id: "t3", name: "Chasers", color: "#22c55e", createdAt: 3 },
  { id: "t4", name: "Diggers", color: "#f59e0b", createdAt: 4 },
];

const setup = (changes: Partial<TournamentSetup>): TournamentSetup => ({ ...emptySetup(), ...changes });

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

describe("the setup as the page opens", () => {
  it("has nothing chosen, nothing imported, one court, single games, and no scheduled time", () => {
    expect(emptySetup()).toEqual({
      name: "",
      format: null,
      teamIds: [],
      import: null,
      courts: 1,
      seriesLength: 1,
      instantWin: false,
      pointsForWin: 3,
      pointsForLoss: 0,
      courtWord: "court",
    });
  });
});

describe("setupProblems in the order to fix them", () => {
  it("puts the format first, then the name, then the teams", () => {
    expect(problemsInOrder(setupProblems(emptySetup(), roster))).toEqual([
      "Pick a format.",
      "Give the tournament a name.",
    ]);
    const problems = setupProblems(setup({ format: "round_robin", teamIds: ["t1"] }), roster);
    expect(problemsInOrder(problems)).toEqual([
      "Give the tournament a name.",
      "Round Robin needs at least 3 teams.",
    ]);
    expect(firstProblem(problems)).toBe("Give the tournament a name.");
  });
});

describe("setupInput", () => {
  it("builds a tournament from its name, format, teams, and settings, and nothing else", () => {
    const input = setupInput(
      setup({ name: "Friday night", format: "round_robin", teamIds: ["t1", "t2", "t3"] }),
      roster,
    );

    expect(Object.keys(input).sort()).toEqual(["format", "name", "settings", "teams"]);
  });

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
      instantWin: true,
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

describe("what the teams section says while the roster is empty", () => {
  it("invites the owner to add a team while nothing is entering", () => {
    expect(emptyRosterMessage(0)).toBe(
      "No teams yet. Type a name above and press Enter, or paste a list.",
    );
  });

  it("says nothing once imported teams are entering, since there are teams", () => {
    expect(emptyRosterMessage(1)).toBeNull();
    expect(emptyRosterMessage(8)).toBeNull();
  });
});

/** An import of a by-team list holding these team names, in arrival order. */
const imported = (...names: string[]): ListImport => ({
  listId: "list-1",
  listName: "Friday teams",
  takes: "teams",
  teams: names.map((name, index) => ({ id: `rsvp-${index + 1}`, name })),
});

describe("setupProblems with an import", () => {
  it("counts imported teams toward the format's minimum with the ticked ones", () => {
    const base = { name: "Friday night", format: "round_robin" as const, teamIds: ["t1"] };

    expect(setupProblems(setup({ ...base, import: imported("Newcomers") }), roster)).toEqual({
      teams: "Round Robin needs at least 3 teams.",
    });
    expect(
      setupProblems(setup({ ...base, import: imported("Newcomers", "chasers") }), roster),
    ).toEqual({});
  });

  it("counts a roster team once when it is both ticked and imported", () => {
    const problems = setupProblems(
      setup({
        name: "Friday night",
        format: "round_robin",
        teamIds: ["t1", "t2"],
        import: imported("Aces", "blockers"),
      }),
      roster,
    );

    expect(problems).toEqual({ teams: "Round Robin needs at least 3 teams." });
  });

  it("asks the owner to rename one of two imported teams under the same name", () => {
    const problems = setupProblems(
      setup({
        name: "Friday night",
        format: "round_robin",
        import: imported("Spikers", "Newcomers", "spikers"),
      }),
      roster,
    );

    expect(problems).toEqual({ imported: "Rename one of the two teams called Spikers." });
  });

  it("words a name three teams share for three", () => {
    const problems = setupProblems(
      setup({
        name: "Friday night",
        format: "round_robin",
        import: imported("Aces", "ACES", "aces"),
      }),
      roster,
    );

    expect(problems.imported).toBe("Rename the 3 teams called Aces so each has its own name.");
  });

  it("asks for a name when the owner has blanked an imported team", () => {
    const problems = setupProblems(
      setup({
        name: "Friday night",
        format: "single_elimination",
        import: imported("Spikers", "  "),
      }),
      roster,
    );

    expect(problems).toEqual({ imported: "Give every imported team a name." });
  });

  it("puts the import's problem after the name and before the team count", () => {
    const problems = setupProblems(
      setup({ format: "round_robin", import: imported("Spikers", "Spikers") }),
      roster,
    );

    expect(problemsInOrder(problems)).toEqual([
      "Give the tournament a name.",
      "Rename one of the two teams called Spikers.",
      "Round Robin needs at least 3 teams.",
    ]);
  });
});

describe("setupInput with an import", () => {
  it("seeds the ticked roster teams in tick order, then the imported teams in arrival order", () => {
    const input = setupInput(
      setup({
        name: "Friday night",
        format: "round_robin",
        teamIds: ["t4", "t1"],
        import: imported("Newcomers", "BLOCKERS", " Late Entry "),
      }),
      roster,
    );

    expect(input.teams).toEqual([
      roster[3],
      roster[0],
      { kind: "joining", newName: "Newcomers" },
      roster[1],
      { kind: "joining", newName: "Late Entry" },
    ]);
  });

  it("enters a roster team once, at its imported place, when it is also ticked", () => {
    const input = setupInput(
      setup({
        name: "Friday night",
        format: "round_robin",
        teamIds: ["t2", "t1"],
        import: imported("Chasers", "Blockers"),
      }),
      roster,
    );

    expect(input.teams).toEqual([roster[0], roster[2], roster[1]]);
  });

  it("names the list the teams came from", () => {
    const input = setupInput(
      setup({ name: "Friday night", format: "single_elimination", import: imported("Aces", "Newcomers") }),
      roster,
    );

    expect(input.rsvpListId).toBe("list-1");
  });

  it("refuses to build while two imported teams share a name", () => {
    expect(() =>
      setupInput(
        setup({
          name: "Friday night",
          format: "single_elimination",
          import: imported("Spikers", "spikers"),
        }),
        roster,
      ),
    ).toThrow("Rename one of the two teams called Spikers.");
  });
});

/** An import of a by-person list dealt into these mixed teams, each a name and its players. */
const mixed = (...teams: [name: string, ...players: string[]][]): ListImport => {
  const dealt = teams.map(([name, ...players], index) => ({
    id: `mixed-${index + 1}`,
    name,
    players: players.map((player) => ({ id: `rsvp-${player.toLowerCase()}`, name: player })),
  }));
  return {
    listId: "list-2",
    listName: "Friday pickup",
    takes: "people",
    teams: dealt,
    people: dealt.flatMap((team) => team.players),
    teamSize: 2,
  };
};

describe("setupProblems with mixed teams", () => {
  it("counts mixed teams toward the format's minimum with the ticked ones", () => {
    const base = { name: "Friday night", format: "round_robin" as const, teamIds: ["t1"] };

    expect(
      setupProblems(setup({ ...base, import: mixed(["Team 1", "Ana", "Ben"]) }), roster),
    ).toEqual({ teams: "Round Robin needs at least 3 teams." });
    expect(
      setupProblems(
        setup({ ...base, import: mixed(["Team 1", "Ana", "Ben"], ["Team 2", "Cy", "Dee"]) }),
        roster,
      ),
    ).toEqual({});
  });

  it("asks the owner to rename one of two mixed teams under the same name", () => {
    const problems = setupProblems(
      setup({
        name: "Friday night",
        format: "single_elimination",
        import: mixed(["Sharks", "Ana"], ["sharks", "Ben"]),
      }),
      roster,
    );

    expect(problems).toEqual({ imported: "Rename one of the two teams called Sharks." });
  });

  it("asks the owner to tell a mixed team apart from a ticked roster team under the same name", () => {
    const base = {
      name: "Friday night",
      format: "single_elimination" as const,
      import: mixed([" aces ", "Ana"], ["Team 2", "Ben"]),
    };
    const clash =
      "A ticked roster team is also called Aces. Rename the mixed team or untick the roster team.";

    expect(setupProblems(setup({ ...base, teamIds: ["t1"] }), roster)).toEqual({ imported: clash });
    expect(() => setupInput(setup({ ...base, teamIds: ["t1"] }), roster)).toThrow(clash);
    // Left unticked, the roster team does not enter, so nothing shares the name.
    expect(setupProblems(setup({ ...base, teamIds: ["t2"] }), roster)).toEqual({});
  });

  it("asks for a name when the owner has blanked a mixed team", () => {
    const problems = setupProblems(
      setup({
        name: "Friday night",
        format: "single_elimination",
        import: mixed(["Team 1", "Ana"], [" ", "Ben"]),
      }),
      roster,
    );

    expect(problems).toEqual({ imported: "Give every imported team a name." });
  });
});

describe("setupInput with mixed teams", () => {
  it("seeds the ticked roster teams in tick order, then the mixed teams in number order with their players", () => {
    const input = setupInput(
      setup({
        name: "Friday night",
        format: "round_robin",
        teamIds: ["t2", "t1"],
        import: mixed(["Team 1", "Ana", "Ben"], [" Sharks ", "Cy", "Dee", "Eve"]),
      }),
      roster,
    );

    expect(input.teams).toEqual([
      roster[1],
      roster[0],
      { kind: "mixed", name: "Team 1", color: "#f97316", players: ["Ana", "Ben"] },
      { kind: "mixed", name: "Sharks", color: "#eab308", players: ["Cy", "Dee", "Eve"] },
    ]);
    expect(input.rsvpListId).toBe("list-2");
  });

  it("gives each mixed team the palette color the tournament's teams use least", () => {
    const input = setupInput(
      setup({
        name: "Friday night",
        format: "round_robin",
        teamIds: ["t1", "t2", "t3"],
        import: mixed(["Team 1", "Ana"], ["Team 2", "Ben"], ["Team 3", "Cy"], ["Team 4", "Dee"]),
      }),
      roster,
    );

    // Red, blue, and green are taken by the ticked teams, so the mixed teams
    // take the unused palette colors in palette order.
    expect(input.teams.slice(3).map((team) => "color" in team && team.color)).toEqual([
      "#f97316",
      "#eab308",
      "#14b8a6",
      "#06b6d4",
    ]);
  });

  it("goes round the palette again once every color is taken", () => {
    const eleven = Array.from(
      { length: 11 },
      (_, i): [string, string] => [`Team ${i + 1}`, `Person ${i + 1}`],
    );
    const input = setupInput(
      setup({ name: "Friday night", format: "round_robin", import: mixed(...eleven) }),
      roster,
    );

    const colors = input.teams.map((team) => "color" in team && team.color);
    expect(new Set(colors.slice(0, 10)).size).toBe(10);
    expect(colors[10]).toBe("#ef4444");
  });

  it("never enters a mixed team as the roster team that shares its name", () => {
    const input = setupInput(
      setup({
        name: "Friday night",
        format: "single_elimination",
        teamIds: ["t2"],
        import: mixed(["aces", "Ana", "Ben"]),
      }),
      roster,
    );

    // Aces is on the roster and not ticked, so only the mixed team has the name.
    expect(input.teams).toEqual([
      roster[1],
      { kind: "mixed", name: "aces", color: "#ef4444", players: ["Ana", "Ben"] },
    ]);
  });
});
