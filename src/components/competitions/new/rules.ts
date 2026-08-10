/* ===========================================================================
   THE WIZARD'S RULES, AS PURE FUNCTIONS

   Split out of the hook on purpose. These four things — the format -> controls
   matrix, the bye arithmetic, the court clamp and the `isCustomised` predicate
   — are where this flow silently drops a capability, and a module with no
   React, no router and no context import is one a table test can pin down
   without mounting anything.

   `useNewCompetitionPage` re-exports every symbol here, so call sites import
   from the hook and only the tests import this file directly.
   =========================================================================== */

import { FORMAT_META, isEliminationFormat } from "@/components/matchbook/formatMeta";
import { pluralise } from "@/lib/text";
import type { CompetitionType } from "@/types/game";
import {
  DEFAULT_COMPETITION_CONFIG,
  type CompetitionConfig,
} from "@/types/competition-config";

/* ------------------------------------------------------------------- steps */

export type WizardStep = "format" | "teams" | "details";

export const WIZARD_STEPS: readonly WizardStep[] = ["format", "teams", "details"];

/** Query key. The step lives in the URL so Android Back walks the wizard. */
export const WIZARD_STEP_PARAM = "step";

export const parseWizardStep = (raw: string | null | undefined): WizardStep =>
  WIZARD_STEPS.includes(raw as WizardStep) ? (raw as WizardStep) : "format";

export const wizardStepHref = (step: WizardStep): string =>
  step === "format"
    ? "/competitions/new"
    : `/competitions/new?${WIZARD_STEP_PARAM}=${step}`;

/* ----------------------------------------------------------- bracket maths */

export const isPowerOfTwo = (n: number): boolean => n > 0 && (n & (n - 1)) === 0;

export const nextPowerOfTwo = (n: number): number => {
  let power = 1;
  while (power < n) power *= 2;
  return power;
};

export interface EntryValidation {
  valid: boolean;
  /** The line shown under the entry count. Empty before a format is chosen. */
  message: string;
  /** Bracket padding for non-power-of-2 elimination entries. 0 otherwise. */
  byes: number;
  /** Bracket size for elimination formats, else null. */
  bracketSize: number | null;
  minTeams: number;
}

/**
 * The entry-count rule, including the bye messaging — the only place the app
 * ever explains bracket padding, so it is preserved verbatim
 * ("7 teams selected (1 bye)").
 */
export const validateEntry = (
  format: CompetitionType | null,
  count: number
): EntryValidation => {
  if (!format) {
    return { valid: false, message: "", byes: 0, bracketSize: null, minTeams: 0 };
  }
  const { minTeams } = FORMAT_META[format];

  if (count < minTeams) {
    return {
      valid: false,
      message: `Select at least ${minTeams} teams`,
      byes: 0,
      bracketSize: null,
      minTeams,
    };
  }

  if (isEliminationFormat(format) && !isPowerOfTwo(count)) {
    const bracketSize = nextPowerOfTwo(count);
    const byes = bracketSize - count;
    return {
      valid: true,
      message: `${count} teams selected (${byes} ${pluralise("bye", byes)})`,
      byes,
      bracketSize,
      minTeams,
    };
  }

  return {
    valid: true,
    message: `${count} teams selected`,
    byes: 0,
    bracketSize: isEliminationFormat(format) ? count : null,
    minTeams,
  };
};

/* ------------------------------------------------------------------ courts */

/** Two teams per venue, so the entry list caps how many can run at once. */
export const maxCourtsFor = (teamCount: number): number =>
  Math.floor(teamCount / 2);

/** How many court options the picker offers. Capped at 4, never below 1. */
export const courtOptionCount = (teamCount: number): number =>
  Math.max(1, Math.min(maxCourtsFor(teamCount), 4));

/**
 * Re-clamped on every read rather than only on change (charter W3 acceptance
 * 4): `maxCourts` is derived from the selection, so choosing 4 courts with 12
 * teams and then dropping to 4 teams used to leave `numberOfCourts = 4` and
 * generate a competition with two empty venues.
 */
export const clampCourts = (value: number, teamCount: number): number =>
  Math.min(Math.max(1, Math.round(value)), courtOptionCount(teamCount));

/* -------------------------------------------------------- advanced settings */

export interface AdvancedSettings {
  pointsForWin: number;
  pointsForTie: number;
  pointsForLoss: number;
  allowTies: boolean;
  venueName: string;
  venuePlural: string;
}

