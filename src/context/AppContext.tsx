"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type {
  AppState,
  PersistentTeam,
  Competition,
  Match,
  CompetitionType,
  MatchStatus,
} from "@/types/game";
import { useSession } from "./SessionContext";

// ============================================
// Constants
// ============================================
const STORAGE_KEY = "volleyball-tracker-state";

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// ============================================
// Initial State
// ============================================
const initialState: AppState = {
  teams: [],
  competitions: [],
  matches: [],
};

// ============================================
// Action Types
// ============================================
type AppAction =
  // Team actions
  | { type: "ADD_TEAM"; name: string; color?: string }
  | { type: "UPDATE_TEAM"; id: string; name: string; color?: string }
  | { type: "DELETE_TEAM"; id: string }
  // Competition actions
  | {
      type: "CREATE_COMPETITION";
      name: string;
      competitionType: CompetitionType;
      teamIds: string[];
      numberOfCourts?: number;
    }
  | { type: "UPDATE_COMPETITION"; competition: Competition }
  | { type: "DELETE_COMPETITION"; id: string }
  | { type: "START_COMPETITION"; id: string }
  | { type: "COMPLETE_COMPETITION"; id: string; winnerId?: string }
  // Match actions
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
  | { type: "DELETE_MATCH"; matchId: string }
  // State actions
  | { type: "LOAD_STATE"; state: AppState }
  | { type: "RESET_STATE" };

