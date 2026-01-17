import type {
  AppState,
  PersistentTeam,
  Competition,
  Match,
  CompetitionType,
  MatchStatus,
} from "@/types/game";

// ============================================
// Constants
// ============================================
export const STORAGE_KEY = "volleyball-tracker-state";

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// ============================================
// Initial State
// ============================================
export const initialState: AppState = {
  teams: [],
  competitions: [],
  matches: [],
};

// ============================================
// Action Types
// ============================================

// Team Actions
type TeamAction =
  | { type: "ADD_TEAM"; name: string; color?: string }
  | { type: "UPDATE_TEAM"; id: string; name: string; color?: string }
  | { type: "DELETE_TEAM"; id: string };

// Competition Actions
type CompetitionAction =
  | {
      type: "CREATE_COMPETITION";
      name: string;
      competitionType: CompetitionType;
      teamIds: string[];
      numberOfCourts?: number;
      matchSeriesLength?: number;
    }
  | { type: "UPDATE_COMPETITION"; competition: Competition }
  | { type: "DELETE_COMPETITION"; id: string }
  | { type: "START_COMPETITION"; id: string }
  | { type: "COMPLETE_COMPETITION"; id: string; winnerId?: string };

// Match Actions
type MatchAction =
  | { type: "ADD_MATCH"; match: Omit<Match, "id" | "createdAt"> }
  | { type: "ADD_MATCHES"; matches: Omit<Match, "id" | "createdAt">[] }
  | {
      type: "UPDATE_MATCH_SCORE";
      matchId: string;
      homeScore: number;
      awayScore: number;
    }
  | { type: "START_MATCH"; matchId: string }
  | { type: "COMPLETE_MATCH"; matchId: string; winnerId: string }
  | { type: "UPDATE_MATCH"; matchId: string; updates: Partial<Match> }
  | { type: "DELETE_MATCH"; matchId: string }
  | {
      type: "UPDATE_MATCH_TEAMS";
      matchId: string;
      homeTeamId: string;
      awayTeamId: string;
    }
  | {
      type: "UPDATE_MATCH_COURT";
      matchId: string;
      courtNumber: number;
    };

// State Actions
type StateAction =
  | { type: "LOAD_STATE"; state: AppState }
  | { type: "RESET_STATE" };

export type AppAction =
  | TeamAction
  | CompetitionAction
  | MatchAction
  | StateAction;

