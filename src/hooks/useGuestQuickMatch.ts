"use client";

import { useCallback, useMemo, useState } from "react";
import { GUEST_HOME_TEAM, GUEST_AWAY_TEAM } from "@/constants/guestTeams";
import { useScoreHistory } from "@/hooks/useScoreHistory";
import { useScoreRollbackToast } from "@/hooks/useScoreRollbackToast";
import type { PersistentTeam } from "@/types/game";

/* ===========================================================================
   THE GUEST CONSOLE'S STATE

   The score is no longer a second copy of the same numbers. It IS
   `history.tip`, so the desync that shipped here — `setMatch` using the updater
   form while `setHistory` read `match.homeScore` from the closure, five rapid
   taps then six undos leaving the score stuck at 1 — is unrepresentable rather
   than merely fixed. There is exactly one place a guest score can change and it
   is `useScoreHistory`.

   Nothing is persisted, deliberately: a guest match is in memory and the console
   says so out loud in the action rail. That includes the undo stack — a page
   reload starts a new match, so a restored stack would be a stack for a game
   that no longer exists.

   The two guest teams carry hard-coded blue and orange hexes in
   `src/constants/guestTeams.ts`, which is not this workstream's file and is
   consumed elsewhere. They are mapped to Matchbook tokens here rather than
   passed through, so no off-palette colour reaches a rendered surface
   (invariant 10).
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