// ============================================
// Reducer
// ============================================
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    // Team actions
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

    // Competition actions
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

    // Match actions
    case "ADD_MATCH": {
      const newMatch: Match = {
        ...action.match,
        id: generateId(),
        createdAt: Date.now(),
      };

      // Update competition's matchIds if this match belongs to one
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

      // Group matchIds by competition
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

      // Update competitions with new match IDs
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

    case "DELETE_MATCH": {
      const match = state.matches.find((m) => m.id === action.matchId);
      if (!match) return state;

      // Remove match ID from competition if applicable
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

    // State actions
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

// ============================================
// Context
// ============================================
interface AppContextValue {
  state: AppState;
  // Session info
  isSharedMode: boolean;
  canEdit: boolean;
  // Team actions
  addTeam: (name: string, color?: string) => void;
  updateTeam: (id: string, name: string, color?: string) => void;
  deleteTeam: (id: string) => void;
  getTeamById: (id: string) => PersistentTeam | undefined;
  // Competition actions
  createCompetition: (
    name: string,
    type: CompetitionType,
    teamIds: string[],
    numberOfCourts?: number
  ) => string;
  updateCompetition: (competition: Competition) => void;
  deleteCompetition: (id: string) => void;
  startCompetition: (id: string) => void;
  startCompetitionWithMatches: (
    competition: Competition,
    matches: Omit<Match, "id" | "createdAt">[]
  ) => void;
  completeCompetition: (id: string, winnerId?: string) => void;
  getCompetitionById: (id: string) => Competition | undefined;
  // Match actions
  addMatch: (match: Omit<Match, "id" | "createdAt">) => void;
  addMatches: (matches: Omit<Match, "id" | "createdAt">[]) => void;
  updateMatchScore: (
    matchId: string,
    homeScore: number,
    awayScore: number
  ) => void;
  startMatch: (matchId: string) => void;
  completeMatch: (matchId: string, winnerId: string) => void;
  completeMatchWithNextMatch: (
    matchId: string,
    winnerId: string,
    updatedCompetition: Competition,
    nextMatch: Omit<Match, "id" | "createdAt"> | null
  ) => void;
  deleteMatch: (matchId: string) => void;
  getMatchById: (id: string) => Match | undefined;
  getMatchesByCompetition: (competitionId: string) => Match[];
  // Utility
  resetState: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// ============================================
// Provider
// ============================================
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  const [localState, dispatch] = useReducer(appReducer, initialState);
  const { session, isSharedMode, canEdit, syncAllData } = useSession();

  // Determine which state to use: session data or local data
  const state = useMemo((): AppState => {
    if (isSharedMode && session) {
      return {
        teams: session.teams || [],
        competitions: session.competition ? [session.competition] : [],
        matches: session.matches || [],
      };
    }
    return localState;
  }, [isSharedMode, session, localState]);

  // Load state from localStorage on mount (only for local mode)
  useEffect(() => {
    if (!isSharedMode) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as AppState;
          dispatch({ type: "LOAD_STATE", state: parsed });
        }
      } catch (error) {
        console.error("Failed to load state from localStorage:", error);
      }
    }
  }, [isSharedMode]);

  // Save state to localStorage whenever it changes (only for local mode)
  useEffect(() => {
    if (!isSharedMode) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localState));
      } catch (error) {
        console.error("Failed to save state to localStorage:", error);
      }
    }
  }, [localState, isSharedMode]);

  // Team actions
  const addTeam = useCallback(
    (name: string, color?: string) => {
      if (isSharedMode && !canEdit) return;

      const newTeam: PersistentTeam = {
        id: generateId(),
        name,
        color,
        createdAt: Date.now(),
      };

      if (isSharedMode && session) {
        const newTeams = [...(session.teams || []), newTeam];
        syncAllData({ teams: newTeams });
      } else {
        dispatch({ type: "ADD_TEAM", name, color });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const updateTeam = useCallback(
    (id: string, name: string, color?: string) => {
      if (isSharedMode && !canEdit) return;

      if (isSharedMode && session) {
        const newTeams = (session.teams || []).map((team) =>
          team.id === id ? { ...team, name, color } : team
        );
        syncAllData({ teams: newTeams });
      } else {
        dispatch({ type: "UPDATE_TEAM", id, name, color });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const deleteTeam = useCallback(
    (id: string) => {
      if (isSharedMode && !canEdit) return;

      if (isSharedMode && session) {
        const newTeams = (session.teams || []).filter((team) => team.id !== id);
        syncAllData({ teams: newTeams });
      } else {
        dispatch({ type: "DELETE_TEAM", id });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const getTeamById = useCallback(
    (id: string) => state.teams.find((team) => team.id === id),
    [state.teams]
  );

  // Competition actions
  const createCompetition = useCallback(
    (
      name: string,
      type: CompetitionType,
      teamIds: string[],
      numberOfCourts?: number
    ) => {
      if (isSharedMode && !canEdit) return "";

      const id = generateId();
      const newCompetition: Competition = {
        id,
        name,
        type,
        teamIds,
        matchIds: [],
        status: "draft",
        createdAt: Date.now(),
        numberOfCourts,
      };

      if (isSharedMode && session) {
        syncAllData({ competition: newCompetition });
      } else {
        dispatch({
          type: "CREATE_COMPETITION",
          name,
          competitionType: type,
          teamIds,
          numberOfCourts,
        });
      }

      return id;
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const updateCompetition = useCallback(
    (competition: Competition) => {
      if (isSharedMode && !canEdit) return;

      if (isSharedMode && session) {
        syncAllData({ competition });
      } else {
        dispatch({ type: "UPDATE_COMPETITION", competition });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const deleteCompetition = useCallback(
    (id: string) => {
      if (isSharedMode && !canEdit) return;

      if (isSharedMode && session) {
        const newMatches = (session.matches || []).filter(
          (m) => m.competitionId !== id
        );
        syncAllData({ competition: null, matches: newMatches });
      } else {
        dispatch({ type: "DELETE_COMPETITION", id });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const startCompetition = useCallback(
    (id: string) => {
      if (isSharedMode && !canEdit) return;

      if (isSharedMode && session && session.competition) {
        syncAllData({
          competition: { ...session.competition, status: "in_progress" },
        });
      } else {
        dispatch({ type: "START_COMPETITION", id });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  // Atomically start competition with matches (fixes race condition in shared mode)
  const startCompetitionWithMatches = useCallback(
    (competition: Competition, matches: Omit<Match, "id" | "createdAt">[]) => {
      if (isSharedMode && !canEdit) return;

      // Generate IDs for new matches
      const newMatches: Match[] = matches.map((match) => ({
        ...match,
        id: generateId(),
        createdAt: Date.now(),
      }));

      // Update competition with match IDs
      const updatedCompetition: Competition = {
        ...competition,
        status: "in_progress",
        matchIds: [
          ...(competition.matchIds || []),
          ...newMatches.map((m) => m.id),
        ],
      };

      if (isSharedMode && session) {
        // Single atomic update for shared mode
        const allMatches = [...(session.matches || []), ...newMatches];
        syncAllData({ competition: updatedCompetition, matches: allMatches });
      } else {
        // For local mode, dispatch both actions
        dispatch({
          type: "UPDATE_COMPETITION",
          competition: updatedCompetition,
        });
        dispatch({ type: "ADD_MATCHES", matches });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const completeCompetition = useCallback(
    (id: string, winnerId?: string) => {
      if (isSharedMode && !canEdit) return;

      if (isSharedMode && session && session.competition) {
        syncAllData({
          competition: {
            ...session.competition,
            status: "completed",
            completedAt: Date.now(),
            winnerId,
          },
        });
      } else {
        dispatch({ type: "COMPLETE_COMPETITION", id, winnerId });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const getCompetitionById = useCallback(
    (id: string) => state.competitions.find((comp) => comp.id === id),
    [state.competitions]
  );

  // Match actions
  const addMatch = useCallback(
    (match: Omit<Match, "id" | "createdAt">) => {
      if (isSharedMode && !canEdit) return;

      const newMatch: Match = {
        ...match,
        id: generateId(),
        createdAt: Date.now(),
      };

      if (isSharedMode && session) {
        const newMatches = [...(session.matches || []), newMatch];

        // Update competition matchIds if applicable
        let updatedCompetition = session.competition;
        if (match.competitionId && session.competition) {
          updatedCompetition = {
            ...session.competition,
            matchIds: [...session.competition.matchIds, newMatch.id],
          };
        }

        syncAllData({ matches: newMatches, competition: updatedCompetition });
      } else {
        dispatch({ type: "ADD_MATCH", match });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const addMatches = useCallback(
    (matches: Omit<Match, "id" | "createdAt">[]) => {
      if (isSharedMode && !canEdit) return;

      const newMatches: Match[] = matches.map((match) => ({
        ...match,
        id: generateId(),
        createdAt: Date.now(),
      }));

      if (isSharedMode && session) {
        const allMatches = [...(session.matches || []), ...newMatches];

        // Update competition matchIds if applicable
        let updatedCompetition = session.competition;
        if (session.competition) {
          const newMatchIds = newMatches
            .filter((m) => m.competitionId === session.competition?.id)
            .map((m) => m.id);
          if (newMatchIds.length > 0) {
            updatedCompetition = {
              ...session.competition,
              matchIds: [...session.competition.matchIds, ...newMatchIds],
            };
          }
        }

        syncAllData({ matches: allMatches, competition: updatedCompetition });
      } else {
        dispatch({ type: "ADD_MATCHES", matches });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const updateMatchScore = useCallback(
    (matchId: string, homeScore: number, awayScore: number) => {
      if (isSharedMode && !canEdit) return;

      if (isSharedMode && session) {
        const newMatches = (session.matches || []).map((match) =>
          match.id === matchId ? { ...match, homeScore, awayScore } : match
        );
        syncAllData({ matches: newMatches });
      } else {
        dispatch({ type: "UPDATE_MATCH_SCORE", matchId, homeScore, awayScore });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const startMatch = useCallback(
    (matchId: string) => {
      if (isSharedMode && !canEdit) return;

      if (isSharedMode && session) {
        const newMatches = (session.matches || []).map((match) =>
          match.id === matchId
            ? { ...match, status: "in_progress" as MatchStatus }
            : match
        );
        syncAllData({ matches: newMatches });
      } else {
        dispatch({ type: "START_MATCH", matchId });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const completeMatch = useCallback(
    (matchId: string, winnerId: string) => {
      if (isSharedMode && !canEdit) return;

      if (isSharedMode && session) {
        const newMatches = (session.matches || []).map((match) =>
          match.id === matchId
            ? {
                ...match,
                status: "completed" as MatchStatus,
                completedAt: Date.now(),
                winnerId,
              }
            : match
        );
        syncAllData({ matches: newMatches });
      } else {
        dispatch({ type: "COMPLETE_MATCH", matchId, winnerId });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  // Atomically complete a match, update competition, and add next match (for win2out/two_match_rotation)
  const completeMatchWithNextMatch = useCallback(
    (
      matchId: string,
      winnerId: string,
      updatedCompetition: Competition,
      nextMatch: Omit<Match, "id" | "createdAt"> | null
    ) => {
      if (isSharedMode && !canEdit) return;

      if (isSharedMode && session) {
        // Update the completed match
        let newMatches = (session.matches || []).map((match) =>
          match.id === matchId
            ? {
                ...match,
                status: "completed" as MatchStatus,
                completedAt: Date.now(),
                winnerId,
              }
            : match
        );

        // Add the next match if provided
        if (nextMatch) {
          const newMatch: Match = {
            ...nextMatch,
            id: generateId(),
            createdAt: Date.now(),
          };
          newMatches = [...newMatches, newMatch];

          // Update competition matchIds
          updatedCompetition = {
            ...updatedCompetition,
            matchIds: [...(updatedCompetition.matchIds || []), newMatch.id],
          };
        }

        // Single atomic update
        syncAllData({ matches: newMatches, competition: updatedCompetition });
      } else {
        // For local mode, dispatch in sequence
        dispatch({ type: "COMPLETE_MATCH", matchId, winnerId });
        dispatch({
          type: "UPDATE_COMPETITION",
          competition: updatedCompetition,
        });
        if (nextMatch) {
          dispatch({ type: "ADD_MATCH", match: nextMatch });
        }
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const deleteMatch = useCallback(
    (matchId: string) => {
      if (isSharedMode && !canEdit) return;

      if (isSharedMode && session) {
        const match = (session.matches || []).find((m) => m.id === matchId);
        const newMatches = (session.matches || []).filter(
          (m) => m.id !== matchId
        );

        // Remove match ID from competition if applicable
        let updatedCompetition = session.competition;
        if (match?.competitionId && session.competition) {
          updatedCompetition = {
            ...session.competition,
            matchIds: session.competition.matchIds.filter(
              (id) => id !== matchId
            ),
          };
        }

        syncAllData({ matches: newMatches, competition: updatedCompetition });
      } else {
        dispatch({ type: "DELETE_MATCH", matchId });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const getMatchById = useCallback(
    (id: string) => state.matches.find((match) => match.id === id),
    [state.matches]
  );

  const getMatchesByCompetition = useCallback(
    (competitionId: string) =>
      state.matches.filter((match) => match.competitionId === competitionId),
    [state.matches]
  );

  // Utility
  const resetState = useCallback(() => {
    if (!isSharedMode) {
      dispatch({ type: "RESET_STATE" });
    }
  }, [isSharedMode]);

  const value: AppContextValue = {
    state,
    isSharedMode,
    canEdit: isSharedMode ? canEdit : true,
    addTeam,
    updateTeam,
    deleteTeam,
    getTeamById,
    createCompetition,
    updateCompetition,
    deleteCompetition,
    startCompetition,
    startCompetitionWithMatches,
    completeCompetition,
    getCompetitionById,
    addMatch,
    addMatches,
    updateMatchScore,
    startMatch,
    completeMatch,
    completeMatchWithNextMatch,
    deleteMatch,
    getMatchById,
    getMatchesByCompetition,
    resetState,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ============================================
// Hook
// ============================================
export const useApp = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
