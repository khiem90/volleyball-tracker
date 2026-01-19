import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import type { CompetitionTerminology } from "@/types/competition-config";
import { DEFAULT_TERMINOLOGY } from "@/types/competition-config";

/**
 * Hook to get dynamic terminology based on competition config
 * Falls back to default terminology if no competition or config is provided
 */
export const useTerminology = (competitionId?: string): CompetitionTerminology => {
  const { getCompetitionById } = useApp();

  return useMemo(() => {
    if (!competitionId) {
      return DEFAULT_TERMINOLOGY;
    }

    const competition = getCompetitionById(competitionId);
    if (!competition?.config?.terminology) {
      return DEFAULT_TERMINOLOGY;
    }

    return {
      ...DEFAULT_TERMINOLOGY,
      ...competition.config.terminology,
    };
  }, [competitionId, getCompetitionById]);
};

/**
 * Capitalizes the first letter of a string
 */
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};
