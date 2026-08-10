import { describe, expect, it } from "vitest";
import {
  FORMAT_META,
  FORMAT_ORDER,
  hasAdvancedSettings,
} from "@/components/matchbook/formatMeta";
import {
  buildCompetitionConfig,
  clampCourts,
  courtOptionCount,
  isConfigCustomised,
  isPowerOfTwo,
  nextPowerOfTwo,
  parseDraft,
  parseWizardStep,
  validateEntry,
  wizardStepHref,
  DEFAULT_ADVANCED_SETTINGS,
  type AdvancedSettings,
} from "@/components/competitions/new/rules";
import {
  buildQuickAddPlan,
  columnLetters,
} from "@/components/QuickAddTeams";
import { formatPreview } from "@/components/matchbook/useMatchbookNewCompetition";
import type { CompetitionType } from "@/types/game";

/* ===========================================================================
   The format -> controls matrix.

   This is the table the charter (W3 acceptance 2) asks for. Before the
   rewrite the same knowledge lived in three predicates in `NameStep` and a
   fourth in `AdvancedSettingsPanel`; the values below are those four
   predicates, transcribed from the pre-rewrite source, so the test fails if
   `FORMAT_META` ever quietly drops a control from a format.
   =========================================================================== */

const LEGACY_MATRIX: Record<
  CompetitionType,
  { series: boolean; courts: boolean; scoringMode: boolean; standingsPoints: boolean }
> = {
  // NameStep.tsx:181 — series for RR / SE / DE
  // NameStep.tsx:102 — courts for TMR / W2O (gated on maxCourts > 1)
  // NameStep.tsx:137 — scoring mode for TMR / W2O
  // AdvancedSettingsPanel.tsx:56 — standings points for RR only
  round_robin: { series: true, courts: false, scoringMode: false, standingsPoints: true },
  single_elimination: { series: true, courts: false, scoringMode: false, standingsPoints: false },
  double_elimination: { series: true, courts: false, scoringMode: false, standingsPoints: false },
  win2out: { series: false, courts: true, scoringMode: true, standingsPoints: false },
  two_match_rotation: { series: false, courts: true, scoringMode: true, standingsPoints: false },
};

describe("format -> controls matrix", () => {
  it("covers all five formats exactly once", () => {
    expect([...FORMAT_ORDER].sort()).toEqual(
      (Object.keys(LEGACY_MATRIX) as CompetitionType[]).sort()
    );
  });

  for (const type of Object.keys(LEGACY_MATRIX) as CompetitionType[]) {
    it(`${type} renders the same controls it did before the rewrite`, () => {
      expect(FORMAT_META[type].supports).toEqual(LEGACY_MATRIX[type]);
    });
  }

  it("offers advanced settings wherever a format owns one", () => {
    // Venue wording now renders for every format, but `hasAdvancedSettings`
    // still reports whether the format owns a setting of its own.
    expect(hasAdvancedSettings("round_robin")).toBe(true);
    expect(hasAdvancedSettings("win2out")).toBe(true);
    expect(hasAdvancedSettings("single_elimination")).toBe(false);
  });

  it("gives every format a sprite mark and a token accent", () => {
    for (const type of FORMAT_ORDER) {
      expect(FORMAT_META[type].icon).toMatch(/^[a-z-]+$/);
      expect(FORMAT_META[type].accent).toMatch(/^var\(--mb-[a-z-]+\)$/);
    }
  });
});

/* --------------------------------------------------------------- entry rule */

describe("validateEntry", () => {
  it("refuses a count under the format minimum", () => {
    const result = validateEntry("double_elimination", 3);
    expect(result.valid).toBe(false);
    expect(result.message).toBe("Select at least 4 teams");
  });

  it("keeps the bye message for non-power-of-two elimination entries", () => {
    expect(validateEntry("single_elimination", 7).message).toBe(
      "7 teams selected (1 bye)"
    );
    expect(validateEntry("single_elimination", 5).message).toBe(
      "5 teams selected (3 byes)"
    );
    expect(validateEntry("single_elimination", 7).byes).toBe(1);
    expect(validateEntry("single_elimination", 7).bracketSize).toBe(8);
  });

  it("reports no byes for a full bracket", () => {
    const result = validateEntry("single_elimination", 8);
    expect(result.byes).toBe(0);
    expect(result.message).toBe("8 teams selected");
  });

  it("never mentions byes for a non-bracket format", () => {
    expect(validateEntry("round_robin", 7).message).toBe("7 teams selected");
  });

  it("is invalid with no format chosen", () => {
    expect(validateEntry(null, 12).valid).toBe(false);
  });

  it("agrees with the power-of-two helpers", () => {
    expect(isPowerOfTwo(1)).toBe(true);
    expect(isPowerOfTwo(6)).toBe(false);
    expect(nextPowerOfTwo(5)).toBe(8);
    expect(nextPowerOfTwo(16)).toBe(16);
  });
});

