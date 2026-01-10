import { useState, useCallback, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import type { CompetitionStatus } from "@/types/game";

type FilterOption = "all" | CompetitionStatus;

export const useCompetitionsPage = () => {
  const { state, deleteCompetition } = useApp();
  const [filter, setFilter] = useState<FilterOption>("all");

  const handleDeleteCompetition = useCallback(
    (id: string) => {
      deleteCompetition(id);
    },
    [deleteCompetition]
  );

  const handleFilterChange = useCallback((value: string) => {
    setFilter(value as FilterOption);
  }, []);

  const filteredCompetitions = useMemo(() => {
    const competitions = [...state.competitions].sort(
      (a, b) => b.createdAt - a.createdAt
    );
    if (filter === "all") return competitions;
    return competitions.filter((c) => c.status === filter);
  }, [state.competitions, filter]);

  const getMatchStats = useCallback(
    (competitionId: string) => {
      const matches = state.matches.filter(
        (m) => m.competitionId === competitionId
      );
      const completedMatches = matches.filter((m) => m.status === "completed");
      return {
        total: matches.length,
        completed: completedMatches.length,
      };
    },
    [state.matches]
  );

  const counts = useMemo(
    () => ({
      all: state.competitions.length,
      draft: state.competitions.filter((c) => c.status === "draft").length,
      in_progress: state.competitions.filter((c) => c.status === "in_progress")
        .length,
      completed: state.competitions.filter((c) => c.status === "completed")
        .length,
    }),
    [state.competitions]
  );

  return {
    competitions: state.competitions,
    counts,
    filter,
    filteredCompetitions,
    getMatchStats,
    handleDeleteCompetition,
    handleFilterChange,
  };
};
