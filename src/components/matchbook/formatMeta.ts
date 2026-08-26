// The single source of truth for competition-format labels, blurbs, marks and
// — critically — which format-conditional configuration controls exist.
//
// This module reconciles the three tables that duplicated this information:
//   - src/hooks/useNewCompetitionPage.tsx:39-80   (label, description, icon, minTeams, gradient)
//   - src/components/matchbook/useMatchbookCompete.ts:7-13  (labels only, one of them different)
//   - the format predicates inlined in src/components/competitions/new/NameStep.tsx
//     and AdvancedSettingsPanel.tsx  (the `supports` flags below)
//
// Nobody writes a fourth table.

import type { CompetitionType } from "@/types/game";

/**
 * Which format-conditional configuration controls a format renders.
 * Lifted verbatim from the predicates in NameStep.tsx and AdvancedSettingsPanel.tsx
 * so the wizard can no longer silently drop a capability.
 */
export interface FormatSupports {
  /** "Matches per matchup" — the best-of series length picker. */
  series: boolean;
  /** Multiple simultaneous venues, plus the rotation queue that implies. */
  courts: boolean;
  /** The score-points vs instant-win scoring-mode choice. */
  scoringMode: boolean;
  /** Configurable win/tie/loss points and the allow-ties switch. */
  standingsPoints: boolean;
}

export interface FormatMetaEntry {
  /** Display-cased name. Rendered uppercase by `.matchbook-display`. */
  label: string;
  /** One sentence, sentence case, full stop. Fits a choice card at 390px. */
  blurb: string;
  /** Sprite id — render with `<MbIcon id={...} />`. Never a second icon library. */
  icon: string;
  /**
   * THERE IS DELIBERATELY NO COLOUR KEY FOR FORMATS.
   *
   * Formats deliberately carry no rail colour: a categorical key would be
   * built out of locked semantic tokens (`--mb-teal` is the rank-#1 rail,
   * `--mb-gold` is Draft) and no free hue exists in the closed palette.
   * Identity is the sprite + the label; rails around format rows are the
   * neutral `--mb-rule` hairline, and selection is the coral selection mark,
   * same as every other row in the app.
   */
  /** Fewest teams the generator accepts. */
  minTeams: number;
  supports: FormatSupports;
}

export const FORMAT_META: Record<CompetitionType, FormatMetaEntry> = {
  round_robin: {
    label: "Round Robin",
    blurb: "Every team plays every other team once. Standings decide the winner.",
    icon: "refresh",
    minTeams: 3,
    supports: {
      series: true,
      courts: false,
      scoringMode: false,
      standingsPoints: true,
    },
  },
  single_elimination: {
    label: "Single Elimination",
    blurb: "Lose once and you are out. The shortest route to a champion.",
    icon: "bracket",
    minTeams: 2,
    supports: {
      series: true,
      courts: false,
      scoringMode: false,
      standingsPoints: false,
    },
  },
  double_elimination: {
    label: "Double Elimination",
    blurb: "Two losses eliminate a team. A first defeat drops into the second bracket.",
    icon: "grid",
    minTeams: 4,
    supports: {
      series: true,
      courts: false,
      scoringMode: false,
      standingsPoints: false,
    },
  },
  win2out: {
    label: "Win 2 & Out",
    blurb: "The winner stays on. Two wins crowns a team and returns it to the queue.",
    icon: "crown",
    minTeams: 3,
    supports: {
      series: false,
      courts: true,
      scoringMode: true,
      standingsPoints: false,
    },
  },
  two_match_rotation: {
    label: "2 Match Rotation",
    blurb: "Teams play two matches, then the queue rotates. Everyone gets equal time.",
    icon: "swap",
    minTeams: 3,
    supports: {
      series: false,
      courts: true,
      scoringMode: true,
      standingsPoints: false,
    },
  },
};

/**
 * Presentation order for the wizard's format grid and any format legend.
 * Explicit so the order is a decision rather than an object-literal accident.
 */
export const FORMAT_ORDER: readonly CompetitionType[] = [
  "round_robin",
  "single_elimination",
  "double_elimination",
  "win2out",
  "two_match_rotation",
];

/** Elimination formats render a bracket instead of a standings table. */
export const isEliminationFormat = (type: CompetitionType): boolean =>
  type === "single_elimination" || type === "double_elimination";

/**
 * The wizard's "Advanced Settings" disclosure exists only for formats that own
 * at least one setting inside it. Derived, never stored, so it cannot drift
 * from `supports`.
 */
export const hasAdvancedSettings = (type: CompetitionType): boolean => {
  const { standingsPoints, courts } = FORMAT_META[type].supports;
  return standingsPoints || courts;
};
