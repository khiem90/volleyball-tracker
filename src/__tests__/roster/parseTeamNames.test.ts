import { describe, expect, it } from "vitest";
import { parseTeamNames, TEAM_COLORS } from "@/lib/roster";
import type { PersistentTeam } from "@/types/game";

const team = (name: string, color?: string): PersistentTeam => ({
  id: `id-${name}`,
  name,
  createdAt: 1,
  ...(color && { color }),
});

describe("parseTeamNames", () => {
  it("makes one team per line, trimmed, and ignores blank lines", () => {
    const { teams } = parseTeamNames("Aces\n  Blockers \n\n   \nChasers\n", []);

    expect(teams.map((t) => t.name)).toEqual(["Aces", "Blockers", "Chasers"]);
  });

  it("reports names already on the roster instead of adding them again, whatever their case", () => {
    const roster = [team("Aces"), team("Blockers")];

    const { teams, alreadyOnRoster } = parseTeamNames("aces\nChasers\nBLOCKERS", roster);

    expect(teams.map((t) => t.name)).toEqual(["Chasers"]);
    expect(alreadyOnRoster).toEqual(["aces", "BLOCKERS"]);
  });

  it("adds a name repeated in the pasted text once and reports the repeat", () => {
    const { teams, alreadyOnRoster } = parseTeamNames("Aces\nBlockers\naces", []);

    expect(teams.map((t) => t.name)).toEqual(["Aces", "Blockers"]);
    expect(alreadyOnRoster).toEqual(["aces"]);
  });

  it("gives each new team the palette color the roster uses least, in palette order on ties", () => {
    const [red, orange] = TEAM_COLORS;
    const roster = [team("Aces", red), team("Blockers", red), team("Chasers", orange)];
    const names = ["D", "E", "F", "G", "H", "I", "J", "K", "L"];

    const { teams } = parseTeamNames(names.join("\n"), roster);

    // Eight unused colors first, then orange, which has fewer uses than red.
    expect(teams.map((t) => t.color)).toEqual([...TEAM_COLORS.slice(2), orange]);
  });
});
