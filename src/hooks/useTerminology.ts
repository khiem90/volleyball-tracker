import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import type { CompetitionTerminology } from "@/types/competition-config";
import { DEFAULT_TERMINOLOGY } from "@/types/competition-config";

/**
 * Hook to get dynamic terminology based on competition config
 * Falls back to default terminology if no competition or config is provided
 */
export const useTerminology = (competitionId?: string): CompetitionTerminology => {
  const { getTournamentById } = useApp();

  return useMemo(() => {
    if (!competitionId) {
      return DEFAULT_TERMINOLOGY;
    }

    const competition = getTournamentById(competitionId);
    if (!competition?.settings?.terminology) {
      return DEFAULT_TERMINOLOGY;
    }

    return {
      ...DEFAULT_TERMINOLOGY,
      ...competition.settings.terminology,
    };
  }, [competitionId, getTournamentById]);
};

/**
 * Capitalizes the first letter of a string
 */
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};
