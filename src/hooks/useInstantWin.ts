"use client";

import { useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { useUndo } from "@/components/GlobalUndoToast";
import type { Match, Tournament } from "@/types/game";

interface UseInstantWinProps {
  tournament: Tournament | null | undefined;
  getTeamName: (id: string) => string;
}

/**
 * Instant win: record a result by tapping the winner. On a rotation court
 * the engine scores it, moves the queue, schedules the court's next match,
 * and keeps what it moved so the undo toast can take the result back. In
 * Round Robin it scores the match and the undo reopens it. The undo entry
 * is offered as soon as the win shows on this phone, before the server has
 * answered, and withdrawn if the win's write fails, since the win is then
 * rolled back. A tap that completed the tournament gets no entry: nothing
 * in a completed tournament changes.
 * Whether the visitor may record results is the caller's check; a refused
 * or reversed write comes back as the rejection.
 */
export const useInstantWin = ({ tournament, getTeamName }: UseInstantWinProps) => {
  const { instantWin } = useApp();
  const { pushUndo, resultFailed } = useUndo();

  const handleInstantWin = useCallback(
    async (match: Match, winnerId: string) => {
      if (!tournament) return;
      const { outcome, done } = await instantWin(match.id, winnerId);
      // Only this tap's entry is withdrawn on failure: an earlier game of
      // the same best-of still stands. A tap that completed the tournament
      // pushed no entry, so there is nothing to withdraw.
      const entryId =
        outcome.tournament.status === "live"
          ? pushUndo({
              actionType: "instant_win",
              description: `${getTeamName(winnerId)} won`,
              tournamentId: tournament.id,
              matchId: match.id,
              winnerId,
            })
          : null;
      try {
        await done;
      } catch (error) {
        if (entryId !== null) resultFailed(entryId);
        throw error;
      }
    },
    [tournament, instantWin, getTeamName, pushUndo, resultFailed]
  );

  return { handleInstantWin };
};
