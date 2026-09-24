"use client";

import { useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { useUndo } from "@/components/GlobalUndoToast";
import { createSnapshot } from "@/lib/undo";
import type { Match, Tournament } from "@/types/game";

interface UseRotationInstantWinProps {
  tournament: Tournament | null | undefined;
  getTeamName: (id: string) => string;
}

/**
 * Instant win: record a rotation-format result by tapping the winner. The
 * engine scores it 25-0, moves the queue, and schedules the court's next match.
 */
export const useRotationInstantWin = ({ tournament, getTeamName }: UseRotationInstantWinProps) => {
  const { canEdit, completeMatch } = useApp();
  const { pushUndo } = useUndo();

  const handleInstantWin = useCallback(
    async (winnerId: string, match: Match) => {
      if (!tournament || !canEdit) return;

      // Capture the state before the result so undo can put it back.
      const snapshot = createSnapshot(match, tournament);

      try {
        const outcome = await completeMatch(match.id, {
          homeScore: winnerId === match.homeTeamId ? 25 : 0,
          awayScore: winnerId === match.awayTeamId ? 25 : 0,
        });
        pushUndo({
          actionType: "instant_win",
          description: `${getTeamName(winnerId)} won`,
          snapshot: { ...snapshot, newMatchId: outcome.createdMatchIds[0] ?? null },
        });
      } catch (error) {
        console.error("Instant win failed:", error);
      }
    },
    [tournament, canEdit, completeMatch, getTeamName, pushUndo]
  );

  return { handleInstantWin, canEdit };
};
