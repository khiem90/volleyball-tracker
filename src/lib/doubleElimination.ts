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
 * Get seeded matchup order for tournament bracket.
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
 * Reorder teams so that specified bye teams are placed at positions
 * that will be matched against BYE_MARKER in the seeded bracket.
 */
const reorderTeamsForByes = (
  teamIds: string[],
  byeTeamIds: string[],
  bracketSize: number
): string[] => {
  const n = teamIds.length;

  // Create the seeded matchups to find which positions get byes
  const seededOrder = getSeededMatchups(bracketSize);

  // Find which seed positions will be matched against bye markers
  const byeReceivingPositions: number[] = [];
  for (let i = 0; i < seededOrder.length; i += 2) {
    const homeIndex = seededOrder[i];
    const awayIndex = seededOrder[i + 1];
    if (awayIndex >= n && homeIndex < n) {
      byeReceivingPositions.push(homeIndex);
    }
    if (homeIndex >= n && awayIndex < n) {
      byeReceivingPositions.push(awayIndex);
    }
  }

  // Create the reordered array: place bye teams at bye-receiving positions
  const result: string[] = new Array(n).fill("");
  const byeTeamSet = new Set(byeTeamIds);
  const nonByeTeams = teamIds.filter((t) => !byeTeamSet.has(t));

  // Place bye teams at bye-receiving positions
  byeTeamIds.forEach((teamId, idx) => {
    if (idx < byeReceivingPositions.length) {
      result[byeReceivingPositions[idx]] = teamId;
    }
  });

  // Fill remaining positions with non-bye teams
  let nonByeIdx = 0;
  for (let i = 0; i < n; i++) {
    if (result[i] === "") {
      result[i] = nonByeTeams[nonByeIdx++];
    }
  }

  return result;
};

/**
 * Generates a double elimination bracket.
 * Winners bracket + Losers bracket + Grand Finals.
 * Supports non-power-of-2 team counts by adding byes.
 * @param byeTeamIds - Optional array of team IDs that should receive first-round byes
 */
export const generateDoubleEliminationBracket = (
  teamIds: string[],
  competitionId: string,
  byeTeamIds?: string[]
): Omit<Match, "id" | "createdAt">[] => {
  const matches: Omit<Match, "id" | "createdAt">[] = [];
  const n = teamIds.length;

  if (n < 4) {
    throw new Error("Need at least 4 teams for double elimination");
  }

  // Calculate bracket size (next power of 2)
  const bracketSize = nextPowerOf2(n);
  const winnersRounds = Math.log2(bracketSize);
  const byeCount = bracketSize - n;

  // Reorder teams if custom bye selection provided
  const orderedTeamIds =
    byeTeamIds && byeTeamIds.length === byeCount
      ? reorderTeamsForByes(teamIds, byeTeamIds, bracketSize)
      : teamIds;

  // Create virtual team list with byes filling the lowest seed positions
  const virtualTeams: string[] = [...orderedTeamIds];
  for (let i = 0; i < byeCount; i++) {
    virtualTeams.push(BYE_MARKER);
  }

  // Generate seeded matchups for first round
  const seededOrder = getSeededMatchups(bracketSize);

  // ==================
  // Winners Bracket
  // ==================

  // Track bye advances for winners bracket
  const winnersByeAdvances: Map<number, string> = new Map();

  // First round of winners bracket
  for (let i = 0; i < seededOrder.length; i += 2) {
    const homeIndex = seededOrder[i];
    const awayIndex = seededOrder[i + 1];
    const homeTeam = virtualTeams[homeIndex];
    const awayTeam = virtualTeams[awayIndex];
    const position = Math.floor(i / 2) + 1;

    // Check if this is a bye match
    if (homeTeam === BYE_MARKER || awayTeam === BYE_MARKER) {
      const advancingTeam = homeTeam === BYE_MARKER ? awayTeam : homeTeam;
      winnersByeAdvances.set(position, advancingTeam);

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
        bracket: "winners",
        winnerId: advancingTeam,
        isBye: true,
      });
    } else {
      matches.push({
        competitionId,
        homeTeamId: homeTeam,
        awayTeamId: awayTeam,
        homeScore: 0,
        awayScore: 0,
        status: "pending",
        round: 1,
        position,
        bracket: "winners",
      });
    }
  }

  // Subsequent rounds of winners bracket (placeholders)
  let matchesInPrevRound = bracketSize / 2;
  for (let round = 2; round <= winnersRounds; round++) {
    const matchesInRound = matchesInPrevRound / 2;

    for (let pos = 1; pos <= matchesInRound; pos++) {
      // Check if any teams advance via bye to this match
      let homeTeamId = "";
      let awayTeamId = "";

      if (round === 2) {
        const homeSourcePos = pos * 2 - 1;
        const awaySourcePos = pos * 2;
        if (winnersByeAdvances.has(homeSourcePos)) {
          homeTeamId = winnersByeAdvances.get(homeSourcePos)!;
        }
        if (winnersByeAdvances.has(awaySourcePos)) {
          awayTeamId = winnersByeAdvances.get(awaySourcePos)!;
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
        bracket: "winners",
      });
    }

    matchesInPrevRound = matchesInRound;
  }

  // ==================
  // Losers Bracket
  // ==================

  // Losers bracket rounds
  // Round L1: First round losers play each other (bracketSize/4 matches)
  // Round L2: L1 winners vs second round losers
  // Continue alternating...

  let losersMatchCount = bracketSize / 4;
  let losersRound = 1;

  // First round of losers (losers from winners round 1)
  // Note: bye matches don't produce losers, so some L1 matches may have pre-filled teams
  for (let pos = 1; pos <= losersMatchCount; pos++) {
    matches.push({
      competitionId,
      homeTeamId: "",
      awayTeamId: "",
      homeScore: 0,
      awayScore: 0,
      status: "pending",
      round: losersRound,
      position: pos,
      bracket: "losers",
    });
  }

  // Subsequent losers rounds
  for (let wr = 2; wr <= winnersRounds - 1; wr++) {
    // After each winners round elimination, losers from that round enter losers bracket

    // Round where losers from winners bracket enter
    losersRound++;
    for (let pos = 1; pos <= losersMatchCount; pos++) {
      matches.push({
        competitionId,
        homeTeamId: "",
        awayTeamId: "",
        homeScore: 0,
        awayScore: 0,
        status: "pending",
        round: losersRound,
        position: pos,
        bracket: "losers",
      });
    }

    // Round where winners advance in losers bracket (halves the count)
    losersRound++;
    losersMatchCount = losersMatchCount / 2;
    for (let pos = 1; pos <= losersMatchCount; pos++) {
      matches.push({
        competitionId,
        homeTeamId: "",
        awayTeamId: "",
        homeScore: 0,
        awayScore: 0,
        status: "pending",
        round: losersRound,
        position: pos,
        bracket: "losers",
      });
    }
  }

  // Losers Finals (1 match)
  losersRound++;
  matches.push({
    competitionId,
    homeTeamId: "",
    awayTeamId: "",
    homeScore: 0,
    awayScore: 0,
    status: "pending",
    round: losersRound,
    position: 1,
    bracket: "losers",
  });

  // ==================
  // Grand Finals
  // ==================
  matches.push({
    competitionId,
    homeTeamId: "",
    awayTeamId: "",
    homeScore: 0,
    awayScore: 0,
    status: "pending",
    round: 1,
    position: 1,
    bracket: "grand_finals",
  });

  return matches;
};

