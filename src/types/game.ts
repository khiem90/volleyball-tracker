// ============================================
// Legacy types for single match scoring
// ============================================
export type TeamId = "teamA" | "teamB";

export interface Team {
  id: TeamId;
  name: string;
  score: number;
}

export type ActionType = "add" | "deduct";

export interface ScoreEvent {
  id: string;
  teamId: TeamId;
  teamName: string;
  action: ActionType;
  previousScore: number;
  newScore: number;
  timestamp: number;
}

export interface GameState {
  teamA: Team;
  teamB: Team;
  history: ScoreEvent[];
}

export type GameAction =
  | { type: "ADD_POINT"; teamId: TeamId }
  | { type: "DEDUCT_POINT"; teamId: TeamId }
  | { type: "UNDO" }
  | { type: "RESET" }
  | { type: "SET_TEAM_NAME"; teamId: TeamId; name: string };

// ============================================
// New types for multi-page app
// ============================================

// Persistent team (stored in localStorage)
export interface PersistentTeam {
  id: string;
  name: string;
  createdAt: number;
  color?: string;
}

// Competition types
export type CompetitionType = "round_robin" | "single_elimination" | "double_elimination";

export type CompetitionStatus = "draft" | "in_progress" | "completed";

export type MatchStatus = "pending" | "in_progress" | "completed";

// Match within a competition
export interface Match {
  id: string;
  competitionId: string | null; // null for quick matches
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  status: MatchStatus;
  round: number; // For brackets/scheduling
  position: number; // Position within round
  bracket?: "winners" | "losers" | "grand_finals"; // For double elimination
  winnerId?: string;
  createdAt: number;
  completedAt?: number;
}

// Competition
export interface Competition {
  id: string;
  name: string;
  type: CompetitionType;
  teamIds: string[];
  matchIds: string[];
  status: CompetitionStatus;
  createdAt: number;
  completedAt?: number;
  winnerId?: string;
}

// Round Robin specific
export interface RoundRobinStanding {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDiff: number;
  competitionPoints: number; // 3 for win, 0 for loss
}

// Bracket node for tournament visualization
export interface BracketNode {
  matchId: string | null;
  round: number;
  position: number;
  homeTeamId?: string;
  awayTeamId?: string;
  winnerId?: string;
  nextMatchId?: string; // Match winner advances to
  bracket?: "winners" | "losers" | "grand_finals";
}

// App state stored in localStorage
export interface AppState {
  teams: PersistentTeam[];
  competitions: Competition[];
  matches: Match[];
}

// Quick match state (for standalone matches)
export interface QuickMatch {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  status: MatchStatus;
  createdAt: number;
  completedAt?: number;
}
