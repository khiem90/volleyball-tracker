import type { Match } from "@/types/game";

/**
 * The match as a forfeit by `teamId`: completed, won by the other side, with
 * no points either way, and marked with the team that forfeited.
 */
export const forfeited = (match: Match, teamId: string, now: number): Match => ({
  ...match,
  status: "completed",
  winnerId: match.homeTeamId === teamId ? match.awayTeamId : match.homeTeamId,
  forfeitedBy: teamId,
  homeScore: 0,
  awayScore: 0,
  completedAt: now,
});
