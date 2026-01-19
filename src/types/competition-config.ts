/**
 * User-configurable competition settings
 * Allows customization of scoring rules and terminology per competition
 */

export interface CompetitionTerminology {
  /** Singular venue name (e.g., "court", "field", "table") */
  venue: string;
  /** Plural venue name (e.g., "courts", "fields", "tables") */
  venuePlural: string;
  /** Singular match name (e.g., "match", "game") */
  match: string;
  /** Plural match name (e.g., "matches", "games") */
  matchPlural: string;
}

export interface CompetitionConfig {
  /** Points awarded for a win (default: 3) */
  pointsForWin: number;
  /** Points awarded for a tie/draw (default: 0, undefined means ties not allowed) */
  pointsForTie?: number;
  /** Points awarded for a loss (default: 0) */
  pointsForLoss: number;
  /** Whether ties are allowed in this competition (default: false) */
  allowTies: boolean;
  /** Custom terminology for this competition */
  terminology: CompetitionTerminology;
}

/** Default terminology used when not customized */
export const DEFAULT_TERMINOLOGY: CompetitionTerminology = {
  venue: "court",
  venuePlural: "courts",
  match: "match",
  matchPlural: "matches",
};

/** Default competition configuration */
export const DEFAULT_COMPETITION_CONFIG: CompetitionConfig = {
  pointsForWin: 3,
  pointsForLoss: 0,
  allowTies: false,
  terminology: DEFAULT_TERMINOLOGY,
};

/**
 * Get a complete config by merging partial config with defaults
 */
export const getCompetitionConfig = (
  partialConfig?: Partial<CompetitionConfig>
): CompetitionConfig => {
  if (!partialConfig) {
    return DEFAULT_COMPETITION_CONFIG;
  }

  return {
    pointsForWin: partialConfig.pointsForWin ?? DEFAULT_COMPETITION_CONFIG.pointsForWin,
    pointsForTie: partialConfig.pointsForTie,
    pointsForLoss: partialConfig.pointsForLoss ?? DEFAULT_COMPETITION_CONFIG.pointsForLoss,
    allowTies: partialConfig.allowTies ?? DEFAULT_COMPETITION_CONFIG.allowTies,
    terminology: {
      ...DEFAULT_TERMINOLOGY,
      ...partialConfig.terminology,
    },
  };
};
