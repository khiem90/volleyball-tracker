import { useState, useCallback, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { useSession } from "@/context/SessionContext";
import { useFullscreen } from "@/hooks/useFullscreen";
import { advanceWinner } from "@/lib/singleElimination";
import { calculateStandings } from "@/lib/roundRobin";
import { processMatchResult } from "@/lib/win2out";
import { processMatchResult as processTwoMatchRotationResult } from "@/lib/twoMatchRotation";

export const useMatchPage = () => {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;

  const {
    state,
    getMatchById,
    getCompetitionById,
    updateMatchScore,
    startMatch,
    completeMatch,
    completeMatchWithNextMatch,
    completeCompetition,
    canEdit,
    isSharedMode,
  } = useApp();

  const { role } = useSession();
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [history, setHistory] = useState<{ home: number; away: number }[]>([]);
  const [showRotatePrompt, setShowRotatePrompt] = useState(false);

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
    () =>
      match?.competitionId ? getCompetitionById(match.competitionId) : null,
    [match, getCompetitionById]
  );

  const homeTeam = useMemo(
    () => state.teams.find((t) => t.id === match?.homeTeamId),
    [state.teams, match?.homeTeamId]
  );
  const awayTeam = useMemo(
    () => state.teams.find((t) => t.id === match?.awayTeamId),
    [state.teams, match?.awayTeamId]
  );

  useEffect(() => {
    if (match && match.status === "pending") {
      startMatch(matchId);
    }
  }, [match, matchId, startMatch]);

  const handleAddPoint = useCallback(
    (team: "home" | "away") => {
      if (!match || !canEdit) return;
      const currentHome = match.homeScore;
      const currentAway = match.awayScore;
      const newHome = team === "home" ? currentHome + 1 : currentHome;
      const newAway = team === "away" ? currentAway + 1 : currentAway;
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
    [match, matchId, updateMatchScore, canEdit]
  );

  const handleDeductPoint = useCallback(
    (team: "home" | "away") => {
      if (!match || !canEdit) return;
      const currentHome = match.homeScore;
      const currentAway = match.awayScore;
      const newHome =
        team === "home" ? Math.max(0, currentHome - 1) : currentHome;
      const newAway =
        team === "away" ? Math.max(0, currentAway - 1) : currentAway;
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
    [match, matchId, updateMatchScore, canEdit]
  );

  const handleUndo = useCallback(() => {
    if (!match || history.length < 2) return;
    const prevState = history[history.length - 2];
    setHistory((prev) => prev.slice(0, -1));
    updateMatchScore(matchId, prevState.home, prevState.away);
  }, [match, matchId, history, updateMatchScore]);

  const handleCompleteMatch = useCallback(() => {
    if (!match) return;

    const winnerId =
      match.homeScore > match.awayScore ? match.homeTeamId : match.awayTeamId;

    if (
      competition &&
      competition.type === "win2out" &&
      competition.win2outState
    ) {
      const completedMatch = {
        ...match,
        winnerId,
        status: "completed" as const,
        completedAt: Date.now(),
      };

      const { updatedState, nextMatch } = processMatchResult(
        competition.win2outState,
        completedMatch
      );

      const updatedCompetition = {
        ...competition,
        win2outState: updatedState,
        status: updatedState.isComplete
          ? ("completed" as const)
          : ("in_progress" as const),
      };

      completeMatchWithNextMatch(
        matchId,
        winnerId,
        updatedCompetition,
        nextMatch
      );
      setShowCompleteDialog(false);
      router.push(`/competitions/${competition.id}`);
      return;
    }

    if (
      competition &&
      competition.type === "two_match_rotation" &&
      competition.twoMatchRotationState
    ) {
      const completedMatch = {
        ...match,
        winnerId,
        status: "completed" as const,
        completedAt: Date.now(),
      };

      const { updatedState, nextMatch } = processTwoMatchRotationResult(
        competition.twoMatchRotationState,
        completedMatch
      );

      const updatedCompetition = {
        ...competition,
        twoMatchRotationState: updatedState,
        status: updatedState.isComplete
          ? ("completed" as const)
          : ("in_progress" as const),
      };

      completeMatchWithNextMatch(
        matchId,
        winnerId,
        updatedCompetition,
        nextMatch
      );
      setShowCompleteDialog(false);
      router.push(`/competitions/${competition.id}`);
      return;
    }

    completeMatch(matchId, winnerId);

    if (
      competition &&
      (competition.type === "single_elimination" ||
        competition.type === "double_elimination")
    ) {
      const competitionMatches = state.matches.filter(
        (m) => m.competitionId === competition.id
      );
      const updatedMatches = advanceWinner(competitionMatches, match, winnerId);

      updatedMatches.forEach((updatedMatch) => {
        if (updatedMatch.id !== match.id) {
          const original = competitionMatches.find(
            (m) => m.id === updatedMatch.id
          );
          if (
            original &&
            (original.homeTeamId !== updatedMatch.homeTeamId ||
              original.awayTeamId !== updatedMatch.awayTeamId)
          ) {
            updateMatchScore(
              updatedMatch.id,
              updatedMatch.homeScore,
              updatedMatch.awayScore
            );
          }
        }
      });
    }

    if (
      competition &&
      competition.status === "in_progress" &&
      (competition.type === "round_robin" ||
        competition.type === "single_elimination" ||
        competition.type === "double_elimination")
    ) {
      const competitionMatches = state.matches
        .filter((m) => m.competitionId === competition.id)
        .map((m) =>
          m.id === match.id
            ? { ...m, status: "completed" as const, winnerId }
            : m
        );

      const allMatchesComplete =
        competitionMatches.length > 0 &&
        competitionMatches.every((m) => m.status === "completed");

      if (allMatchesComplete) {
        let competitionWinnerId: string | undefined;

        if (competition.type === "round_robin") {
          const standings = calculateStandings(
            competition.teamIds,
            competitionMatches
          );
          competitionWinnerId = standings[0]?.teamId;
        } else {
          const finalMatch = competitionMatches.find((m) => {
            if (competition.type === "single_elimination") {
              const totalRounds = Math.log2(competition.teamIds.length);
              return m.round === totalRounds && !m.bracket;
            }
            return m.bracket === "grand_finals";
          });
          competitionWinnerId = finalMatch?.winnerId;
        }

        if (competitionWinnerId) {
          completeCompetition(competition.id, competitionWinnerId);
        }
      }
    }

    setShowCompleteDialog(false);

    if (competition) {
      router.push(`/competitions/${competition.id}`);
    } else {
      router.push("/");
    }
  }, [
    match,
    matchId,
    competition,
    state.matches,
    completeMatch,
    completeMatchWithNextMatch,
    completeCompetition,
    updateMatchScore,
    router,
  ]);

  const handleOpenCompleteDialog = useCallback(() => {
    if (!match) return;
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

  const canComplete = match ? match.homeScore !== match.awayScore : false;
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
    isFullscreen,
    isSharedMode,
    match,
    role,
    setShowCompleteDialog,
    setShowRotatePrompt,
    showCompleteDialog,
    showRotatePrompt,
  };
};
