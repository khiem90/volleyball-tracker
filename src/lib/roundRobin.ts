import type { Match, MatchDraft, RoundRobinStanding } from "@/types/game";
import {
  DEFAULT_POINTS_FOR_LOSS,
  DEFAULT_POINTS_FOR_WIN,
} from "@/types/competition-config";

/**
 * Generates a round robin schedule where every team plays every other team once.
 * Uses the circle method for scheduling.
 */
export const generateRoundRobinSchedule = (teamIds: string[]): MatchDraft[] => {
  const matches: MatchDraft[] = [];
  const teams = [...teamIds];

  // If odd number of teams, add a "bye" placeholder
  const hasBye = teams.length % 2 !== 0;
  if (hasBye) {
    teams.push("BYE");
  }

  const n = teams.length;
  const rounds = n - 1;
  const matchesPerRound = n / 2;

  for (let round = 0; round < rounds; round++) {
    for (let match = 0; match < matchesPerRound; match++) {
      const home = (round + match) % (n - 1);
      let away = (n - 1 - match + round) % (n - 1);

      // Last team stays fixed, others rotate
      if (match === 0) {
        away = n - 1;
      }

      const homeTeamId = teams[home];
      const awayTeamId = teams[away];

      // Skip matches with the bye team
      if (homeTeamId === "BYE" || awayTeamId === "BYE") {
        continue;
      }

      matches.push({
        homeTeamId,
        awayTeamId,
        homeScore: 0,
        awayScore: 0,
        status: "pending",
        round: round + 1,
        position: match + 1,
      });
    }
  }

  return matches;
};

export interface ScoringRules {
  pointsForWin: number;
  pointsForLoss: number;
}

/**
 * Calculate standings from completed matches.
 *
 * A forfeit counts as a win for the other team and a loss for the team that
 * forfeited, and changes nothing else: no points for, against, or difference.
 * Bye matches are not played and do not count.
 */
export const calculateStandings = (
  teamIds: string[],
  matches: Match[],
  rules?: Partial<ScoringRules>
): RoundRobinStanding[] => {
  const pointsForWin = rules?.pointsForWin ?? DEFAULT_POINTS_FOR_WIN;
  const pointsForLoss = rules?.pointsForLoss ?? DEFAULT_POINTS_FOR_LOSS;

  const standingsMap = new Map<string, RoundRobinStanding>();

  teamIds.forEach((teamId) => {
    standingsMap.set(teamId, {
      teamId,
      played: 0,
      won: 0,
      lost: 0,
      forfeitWins: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointsDiff: 0,
      competitionPoints: 0,
    });
  });

  matches
    .filter((match) => match.status === "completed" && !match.isBye)
    .forEach((match) => {
      const homeStanding = standingsMap.get(match.homeTeamId);
      const awayStanding = standingsMap.get(match.awayTeamId);

      if (!homeStanding || !awayStanding) return;

      homeStanding.played++;
      awayStanding.played++;

      if (match.forfeitedBy) {
        const [winner, loser] =
          match.forfeitedBy === match.homeTeamId
            ? [awayStanding, homeStanding]
            : [homeStanding, awayStanding];
        winner.won++;
        winner.forfeitWins++;
        winner.competitionPoints += pointsForWin;
        loser.lost++;
        loser.competitionPoints += pointsForLoss;
        return;
      }

      homeStanding.pointsFor += match.homeScore;
      homeStanding.pointsAgainst += match.awayScore;
      awayStanding.pointsFor += match.awayScore;
      awayStanding.pointsAgainst += match.homeScore;

      // The winner is whoever the match records, falling back to the score.
      const homeWon = match.winnerId
        ? match.winnerId === match.homeTeamId
        : match.homeScore > match.awayScore;
      const [winner, loser] = homeWon
        ? [homeStanding, awayStanding]
        : [awayStanding, homeStanding];
      winner.won++;
      winner.competitionPoints += pointsForWin;
      loser.lost++;
      loser.competitionPoints += pointsForLoss;

      homeStanding.pointsDiff = homeStanding.pointsFor - homeStanding.pointsAgainst;
      awayStanding.pointsDiff = awayStanding.pointsFor - awayStanding.pointsAgainst;
    });

  const standings = Array.from(standingsMap.values());

  // Sort by: competition points (desc), point diff (desc), points for (desc)
  standings.sort((a, b) => {
    if (b.competitionPoints !== a.competitionPoints) {
      return b.competitionPoints - a.competitionPoints;
    }
    if (b.pointsDiff !== a.pointsDiff) {
      return b.pointsDiff - a.pointsDiff;
    }
    return b.pointsFor - a.pointsFor;
  });

  return standings;
};

// Re-export the type for convenience
export type { RoundRobinStanding };
