import { describe, expect, it } from "vitest";
import {
  DEFAULT_TEAM_COLOR,
  nextTeamColor,
  normalizeTeamColor,
  TEAM_COLOR_CSS,
  TEAM_COLOR_IDS,
  teamColorCss,
  teamColorHex,
  teamColorName,
} from "@/lib/teamColor";
import { buildQuickAddPlan } from "@/components/QuickAddTeams";
import { crestForTeam } from "@/components/matchbook/types";
import { GUEST_AWAY_TEAM, GUEST_HOME_TEAM } from "@/constants/guestTeams";

/* ===========================================================================
   THE TEAM-COLOUR CONTRACT

   Two rules, and every test below is one of them:

     nothing a CSS engine reads may reach a text node          (Z9)
     nothing a CSS engine reads may reach storage              (Z10)

   The strings in `LEGACY` are verbatim from a saved account — the two Quick
   Add wrote for Team 3 and Team 5, the one a hand-created team stored, and the
   house tokens the palette offered before it was re-measured.
   =========================================================================== */

const LEGACY = {
  quickAddTeal: "color-mix(in oklab, var(--mb-navy) 55%, var(--mb-green))",
  quickAddRose: "color-mix(in oklab, var(--mb-plum) 50%, var(--mb-red))",
  lilac: "color-mix(in oklab, var(--mb-plum) 65%, var(--mb-paper-bright))",
  ochre: "color-mix(in oklab, var(--mb-gold) 45%, var(--mb-ink-muted))",
  handMade: "var(--mb-navy)",
  oldPaletteCoral: "var(--mb-coral)",
  oldPaletteGold: "var(--mb-gold)",
  customHex: "#E2553D",
};

const isCssExpression = (value: string) =>
  value.includes("var(") || value.includes("color-mix(");

describe("what gets stored", () => {
  it("turns every colour the app has ever written into a name", () => {
    expect(normalizeTeamColor(LEGACY.quickAddTeal)).toBe("teal");
    expect(normalizeTeamColor(LEGACY.quickAddRose)).toBe("rose");
    expect(normalizeTeamColor(LEGACY.lilac)).toBe("lilac");
    expect(normalizeTeamColor(LEGACY.ochre)).toBe("ochre");
    expect(normalizeTeamColor(LEGACY.handMade)).toBe("navy");
    // The old eight land on the surviving ink nearest them.
    expect(normalizeTeamColor(LEGACY.oldPaletteCoral)).toBe("rose");
    expect(normalizeTeamColor(LEGACY.oldPaletteGold)).toBe("ochre");
  });

  it("keeps a hand-mixed colour, and keeps it comparable", () => {
    expect(normalizeTeamColor("#E2553D")).toBe("#e2553d");
    expect(normalizeTeamColor("#e2553d")).toBe(normalizeTeamColor("#E2553D"));
  });

  it("leaves 'no colour' expressible", () => {
    expect(normalizeTeamColor(undefined)).toBe("");
    expect(normalizeTeamColor("")).toBe("");
    expect(teamColorCss(undefined)).toBeUndefined();
  });

  it("is idempotent, so a re-save cannot drift", () => {
    for (const value of Object.values(LEGACY)) {
      const once = normalizeTeamColor(value);
      expect(normalizeTeamColor(once)).toBe(once);
    }
  });

  it("never stores a CSS expression for a palette ink", () => {
    for (const value of Object.values(LEGACY)) {
      expect(isCssExpression(normalizeTeamColor(value))).toBe(false);
    }
  });
});

