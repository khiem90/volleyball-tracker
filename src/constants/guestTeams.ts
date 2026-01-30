import type { PersistentTeam } from "@/types/game";

/**
 * Pre-defined teams for guest Quick Match mode.
 * These teams exist only in memory and are never persisted.
 */
export const GUEST_TEAMS: readonly PersistentTeam[] = [
  {
    id: "guest-team-a",
    name: "Team A",
    color: "#3b82f6", // Blue
    createdAt: 0,
  },
  {
    id: "guest-team-b",
    name: "Team B",
    color: "#f97316", // Orange
    createdAt: 0,
  },
] as const;

export const GUEST_TEAM_IDS = GUEST_TEAMS.map((team) => team.id);

export const GUEST_HOME_TEAM = GUEST_TEAMS[0];
export const GUEST_AWAY_TEAM = GUEST_TEAMS[1];

/**
 * Check if a team ID belongs to a guest team
 */
export const isGuestTeamId = (teamId: string): boolean => {
  return GUEST_TEAM_IDS.includes(teamId);
};
