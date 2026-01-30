import { useState, useCallback } from "react";
import { GUEST_HOME_TEAM, GUEST_AWAY_TEAM } from "@/constants/guestTeams";
import type { PersistentTeam } from "@/types/game";

type MatchStatus = "pending" | "in_progress" | "completed";

interface GuestMatch {
  homeTeam: PersistentTeam;
  awayTeam: PersistentTeam;
  homeScore: number;
  awayScore: number;
  status: MatchStatus;
  winnerId?: string;
}

interface ScoreHistory {
  home: number;
  away: number;
}

/**
 * Hook for managing in-memory guest match state.
 * No data is persisted - all state is lost on page refresh.
 */
export const useGuestQuickMatch = () => {
  const [match, setMatch] = useState<GuestMatch>({
    homeTeam: GUEST_HOME_TEAM,
    awayTeam: GUEST_AWAY_TEAM,
    homeScore: 0,
    awayScore: 0,
    status: "pending",
  });

  const [history, setHistory] = useState<ScoreHistory[]>([]);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);

  const startMatch = useCallback(() => {
    setMatch((prev) => ({
      ...prev,
      status: "in_progress",
    }));
    setHistory([{ home: 0, away: 0 }]);
  }, []);

  const handleAddPoint = useCallback(
    (team: "home" | "away") => {
      if (match.status === "completed") return;

      setMatch((prev) => {
        const newHome = team === "home" ? prev.homeScore + 1 : prev.homeScore;
        const newAway = team === "away" ? prev.awayScore + 1 : prev.awayScore;
        return { ...prev, homeScore: newHome, awayScore: newAway };
      });

      setHistory((prev) => {
        const currentHome = match.homeScore;
        const currentAway = match.awayScore;
        const newHome = team === "home" ? currentHome + 1 : currentHome;
        const newAway = team === "away" ? currentAway + 1 : currentAway;
        return [...prev, { home: newHome, away: newAway }];
      });
    },
    [match.status, match.homeScore, match.awayScore]
  );

  const handleDeductPoint = useCallback(
    (team: "home" | "away") => {
      if (match.status === "completed") return;

      setMatch((prev) => {
        const newHome =
          team === "home" ? Math.max(0, prev.homeScore - 1) : prev.homeScore;
        const newAway =
          team === "away" ? Math.max(0, prev.awayScore - 1) : prev.awayScore;
        return { ...prev, homeScore: newHome, awayScore: newAway };
      });

      setHistory((prev) => {
        const currentHome = match.homeScore;
        const currentAway = match.awayScore;
        const newHome = team === "home" ? Math.max(0, currentHome - 1) : currentHome;
        const newAway = team === "away" ? Math.max(0, currentAway - 1) : currentAway;
        return [...prev, { home: newHome, away: newAway }];
      });
    },
    [match.status, match.homeScore, match.awayScore]
  );

  const handleUndo = useCallback(() => {
    if (history.length < 2 || match.status === "completed") return;

    const prevState = history[history.length - 2];
    setHistory((prev) => prev.slice(0, -1));
    setMatch((prev) => ({
      ...prev,
      homeScore: prevState.home,
      awayScore: prevState.away,
    }));
  }, [history, match.status]);

  const handleOpenCompleteDialog = useCallback(() => {
    if (match.status === "completed") return;
    if (match.homeScore === match.awayScore) return;
    setShowCompleteDialog(true);
  }, [match.status, match.homeScore, match.awayScore]);

  const handleCompleteMatch = useCallback(() => {
    const winnerId =
      match.homeScore > match.awayScore
        ? match.homeTeam.id
        : match.awayTeam.id;

    setMatch((prev) => ({
      ...prev,
      status: "completed",
      winnerId,
    }));
    setShowCompleteDialog(false);
    setShowResultModal(true);
  }, [match.homeScore, match.awayScore, match.homeTeam.id, match.awayTeam.id]);

  const resetMatch = useCallback(() => {
    setMatch({
      homeTeam: GUEST_HOME_TEAM,
      awayTeam: GUEST_AWAY_TEAM,
      homeScore: 0,
      awayScore: 0,
      status: "pending",
      winnerId: undefined,
    });
    setHistory([]);
    setShowCompleteDialog(false);
    setShowResultModal(false);
  }, []);

  const canComplete =
    match.status !== "completed" && match.homeScore !== match.awayScore;

  const homeLeading = match.homeScore > match.awayScore;
  const awayLeading = match.awayScore > match.homeScore;

  const winner = match.winnerId
    ? match.winnerId === match.homeTeam.id
      ? match.homeTeam
      : match.awayTeam
    : null;

  return {
    match,
    history,
    homeLeading,
    awayLeading,
    canComplete,
    winner,
    showCompleteDialog,
    showResultModal,
    startMatch,
    handleAddPoint,
    handleDeductPoint,
    handleUndo,
    handleOpenCompleteDialog,
    handleCompleteMatch,
    resetMatch,
    setShowCompleteDialog,
    setShowResultModal,
  };
};
