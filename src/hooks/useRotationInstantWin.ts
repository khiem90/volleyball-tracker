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
 * keeps what it moved so the undo toast can take the result back.
 */
export const useRotationInstantWin = ({ tournament, getTeamName }: UseRotationInstantWinProps) => {
  const { canEdit, instantWin } = useApp();
  const { pushUndo } = useUndo();

  const handleInstantWin = useCallback(
    async (winnerId: string, match: Match) => {
      if (!tournament || !canEdit) return;

      try {
        await instantWin(match.id, winnerId);
        pushUndo({
          actionType: "instant_win",
          description: `${getTeamName(winnerId)} won`,
          tournamentId: tournament.id,
          matchId: match.id,
        });
      } catch (error) {
        console.error("Instant win failed:", error);
      }
    },
    [tournament, canEdit, instantWin, getTeamName, pushUndo]
  );

  return { handleInstantWin, canEdit };
};
