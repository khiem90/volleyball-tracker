import type { Team } from "@/lib/teamShapes";
import type { PersistentTeam } from "@/types/game";

/** A team as the console shows it: its name and color, plus its id. */
export interface ConsoleTeam extends Team {
  id: string;
}

export type TeamLookup = (teamId: string) => ConsoleTeam;

/**
 * Team refs by id from the entries as they should be shown (see entryTeams).
 * An id nothing knows shows as "Unknown" rather than breaking a row.
 */
export const teamLookup = (teams: PersistentTeam[]): TeamLookup => {
  const byId = new Map(teams.map((team) => [team.id, team]));
  return (teamId) => {
    const team = byId.get(teamId);
    return {
      id: teamId,
      name: team?.name ?? "Unknown",
      ...(team?.color !== undefined && { color: team.color }),
    };
  };
};
