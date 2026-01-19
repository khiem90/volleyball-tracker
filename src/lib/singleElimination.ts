import type { Match } from "@/types/game";

// Special marker for bye positions
const BYE_MARKER = "__BYE__";

/**
 * Get the next power of 2 >= n
 */
const nextPowerOf2 = (n: number): number => {
  let power = 1;
  while (power < n) power *= 2;
  return power;
};

/**
 * Generates a single elimination bracket.
 * Teams are seeded in order provided.
 * Supports non-power-of-2 team counts by adding byes.
 */
export const generateSingleEliminationBracket = (
  teamIds: string[],
  competitionId: string
): Omit<Match, "id" | "createdAt">[] => {
  const matches: Omit<Match, "id" | "createdAt">[] = [];
  const n = teamIds.length;

  if (n < 2) {
    throw new Error("Need at least 2 teams for single elimination");
  }

  // Calculate bracket size (next power of 2)
  const bracketSize = nextPowerOf2(n);
  const totalRounds = Math.log2(bracketSize);
  const byeCount = bracketSize - n;

  // Create virtual team list with byes filling the lowest seed positions
  // Teams are seeded 1 through n, byes fill positions n+1 through bracketSize
  const virtualTeams: string[] = [...teamIds];
  for (let i = 0; i < byeCount; i++) {
    virtualTeams.push(BYE_MARKER);
  }

  // Generate first round matches (seeded)
  // Standard seeding: 1v8, 4v5, 2v7, 3v6 for 8 teams
  const seededOrder = getSeededMatchups(bracketSize);

  // First round - track which teams advance via bye
  const byeAdvances: Map<number, string> = new Map();

  for (let i = 0; i < seededOrder.length; i += 2) {
    const homeIndex = seededOrder[i];
    const awayIndex = seededOrder[i + 1];
    const homeTeam = virtualTeams[homeIndex];
    const awayTeam = virtualTeams[awayIndex];
    const position = Math.floor(i / 2) + 1;

    // Check if this is a bye match
    if (homeTeam === BYE_MARKER || awayTeam === BYE_MARKER) {
      // One team has a bye - they auto-advance to round 2
      const advancingTeam = homeTeam === BYE_MARKER ? awayTeam : homeTeam;
      byeAdvances.set(position, advancingTeam);

      // Create a "bye" match that's already completed
      matches.push({
        competitionId,
        homeTeamId: homeTeam === BYE_MARKER ? "" : homeTeam,
        awayTeamId: awayTeam === BYE_MARKER ? "" : awayTeam,
        homeScore: homeTeam === BYE_MARKER ? 0 : 1,
        awayScore: awayTeam === BYE_MARKER ? 0 : 1,
        status: "completed",
        round: 1,
        position,
        winnerId: advancingTeam,
        isBye: true,
      });
    } else {
      // Normal match
      matches.push({
        competitionId,
        homeTeamId: homeTeam,
        awayTeamId: awayTeam,
        homeScore: 0,
        awayScore: 0,
        status: "pending",
        round: 1,
        position,
      });
    }
  }

  // Generate placeholder matches for subsequent rounds
  let matchesInPrevRound = bracketSize / 2;
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = matchesInPrevRound / 2;

    for (let pos = 1; pos <= matchesInRound; pos++) {
      // Check if any teams advance via bye to this match
      let homeTeamId = "";
      let awayTeamId = "";

      if (round === 2) {
        // Check bye advances from round 1
        const homeSourcePos = pos * 2 - 1;
        const awaySourcePos = pos * 2;
        if (byeAdvances.has(homeSourcePos)) {
          homeTeamId = byeAdvances.get(homeSourcePos)!;
        }
        if (byeAdvances.has(awaySourcePos)) {
          awayTeamId = byeAdvances.get(awaySourcePos)!;
        }
      }

      matches.push({
        competitionId,
        homeTeamId,
        awayTeamId,
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
  // Calculate bracket size as next power of 2 for proper round calculation
  const bracketSize = nextPowerOf2(totalTeams);
  const totalRounds = Math.log2(bracketSize);
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

/**
 * Get total rounds for a given team count (accounts for byes).
 */
export const getTotalRounds = (teamCount: number): number => {
  return Math.log2(nextPowerOf2(teamCount));
};

