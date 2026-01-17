"use client";

import { useMemo, useCallback } from "react";
import type { PersistentTeam } from "@/types/game";

interface UseTeamsMapReturn {
  teamsMap: Map<string, PersistentTeam>;
  getTeamName: (teamId: string) => string;
  getTeamColor: (teamId: string) => string;
  getTeam: (teamId: string) => PersistentTeam | undefined;
}

export const useTeamsMap = (teams: PersistentTeam[]): UseTeamsMapReturn => {
  const teamsMap = useMemo(() => {
    const map = new Map<string, PersistentTeam>();
    teams.forEach((team) => map.set(team.id, team));
    return map;
  }, [teams]);

  const getTeam = useCallback(
    (teamId: string) => teamsMap.get(teamId),
    [teamsMap]
  );

  const getTeamName = useCallback(
    (teamId: string) => teamsMap.get(teamId)?.name || "Unknown Team",
    [teamsMap]
  );

  const getTeamColor = useCallback(
    (teamId: string) => teamsMap.get(teamId)?.color || "#3b82f6",
    [teamsMap]
  );

  return {
    teamsMap,
    getTeamName,
    getTeamColor,
    getTeam,
  };
};
