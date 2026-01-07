import type { Match } from "@/types/game";

/**
 * Generates a round robin schedule where every team plays every other team once.
 * Uses the circle method for scheduling.
 */
export const generateRoundRobinSchedule = (
  teamIds: string[],
  competitionId: string
): Omit<Match, "id" | "createdAt">[] => {
  const matches: Omit<Match, "id" | "createdAt">[] = [];
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
        competitionId,
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

/**
 * Calculate standings from completed matches
 */
export interface RoundRobinStanding {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDiff: number;
  competitionPoints: number; // 3 for win, 0 for loss
}

export const calculateStandings = (
  teamIds: string[],
  matches: Match[]
): RoundRobinStanding[] => {
  // Initialize standings for all teams
  const standingsMap = new Map<string, RoundRobinStanding>();

  teamIds.forEach((teamId) => {
    standingsMap.set(teamId, {
      teamId,
      played: 0,
      won: 0,
      lost: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointsDiff: 0,
      competitionPoints: 0,
    });
  });

  // Process completed matches
  matches
    .filter((match) => match.status === "completed")
    .forEach((match) => {
      const homeStanding = standingsMap.get(match.homeTeamId);
      const awayStanding = standingsMap.get(match.awayTeamId);

      if (!homeStanding || !awayStanding) return;

      // Update games played
      homeStanding.played++;
      awayStanding.played++;

      // Update points for/against
      homeStanding.pointsFor += match.homeScore;
      homeStanding.pointsAgainst += match.awayScore;
      awayStanding.pointsFor += match.awayScore;
      awayStanding.pointsAgainst += match.homeScore;

      // Determine winner
      if (match.homeScore > match.awayScore) {
        homeStanding.won++;
        homeStanding.competitionPoints += 3;
        awayStanding.lost++;
      } else if (match.awayScore > match.homeScore) {
        awayStanding.won++;
        awayStanding.competitionPoints += 3;
        homeStanding.lost++;
      }
      // Ties: no additional points (volleyball typically doesn't have ties)

      // Update point differential
      homeStanding.pointsDiff = homeStanding.pointsFor - homeStanding.pointsAgainst;
      awayStanding.pointsDiff = awayStanding.pointsFor - awayStanding.pointsAgainst;
    });

  // Convert to array and sort
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

