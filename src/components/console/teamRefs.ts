import { crestForTeam, type MbTeam } from "@/components/matchbook/types";
import type { PersistentTeam } from "@/types/game";

/** A team as the console shows it: matchbook crest and name, plus its color. */
export interface ConsoleTeam extends MbTeam {
  id: string;
  color?: string;
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
      crest: crestForTeam(teamId, team?.name ?? ""),
      ...(team?.color !== undefined && { color: team.color }),
    };
  };
};
