"use client";

import { useCallback, useMemo, useState } from "react";
import { GUEST_HOME_TEAM, GUEST_AWAY_TEAM } from "@/constants/guestTeams";
import { useScoreHistory } from "@/hooks/useScoreHistory";
import { useScoreRollbackToast } from "@/hooks/useScoreRollbackToast";
import type { PersistentTeam } from "@/types/game";

/* ===========================================================================
   THE GUEST CONSOLE'S STATE

   The score IS `history.tip` — never a second copy of the same numbers, so a
   score/history desync is unrepresentable. The one place a guest score can
   change is `useScoreHistory`.

   Nothing is persisted, deliberately: a guest match is in memory and the
   console says so. That includes the undo stack — a reload starts a new
   match, so a restored stack would belong to a game that no longer exists.

   The guest teams carry hard-coded hexes in `constants/guestTeams.ts`; they
   are mapped to Matchbook tokens here rather than passed through, so no
   off-palette colour reaches a rendered surface.
   =========================================================================== */

type MatchStatus = "pending" | "in_progress" | "completed";

export const GUEST_ACCENTS = {
  home: "var(--mb-teal)",
  away: "var(--mb-coral)",
} as const;

export interface GuestMatch {
  homeTeam: PersistentTeam;
  awayTeam: PersistentTeam;
  homeScore: number;
  awayScore: number;
  status: MatchStatus;
  winnerId?: string;
}

export const useGuestQuickMatch = () => {
  const [status, setStatus] = useState<MatchStatus>("pending");
  const [winnerId, setWinnerId] = useState<string | undefined>(undefined);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);

  const history = useScoreHistory({ seed: { home: 0, away: 0 } });
  const { home: homeScore, away: awayScore } = history.tip;

  const startMatch = useCallback(() => setStatus("in_progress"), []);

  const handleAddPoint = useCallback(
    (team: "home" | "away") => {
      if (status === "completed") return;
      history.bump(team, 1);
    },
    [history, status]
  );

  const handleDeductPoint = useCallback(
    (team: "home" | "away") => {
      if (status === "completed") return;
      history.bump(team, -1);
    },
    [history, status]
  );

  const announceRollback = useScoreRollbackToast();

  const handleUndo = useCallback(() => {
    if (status === "completed") return;
    /* Tip before the step back, so the strip can say which way it went (C16).
       Same sentence, same slot, same one-strip rule as the signed-in console —
       `useScoreRollbackToast` is the single definition of all three. */
    const previous = history.tip;
    const target = history.undo();
    if (target) announceRollback(previous, target);
  }, [history, status, announceRollback]);

  const handleOpenCompleteDialog = useCallback(() => {
    if (status === "completed") return;
    if (homeScore === awayScore) return;
    setShowCompleteDialog(true);
  }, [status, homeScore, awayScore]);

  const handleCompleteMatch = useCallback(() => {
    setWinnerId(
      homeScore > awayScore ? GUEST_HOME_TEAM.id : GUEST_AWAY_TEAM.id
    );
    setStatus("completed");
    setShowCompleteDialog(false);
    setShowResultModal(true);
  }, [homeScore, awayScore]);

  const resetMatch = useCallback(() => {
    history.reset({ home: 0, away: 0 });
    setStatus("pending");
    setWinnerId(undefined);
    setShowCompleteDialog(false);
    setShowResultModal(false);
  }, [history]);

  const match: GuestMatch = useMemo(
    () => ({
      homeTeam: GUEST_HOME_TEAM,
      awayTeam: GUEST_AWAY_TEAM,
      homeScore,
      awayScore,
      status,
      winnerId,
    }),
    [homeScore, awayScore, status, winnerId]
  );

  const winner = winnerId
    ? winnerId === GUEST_HOME_TEAM.id
      ? GUEST_HOME_TEAM
      : GUEST_AWAY_TEAM
    : null;

  return {
    match,
    canUndo: history.canUndo,
    homeLeading: homeScore > awayScore,
    awayLeading: awayScore > homeScore,
    canComplete: status !== "completed" && homeScore !== awayScore,
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
