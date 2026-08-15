"use client";

import { useCallback } from "react";
import { useApp } from "./AppContext";
import { teamColorCssOrDefault } from "@/lib/teamColor";

/**
 * Hook for team-related operations.
 * Use this instead of useApp() when you only need team functionality.
 */
export const useTeams = () => {
  const {
    state,
    canEdit,
    addTeam,
    updateTeam,
    deleteTeam,
    getTeamById,
  } = useApp();

  const teams = state.teams;

  const getTeamName = useCallback(
    (teamId: string): string => {
      const team = teams.find((t) => t.id === teamId);
      return team?.name || "Unknown Team";
    },
    [teams]
  );

  const getTeamColor = useCallback(
    (teamId: string): string => {
      const team = teams.find((t) => t.id === teamId);
      return teamColorCssOrDefault(team?.color);
    },
    [teams]
  );

  return {
    teams,
    canEdit,
    addTeam,
    updateTeam,
    deleteTeam,
    getTeamById,
    getTeamName,
    getTeamColor,
  };
};

export type UseTeamsReturn = ReturnType<typeof useTeams>;
