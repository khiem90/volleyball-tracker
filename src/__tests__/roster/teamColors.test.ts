// @vitest-environment node
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/contrast";
import { fallbackColor, INK, letterColor, TEAM_COLORS } from "@/lib/teamColors";
import { token } from "../design/stylesheet";

const YELLOW = "#eab308";
const INDIGO = "#6366f1";

/* What each answer paints. Ink is the app's own, which the last test here holds to the stylesheet. */
const LETTER = { ink: INK, white: "#ffffff" };

describe("the letter on a team's mark", () => {
  it("is ink on the palette's yellow", () => {
    expect(letterColor(YELLOW)).toBe("ink");
  });

  it("is white on the palette's indigo", () => {
    expect(letterColor(INDIGO)).toBe("white");
  });

  /* 3 to 1 is the level for a graphic. The team's name always sits beside its mark. */
  it.each(TEAM_COLORS)("stands out at 3 to 1 or better on %s", (color) => {
    expect(contrastRatio(LETTER[letterColor(color)], color)).toBeGreaterThanOrEqual(3);
  });

  it("answers for a color outside the palette too", () => {
    expect(letterColor("#000000")).toBe("white");
    expect(letterColor("#ffffff")).toBe("ink");
    expect(letterColor("#3B82F6")).toBe("ink");
  });

  it("measures against the ink the stylesheet defines", () => {
    expect(INK).toBe(token("ink"));
  });
});

describe("the color of a team that has none", () => {
  it("is a palette color, the same one every time for a name", () => {
    const color = fallbackColor("Aces");

    expect(TEAM_COLORS).toContain(color);
    expect(fallbackColor("Aces")).toBe(color);
  });

  it("spreads different names over the palette", () => {
    const names = ["Aces", "Blockers", "Chasers", "Diggers", "Eagles", "Falcons", "Gulls", "Hawks"];

    const colors = new Set(names.map(fallbackColor));

    expect(colors.size).toBeGreaterThanOrEqual(4);
    for (const color of colors) expect(TEAM_COLORS).toContain(color);
  });

  /* The roster's own rule for when two names are the same team. */
  it("does not change with a name's case or the spaces around it", () => {
    expect(fallbackColor("  aces ")).toBe(fallbackColor("Aces"));
    expect(fallbackColor("BLOCKERS")).toBe(fallbackColor("Blockers"));
  });

  it("gives an empty name a palette color too", () => {
    expect(TEAM_COLORS).toContain(fallbackColor(""));
    expect(fallbackColor("   ")).toBe(fallbackColor(""));
  });
});
