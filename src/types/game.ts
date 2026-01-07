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