/* -------------------------------------------------------------- court clamp */

describe("court clamp", () => {
  it("offers one option per two teams, capped at four", () => {
    expect(courtOptionCount(0)).toBe(1);
    expect(courtOptionCount(3)).toBe(1);
    expect(courtOptionCount(4)).toBe(2);
    expect(courtOptionCount(12)).toBe(4);
    expect(courtOptionCount(40)).toBe(4);
  });

  it("re-clamps a stale court count when the entry list shrinks", () => {
    // The inherited bug: 12 teams -> 4 courts, then drop to 4 teams.
    expect(clampCourts(4, 12)).toBe(4);
    expect(clampCourts(4, 4)).toBe(2);
    expect(clampCourts(4, 2)).toBe(1);
  });

  it("never returns zero", () => {
    expect(clampCourts(0, 12)).toBe(1);
    expect(clampCourts(-3, 12)).toBe(1);
  });
});

/* ------------------------------------------------------------------ config */

const withAdvanced = (patch: Partial<AdvancedSettings>): AdvancedSettings => ({
  ...DEFAULT_ADVANCED_SETTINGS,
  ...patch,
});

describe("competition config", () => {
  it("persists nothing when the user changed nothing", () => {
    expect(buildCompetitionConfig(DEFAULT_ADVANCED_SETTINGS)).toBeUndefined();
    expect(isConfigCustomised(DEFAULT_ADVANCED_SETTINGS)).toBe(false);
  });

  it("counts pointsForTie as a customisation", () => {
    // The regression this test exists for: `pointsForTie` was absent from the
    // predicate, so a tie value could be entered and silently dropped.
    const settings = withAdvanced({ pointsForTie: 1 });
    expect(isConfigCustomised(settings)).toBe(true);
    expect(buildCompetitionConfig(settings)).toBeDefined();
  });

  it("keeps tie points only when ties are allowed", () => {
    expect(
      buildCompetitionConfig(withAdvanced({ allowTies: true, pointsForTie: 1 }))
        ?.pointsForTie
    ).toBe(1);
    expect(
      buildCompetitionConfig(withAdvanced({ allowTies: false, pointsForTie: 1 }))
        ?.pointsForTie
    ).toBeUndefined();
  });

  it("pluralises the venue properly instead of appending an s", () => {
    const config = buildCompetitionConfig(
      withAdvanced({ venueName: "pitch", venuePlural: "pitches" })
    );
    expect(config?.terminology.venue).toBe("pitch");
    expect(config?.terminology.venuePlural).toBe("pitches");
  });

  it("falls back to a derived plural when the field is emptied", () => {
    const config = buildCompetitionConfig(
      withAdvanced({ venueName: "box", venuePlural: "  " })
    );
    expect(config?.terminology.venuePlural).toBe("boxes");
  });

  it("leaves match terminology at its defaults", () => {
    const config = buildCompetitionConfig(withAdvanced({ pointsForWin: 2 }));
    expect(config?.terminology.match).toBe("match");
    expect(config?.terminology.matchPlural).toBe("matches");
  });
});

/* ------------------------------------------------------------------- steps */

describe("step routing", () => {
  it("falls back to the first step for anything unknown", () => {
    expect(parseWizardStep(null)).toBe("format");
    expect(parseWizardStep("nonsense")).toBe("format");
    expect(parseWizardStep("teams")).toBe("teams");
    expect(parseWizardStep("details")).toBe("details");
  });

  it("keeps the first step on the bare path", () => {
    expect(wizardStepHref("format")).toBe("/competitions/new");
    expect(wizardStepHref("teams")).toBe("/competitions/new?step=teams");
  });
});

