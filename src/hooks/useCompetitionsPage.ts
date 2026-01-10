import { useState, useCallback, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import type { CompetitionStatus } from "@/types/game";

type FilterOption = "all" | CompetitionStatus;

export const useCompetitionsPage = () => {
  const { state, deleteCompetition } = useApp();
  const [filter, setFilter] = useState<FilterOption>("all");

  const visibleCompetitions = useMemo(
    () => state.competitions.filter((c) => c.status !== "completed"),
    [state.competitions]
  );

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
    const competitions = [...visibleCompetitions].sort(
      (a, b) => b.createdAt - a.createdAt
    );
    if (filter === "all") return competitions;
    return competitions.filter((c) => c.status === filter);
  }, [visibleCompetitions, filter]);

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
      all: visibleCompetitions.length,
      draft: visibleCompetitions.filter((c) => c.status === "draft").length,
      in_progress: visibleCompetitions.filter((c) => c.status === "in_progress")
        .length,
      completed: 0,
    }),
    [visibleCompetitions]
  );

  return {
    competitions: visibleCompetitions,
    counts,
    filter,
    filteredCompetitions,
    getMatchStats,
    handleDeleteCompetition,
    handleFilterChange,
  };
};
