import { useMemo, useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { calculateStandings } from "@/lib/roundRobin";
import { entryTeams } from "@/lib/entries";
import type { Match, PersistentTeam } from "@/types/game";

export interface RoundRobinMatchRow {
  match: Match;
  homeTeam?: PersistentTeam;
  awayTeam?: PersistentTeam;
  homeWon: boolean;
  awayWon: boolean;
}

const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const useCompetitionDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;

  const {
    state,
    getTournamentById,
    getMatchesByTournament,
    startTournament,
    endTournament,
    canEdit,
    isTournamentsLoading,
  } = useApp();

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isEndingCompetition, setIsEndingCompetition] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const competition = useMemo(
    () => getTournamentById(tournamentId),
    [getTournamentById, tournamentId]
  );

  const matches = useMemo(
    () => getMatchesByTournament(tournamentId),
    [getMatchesByTournament, tournamentId]
  );

  const competitionTeams = useMemo(
    () => (competition ? entryTeams(competition, state.teams) : []),
    [competition, state.teams]
  );

  const competitionTeamsMap = useMemo(() => {
    const map = new Map<string, PersistentTeam>();
    competitionTeams.forEach((team) => map.set(team.id, team));
    return map;
  }, [competitionTeams]);

  const roundRobinMatches = useMemo<RoundRobinMatchRow[]>(() => {
    if (!competition || competition.format !== "round_robin") return [];

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
      .map((match) => ({
        match,
        homeTeam: competitionTeamsMap.get(match.homeTeamId),
        awayTeam: competitionTeamsMap.get(match.awayTeamId),
        homeWon: match.winnerId === match.homeTeamId,
        awayWon: match.winnerId === match.awayTeamId,
      }));
  }, [competition, matches, competitionTeamsMap]);

  // Starting goes through the engine, which schedules every match and marks
  // the tournament live in one write.
  const handleStartCompetition = useCallback(
    async (byeTeamIds?: string[]) => {
      if (!competition || isStarting) return;
      setIsStarting(true);
      setActionError(null);
      try {
        await startTournament(competition.id, byeTeamIds);
        setShowStartConfirm(false);
      } catch (error) {
        console.error("Failed to start the tournament:", error);
        setActionError(messageOf(error, "The tournament could not be started."));
      } finally {
        setIsStarting(false);
      }
    },
    [competition, isStarting, startTournament]
  );

  const handleMatchClick = useCallback((match: Match) => {
    setSelectedMatch(match);
  }, []);

  const handlePlayMatch = useCallback(() => {
    if (!selectedMatch) return;
    router.push(`/match/${selectedMatch.id}`);
  }, [selectedMatch, router]);

  const handleEndCompetition = useCallback(async () => {
    if (!competition) return;
    setIsEndingCompetition(true);
    setActionError(null);
    try {
      await endTournament(competition.id);
      setShowEndConfirm(false);
    } catch (error) {
      console.error("Failed to end the tournament:", error);
      setActionError(messageOf(error, "The tournament could not be ended."));
    } finally {
      setIsEndingCompetition(false);
    }
  }, [competition, endTournament]);

  const completedMatches = matches.filter((m) => m.status === "completed").length;
  const inProgressMatches = matches.filter((m) => m.status === "in_progress").length;
  const pendingMatches = matches.filter((m) => m.status === "pending").length;
  const totalProgress =
    matches.length > 0 ? (completedMatches / matches.length) * 100 : 0;

  const standings =
    competition && competition.format === "round_robin"
      ? calculateStandings(competition.teamIds, matches, competition.settings)
      : null;

  const winner = competition?.winnerId
    ? competitionTeamsMap.get(competition.winnerId) ?? null
    : null;

  return {
    actionError,
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
    isEndingCompetition,
    isLoading: isTournamentsLoading,
    isStarting,
    matches,
    pendingMatches,
    roundRobinMatches,
    selectedMatch,
    setEditingMatch,
    setSelectedMatch,
    setShowStartConfirm,
    setShowEndConfirm,
    showStartConfirm,
    showEndConfirm,
    standings,
    totalProgress,
    winner,
  };
};
