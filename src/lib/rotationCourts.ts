import type { Competition } from "@/types/game";

/**
 * Court-state rewriting for a cross-court team swap in a rotation format.
 *
 * One implementation shared by `win2outState.courts` and
 * `twoMatchRotationState.courts`; the index search silently no-ops when
 * either index is -1. The module is pure: no React, no context, no writes.
 */

/** The shape both `Win2OutCourt` and `TwoMatchRotationCourt` share. */
export interface RotationCourtLike {
  courtNumber: number;
  teamIds: [string, string];
}

export interface RotationSwapRequest {
  /** The two teams currently on the court being edited. */
  currentTeamIds: readonly [string, string];
  /** The two teams the operator has chosen for that court. */
  nextTeamIds: readonly [string, string];
  /** The team being pulled in from another court. */
  swappingTeamId: string;
  /** The team it displaces, which takes its place on the other court. */
  displacedTeamId: string;
}

/**
 * Rewrite a courts array so `swappingTeamId` moves onto the edited court and
 * `displacedTeamId` takes its old seat.
 *
 * Returns `null` — never a half-applied array — when either court cannot be
 * located, so the caller can tell "nothing to do" from "the state and the
 * match list disagree".
 *
 * Order matters and is preserved from the original: the edited court is
 * assigned the operator's chosen pair **as given**, so home/away order is the
 * operator's, while the other court keeps its own order and only substitutes
 * the one id.
 */
export const rewriteRotationCourts = <C extends RotationCourtLike>(
  courts: readonly C[],
  { currentTeamIds, nextTeamIds, swappingTeamId, displacedTeamId }: RotationSwapRequest
): C[] | null => {
  const currentIndex = courts.findIndex(
    (court) =>
      court.teamIds.includes(currentTeamIds[0]) &&
      court.teamIds.includes(currentTeamIds[1])
  );
  const otherIndex = courts.findIndex(
    (court, index) => court.teamIds.includes(swappingTeamId) && index !== currentIndex
  );

  if (currentIndex === -1 || otherIndex === -1) return null;

  const next = [...courts];
  next[currentIndex] = {
    ...next[currentIndex],
    teamIds: [nextTeamIds[0], nextTeamIds[1]] as [string, string],
  };
  const other = next[otherIndex];
  next[otherIndex] = {
    ...other,
    teamIds: other.teamIds.map((id) =>
      id === swappingTeamId ? displacedTeamId : id
    ) as [string, string],
  };
  return next;
};

/**
 * The same rewrite applied to whichever rotation state a competition carries.
 *
 * Returns `null` when the competition is not a rotation format, or when the
 * courts could not be rewritten — the caller then leaves the competition
 * untouched.
 */
export const applyRotationCourtSwap = (
  competition: Competition,
  request: RotationSwapRequest
): Competition | null => {
  if (competition.win2outState) {
    const courts = rewriteRotationCourts(competition.win2outState.courts, request);
    if (!courts) return null;
    return {
      ...competition,
      win2outState: { ...competition.win2outState, courts },
    };
  }

  if (competition.twoMatchRotationState) {
    const courts = rewriteRotationCourts(
      competition.twoMatchRotationState.courts,
      request
    );
    if (!courts) return null;
    return {
      ...competition,
      twoMatchRotationState: { ...competition.twoMatchRotationState, courts },
    };
  }

  return null;
};
