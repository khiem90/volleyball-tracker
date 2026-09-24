import { useState, useCallback, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { useFullscreen } from "@/hooks/useFullscreen";
import { entryTeams } from "@/lib/entries";

export const useMatchPage = () => {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;

  const {
    state,
    getMatchById,
    getTournamentById,
    updateMatchScore,
    startMatch,
    completeMatch,
    canEdit,
    isTournamentsLoading,
  } = useApp();

  const { isFullscreen, toggleFullscreen } = useFullscreen();

  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [history, setHistory] = useState<{ home: number; away: number }[]>([]);
  const [showRotatePrompt, setShowRotatePrompt] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  const isLandscape = useCallback(() => {
    return window.innerWidth > window.innerHeight;
  }, []);

  const handleFullscreenToggle = useCallback(() => {
    if (isFullscreen) {
      toggleFullscreen();
    } else {
      if (isLandscape()) {
        toggleFullscreen();
      } else {
        setShowRotatePrompt(true);
      }
    }
  }, [isFullscreen, isLandscape, toggleFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;

    const handleOrientationChange = () => {
      if (!isLandscape()) {
        toggleFullscreen();
      }
    };

    window.addEventListener("resize", handleOrientationChange);
    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      window.removeEventListener("resize", handleOrientationChange);
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, [isFullscreen, isLandscape, toggleFullscreen]);

  const match = useMemo(() => getMatchById(matchId), [getMatchById, matchId]);
  const competition = useMemo(
    () => (match?.tournamentId ? getTournamentById(match.tournamentId) : null),
    [match, getTournamentById]
  );

  // A tournament match shows its entries; a quick match shows roster teams.
  const teams = useMemo(
    () => (competition ? entryTeams(competition, state.teams) : state.teams),
    [competition, state.teams]
  );
  const homeTeam = useMemo(
    () => teams.find((t) => t.id === match?.homeTeamId),
    [teams, match?.homeTeamId]
  );
  const awayTeam = useMemo(
    () => teams.find((t) => t.id === match?.awayTeamId),
    [teams, match?.awayTeamId]
  );

  const seriesInfo = useMemo(() => {
    const seriesLength = match?.seriesLength ?? 1;
    const isSeries = seriesLength > 1;
    const homeWins = isSeries ? match?.homeWins ?? 0 : 0;
    const awayWins = isSeries ? match?.awayWins ?? 0 : 0;
    const gamesPlayed = homeWins + awayWins;

    return {
      isSeries,
      seriesLength,
      homeWins,
      awayWins,
      winsNeeded: isSeries ? Math.ceil(seriesLength / 2) : 1,
      gameNumber: isSeries
        ? match?.status === "completed"
          ? gamesPlayed
          : gamesPlayed + 1
        : 1,
    };
  }, [match]);

  useEffect(() => {
    if (match && match.status === "pending" && canEdit) {
      startMatch(matchId);
    }
  }, [match, matchId, startMatch, canEdit]);

  const recordScore = useCallback(
    (newHome: number, newAway: number) => {
      if (!match) return;
      const currentHome = match.homeScore;
      const currentAway = match.awayScore;
      setHistory((prev) => {
        const seeded =
          prev.length === 0 ? [{ home: currentHome, away: currentAway }] : prev;
        const last = seeded[seeded.length - 1];
        if (!last || last.home !== newHome || last.away !== newAway) {
          return [...seeded, { home: newHome, away: newAway }];
        }
        return seeded;
      });
      updateMatchScore(matchId, newHome, newAway);
    },
    [match, matchId, updateMatchScore]
  );

  const handleAddPoint = useCallback(
    (team: "home" | "away") => {
      if (!match || !canEdit || match.status === "completed") return;
      recordScore(
        team === "home" ? match.homeScore + 1 : match.homeScore,
        team === "away" ? match.awayScore + 1 : match.awayScore
      );
    },
    [match, canEdit, recordScore]
  );

  const handleDeductPoint = useCallback(
    (team: "home" | "away") => {
      if (!match || !canEdit || match.status === "completed") return;
      recordScore(
        team === "home" ? Math.max(0, match.homeScore - 1) : match.homeScore,
        team === "away" ? Math.max(0, match.awayScore - 1) : match.awayScore
      );
    },
    [match, canEdit, recordScore]
  );

  const handleUndo = useCallback(() => {
    if (!match || history.length < 2 || match.status === "completed") return;
    const prevState = history[history.length - 2];
    setHistory((prev) => prev.slice(0, -1));
    updateMatchScore(matchId, prevState.home, prevState.away);
  }, [match, matchId, history, updateMatchScore]);

  // The engine decides what a result means: the next game of a series, the
  // next match on a court, a slot in the bracket, or the end of the tournament.
  const handleCompleteMatch = useCallback(async () => {
    if (!match || match.status === "completed" || isCompleting) return;
    setIsCompleting(true);
    setCompleteError(null);
    try {
      const outcome = await completeMatch(matchId, {
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      });
      setShowCompleteDialog(false);
      if (!outcome.completed) {
        // On to the next game of the series, on the same page.
        setHistory([]);
        return;
      }
      router.push(competition ? `/competitions/${competition.id}` : "/");
    } catch (error) {
      console.error("Failed to complete the match:", error);
      setCompleteError(
        error instanceof Error ? error.message : "The result could not be saved."
      );
    } finally {
      setIsCompleting(false);
    }
  }, [match, matchId, competition, completeMatch, isCompleting, router]);

  const handleOpenCompleteDialog = useCallback(() => {
    if (!match || match.status === "completed") return;
    if (match.homeScore === match.awayScore) {
      return;
    }
    setShowCompleteDialog(true);
  }, [match]);

  const handleBack = useCallback(() => {
    if (competition) {
      router.push(`/competitions/${competition.id}`);
    } else {
      router.push("/");
    }
  }, [competition, router]);

  const canComplete =
    match &&
    match.status !== "completed" &&
    match.homeScore !== match.awayScore;
  const homeColor = homeTeam?.color || "#3b82f6";
  const awayColor = awayTeam?.color || "#f97316";
  const homeLeading = match ? match.homeScore > match.awayScore : false;
  const awayLeading = match ? match.awayScore > match.homeScore : false;

  return {
    awayColor,
    awayLeading,
    awayTeam,
    canComplete,
    canEdit,
    competition,
    completeError,
    handleAddPoint,
    handleBack,
    handleCompleteMatch,
    handleDeductPoint,
    handleFullscreenToggle,
    handleOpenCompleteDialog,
    handleUndo,
    history,
    homeColor,
    homeLeading,
    homeTeam,
    isCompleting,
    isFullscreen,
    isLoading: isTournamentsLoading,
    match,
    seriesInfo,
    setShowCompleteDialog,
    setShowRotatePrompt,
    showCompleteDialog,
    showRotatePrompt,
  };
};
