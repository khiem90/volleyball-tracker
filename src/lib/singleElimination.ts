import type { Match } from "@/types/game";

/**
 * Generates a single elimination bracket.
 * Teams are seeded in order provided.
 */
export const generateSingleEliminationBracket = (
  teamIds: string[],
  competitionId: string
): Omit<Match, "id" | "createdAt">[] => {
  const matches: Omit<Match, "id" | "createdAt">[] = [];
  const n = teamIds.length;

  // Ensure power of 2
  if (n < 2 || (n & (n - 1)) !== 0) {
    throw new Error("Team count must be a power of 2 for single elimination");
  }

  const totalRounds = Math.log2(n);

  // Generate first round matches (seeded)
  // Standard seeding: 1v8, 4v5, 2v7, 3v6 for 8 teams
  const seededOrder = getSeededMatchups(n);

  // First round
  for (let i = 0; i < seededOrder.length; i += 2) {
    const homeIndex = seededOrder[i];
    const awayIndex = seededOrder[i + 1];

    matches.push({
      competitionId,
      homeTeamId: teamIds[homeIndex],
      awayTeamId: teamIds[awayIndex],
      homeScore: 0,
      awayScore: 0,
      status: "pending",
      round: 1,
      position: Math.floor(i / 2) + 1,
    });
  }

  // Generate placeholder matches for subsequent rounds
  let matchesInPrevRound = n / 2;
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = matchesInPrevRound / 2;

    for (let pos = 1; pos <= matchesInRound; pos++) {
      matches.push({
        competitionId,
        homeTeamId: "", // To be determined
        awayTeamId: "", // To be determined
        homeScore: 0,
        awayScore: 0,
        status: "pending",
        round,
        position: pos,
      });
    }

    matchesInPrevRound = matchesInRound;
  }

  return matches;
};

/**
 * Get seeded matchup order for tournament bracket.
 * Returns indices that should be matched up in first round.
 * For 8 teams: [0, 7, 3, 4, 1, 6, 2, 5] -> 1v8, 4v5, 2v7, 3v6
 */
const getSeededMatchups = (n: number): number[] => {
  if (n === 2) return [0, 1];

  const result: number[] = [];
  const half = n / 2;
  const subMatchups = getSeededMatchups(half);

  for (const seed of subMatchups) {
    result.push(seed);
    result.push(n - 1 - seed);
  }

  return result;
};

/**
 * Get the match that a winner advances to.
 */
export const getNextMatchPosition = (
  round: number,
  position: number
): { round: number; position: number; slot: "home" | "away" } => {
  const nextRound = round + 1;
  const nextPosition = Math.ceil(position / 2);
  const slot = position % 2 === 1 ? "home" : "away";

  return { round: nextRound, position: nextPosition, slot };
};

/**
 * Update bracket after a match is completed.
 * Returns the updated matches array.
 */
export const advanceWinner = (
  matches: Match[],
  completedMatch: Match,
  winnerId: string
): Match[] => {
  const totalRounds = Math.max(...matches.map((m) => m.round));

  // If this is the finals, no advancement needed
  if (completedMatch.round === totalRounds) {
    return matches;
  }

  const next = getNextMatchPosition(completedMatch.round, completedMatch.position);

  return matches.map((match) => {
    if (match.round === next.round && match.position === next.position) {
      return {
        ...match,
        [next.slot === "home" ? "homeTeamId" : "awayTeamId"]: winnerId,
      };
    }
    return match;
  });
};

/**
 * Get bracket structure for visualization.
 */
export interface BracketMatch {
  match: Match | null;
  round: number;
  position: number;
  homeTeamId?: string;
  awayTeamId?: string;
}

export const getBracketStructure = (
  matches: Match[],
  totalTeams: number
): BracketMatch[][] => {
  const totalRounds = Math.log2(totalTeams);
  const bracket: BracketMatch[][] = [];

  for (let round = 1; round <= totalRounds; round++) {
    const roundMatches = matches
      .filter((m) => m.round === round)
      .sort((a, b) => a.position - b.position);

    bracket.push(
      roundMatches.map((match) => ({
        match,
        round: match.round,
        position: match.position,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
      }))
    );
  }

  return bracket;
};

/**
 * Get round name based on total rounds and current round.
 */
export const getRoundName = (round: number, totalRounds: number): string => {
  const roundsFromFinal = totalRounds - round;

  switch (roundsFromFinal) {
    case 0:
      return "Finals";
    case 1:
      return "Semi-Finals";
    case 2:
      return "Quarter-Finals";
    default:
      return `Round ${round}`;
  }
};

