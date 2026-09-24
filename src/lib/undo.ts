import type { Match, Tournament } from "@/types/game";
import type { UndoSnapshot } from "@/types/undo";

/**
 * Generate a unique ID for undo entries
 */
export const generateUndoId = (): string => {
  return `undo_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

/**
 * Deep clone a tournament including nested state objects
 */
const deepCloneTournament = (tournament: Tournament): Tournament => {
  return {
    ...tournament,
    entries: tournament.entries.map((entry) => ({ ...entry })),
    teamIds: [...tournament.teamIds],
    settings: { ...tournament.settings, terminology: { ...tournament.settings.terminology } },
    win2outState: tournament.win2outState
      ? {
          ...tournament.win2outState,
          teamStatuses: tournament.win2outState.teamStatuses.map((s) => ({
            ...s,
          })),
          queue: [...tournament.win2outState.queue],
          courts: tournament.win2outState.courts.map((c) => ({
            ...c,
            teamIds: [...c.teamIds] as [string, string],
          })),
        }
      : undefined,
    twoMatchRotationState: tournament.twoMatchRotationState
      ? {
          ...tournament.twoMatchRotationState,
          teamStatuses: tournament.twoMatchRotationState.teamStatuses.map(
            (s) => ({ ...s })
          ),
          queue: [...tournament.twoMatchRotationState.queue],
          courts: tournament.twoMatchRotationState.courts.map((c) => ({
            ...c,
            teamIds: [...c.teamIds] as [string, string],
          })),
        }
      : undefined,
  };
};

/**
 * Create an undo snapshot before performing an action
 */
export const createSnapshot = (
  match: Match | null,
  tournament: Tournament | null,
  newMatchId: string | null = null
): UndoSnapshot => {
  return {
    match: match ? { ...match } : null,
    tournament: tournament ? deepCloneTournament(tournament) : null,
    newMatchId,
  };
};
