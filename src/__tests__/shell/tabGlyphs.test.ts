import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SHELL_TABS, tabGlyph } from "@/lib/shell";

describe("tabGlyph", () => {
  it("draws the tab the page sits under with its filled glyph", () => {
    expect(SHELL_TABS.map((spec) => tabGlyph(spec, true))).toEqual([
      "overview-fill",
      "teams-fill",
      "compete-fill",
      "history-fill",
      "rsvp-fill",
    ]);
  });

  it("draws every other tab with its outline glyph", () => {
    expect(SHELL_TABS.map((spec) => tabGlyph(spec, false))).toEqual([
      "overview",
      "teams",
      "compete",
      "history",
      "rsvp",
    ]);
  });

  it("asks the sprite only for glyphs it has", () => {
    // Read from the repo root, which is where vitest runs.
    const sprite = readFileSync("public/assets/matchbook/icons/sprite.svg", "utf8");
    for (const spec of SHELL_TABS) {
      expect(sprite, spec.label).toContain(`<symbol id="${tabGlyph(spec, true)}" `);
      expect(sprite, spec.label).toContain(`<symbol id="${tabGlyph(spec, false)}" `);
    }
  });
});
