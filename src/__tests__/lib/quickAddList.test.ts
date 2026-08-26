import { describe, expect, it } from "vitest";
import {
  buildQuickAddPlan,
  firstMarkClash,
  parseTeamList,
  QUICK_ADD_MAX,
  teamMarkKey,
} from "@/components/QuickAddTeams";
import { CREST_PACK_SIZE, crestNameFor } from "@/components/dialogs/team-form/crest";
import { crestForTeam } from "@/components/matchbook/types";
import { TEAM_COLOR_IDS } from "@/lib/teamColor";

/* ===========================================================================
   QUICK ADD TAKES A LIST (D1)

   `/teams` advertised "Type a list and add a whole roster in one go" over a
   dialog that could only count. These pin the parser against what a paste
   actually contains, because every one of these cases silently created a
   wrong team or no team at all before.
   =========================================================================== */

describe("parseTeamList", () => {
  it("reads one team per line", () => {
    expect(parseTeamList("Comets\nRockets\nHawks").names).toEqual([
      "Comets",
      "Rockets",
      "Hawks",
    ]);
  });

  it("reads commas, semicolons and spreadsheet tabs as separators", () => {
    expect(parseTeamList("Comets, Rockets; Hawks\tKings").names).toEqual([
      "Comets",
      "Rockets",
      "Hawks",
      "Kings",
    ]);
  });

  it("drops a trailing comma and blank lines, and says how many", () => {
    const parsed = parseTeamList("Comets,\nRockets,\n\n");
    expect(parsed.names).toEqual(["Comets", "Rockets"]);
    expect(parsed.blanks).toBe(1);
  });

  it("drops a repeat of an earlier line, case-insensitively", () => {
    const parsed = parseTeamList("Comets\ncomets\nRockets");
    expect(parsed.names).toEqual(["Comets", "Rockets"]);
    expect(parsed.duplicates).toEqual(["comets"]);
  });

  it("drops a team the roster already has", () => {
    const parsed = parseTeamList("Comets\nRockets", { existing: ["  COMETS "] });
    expect(parsed.names).toEqual(["Rockets"]);
    expect(parsed.duplicates).toEqual(["Comets"]);
  });

  it("strips bullets", () => {
    expect(parseTeamList("- Comets\n• Rockets\n* Hawks").names).toEqual([
      "Comets",
      "Rockets",
      "Hawks",
    ]);
  });

  it("strips list numbering when the figures ascend", () => {
    expect(parseTeamList("1. Comets\n2) Rockets\n3. Hawks").names).toEqual([
      "Comets",
      "Rockets",
      "Hawks",
    ]);
    /* One numbered line among unnumbered ones is a name: 1. FC Köln is a club,
       not item one. */
    expect(parseTeamList("1. FC Köln\nComets").names).toEqual([
      "1. FC Köln",
      "Comets",
    ]);
    /* Two clubs, both starting "1." — figures that do not ascend are not a
       list. */
    expect(parseTeamList("1. FC Köln\n1. FC Nürnberg").names).toEqual([
      "1. FC Köln",
      "1. FC Nürnberg",
    ]);
    /* And a numbered list survives one line that holds two names: the earlier
       "every entry must be numbered" rule created seven teams called
       "1. Coastal Comets" … because "Maple Titans" carried no figure. */
    expect(
      parseTeamList("1. Comets\n2. Rockets, Maple Titans,\n3. Hawks").names
    ).toEqual(["Comets", "Rockets", "Maple Titans", "Hawks"]);
  });

  it("unwraps the quotes a CSV paste brings and collapses inner whitespace", () => {
    expect(parseTeamList('"Coastal   Comets"\n“Riverside Rockets”').names).toEqual([
      "Coastal Comets",
      "Riverside Rockets",
    ]);
  });

  it("shortens an over-long name to the length the single-team sheet allows", () => {
    const long = "W".repeat(60);
    const parsed = parseTeamList(long);
    expect(parsed.names[0]).toHaveLength(40);
    expect(parsed.shortened).toBe(1);
  });

  it("caps the batch and counts what it refused", () => {
    const raw = Array.from({ length: QUICK_ADD_MAX + 3 }, (_, i) => `Team ${i + 1}`).join("\n");
    const parsed = parseTeamList(raw);
    expect(parsed.names).toHaveLength(QUICK_ADD_MAX);
    expect(parsed.overflow).toBe(3);
  });

  it("returns nothing, and no phantom blank, for an empty box", () => {
    expect(parseTeamList("   ")).toEqual({
      names: [],
      duplicates: [],
      blanks: 0,
      shortened: 0,
      overflow: 0,
    });
  });
});

