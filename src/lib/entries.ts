import type { PersistentTeam, Tournament } from "@/types/game";

/**
 * The teams of a tournament as they should be shown. While a tournament is a
 * draft or live an entry shows the roster team's current name and color; once
 * it is completed the entry keeps them as they were. A team that has left the
 * roster shows its entry snapshot either way, so it never becomes "Unknown".
 */
export const entryTeams = (
  tournament: Tournament,
  roster: PersistentTeam[]
): PersistentTeam[] => {
  const rosterById = new Map(roster.map((team) => [team.id, team]));
  return tournament.entries.map((entry) => {
    const current = tournament.status === "completed" ? undefined : rosterById.get(entry.teamId);
    return {
      id: entry.teamId,
      name: current?.name ?? entry.name,
      createdAt: current?.createdAt ?? tournament.createdAt,
      ...((current?.color ?? entry.color) !== undefined && {
        color: current?.color ?? entry.color,
      }),
    };
  });
};
