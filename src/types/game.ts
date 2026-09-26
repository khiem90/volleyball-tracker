import type { CompetitionTerminology } from "./competition-config";

// A roster team. Stored under users/{uid}/teams (see src/lib/roster.ts).
export interface PersistentTeam {
  id: string;
  name: string;
  createdAt: number;
  color?: string;
}

// ============================================
// Tournaments
// ============================================

export type TournamentFormat =
  | "round_robin"
  | "single_elimination"
  | "double_elimination"
  | "win2out"
  | "two_match_rotation";

export type TournamentStatus = "draft" | "live" | "completed";

/**
 * A team's place in one tournament. An entry copies the team's name and color
 * from the roster when it is made, so a completed tournament keeps them as
 * they were. Withdrawing a team from a live tournament sets `withdrawnAt`.
 */
export interface Entry {
  teamId: string;
  name: string;
  color?: string;
  withdrawnAt?: number;
}

export interface TournamentSettings {
  /** Courts in play at once. Only rotation formats use more than one. */
  courts: number;
  /** Best-of series length. 1 means a single game decides each match. */
  seriesLength: number;
  /** Record a result by tapping the winner instead of scoring points. */
  instantWin: boolean;
  /** Standings points for a win and a loss. Ties are not allowed. */
  pointsForWin: number;
  pointsForLoss: number;
  terminology: CompetitionTerminology;
}

/**
 * A tournament document at tournaments/{id}. Matches live in the `matches`
 * subcollection, one document each; the tournament never carries an array of
 * them. `revision` changes on every write so a command applied on stale data
 * can be detected and retried.
 */
export interface Tournament {
  id: string;
  ownerId: string;
  name: string;
  format: TournamentFormat;
  status: TournamentStatus;
  entries: Entry[];
  /** Entered team ids, kept flat so queries can filter on them. */
  teamIds: string[];
  settings: TournamentSettings;
  // Rotation format state
  win2outState?: Win2OutState;
  twoMatchRotationState?: TwoMatchRotationState;
  /** Whether the spectator link is on. Off means nobody but the owner can read it. */
  spectatorEnabled: boolean;
  revision: string;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
  winnerId?: string;
}

// ============================================
// Matches
// ============================================

export type MatchStatus = "pending" | "in_progress" | "completed";

export type BracketSide = "winners" | "losers" | "grand_finals";

/**
 * One match. Tournament matches live at tournaments/{tournamentId}/matches/{id}
 * and quick matches at users/{uid}/matches/{id} with a null tournamentId. Both
 * carry ownerId so one collection group query returns an account's matches.
 * An empty homeTeamId or awayTeamId is a bracket slot nothing has filled yet.
 */
export interface Match {
  id: string;
  ownerId: string;
  tournamentId: string | null;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  status: MatchStatus;
  round: number;
  /** Position within the round. Rotation formats use it as the court number. */
  position: number;
  /** Court the match is played on, when the format assigns one. */
  court?: number;
  bracket?: BracketSide;
  winnerId?: string;
  /** Set when the result was awarded because this team withdrew or did not play. */
  forfeitedBy?: string;
  createdAt: number;
  completedAt?: number;
  seriesLength?: number;
  homeWins?: number;
  awayWins?: number;
  seriesGame?: number;
  /** True when a bye decided the match instead of play. */
  isBye?: boolean;
}

/** A match the engine has scheduled but not yet placed in a tournament. */
export type MatchDraft = Omit<Match, "id" | "ownerId" | "tournamentId" | "createdAt">;

/** How far a match has got: its status and the points on the board. */
export type MatchProgress = Pick<Match, "status" | "homeScore" | "awayScore">;

// ============================================
// Round Robin
// ============================================

export interface RoundRobinStanding {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  /** Wins awarded by forfeit, already counted in `won`. */
  forfeitWins: number;
  /** Losses by forfeit, already counted in `lost`. */
  forfeitLosses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDiff: number;
  competitionPoints: number;
}

// ============================================
// App state
// ============================================

export interface AppState {
  teams: PersistentTeam[];
  tournaments: Tournament[];
  matches: Match[];
}

// ============================================
// Rotation formats
// ============================================

/**
 * What one result on a court moved, kept so the result can be undone without
 * touching the other courts. A rotation state keeps the last few records of
 * each court, oldest first; only a court's newest record can be undone, and
 * undoing it makes the one before it the newest. `court` and `teamStatuses`
 * are copies from before the result: the court itself and the status of every
 * team the result touched.
 */
export interface RotationUndoRecord<TeamStatus, Court> {
  matchId: string;
  /** The match the result scheduled on this court, if the queue had teams for it. */
  nextMatchId?: string;
  court: Court;
  /** Teams the result sent from the court to the queue, in the order they joined it. */
  toQueue: string[];
  /** Teams the result pulled from the queue onto the court, in the order they left it. */
  fromQueue: string[];
  teamStatuses: TeamStatus[];
  /** The match as it stood before the result, so undo can put its points back. */
  match: MatchProgress;
}

// ============================================
// Win 2 & Out
// ============================================

export type Win2OutEliminationReason = "lost" | "champion";

export interface Win2OutTeamStatus {
  teamId: string;
  winStreak: number;
  isEliminated: boolean;
  eliminationReason?: Win2OutEliminationReason;
  eliminatedAt?: number; // Repurposed as champion count in endless mode
  matchesPlayed: number;
  currentCourt?: number; // Which court the team is currently on (undefined if in queue)
}

export interface Win2OutCourt {
  courtNumber: number;
  teamIds: [string, string];
  currentChampionId?: string; // Team with win streak on this court
}

export interface Win2OutState {
  teamStatuses: Win2OutTeamStatus[];
  queue: string[]; // Team IDs waiting to play
  courts: Win2OutCourt[]; // Multiple courts with teams
  numberOfCourts: number; // Configuration setting
  currentChampionId?: string; // Legacy - kept for single court compatibility
  isComplete: boolean;
  undoRecords?: RotationUndoRecord<Win2OutTeamStatus, Win2OutCourt>[];
}

// ============================================
// Two Match Rotation
// ============================================

export interface TwoMatchRotationTeamStatus {
  teamId: string;
  sessionMatches: number; // Matches played in current session (resets when returning from queue)
  totalMatches: number;
  totalWins: number;
  totalLosses: number;
  currentCourt?: number; // Which court the team is currently on (undefined if in queue)
}

export interface TwoMatchRotationCourt {
  courtNumber: number;
  teamIds: [string, string];
  isFirstMatch: boolean; // Each court tracks its own first match state
  matchId?: string; // Current match ID for this court
}

export interface TwoMatchRotationState {
  teamStatuses: TwoMatchRotationTeamStatus[];
  queue: string[]; // Team IDs waiting to play
  courts: TwoMatchRotationCourt[]; // Multiple courts with teams
  numberOfCourts: number; // Configuration setting
  isComplete: boolean;
  undoRecords?: RotationUndoRecord<TwoMatchRotationTeamStatus, TwoMatchRotationCourt>[];
}