describe("what gets painted", () => {
  it("resolves an ink id through --mb-* tokens, never a hex", () => {
    for (const id of TEAM_COLOR_IDS) {
      const css = teamColorCss(id)!;
      expect(css).toBe(TEAM_COLOR_CSS[id]);
      expect(css).toContain("var(--mb-");
      expect(css).not.toMatch(/#[0-9a-f]{3,8}/i);
    }
  });

  it("still paints a legacy value, so an un-migrated team is never invisible", () => {
    expect(teamColorCss(LEGACY.quickAddTeal)).toBe(TEAM_COLOR_CSS.teal);
    expect(teamColorCss(LEGACY.oldPaletteCoral)).toBe(TEAM_COLOR_CSS.rose);
    expect(teamColorCss("#e2553d")).toBe("#e2553d");
  });
});

describe("what a reader is told", () => {
  it("names the ink instead of printing the recipe", () => {
    // The team profile printed the left-hand side of each of these.
    expect(teamColorName(LEGACY.lilac)).toBe("Lilac");
    expect(teamColorName(LEGACY.quickAddTeal)).toBe("Teal");
    expect(teamColorName(LEGACY.handMade)).toBe("Navy");
    expect(teamColorName("rose")).toBe("Rose");
  });

  it("cannot emit var() or color-mix() from any input", () => {
    const inputs = [
      ...Object.values(LEGACY),
      ...TEAM_COLOR_IDS,
      "",
      "var(--mb-teal-does-not-exist)",
      "rgb(1 2 3)",
      "chartreuse",
    ];
    for (const value of inputs) {
      expect(isCssExpression(teamColorName(value))).toBe(false);
    }
  });

  it("shows a hand-mixed colour as its hex and nothing else as one", () => {
    expect(teamColorName("#e2553d")).toBe("Custom");
    expect(teamColorHex("#e2553d")).toBe("#E2553D");
    expect(teamColorHex("rose")).toBeUndefined();
    expect(teamColorHex(LEGACY.lilac)).toBeUndefined();
  });
});

describe("the colour a new team gets", () => {
  it("is the palette's first ink on an empty account, not a dice roll", () => {
    expect(nextTeamColor([])).toBe(DEFAULT_TEAM_COLOR);
    expect(nextTeamColor([])).toBe(nextTeamColor([]));
  });

  it("gives the first six teams six different colours", () => {
    const roster: string[] = [];
    for (let i = 0; i < TEAM_COLOR_IDS.length; i++) roster.push(nextTeamColor(roster));
    expect(new Set(roster).size).toBe(TEAM_COLOR_IDS.length);
    expect(roster).toEqual([...TEAM_COLOR_IDS]);
  });

  it("reads a legacy roster before deciding", () => {
    // Two teams saved as the old expressions ARE navy and teal already.
    expect(nextTeamColor([LEGACY.handMade, LEGACY.quickAddTeal])).toBe("plum");
  });

  it("wraps to the least-used ink once the palette is spent", () => {
    expect(nextTeamColor([...TEAM_COLOR_IDS])).toBe(TEAM_COLOR_IDS[0]);
    expect(nextTeamColor([...TEAM_COLOR_IDS, "navy"])).toBe(TEAM_COLOR_IDS[1]);
  });
});

describe("quick add writes storable colours", () => {
  it("emits ink ids, never the CSS the swatches paint", () => {
    const plan = buildQuickAddPlan({
      count: 6,
      start: 1,
      naming: "team",
      colors: [...TEAM_COLOR_IDS],
    });
    expect(plan.map((entry) => entry.color)).toEqual([...TEAM_COLOR_IDS]);
    for (const entry of plan) expect(isCssExpression(entry.color)).toBe(false);
  });

  it("continues the colour cycle across batches, like the numbering", () => {
    const second = buildQuickAddPlan({
      count: 2,
      start: 7,
      naming: "team",
      colors: [...TEAM_COLOR_IDS],
    });
    expect(second.map((e) => e.name)).toEqual(["Team 7", "Team 8"]);
    expect(second.map((e) => e.color)).toEqual(["navy", "teal"]);
  });
});

describe("guest teams", () => {
  it("carry ink ids rather than off-palette hexes", () => {
    for (const team of [GUEST_HOME_TEAM, GUEST_AWAY_TEAM]) {
      expect(TEAM_COLOR_IDS).toContain(team.color);
      expect(teamColorCss(team.color)).toContain("var(--mb-");
    }
    expect(GUEST_HOME_TEAM.color).not.toBe(GUEST_AWAY_TEAM.color);
  });
});

/* ---------------------------------------------------------------------------
   CRESTS

   The walker's report: "five teams render two distinct crest designs, rows 1–2
   pixel-identical and rows 3–4 pixel-identical". Measured over 1000 simulated
   quick-add batches of five, the id-hashed assignment repeated a crest in 802
   of them and bottomed out at two designs for five teams — the birthday bound
   over an eight-crest pack, not a bad mixer. A numbered run is the one case
   the app can assign perfectly, and it is the case Quick Add creates.
   --------------------------------------------------------------------------- */
describe("crest assignment", () => {
  const STYLES: Array<[string, boolean]> = [
    ["Team", false],
    ["Squad", false],
    ["Group", true],
    ["Court", false],
    ["Side", true],
  ];

  it("gives every team in a quick-add batch a different crest", () => {
    for (const [prefix, letters] of STYLES) {
      for (let start = 1; start <= 60; start++) {
        const plan = buildQuickAddPlan({
          count: 8,
          start,
          naming: prefix.toLowerCase(),
          colors: [...TEAM_COLOR_IDS],
        });
        expect(letters || plan[0].name.startsWith(prefix)).toBeTruthy();
        const crests = plan.map((entry) => crestForTeam("id-is-ignored", entry.name));
        expect(new Set(crests).size).toBe(8);
      }
    }
  });

  it("is what the create sheet previewed — same name, same crest", () => {
    // The preview hashed the typed name; the created team hashed its generated
    // id, so the crest a person approved was usually not the one they got.
    expect(crestForTeam("1784116800000-abc1234", "Coastal Comets")).toBe(
      crestForTeam("1784116800000-zzz9999", "Coastal Comets")
    );
  });

  it("still honours a name that IS one of the pack crests", () => {
    expect(crestForTeam("whatever", "Riptide")).toContain("riptide");
    expect(crestForTeam("whatever", "Storm Chasers")).toContain("storm");
  });

  it("falls back to the id when a team has no name", () => {
    expect(crestForTeam("1784116800000-abc1234", "")).toMatch(/\.svg$/);
  });
});
