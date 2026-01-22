"use client";

import { useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { useUndo } from "@/components/GlobalUndoToast";
import { createSnapshot } from "@/lib/undo";
import type { Match, Competition, MatchStatus } from "@/types/game";

interface ProcessResult<TState> {
  updatedState: TState;
  nextMatch: Omit<Match, "id" | "createdAt"> | null;
}

interface UseRotationInstantWinProps<TState> {
  competition: Competition | null | undefined;
  state: TState;
  stateKey: "win2outState" | "twoMatchRotationState";
  processMatchResult: (state: TState, match: Match) => ProcessResult<TState>;
  getTeamName: (id: string) => string;
}

export const useRotationInstantWin = <TState>({
  competition,
  state,
  stateKey,
  processMatchResult,
  getTeamName,
}: UseRotationInstantWinProps<TState>) => {
  const { canEdit, completeMatchWithNextMatch, startMatch, updateMatchScore } = useApp();
  const { pushUndo } = useUndo();

  const handleInstantWin = useCallback(
    (winnerId: string, match: Match) => {
      if (!competition || !canEdit) return;

      // Capture snapshot BEFORE any modifications for undo
      const snapshot = createSnapshot(match, competition);

      // Determine scores (winner gets 25, loser gets 0)
      const homeScore = winnerId === match.homeTeamId ? 25 : 0;
      const awayScore = winnerId === match.awayTeamId ? 25 : 0;

      // Ensure match is started first if pending
      if (match.status === "pending") {
        startMatch(match.id);
      }

      // Update the match score first
      updateMatchScore(match.id, homeScore, awayScore);

      // Create the completed match object for processing
      const completedMatch: Match = {
        ...match,
        homeScore,
        awayScore,
        winnerId,
        status: "completed" as MatchStatus,
        completedAt: Date.now(),
      };

      // Process the result to get updated state and next match
      const { updatedState, nextMatch } = processMatchResult(state, completedMatch);

      // Update competition with new state
      const updatedCompetition = {
        ...competition,
        [stateKey]: updatedState,
      };

      // Complete match and set up next match, get new match ID for undo
      const newMatchId = completeMatchWithNextMatch(
        match.id,
        winnerId,
        updatedCompetition,
        nextMatch
      );

      // Push undo entry
      const winnerName = getTeamName(winnerId);
      pushUndo({
        actionType: "instant_win",
        description: `${winnerName} won`,
        snapshot: {
          ...snapshot,
          newMatchId,
        },
      });
    },
    [
      competition,
      canEdit,
      state,
      stateKey,
      processMatchResult,
      completeMatchWithNextMatch,
      startMatch,
      updateMatchScore,
      getTeamName,
      pushUndo,
    ]
  );

  return { handleInstantWin, canEdit };
};
