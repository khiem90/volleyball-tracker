// @vitest-environment node
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/contrast";
import { OVERLAP_COLORS, PLAYER_COLORS, PLAYER_INFO } from "@/lib/volleyball/constants";
import type { PlayerRole } from "@/lib/volleyball/types";

/* What each letter color paints, from the spec's token table. */
const LETTER = { ink: "#15181b", white: "#ffffff" };
const SURFACE = "#ffffff";

const roles = Object.keys(PLAYER_COLORS) as PlayerRole[];

describe("a player's color on the court", () => {
  it.each(roles)("%s is written as #rrggbb, so its contrast can be measured", (role) => {
    expect(PLAYER_COLORS[role].bg).toMatch(/^#[0-9a-f]{6}$/);
  });

  /* The label is the role's short name inside its circle: S, OPP, OH1. */
  it.each(roles)("%s carries a label that reaches 4.5 to 1", (role) => {
    const { bg, text } = PLAYER_COLORS[role];
    expect(contrastRatio(LETTER[text], bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("is different for every role", () => {
    const colors = roles.map((role) => PLAYER_COLORS[role].bg);
    expect(new Set(colors).size).toBe(7);
  });

  it("is the color the legend shows for that role", () => {
    for (const role of roles) {
      expect(PLAYER_INFO[role].color).toBe(PLAYER_COLORS[role].bg);
      expect(PLAYER_INFO[role].textColor).toBe(PLAYER_COLORS[role].text);
    }
  });
});

/* The help text names each kind of line in the line's own color, on a white card. */
describe("an overlap line's color", () => {
  it.each(["front-back", "left-right"] as const)("%s reads at 4.5 to 1 as text on a card", (type) => {
    expect(OVERLAP_COLORS[type]).toMatch(/^#[0-9a-f]{6}$/);
    expect(contrastRatio(OVERLAP_COLORS[type], SURFACE)).toBeGreaterThanOrEqual(4.5);
  });
});
