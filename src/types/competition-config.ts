/**
 * Per-tournament terminology. A tournament may call its court a field or a
 * table; Court stays the name for the concept in code.
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

/** Default terminology used when not customized */
export const DEFAULT_TERMINOLOGY: CompetitionTerminology = {
  venue: "court",
  venuePlural: "courts",
  match: "match",
  matchPlural: "matches",
};

/** Standings points a win and a loss are worth by default. */
export const DEFAULT_POINTS_FOR_WIN = 3;
export const DEFAULT_POINTS_FOR_LOSS = 0;
