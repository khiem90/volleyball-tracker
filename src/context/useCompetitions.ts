"use client";

import { useApp } from "./AppContext";
import type { Competition, CompetitionType, Match } from "@/types/game";

/**
 * Hook for competition-related operations.
 * Use this instead of useApp() when you only need competition functionality.
 */
export const useCompetitions = () => {
  const {
    state,
    canEdit,
    createCompetition,
    updateCompetition,
    deleteCompetition,
    startCompetition,
    startCompetitionWithMatches,
    completeCompetition,
    removeCompetitionLocal,
    getCompetitionById,
  } = useApp();

  const competitions = state.competitions;

  return {
    competitions,
    canEdit,
    createCompetition,
    updateCompetition,
    deleteCompetition,
    startCompetition,
    startCompetitionWithMatches,
    completeCompetition,
    removeCompetitionLocal,
    getCompetitionById,
  };
};

export type UseCompetitionsReturn = ReturnType<typeof useCompetitions>;
