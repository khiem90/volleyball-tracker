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
 * keeps what it moved so the undo toast can take the result back. Whether
 * the visitor may record results is the caller's check; a refused write
 * comes back as the rejection.
 */
export const useRotationInstantWin = ({ tournament, getTeamName }: UseRotationInstantWinProps) => {
  const { instantWin } = useApp();
  const { pushUndo } = useUndo();

  const handleInstantWin = useCallback(
    async (winnerId: string, match: Match) => {
      if (!tournament) return;
      await instantWin(match.id, winnerId);
      pushUndo({
        actionType: "instant_win",
        description: `${getTeamName(winnerId)} won`,
        tournamentId: tournament.id,
        matchId: match.id,
      });
    },
    [tournament, instantWin, getTeamName, pushUndo]
  );

  return { handleInstantWin };
};
