// The single source of truth for competition-format labels, blurbs, marks and
// — critically — which format-conditional configuration controls exist.
//
// This module reconciles the three tables that duplicated this information:
//   - src/hooks/useNewCompetitionPage.tsx:39-80   (label, description, icon, minTeams, gradient)
//   - src/components/matchbook/useMatchbookCompete.ts:7-13  (labels only, one of them different)
//   - the format predicates inlined in src/components/competitions/new/NameStep.tsx
//     and AdvancedSettingsPanel.tsx  (the `supports` flags below)
//
// Charter H14 / §2.3: nobody writes a fourth table.

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
   * Contained accent for this format: a rule, a bar or a rail — never a fill,
   * a tint or a gradient (charter D-9).
   *
   * Every value below is lifted verbatim from the shipped four-accent rail cycle
   * (`useMatchbookDashboard.ts:19-24` — teal / gold / ink-muted / plum), so no
   * new colour mapping is invented (design language §1.2). Three tokens are
   * deliberately unavailable: `--mb-coral` is the selection rail and would
   * collide with the wizard's own selected-card mark; `--mb-green` and
   * `--mb-red` carry fixed win / live status meanings; `--mb-navy` is the
   * structural border colour, so a navy rail is invisible against the 1.5px
   * navy edge of the panel or choice card it sits inside.
   *
   * That leaves four values for five formats, so the two bracket formats share
   * one. They are a family — `isEliminationFormat()` already treats them as one
   * — and they are told apart by icon and label, never by colour alone.
   */
  accent: string;
  /** Fewest teams the generator accepts. */
  minTeams: number;
  supports: FormatSupports;
}

export const FORMAT_META: Record<CompetitionType, FormatMetaEntry> = {
  round_robin: {
    label: "Round Robin",
    blurb: "Every team plays every other team once. Standings decide the winner.",
    icon: "refresh",
    accent: "var(--mb-teal)",
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
    accent: "var(--mb-plum)",
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
    accent: "var(--mb-plum)",
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
    accent: "var(--mb-gold)",
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
    accent: "var(--mb-ink-muted)",
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
