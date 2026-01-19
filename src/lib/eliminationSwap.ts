import type { Match } from "@/types/game";

export interface SwapResult {
  needsSwap: boolean;
  otherMatchId?: string;
  otherMatchPosition?: number;
  displacedTeamId?: string;
  swappingTeamId?: string;
}

/**
 * Detect if changing teams in a match would require swapping with another match.
 * This happens when the new team is already assigned to another pending match.
 */
export const detectTeamSwap = (
  currentMatch: Match,
  newHomeTeamId: string,
  newAwayTeamId: string,
  allMatches: Match[]
): SwapResult => {
  // Get original teams in current match
  const originalTeams = [currentMatch.homeTeamId, currentMatch.awayTeamId].filter(Boolean);
  const newTeams = [newHomeTeamId, newAwayTeamId].filter(Boolean);

  // Find team being replaced (was in match, no longer in match)
  const displacedTeam = originalTeams.find((t) => !newTeams.includes(t));

  // Find new team coming in (now in match, wasn't before)
  const incomingTeam = newTeams.find((t) => !originalTeams.includes(t));

  if (!displacedTeam || !incomingTeam) {
    return { needsSwap: false };
  }

  // Find if incoming team is already in another pending match in the same round
  const otherMatch = allMatches.find(
    (m) =>
      m.id !== currentMatch.id &&
      m.competitionId === currentMatch.competitionId &&
      m.round === currentMatch.round &&
      m.status === "pending" &&
      !m.isBye &&
      (m.homeTeamId === incomingTeam || m.awayTeamId === incomingTeam)
  );

  if (!otherMatch) {
    return { needsSwap: false };
  }

  return {
    needsSwap: true,
    otherMatchId: otherMatch.id,
    otherMatchPosition: otherMatch.position,
    displacedTeamId: displacedTeam,
    swappingTeamId: incomingTeam,
  };
};

export interface MatchUpdate {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
}

/**
 * Calculate the updates needed for both matches when performing a team swap.
 */
export const calculateSwapUpdates = (
  currentMatchId: string,
  newHomeTeamId: string,
  newAwayTeamId: string,
  otherMatchId: string,
  displacedTeamId: string,
  swappingTeamId: string,
  allMatches: Match[]
): MatchUpdate[] => {
  const otherMatch = allMatches.find((m) => m.id === otherMatchId);
  if (!otherMatch) return [];

  // Calculate what the other match should look like after swap
  // Replace the swapping team with the displaced team
  const otherHomeTeamId =
    otherMatch.homeTeamId === swappingTeamId
      ? displacedTeamId
      : otherMatch.homeTeamId;
  const otherAwayTeamId =
    otherMatch.awayTeamId === swappingTeamId
      ? displacedTeamId
      : otherMatch.awayTeamId;

  return [
    { matchId: currentMatchId, homeTeamId: newHomeTeamId, awayTeamId: newAwayTeamId },
    { matchId: otherMatchId, homeTeamId: otherHomeTeamId, awayTeamId: otherAwayTeamId },
  ];
};
