import { useMemo, useCallback } from "react";
import { useApp } from "@/context/AppContext";

export const useDashboardPage = () => {
  const { state } = useApp();

  const activeCompetitions = useMemo(
    () => state.competitions.filter((c) => c.status === "in_progress"),
    [state.competitions]
  );

  const completedCompetitions = useMemo(
    () => state.competitions.filter((c) => c.status === "completed"),
    [state.competitions]
  );

  const recentMatches = useMemo(
    () =>
      state.matches
        .filter((m) => m.status === "completed")
        .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
        .slice(0, 5),
    [state.matches]
  );

  const getTeamName = useCallback(
    (teamId: string) =>
      state.teams.find((t) => t.id === teamId)?.name || "Unknown Team",
    [state.teams]
  );

  const getTeamColor = useCallback(
    (teamId: string) => state.teams.find((t) => t.id === teamId)?.color || "#666",
    [state.teams]
  );

  const getMatchStats = useCallback(
    (competitionId: string) => {
      const compMatches = state.matches.filter(
        (m) => m.competitionId === competitionId
      );
      const completedCount = compMatches.filter(
        (m) => m.status === "completed"
      ).length;
      const progress =
        compMatches.length > 0
          ? (completedCount / compMatches.length) * 100
          : 0;
      return { total: compMatches.length, completed: completedCount, progress };
    },
    [state.matches]
  );

  return {
    activeCompetitions,
    completedCompetitions,
    getMatchStats,
    getTeamColor,
    getTeamName,
    matchesCount: state.matches.length,
    recentMatches,
    teamsCount: state.teams.length,
  };
};