describe("buildQuickAddPlan with pasted names", () => {
  it("keeps the names it was given, in order", () => {
    const plan = buildQuickAddPlan({
      count: 0,
      start: 1,
      naming: "team",
      colors: [...TEAM_COLOR_IDS],
      names: ["Comets", "Rockets", "Hawks"],
    });
    expect(plan.map((entry) => entry.name)).toEqual(["Comets", "Rockets", "Hawks"]);
  });

  it("continues the ink cycle from the roster, as the numbered path does", () => {
    const plan = buildQuickAddPlan({
      count: 0,
      start: 3,
      naming: "team",
      colors: [...TEAM_COLOR_IDS],
      names: ["Aaa", "Bbb"],
    });
    // start 3 -> the third ink, then the fourth, unless a mark clashes.
    expect(TEAM_COLOR_IDS).toContain(plan[0].color);
    expect(plan[0].color).not.toBe(plan[1].color);
  });
});

/* ===========================================================================
   THE MARK IS CREST + INK (D2)

   Eight crests chosen by name means a pasted roster repeats one — the birthday
   bound, not a fixable hash. What must not repeat is the whole mark.
   =========================================================================== */

describe("crest and ink together", () => {
  it("leaves every numbered batch exactly as it was", () => {
    for (const naming of ["team", "squad", "group", "court", "side"]) {
      for (let start = 1; start <= 60; start++) {
        const plan = buildQuickAddPlan({
          count: 8,
          start,
          naming,
          colors: [...TEAM_COLOR_IDS],
        });
        const expected = plan.map((_, i) => TEAM_COLOR_IDS[(start + i - 1) % 6]);
        expect(plan.map((entry) => entry.color)).toEqual(expected);
        expect(new Set(plan.map((e) => crestForTeam("ignored", e.name))).size).toBe(8);
      }
    }
  });

  it("never repeats a mark inside a pasted batch when the scheme has inks to spare", () => {
    const names = [
      "Coastal Comets", "Riverside Rockets", "Harbour Hawks", "Granite Kings",
      "Maple Titans", "Oakhill Vipers", "Cedar Sharks", "Valley Bulls",
      "Summit Wolves", "Fairview Eagles", "Kingsway Lions",
    ];
    const plan = buildQuickAddPlan({
      count: 0,
      start: 1,
      naming: "team",
      colors: [...TEAM_COLOR_IDS],
      names,
    });
    expect(plan).toHaveLength(11);
    expect(firstMarkClash(plan)).toBeNull();
    // The crests DO repeat — that is the pack, and it is why the ink matters.
    expect(new Set(plan.map((e) => crestForTeam("ignored", e.name))).size).toBeLessThan(11);
  });

  it("respects the roster's existing marks", () => {
    const taken = [teamMarkKey("Comets", "navy")];
    const plan = buildQuickAddPlan({
      count: 0,
      start: 1,
      naming: "team",
      colors: [...TEAM_COLOR_IDS],
      names: ["Comets"],
      taken,
    });
    expect(plan[0].color).not.toBe("navy");
  });

  it("never breaks a two-sided scheme's alternation to do it", () => {
    const plan = buildQuickAddPlan({
      count: 0,
      start: 1,
      naming: "team",
      colors: ["navy", "rose"],
      names: ["Comets", "Rockets", "Hawks", "Kings"],
    });
    expect(plan.map((entry) => entry.color)).toEqual(["navy", "rose", "navy", "rose"]);
  });
});

describe("crestNameFor", () => {
  it("names the crest the team will actually wear", () => {
    expect(crestForTeam("Riptide", "Riptide")).toContain("riptide");
    expect(crestNameFor("Riptide")).toBe("Riptide");
    expect(crestNameFor("Storm Chasers")).toBe("Storm");
  });

  it("agrees with the size of the pack it quotes", () => {
    const seen = new Set(
      Array.from({ length: 400 }, (_, i) => crestNameFor(`Club ${i} Athletic FC`))
    );
    expect(seen.size).toBe(CREST_PACK_SIZE);
  });
});
