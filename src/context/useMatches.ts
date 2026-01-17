"use client";

import { useCallback } from "react";
import { useApp } from "./AppContext";
import type { Match } from "@/types/game";

/**
 * Hook for match-related operations.
 * Use this instead of useApp() when you only need match functionality.
 */
export const useMatches = () => {
  const {
    state,
    canEdit,
    addMatch,
    addMatches,
    updateMatchScore,
    updateMatch,
    startMatch,
    completeMatch,
    completeMatchWithNextMatch,
    deleteMatch,
    getMatchById,
    getMatchesByCompetition,
    // Admin operations
    updateMatchTeams,
    updateMatchCourt,
    swapCourtTeams,
    reorderQueue,
  } = useApp();

  const matches = state.matches;

  // Get active (pending or in_progress) matches
  const getActiveMatches = useCallback(
    (competitionId?: string): Match[] => {
      return matches.filter((m) => {
        const isActive = m.status === "pending" || m.status === "in_progress";
        if (competitionId) {
          return isActive && m.competitionId === competitionId;
        }
        return isActive;
      });
    },
    [matches]
  );

  // Get completed matches
  const getCompletedMatches = useCallback(
    (competitionId?: string): Match[] => {
      return matches
        .filter((m) => {
          if (competitionId) {
            return m.status === "completed" && m.competitionId === competitionId;
          }
          return m.status === "completed";
        })
        .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
    },
    [matches]
  );

  return {
    matches,
    canEdit,
    // Basic match operations
    addMatch,
    addMatches,
    updateMatchScore,
    updateMatch,
    startMatch,
    completeMatch,
    completeMatchWithNextMatch,
    deleteMatch,
    // Query operations
    getMatchById,
    getMatchesByCompetition,
    getActiveMatches,
    getCompletedMatches,
    // Admin operations
    updateMatchTeams,
    updateMatchCourt,
    swapCourtTeams,
    reorderQueue,
  };
};

export type UseMatchesReturn = ReturnType<typeof useMatches>;
