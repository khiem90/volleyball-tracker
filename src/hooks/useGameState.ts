"use client";

import { useReducer, useCallback } from "react";
import type { GameState, GameAction, TeamId, ScoreEvent } from "@/types/game";

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const initialState: GameState = {
  teamA: {
    id: "teamA",
    name: "Team A",
    score: 0,
  },
  teamB: {
    id: "teamB",
    name: "Team B",
    score: 0,
  },
  history: [],
};

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case "ADD_POINT": {
      const team = state[action.teamId];
      const newScore = team.score + 1;
      const event: ScoreEvent = {
        id: generateId(),
        teamId: action.teamId,
        teamName: team.name,
        action: "add",
        previousScore: team.score,
        newScore,
        timestamp: Date.now(),
      };

      return {
        ...state,
        [action.teamId]: {
          ...team,
          score: newScore,
        },
        history: [event, ...state.history],
      };
    }

    case "DEDUCT_POINT": {
      const team = state[action.teamId];
      if (team.score <= 0) return state;

      const newScore = team.score - 1;
      const event: ScoreEvent = {
        id: generateId(),
        teamId: action.teamId,
        teamName: team.name,
        action: "deduct",
        previousScore: team.score,
        newScore,
        timestamp: Date.now(),
      };

      return {
        ...state,
        [action.teamId]: {
          ...team,
          score: newScore,
        },
        history: [event, ...state.history],
      };
    }

    case "UNDO": {
      if (state.history.length === 0) return state;

      const [lastEvent, ...remainingHistory] = state.history;
      const team = state[lastEvent.teamId];

      return {
        ...state,
        [lastEvent.teamId]: {
          ...team,
          score: lastEvent.previousScore,
        },
        history: remainingHistory,
      };
    }

    case "RESET": {
      return {
        teamA: {
          ...state.teamA,
          score: 0,
        },
        teamB: {
          ...state.teamB,
          score: 0,
        },
        history: [],
      };
    }

    case "SET_TEAM_NAME": {
      return {
        ...state,
        [action.teamId]: {
          ...state[action.teamId],
          name: action.name,
        },
      };
    }

    default:
      return state;
  }
};

export const useGameState = () => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const addPoint = useCallback((teamId: TeamId) => {
    dispatch({ type: "ADD_POINT", teamId });
  }, []);

  const deductPoint = useCallback((teamId: TeamId) => {
    dispatch({ type: "DEDUCT_POINT", teamId });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: "UNDO" });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const setTeamName = useCallback((teamId: TeamId, name: string) => {
    dispatch({ type: "SET_TEAM_NAME", teamId, name });
  }, []);

  return {
    state,
    addPoint,
    deductPoint,
    undo,
    reset,
    setTeamName,
  };
};