/* ------------------------------------------------------------------ drafts */

describe("draft parsing", () => {
  it("returns null for junk instead of throwing", () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft("not json")).toBeNull();
    expect(parseDraft("[1,2,3]")?.format).toBeNull();
  });

  it("rejects a format that is not a real competition type", () => {
    expect(parseDraft(JSON.stringify({ format: "kabaddi" }))?.format).toBeNull();
  });

  it("round-trips a complete draft", () => {
    const draft = {
      format: "win2out",
      teamIds: ["a", "b", 7],
      name: "Friday Night",
      courts: 3,
      series: 1,
      instantWin: true,
      advanced: withAdvanced({ venueName: "lane", venuePlural: "lanes" }),
    };
    const parsed = parseDraft(JSON.stringify(draft));
    expect(parsed?.format).toBe("win2out");
    expect(parsed?.teamIds).toEqual(["a", "b"]);
    expect(parsed?.courts).toBe(3);
    expect(parsed?.instantWin).toBe(true);
    expect(parsed?.advanced.venuePlural).toBe("lanes");
  });
});

/* ---------------------------------------------------------------- quick add */

describe("quick add numbering", () => {
  it("continues from the existing library on a repeat open", () => {
    const first = buildQuickAddPlan({
      count: 4,
      start: 1,
      naming: "team",
      colors: ["var(--mb-navy)"],
    });
    expect(first.map((entry) => entry.name)).toEqual([
      "Team 1",
      "Team 2",
      "Team 3",
      "Team 4",
    ]);

    // Second open, with the four teams above already in the library.
    const second = buildQuickAddPlan({
      count: 3,
      start: 5,
      naming: "team",
      colors: ["var(--mb-navy)"],
    });
    expect(second.map((entry) => entry.name)).toEqual([
      "Team 5",
      "Team 6",
      "Team 7",
    ]);
    // The defect: the second batch used to restart at 1 and duplicate names.
    expect(
      second.some((entry) => first.some((prior) => prior.name === entry.name))
    ).toBe(false);
  });

  it("letters group and side styles, and carries past Z", () => {
    expect(
      buildQuickAddPlan({ count: 2, start: 1, naming: "group", colors: ["x"] }).map(
        (entry) => entry.name
      )
    ).toEqual(["Group A", "Group B"]);
    expect(columnLetters(26)).toBe("Z");
    expect(columnLetters(27)).toBe("AA");
    expect(columnLetters(28)).toBe("AB");
  });

  it("cycles the palette and never emits an empty colour", () => {
    const plan = buildQuickAddPlan({
      count: 5,
      start: 1,
      naming: "team",
      colors: ["a", "b"],
    });
    expect(plan.map((entry) => entry.color)).toEqual(["a", "b", "a", "b", "a"]);
    expect(
      buildQuickAddPlan({ count: 2, start: 1, naming: "team", colors: [] }).every(
        (entry) => entry.color.length > 0
      )
    ).toBe(true);
  });
});

/* ---------------------------------------------------------------- preview */

describe("format preview", () => {
  const options = { series: 1, courts: 2, venue: "court", instantWin: false };

  it("counts round-robin matchups", () => {
    const lines = formatPreview("round_robin", 8, options);
    expect(lines.find((line) => line.label === "Matchups")?.value).toBe("28");
  });

  it("reports the padded bracket for an elimination format", () => {
    const lines = formatPreview("single_elimination", 7, options);
    expect(lines.find((line) => line.label === "Bracket")?.value).toBe("8 slots");
    expect(lines.find((line) => line.label === "Byes")?.value).toBe("1");
    expect(lines.find((line) => line.label === "Rounds")?.value).toBe("3");
  });

  it("splits a rotation entry list between the courts and the queue", () => {
    const lines = formatPreview("two_match_rotation", 10, options);
    expect(lines.find((line) => line.label === "Playing at once")?.value).toBe("4");
    expect(lines.find((line) => line.label === "In queue")?.value).toBe("6");
  });

  it("uses the configured venue word", () => {
    const lines = formatPreview("win2out", 6, {
      ...options,
      courts: 1,
      venue: "pitch",
    });
    expect(lines.some((line) => line.value.includes("pitch"))).toBe(true);
  });
});