/**
 * Get round name for double elimination.
 */
export const getDoubleElimRoundName = (
  round: number,
  bracket: "winners" | "losers" | "grand_finals",
  totalWinnersRounds: number
): string => {
  if (bracket === "grand_finals") {
    return "Grand Finals";
  }

  if (bracket === "winners") {
    const roundsFromFinal = totalWinnersRounds - round;
    switch (roundsFromFinal) {
      case 0:
        return "Winners Finals";
      case 1:
        return "Winners Semi-Finals";
      case 2:
        return "Winners Quarter-Finals";
      default:
        return `Winners Round ${round}`;
    }
  }

  // Losers bracket
  return `Losers Round ${round}`;
};

/**
 * Get structured bracket data for visualization.
 */
export interface DoubleBracketData {
  winners: Match[][];
  losers: Match[][];
  grandFinals: Match | null;
}

export const getDoubleBracketStructure = (
  matches: Match[],
  totalTeams: number
): DoubleBracketData => {
  // Calculate bracket size as next power of 2 for proper round calculation
  const bracketSize = nextPowerOf2(totalTeams);
  const winnersRounds = Math.log2(bracketSize);

  const winners: Match[][] = [];
  const losers: Match[][] = [];

  // Winners bracket rounds
  for (let r = 1; r <= winnersRounds; r++) {
    winners.push(
      matches
        .filter((m) => m.bracket === "winners" && m.round === r)
        .sort((a, b) => a.position - b.position)
    );
  }

  // Losers bracket rounds
  const losersMatches = matches.filter((m) => m.bracket === "losers");
  const maxLosersRound = Math.max(...losersMatches.map((m) => m.round), 0);

  for (let r = 1; r <= maxLosersRound; r++) {
    losers.push(
      matches
        .filter((m) => m.bracket === "losers" && m.round === r)
        .sort((a, b) => a.position - b.position)
    );
  }

  // Grand finals
  const grandFinals = matches.find((m) => m.bracket === "grand_finals") || null;

  return { winners, losers, grandFinals };
};

/**
 * Get total winners rounds for a given team count (accounts for byes).
 */
export const getTotalWinnersRounds = (teamCount: number): number => {
  return Math.log2(nextPowerOf2(teamCount));
};

