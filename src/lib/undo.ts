import type { Match, Competition } from "@/types/game";
import type { UndoSnapshot, UndoActionType } from "@/types/undo";

/**
 * Generate a unique ID for undo entries
 */
export const generateUndoId = (): string => {
  return `undo_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

/**
 * Deep clone a competition including nested state objects
 */
export const deepCloneCompetition = (competition: Competition): Competition => {
  return {
    ...competition,
    teamIds: [...competition.teamIds],
    matchIds: [...competition.matchIds],
    win2outState: competition.win2outState
      ? {
          ...competition.win2outState,
          teamStatuses: competition.win2outState.teamStatuses.map((s) => ({
            ...s,
          })),
          queue: [...competition.win2outState.queue],
          courts: competition.win2outState.courts.map((c) => ({
            ...c,
            teamIds: [...c.teamIds] as [string, string],
          })),
        }
      : undefined,
    twoMatchRotationState: competition.twoMatchRotationState
      ? {
          ...competition.twoMatchRotationState,
          teamStatuses: competition.twoMatchRotationState.teamStatuses.map(
            (s) => ({ ...s })
          ),
          queue: [...competition.twoMatchRotationState.queue],
          courts: competition.twoMatchRotationState.courts.map((c) => ({
            ...c,
            teamIds: [...c.teamIds] as [string, string],
          })),
        }
      : undefined,
    config: competition.config ? { ...competition.config } : undefined,
  };
};

/**
 * Create an undo snapshot before performing an action
 */
export const createSnapshot = (
  match: Match | null,
  competition: Competition | null,
  newMatchId: string | null = null
): UndoSnapshot => {
  return {
    match: match ? { ...match } : null,
    competition: competition ? deepCloneCompetition(competition) : null,
    newMatchId,
  };
};

/**
 * Create a human-readable description for an undo action
 */
export const createUndoDescription = (
  actionType: UndoActionType,
  winnerName?: string
): string => {
  switch (actionType) {
    case "instant_win":
      return winnerName ? `${winnerName} won` : "Match completed";
    case "match_complete":
      return winnerName ? `${winnerName} won` : "Match completed";
    case "match_start":
      return "Match started";
    default:
      return "Action performed";
  }
};
