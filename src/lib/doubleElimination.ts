import type { Match } from "@/types/game";

/**
 * Generates a double elimination bracket.
 * Winners bracket + Losers bracket + Grand Finals.
 */
export const generateDoubleEliminationBracket = (
  teamIds: string[],
  competitionId: string
): Omit<Match, "id" | "createdAt">[] => {
  const matches: Omit<Match, "id" | "createdAt">[] = [];
  const n = teamIds.length;

  // Ensure power of 2 and at least 4 teams
  if (n < 4 || (n & (n - 1)) !== 0) {
    throw new Error("Team count must be a power of 2 (minimum 4) for double elimination");
  }

  const winnersRounds = Math.log2(n);
  const losersRounds = (winnersRounds - 1) * 2; // Losers bracket has more rounds

  // Generate seeded matchups for first round
  const seededOrder = getSeededMatchups(n);

  // ==================
  // Winners Bracket
  // ==================

  // First round of winners bracket
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
      bracket: "winners",
    });
  }

  // Subsequent rounds of winners bracket (placeholders)
  let matchesInPrevRound = n / 2;
  for (let round = 2; round <= winnersRounds; round++) {
    const matchesInRound = matchesInPrevRound / 2;

    for (let pos = 1; pos <= matchesInRound; pos++) {
      matches.push({
        competitionId,
        homeTeamId: "",
        awayTeamId: "",
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
  // Round L1: First round losers play each other (n/4 matches)
  // Round L2: L1 winners vs second round losers
  // Continue alternating...

  let losersMatchCount = n / 4; // Start with half of first round losers
  let losersRound = 1;

  // First round of losers (losers from winners round 1)
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
  const winnersRounds = Math.log2(totalTeams);

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

