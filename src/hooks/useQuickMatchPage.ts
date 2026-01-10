import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

export const useQuickMatchPage = () => {
  const router = useRouter();
  const { state, addTeam, addMatch } = useApp();

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

  const handleStartMatch = useCallback(() => {
    if (!homeTeamId || !awayTeamId) {
      setError("Please select both teams");
      return;
    }

    if (homeTeamId === awayTeamId) {
      setError("Please select two different teams");
      return;
    }

    addMatch({
      competitionId: null,
      homeTeamId,
      awayTeamId,
      homeScore: 0,
      awayScore: 0,
      status: "pending",
      round: 1,
      position: 1,
    });

    setTimeout(() => {
      const latestMatch = state.matches[state.matches.length - 1];
      if (latestMatch) {
        router.push(`/match/${latestMatch.id}`);
      }
    }, 100);
  }, [homeTeamId, awayTeamId, addMatch, state.matches, router]);

  const handleQuickCreateTeam = useCallback(() => {
    const teamNumber = state.teams.length + 1;
    addTeam(`Team ${teamNumber}`);
  }, [state.teams.length, addTeam]);

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
    homeTeam,
    homeTeamId,
  };
};
