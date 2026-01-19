import { useEffect, useMemo, useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { useSession } from "@/context/SessionContext";
import { useAuth } from "@/context/AuthContext";
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
import type { Match, PersistentTeam } from "@/types/game";

export interface RoundRobinMatchRow {
  match: Match;
  homeTeam?: PersistentTeam;
  awayTeam?: PersistentTeam;
  homeWon: boolean;
  awayWon: boolean;
}

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
    removeCompetitionLocal,
    canEdit,
  } = useApp();

  const { isSharedMode, isCreator, createNewSession, endSession } = useSession();
  const { isConfigured } = useAuth();

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isEndingCompetition, setIsEndingCompetition] = useState(false);
  const [shouldAutoCreateSession, setShouldAutoCreateSession] = useState(false);

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

  const competitionTeamsMap = useMemo(() => {
    const map = new Map<string, PersistentTeam>();
    competitionTeams.forEach((team) => map.set(team.id, team));
    return map;
  }, [competitionTeams]);

  const roundRobinMatches = useMemo<RoundRobinMatchRow[]>(() => {
    if (!competition || competition.type !== "round_robin") return [];

    const statusOrder = {
      in_progress: 0,
      pending: 1,
      completed: 2,
    } as const;

    return [...matches]
      .sort((a, b) => {
        const statusDiff = statusOrder[a.status] - statusOrder[b.status];
        if (statusDiff !== 0) return statusDiff;
        if (a.round !== b.round) return a.round - b.round;
        return a.position - b.position;
      })
      .map((match) => {
        const homeTeam = competitionTeamsMap.get(match.homeTeamId);
        const awayTeam = competitionTeamsMap.get(match.awayTeamId);

        return {
          match,
          homeTeam,
          awayTeam,
          homeWon: match.winnerId === match.homeTeamId,
          awayWon: match.winnerId === match.awayTeamId,
        };
      });
  }, [competition, matches, competitionTeamsMap]);

  const handleStartCompetition = useCallback((byeTeamIds?: string[]) => {
    if (!competition) return;

    let newMatches: Omit<Match, "id" | "createdAt">[] = [];
    const seriesLength =
      competition.matchSeriesLength && competition.matchSeriesLength > 1
        ? competition.matchSeriesLength
        : 1;
    const withSeries = (matches: Omit<Match, "id" | "createdAt">[]) =>
      seriesLength > 1
        ? matches.map((match) => ({
            ...match,
            seriesLength,
            homeWins: 0,
            awayWins: 0,
            seriesGame: 1,
          }))
        : matches;

    switch (competition.type) {
      case "round_robin":
        newMatches = generateRoundRobinSchedule(
          competition.teamIds,
          competition.id
        );
        newMatches = withSeries(newMatches);
        break;
      case "single_elimination":
        newMatches = generateSingleEliminationBracket(
          competition.teamIds,
          competition.id,
          byeTeamIds
        );
        newMatches = withSeries(newMatches);
        break;
      case "double_elimination":
        newMatches = generateDoubleEliminationBracket(
          competition.teamIds,
          competition.id,
          byeTeamIds
        );
        newMatches = withSeries(newMatches);
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
        if (!isSharedMode) {
          setShouldAutoCreateSession(true);
        }
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
        if (!isSharedMode) {
          setShouldAutoCreateSession(true);
        }
        return;
      }
    }

    addMatches(newMatches);
    startCompetition(competition.id);
    setShowStartConfirm(false);
    if (!isSharedMode) {
      setShouldAutoCreateSession(true);
    }
  }, [competition, addMatches, startCompetition, startCompetitionWithMatches, isSharedMode]);

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
        const standings = calculateStandings(competition.teamIds, matches, competition.config);
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

  useEffect(() => {
    if (!shouldAutoCreateSession) return;
    if (!competition || competition.status !== "in_progress") return;
    if (isSharedMode || !isConfigured) {
      setShouldAutoCreateSession(false);
      return;
    }

    const sessionCompetition = {
      ...competition,
      matchIds: matches.map((match) => match.id),
    };

    let isActive = true;

    const startSession = async () => {
      try {
        await createNewSession(competition.name, {
          competition: sessionCompetition,
          teams: competitionTeams,
          matches,
        });
      } catch (err) {
        console.error("Failed to auto-create session:", err);
      } finally {
        if (isActive) {
          setShouldAutoCreateSession(false);
        }
      }
    };

    startSession();

    return () => {
      isActive = false;
    };
  }, [
    shouldAutoCreateSession,
    competition,
    competitionTeams,
    matches,
    isSharedMode,
    isConfigured,
    createNewSession,
  ]);

  const handleEndCompetition = useCallback(async () => {
    if (!competition || !isSharedMode) return;
    setIsEndingCompetition(true);
    if (competition.status !== "completed") {
      completeCompetition(competition.id);
    }
    const summary = await endSession();
    setIsEndingCompetition(false);
    setShowEndConfirm(false);
    if (summary) {
      removeCompetitionLocal(competition.id);
      router.push(`/summary/${summary.shareCode}`);
    }
  }, [
    competition,
    isSharedMode,
    completeCompetition,
    endSession,
    removeCompetitionLocal,
    router,
  ]);

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
      ? calculateStandings(competition.teamIds, matches, competition.config)
      : null;

  const winner = competition?.winnerId
    ? state.teams.find((t) => t.id === competition.winnerId) ?? null
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
    handleEndCompetition,
    inProgressMatches,
    isSharedMode,
    isCreator,
    isEndingCompetition,
    matches,
    pendingMatches,
    roundRobinMatches,
    selectedMatch,
    setEditingMatch,
    setSelectedMatch,
    setShowCreateSession,
    setShowStartConfirm,
    setShowEndConfirm,
    showCreateSession,
    showStartConfirm,
    showEndConfirm,
    standings,
    totalProgress,
    winner,
  };
};
