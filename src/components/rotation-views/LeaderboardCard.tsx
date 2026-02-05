"use client";

import { memo, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

type LeaderboardEntry = {
  teamId: string;
};

type LeaderboardCardProps<T extends LeaderboardEntry> = {
  icon: ReactNode;
  entries: T[];
  getTeamName: (teamId: string) => string;
  getTeamColor: (teamId: string) => string;
  isTeamOnCourt: (teamId: string) => boolean;
  getRankHighlight: (entry: T, index: number) => boolean;
  getSubtitle: (entry: T) => string;
  renderStats: (entry: T) => ReactNode;
};

const LeaderboardCardInner = <T extends LeaderboardEntry>({
  icon,
  entries,
  getTeamName,
  getTeamColor,
  isTeamOnCourt,
  getRankHighlight,
  getSubtitle,
  renderStats,
}: LeaderboardCardProps<T>) => {
  if (entries.length === 0) return null;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {entries.map((entry, index) => {
            const onCourt = isTeamOnCourt(entry.teamId);
            const isHighlighted = getRankHighlight(entry, index);

            return (
              <div
                key={entry.teamId}
                className={`
                  flex items-center gap-3 p-3 rounded-lg
                  ${
                    index === 0 && isHighlighted
                      ? "bg-amber-500/20 border border-amber-500/30"
                      : "bg-card border border-border/50"
                  }
                  ${onCourt ? "ring-2 ring-primary/30" : ""}
                `}
              >
                {/* Rank */}
                <div
                  className={`
                  w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                  ${index === 0 && isHighlighted ? "bg-amber-500 text-white" : ""}
                  ${index === 1 && isHighlighted ? "bg-slate-400 text-white" : ""}
                  ${index === 2 && isHighlighted ? "bg-amber-700 text-white" : ""}
                  ${index > 2 || !isHighlighted ? "bg-card text-muted-foreground" : ""}
                `}
                >
                  {index + 1}
                </div>

                {/* Team */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${getTeamColor(entry.teamId)}, ${getTeamColor(entry.teamId)}cc)`,
                  }}
                >
                  <Users className="w-4 h-4 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`font-medium truncate ${
                        index === 0 && isHighlighted ? "text-amber-500" : ""
                      }`}
                    >
                      {getTeamName(entry.teamId)}
                    </p>
                    {onCourt && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        Playing
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {getSubtitle(entry)}
                  </p>
                </div>

                {/* Stats */}
                <div className="text-right">
                  {renderStats(entry)}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export const LeaderboardCard = memo(LeaderboardCardInner) as typeof LeaderboardCardInner;
