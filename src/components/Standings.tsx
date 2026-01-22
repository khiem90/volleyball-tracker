"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal } from "lucide-react";
import type { RoundRobinStanding } from "@/lib/roundRobin";
import type { PersistentTeam } from "@/types/game";

interface StandingsProps {
  standings: RoundRobinStanding[];
  teams: PersistentTeam[];
}

export const Standings = ({ standings, teams }: StandingsProps) => {
  const teamsMap = useMemo(() => {
    const map = new Map<string, PersistentTeam>();
    teams.forEach((team) => map.set(team.id, team));
    return map;
  }, [teams]);

  const getTeamName = (teamId: string) => {
    return teamsMap.get(teamId)?.name || "Unknown Team";
  };

  const getTeamColor = (teamId: string) => {
    return teamsMap.get(teamId)?.color || "#3b82f6";
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) {
      return <Trophy className="w-5 h-5 text-amber-500" />;
    }
    if (rank === 2) {
      return <Medal className="w-5 h-5 text-slate-400" />;
    }
    if (rank === 3) {
      return <Medal className="w-5 h-5 text-amber-700" />;
    }
    return <span className="w-5 h-5 flex items-center justify-center text-muted-foreground">{rank}</span>;
  };

  return (
    <Card className="border-border/50 bg-card/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          Standings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground w-12">#</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Team</th>
                <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground w-12">P</th>
                <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground w-12">W</th>
                <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground w-12">L</th>
                <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground w-16">PF</th>
                <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground w-16">PA</th>
                <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground w-16">+/-</th>
                <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground w-16">PTS</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((standing, index) => {
                const rank = index + 1;
                const teamColor = getTeamColor(standing.teamId);

                return (
                  <tr
                    key={standing.teamId}
                    className={`
                      border-b border-border/30 transition-colors
                      ${rank === 1 ? "bg-amber-500/5" : "hover:bg-card/50"}
                    `}
                  >
                    <td className="py-3 px-2">
                      {getRankIcon(rank)}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: teamColor }}
                        />
                        <span className={`font-medium ${rank === 1 ? "text-amber-500" : ""}`}>
                          {getTeamName(standing.teamId)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center tabular-nums">{standing.played}</td>
                    <td className="py-3 px-2 text-center tabular-nums text-emerald-500 font-medium">
                      {standing.won}
                    </td>
                    <td className="py-3 px-2 text-center tabular-nums text-red-500">
                      {standing.lost}
                    </td>
                    <td className="py-3 px-2 text-center tabular-nums">{standing.pointsFor}</td>
                    <td className="py-3 px-2 text-center tabular-nums">{standing.pointsAgainst}</td>
                    <td className="py-3 px-2 text-center tabular-nums">
                      <span
                        className={
                          standing.pointsDiff > 0
                            ? "text-emerald-500"
                            : standing.pointsDiff < 0
                            ? "text-red-500"
                            : ""
                        }
                      >
                        {standing.pointsDiff > 0 ? "+" : ""}
                        {standing.pointsDiff}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span
                        className={`
                          font-bold tabular-nums
                          ${rank === 1 ? "text-amber-500" : ""}
                        `}
                      >
                        {standing.competitionPoints}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-border/30 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span><strong>P</strong> = Played</span>
          <span><strong>W</strong> = Won</span>
          <span><strong>L</strong> = Lost</span>
          <span><strong>PF</strong> = Points For</span>
          <span><strong>PA</strong> = Points Against</span>
          <span><strong>+/-</strong> = Point Diff</span>
          <span><strong>PTS</strong> = Competition Points</span>
        </div>
      </CardContent>
    </Card>
  );
};

