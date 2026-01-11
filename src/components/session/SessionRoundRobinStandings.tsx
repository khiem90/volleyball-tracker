"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RoundRobinStanding, PersistentTeam } from "@/types/game";

interface SessionRoundRobinStandingsProps {
  standings: RoundRobinStanding[];
  teamsMap: Map<string, PersistentTeam>;
}

export const SessionRoundRobinStandings = ({
  standings,
  teamsMap,
}: SessionRoundRobinStandingsProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Standings</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">#</th>
              <th className="text-left py-2 px-2">Team</th>
              <th className="text-center py-2 px-2">P</th>
              <th className="text-center py-2 px-2">W</th>
              <th className="text-center py-2 px-2">L</th>
              <th className="text-center py-2 px-2">PD</th>
              <th className="text-center py-2 px-2">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((standing, idx) => {
              const team = teamsMap.get(standing.teamId);
              return (
                <tr key={standing.teamId} className="border-b border-border/50">
                  <td className="py-2 px-2 font-medium">{idx + 1}</td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: team?.color || "#888" }}
                      />
                      {team?.name || "Unknown"}
                    </div>
                  </td>
                  <td className="text-center py-2 px-2">{standing.played}</td>
                  <td className="text-center py-2 px-2 text-emerald-500">
                    {standing.won}
                  </td>
                  <td className="text-center py-2 px-2 text-destructive">
                    {standing.lost}
                  </td>
                  <td className="text-center py-2 px-2">
                    {standing.pointsDiff > 0
                      ? `+${standing.pointsDiff}`
                      : standing.pointsDiff}
                  </td>
                  <td className="text-center py-2 px-2 font-bold">
                    {standing.competitionPoints}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
);