// ============================================
// Reducer
// ============================================
export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    // ==================
    // Team Actions
    // ==================
    case "ADD_TEAM": {
      const newTeam: PersistentTeam = {
        id: generateId(),
        name: action.name,
        color: action.color,
        createdAt: Date.now(),
      };
      return { ...state, teams: [...state.teams, newTeam] };
    }

    case "UPDATE_TEAM": {
      return {
        ...state,
        teams: state.teams.map((team) =>
          team.id === action.id
            ? { ...team, name: action.name, color: action.color }
            : team
        ),
      };
    }

    case "DELETE_TEAM": {
      return {
        ...state,
        teams: state.teams.filter((team) => team.id !== action.id),
      };
    }

    // ==================
    // Competition Actions
    // ==================
    case "CREATE_COMPETITION": {
      const newCompetition: Competition = {
        id: generateId(),
        name: action.name,
        type: action.competitionType,
        teamIds: action.teamIds,
        matchIds: [],
        status: "draft",
        createdAt: Date.now(),
        numberOfCourts: action.numberOfCourts,
        matchSeriesLength: action.matchSeriesLength,
      };
      return {
        ...state,
        competitions: [...state.competitions, newCompetition],
      };
    }

    case "UPDATE_COMPETITION": {
      return {
        ...state,
        competitions: state.competitions.map((comp) =>
          comp.id === action.competition.id ? action.competition : comp
        ),
      };
    }

    case "DELETE_COMPETITION": {
      const competition = state.competitions.find((c) => c.id === action.id);
      if (!competition) return state;

      return {
        ...state,
        competitions: state.competitions.filter((c) => c.id !== action.id),
        matches: state.matches.filter((m) => m.competitionId !== action.id),
      };
    }

    case "START_COMPETITION": {
      return {
        ...state,
        competitions: state.competitions.map((comp) =>
          comp.id === action.id
            ? { ...comp, status: "in_progress" as const }
            : comp
        ),
      };
    }

    case "COMPLETE_COMPETITION": {
      return {
        ...state,
        competitions: state.competitions.map((comp) =>
          comp.id === action.id
            ? {
                ...comp,
                status: "completed" as const,
                completedAt: Date.now(),
                winnerId: action.winnerId,
              }
            : comp
        ),
      };
    }

    // ==================
    // Match Actions
    // ==================
    case "ADD_MATCH": {
      const newMatch: Match = {
        ...action.match,
        id: generateId(),
        createdAt: Date.now(),
      };

      let updatedCompetitions = state.competitions;
      if (action.match.competitionId) {
        updatedCompetitions = state.competitions.map((comp) =>
          comp.id === action.match.competitionId
            ? { ...comp, matchIds: [...comp.matchIds, newMatch.id] }
            : comp
        );
      }

      return {
        ...state,
        matches: [...state.matches, newMatch],
        competitions: updatedCompetitions,
      };
    }

    case "ADD_MATCHES": {
      const newMatches: Match[] = action.matches.map((match) => ({
        ...match,
        id: generateId(),
        createdAt: Date.now(),
      }));

      const matchIdsByCompetition = new Map<string, string[]>();
      newMatches.forEach((match) => {
        if (match.competitionId) {
          const existing = matchIdsByCompetition.get(match.competitionId) || [];
          matchIdsByCompetition.set(match.competitionId, [
            ...existing,
            match.id,
          ]);
        }
      });

      const updatedCompetitions = state.competitions.map((comp) => {
        const newIds = matchIdsByCompetition.get(comp.id);
        if (newIds) {
          return { ...comp, matchIds: [...comp.matchIds, ...newIds] };
        }
        return comp;
      });

      return {
        ...state,
        matches: [...state.matches, ...newMatches],
        competitions: updatedCompetitions,
      };
    }

    case "UPDATE_MATCH_SCORE": {
      return {
        ...state,
        matches: state.matches.map((match) =>
          match.id === action.matchId
            ? {
                ...match,
                homeScore: action.homeScore,
                awayScore: action.awayScore,
              }
            : match
        ),
      };
    }

    case "START_MATCH": {
      return {
        ...state,
        matches: state.matches.map((match) =>
          match.id === action.matchId
            ? { ...match, status: "in_progress" as MatchStatus }
            : match
        ),
      };
    }

    case "COMPLETE_MATCH": {
      return {
        ...state,
        matches: state.matches.map((match) =>
          match.id === action.matchId
            ? {
                ...match,
                status: "completed" as MatchStatus,
                completedAt: Date.now(),
                winnerId: action.winnerId,
              }
            : match
        ),
      };
    }

    case "UPDATE_MATCH": {
      return {
        ...state,
        matches: state.matches.map((match) =>
          match.id === action.matchId
            ? { ...match, ...action.updates }
            : match
        ),
      };
    }

    case "DELETE_MATCH": {
      const match = state.matches.find((m) => m.id === action.matchId);
      if (!match) return state;

      let updatedCompetitions = state.competitions;
      if (match.competitionId) {
        updatedCompetitions = state.competitions.map((comp) =>
          comp.id === match.competitionId
            ? {
                ...comp,
                matchIds: comp.matchIds.filter((id) => id !== action.matchId),
              }
            : comp
        );
      }

      return {
        ...state,
        matches: state.matches.filter((m) => m.id !== action.matchId),
        competitions: updatedCompetitions,
      };
    }

    case "UPDATE_MATCH_TEAMS": {
      return {
        ...state,
        matches: state.matches.map((match) =>
          match.id === action.matchId
            ? {
                ...match,
                homeTeamId: action.homeTeamId,
                awayTeamId: action.awayTeamId,
              }
            : match
        ),
      };
    }

    case "UPDATE_MATCH_COURT": {
      return {
        ...state,
        matches: state.matches.map((match) =>
          match.id === action.matchId
            ? {
                ...match,
                position: action.courtNumber,
              }
            : match
        ),
      };
    }

    // ==================
    // State Actions
    // ==================
    case "LOAD_STATE": {
      return action.state;
    }

    case "RESET_STATE": {
      return initialState;
    }

    default:
      return state;
  }
};
