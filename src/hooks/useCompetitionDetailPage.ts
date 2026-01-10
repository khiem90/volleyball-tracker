import { useEffect, useMemo, useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { useSession } from "@/context/SessionContext";
import {
  generateRoundRobinSchedule,
  calculateStandings,
} from "@/lib/roundRobin";
import { generateSingleEliminationBracket } from "@/lib/singleElimination";
import { generateDoubleEliminationBracket } from "@/lib/doubleElimination";
import {
  initializeWin2OutState,
  generateInitialMatches as generateWin2OutInitialMatches,
} from "@/lib/win2out";
import {
  initializeTwoMatchRotationState,
  generateInitialMatches as generateTwoMatchRotationInitialMatches,
} from "@/lib/twoMatchRotation";
import type { Match } from "@/types/game";

export const useCompetitionDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const competitionId = params.id as string;

  const {
    state,
    getCompetitionById,
    getMatchesByCompetition,
    addMatches,
    startCompetition,
    startCompetitionWithMatches,
    completeCompetition,
    canEdit,
  } = useApp();

  const { isSharedMode } = useSession();

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showCreateSession, setShowCreateSession] = useState(false);

  const competition = useMemo(
    () => getCompetitionById(competitionId),
    [getCompetitionById, competitionId]
  );

  const matches = useMemo(
    () => getMatchesByCompetition(competitionId),
    [getMatchesByCompetition, competitionId]
  );

  const competitionTeams = useMemo(() => {
    if (!competition) return [];
    return state.teams.filter((t) => competition.teamIds.includes(t.id));
  }, [competition, state.teams]);

  const handleStartCompetition = useCallback(() => {
    if (!competition) return;

    let newMatches: Omit<Match, "id" | "createdAt">[] = [];

    switch (competition.type) {
      case "round_robin":
        newMatches = generateRoundRobinSchedule(
          competition.teamIds,
          competition.id
        );
        break;
      case "single_elimination":
        newMatches = generateSingleEliminationBracket(
          competition.teamIds,
          competition.id
        );
        break;
      case "double_elimination":
        newMatches = generateDoubleEliminationBracket(
          competition.teamIds,
          competition.id
        );
        break;
      case "win2out": {
        const numCourts = competition.numberOfCourts || 1;
        const win2outState = initializeWin2OutState(
          competition.id,
          competition.teamIds,
          numCourts
        );
        const initialMatches = generateWin2OutInitialMatches(
          competition.id,
          competition.teamIds,
          numCourts
        );

        startCompetitionWithMatches(
          { ...competition, win2outState },
          initialMatches
        );
        setShowStartConfirm(false);
        return;
      }
      case "two_match_rotation": {
        const numCourts = competition.numberOfCourts || 1;
        const twoMatchRotationState = initializeTwoMatchRotationState(
          competition.id,
          competition.teamIds,
          numCourts
        );
        const initialMatches = generateTwoMatchRotationInitialMatches(
          competition.id,
          competition.teamIds,
          numCourts
        );

        startCompetitionWithMatches(
          { ...competition, twoMatchRotationState },
          initialMatches
        );
        setShowStartConfirm(false);
        return;
      }
    }

    addMatches(newMatches);
    startCompetition(competition.id);
    setShowStartConfirm(false);
  }, [competition, addMatches, startCompetition, startCompetitionWithMatches]);

  const handleMatchClick = useCallback((match: Match) => {
    setSelectedMatch(match);
  }, []);

  const handlePlayMatch = useCallback(() => {
    if (!selectedMatch) return;
    router.push(`/match/${selectedMatch.id}`);
  }, [selectedMatch, router]);

  useEffect(() => {
    if (!competition || competition.status !== "in_progress") return;

    const allMatchesComplete =
      matches.length > 0 && matches.every((m) => m.status === "completed");

    if (allMatchesComplete) {
      let winnerId: string | undefined;

      if (competition.type === "round_robin") {
        const standings = calculateStandings(competition.teamIds, matches);
        winnerId = standings[0]?.teamId;
      } else {
        const finalMatch = matches.find((m) => {
          if (competition.type === "single_elimination") {
            const totalRounds = Math.log2(competition.teamIds.length);
            return m.round === totalRounds && !m.bracket;
          }
          return m.bracket === "grand_finals";
        });
        winnerId = finalMatch?.winnerId;
      }

      if (winnerId) {
        completeCompetition(competition.id, winnerId);
      }
    }
  }, [competition, matches, completeCompetition]);

  const completedMatches = matches.filter(
    (m) => m.status === "completed"
  ).length;
  const inProgressMatches = matches.filter(
    (m) => m.status === "in_progress"
  ).length;
  const pendingMatches = matches.filter((m) => m.status === "pending").length;
  const totalProgress =
    matches.length > 0 ? (completedMatches / matches.length) * 100 : 0;

  const standings =
    competition && competition.type === "round_robin"
      ? calculateStandings(competition.teamIds, matches)
      : null;

  const winner = competition?.winnerId
    ? state.teams.find((t) => t.id === competition.winnerId)
    : null;

  return {
    canEdit,
    competition,
    competitionTeams,
    completedMatches,
    editingMatch,
    handleMatchClick,
    handlePlayMatch,
    handleStartCompetition,
    inProgressMatches,
    isSharedMode,
    matches,
    pendingMatches,
    selectedMatch,
    setEditingMatch,
    setSelectedMatch,
    setShowCreateSession,
    setShowStartConfirm,
    showCreateSession,
    showStartConfirm,
    standings,
    totalProgress,
    winner,
  };
};
