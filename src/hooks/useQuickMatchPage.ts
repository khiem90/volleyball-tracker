import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

export const useQuickMatchPage = () => {
  const router = useRouter();
  const { state, isRosterLoading, addTeams, addQuickMatch } = useApp();

  const [homeTeamId, setHomeTeamId] = useState<string>("");
  const [awayTeamId, setAwayTeamId] = useState<string>("");
  const [error, setError] = useState("");

  const availableTeams = state.teams;

  const handleHomeTeamSelect = useCallback(
    (teamId: string) => {
      setHomeTeamId(teamId);
      setError("");
      if (teamId === awayTeamId) {
        setAwayTeamId("");
      }
    },
    [awayTeamId]
  );

  const handleAwayTeamSelect = useCallback(
    (teamId: string) => {
      setAwayTeamId(teamId);
      setError("");
      if (teamId === homeTeamId) {
        setHomeTeamId("");
      }
    },
    [homeTeamId]
  );

  const handleSwapTeams = useCallback(() => {
    setHomeTeamId(awayTeamId);
    setAwayTeamId(homeTeamId);
    setError("");
  }, [homeTeamId, awayTeamId]);

  const handleRandomSelect = useCallback(() => {
    if (availableTeams.length < 2) {
      setError("Need at least 2 teams for random selection");
      return;
    }

    const shuffled = [...availableTeams].sort(() => Math.random() - 0.5);
    setHomeTeamId(shuffled[0].id);
    setAwayTeamId(shuffled[1].id);
    setError("");
  }, [availableTeams]);

  const handleStartMatch = useCallback(async () => {
    if (!homeTeamId || !awayTeamId) {
      setError("Please select both teams");
      return;
    }

    if (homeTeamId === awayTeamId) {
      setError("Please select two different teams");
      return;
    }

    try {
      const matchId = await addQuickMatch(homeTeamId, awayTeamId);
      router.push(`/match/${matchId}`);
    } catch (startError) {
      console.error("Failed to start the quick match:", startError);
      setError("The match could not be started. Check your connection and try again.");
    }
  }, [homeTeamId, awayTeamId, addQuickMatch, router]);

  const handleQuickCreateTeam = useCallback(() => {
    const teamNumber = state.teams.length + 1;
    addTeams([{ name: `Team ${teamNumber}` }]);
  }, [state.teams.length, addTeams]);

  const homeTeam = useMemo(
    () => state.teams.find((t) => t.id === homeTeamId),
    [state.teams, homeTeamId]
  );

  const awayTeam = useMemo(
    () => state.teams.find((t) => t.id === awayTeamId),
    [state.teams, awayTeamId]
  );

  const canStart = homeTeamId && awayTeamId && homeTeamId !== awayTeamId;

  return {
    availableTeams,
    awayTeam,
    awayTeamId,
    canStart,
    error,
    handleAwayTeamSelect,
    handleHomeTeamSelect,
    handleQuickCreateTeam,
    handleRandomSelect,
    handleStartMatch,
    handleSwapTeams,
    homeTeam,
    homeTeamId,
    isRosterLoading,
  };
};
