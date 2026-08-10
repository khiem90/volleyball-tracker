import type { Competition } from "@/types/game";

/**
 * Court-state rewriting for a cross-court team swap in a rotation format.
 *
 * This is `useEditMatchDialog.ts:145-209` extracted verbatim in behaviour and
 * de-duplicated (charter W4 acceptance 8, comp-detail R7). It shipped as two
 * near-identical 30-line blocks — one for `win2outState.courts`, one for
 * `twoMatchRotationState.courts` — differing only in which key they read. Two
 * copies of an index-search that silently no-ops when either index is -1 is
 * exactly the code that rots when a screen is restyled around it, so it is
 * lifted out, given one implementation and put under test **before** anything
 * that calls it is redrawn.
 *
 * The module is pure: no React, no context, no writes.
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
 * located. The shipped code expressed the same decision as a silent
 * `if (a !== -1 && b !== -1)`, which left the caller unable to tell "nothing to
 * do" from "the state and the match list disagree".
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
 * untouched, which is what the two shipped blocks did by falling through their
 * `if`.
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
