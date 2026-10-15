"use client";

import { useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { useUndo } from "@/components/GlobalUndoToast";
import type { Match, Tournament } from "@/types/game";

interface UseRotationInstantWinProps {
  tournament: Tournament | null | undefined;
  getTeamName: (id: string) => string;
}

/**
 * Instant win: record a rotation-format result by tapping the winner. The
 * engine scores it, moves the queue, schedules the court's next match, and
 * keeps what it moved so the undo toast can take the result back. The undo
 * entry is offered as soon as the win shows on this phone, before the
 * server has answered, and withdrawn if the win's write fails, since the
 * win is then rolled back.
 * Whether the visitor may record results is the caller's check; a refused
 * or reversed write comes back as the rejection.
 */
export const useRotationInstantWin = ({ tournament, getTeamName }: UseRotationInstantWinProps) => {
  const { instantWin } = useApp();
  const { pushUndo, resultFailed } = useUndo();

  const handleInstantWin = useCallback(
    async (winnerId: string, match: Match) => {
      if (!tournament) return;
      const { done } = await instantWin(match.id, winnerId);
      pushUndo({
        actionType: "instant_win",
        description: `${getTeamName(winnerId)} won`,
        tournamentId: tournament.id,
        matchId: match.id,
      });
      try {
        await done;
      } catch (error) {
        resultFailed(tournament.id, match.id);
        throw error;
      }
    },
    [tournament, instantWin, getTeamName, pushUndo, resultFailed]
  );

  return { handleInstantWin };
};
