import type { PersistentTeam } from "@/types/game";
import { TEAM_COLOR_IDS } from "@/lib/teamColor";

/**
 * Pre-defined teams for guest Quick Match mode.
 * These teams exist only in memory and are never persisted.
 * Colours are ink ids, never hex literals: the two ends of the "Two sides"
 * scheme, which is the scheme a head-to-head draw is for.
 */
const GUEST_TEAMS: readonly PersistentTeam[] = [
  {
    id: "guest-team-a",
    name: "Team A",
    color: TEAM_COLOR_IDS[0], // Navy
    createdAt: 0,
  },
  {
    id: "guest-team-b",
    name: "Team B",
    color: TEAM_COLOR_IDS[3], // Rose
    createdAt: 0,
  },
] as const;

export const GUEST_HOME_TEAM = GUEST_TEAMS[0];
export const GUEST_AWAY_TEAM = GUEST_TEAMS[1];