export const DEFAULT_ADVANCED_SETTINGS: AdvancedSettings = {
  pointsForWin: DEFAULT_COMPETITION_CONFIG.pointsForWin,
  pointsForTie: DEFAULT_COMPETITION_CONFIG.pointsForTie ?? 0,
  pointsForLoss: DEFAULT_COMPETITION_CONFIG.pointsForLoss,
  allowTies: DEFAULT_COMPETITION_CONFIG.allowTies,
  venueName: DEFAULT_COMPETITION_CONFIG.terminology.venue,
  venuePlural: DEFAULT_COMPETITION_CONFIG.terminology.venuePlural,
};

export const POINTS_MIN = 0;
export const POINTS_MAX = 10;

/**
 * Whether the user actually touched the config, which decides whether a
 * `config` object is persisted at all.
 *
 * `pointsForTie` is in the list now. It was not, so a competition that set tie
 * points and changed nothing else round-tripped with the value dropped — the
 * defect the brief records at `useNewCompetitionPage.tsx:217-221`.
 * `venuePlural` is in the list for the same reason: it is a real field now
 * rather than `venueName + "s"`.
 */
export const isConfigCustomised = (settings: AdvancedSettings): boolean =>
  settings.pointsForWin !== DEFAULT_ADVANCED_SETTINGS.pointsForWin ||
  settings.pointsForTie !== DEFAULT_ADVANCED_SETTINGS.pointsForTie ||
  settings.pointsForLoss !== DEFAULT_ADVANCED_SETTINGS.pointsForLoss ||
  settings.allowTies !== DEFAULT_ADVANCED_SETTINGS.allowTies ||
  settings.venueName.trim() !== DEFAULT_ADVANCED_SETTINGS.venueName ||
  settings.venuePlural.trim() !== DEFAULT_ADVANCED_SETTINGS.venuePlural;

export const buildCompetitionConfig = (
  settings: AdvancedSettings
): CompetitionConfig | undefined => {
  if (!isConfigCustomised(settings)) return undefined;

  const venue = settings.venueName.trim() || DEFAULT_ADVANCED_SETTINGS.venueName;
  const venuePlural = settings.venuePlural.trim() || pluralise(venue);

  return {
    pointsForWin: settings.pointsForWin,
    pointsForTie: settings.allowTies ? settings.pointsForTie : undefined,
    pointsForLoss: settings.pointsForLoss,
    allowTies: settings.allowTies,
    terminology: {
      venue,
      venuePlural,
      match: DEFAULT_COMPETITION_CONFIG.terminology.match,
      matchPlural: DEFAULT_COMPETITION_CONFIG.terminology.matchPlural,
    },
  };
};

/* ---------------------------------------------------------------- the draft */

export const WIZARD_DRAFT_KEY = "tt:new-competition-draft";

export interface WizardDraft {
  format: CompetitionType | null;
  teamIds: string[];
  name: string;
  courts: number;
  series: number;
  instantWin: boolean;
  advanced: AdvancedSettings;
}

const isCompetitionType = (value: unknown): value is CompetitionType =>
  typeof value === "string" && value in FORMAT_META;

/**
 * Every field is re-validated on the way in. A draft is untrusted input — it
 * survives a reload, a browser restore and a second tab — and a malformed one
 * must degrade to defaults rather than throw inside a render.
 */
export const parseDraft = (raw: string | null): WizardDraft | null => {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const draft = parsed as Partial<WizardDraft>;
    const advanced = (draft.advanced ?? {}) as Partial<AdvancedSettings>;
    return {
      format: isCompetitionType(draft.format) ? draft.format : null,
      teamIds: Array.isArray(draft.teamIds)
        ? draft.teamIds.filter((id): id is string => typeof id === "string")
        : [],
      name: typeof draft.name === "string" ? draft.name : "",
      courts: typeof draft.courts === "number" ? draft.courts : 1,
      series: typeof draft.series === "number" ? draft.series : 1,
      instantWin: draft.instantWin === true,
      advanced: {
        pointsForWin:
          typeof advanced.pointsForWin === "number"
            ? advanced.pointsForWin
            : DEFAULT_ADVANCED_SETTINGS.pointsForWin,
        pointsForTie:
          typeof advanced.pointsForTie === "number"
            ? advanced.pointsForTie
            : DEFAULT_ADVANCED_SETTINGS.pointsForTie,
        pointsForLoss:
          typeof advanced.pointsForLoss === "number"
            ? advanced.pointsForLoss
            : DEFAULT_ADVANCED_SETTINGS.pointsForLoss,
        allowTies: advanced.allowTies === true,
        venueName:
          typeof advanced.venueName === "string"
            ? advanced.venueName
            : DEFAULT_ADVANCED_SETTINGS.venueName,
        venuePlural:
          typeof advanced.venuePlural === "string"
            ? advanced.venuePlural
            : DEFAULT_ADVANCED_SETTINGS.venuePlural,
      },
    };
  } catch {
    return null;
  }
};
