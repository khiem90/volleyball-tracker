"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Crown } from "lucide-react";
import type { TeamLeaderboardProps } from "./types";

export const TeamLeaderboard = memo(function TeamLeaderboard({
  leaderboard,
  getTeamName,
  getTeamColor,
  isTeamOnCourt,
}: TeamLeaderboardProps) {
  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Crown className="w-5 h-5 text-amber-500" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {leaderboard.map((status, index) => {
            const champCount = status.championCount;
            const onCourt = isTeamOnCourt(status.teamId);

            return (
              <div
                key={status.teamId}
                className={`
                  flex items-center gap-3 p-3 rounded-lg
                  ${
                    index === 0 && champCount > 0
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
                  ${
                    index === 0 && champCount > 0
                      ? "bg-amber-500 text-white"
                      : ""
                  }
                  ${
                    index === 1 && champCount > 0
                      ? "bg-slate-400 text-white"
                      : ""
                  }
                  ${
                    index === 2 && champCount > 0
                      ? "bg-amber-700 text-white"
                      : ""
                  }
                  ${
                    index > 2 || champCount === 0
                      ? "bg-card text-muted-foreground"
                      : ""
                  }
                `}
                >
                  {index + 1}
                </div>

                {/* Team */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${getTeamColor(
                      status.teamId
                    )}, ${getTeamColor(status.teamId)}cc)`,
                  }}
                >
                  <Users className="w-4 h-4 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`font-medium truncate ${
                        index === 0 && champCount > 0 ? "text-amber-500" : ""
                      }`}
                    >
                      {getTeamName(status.teamId)}
                    </p>
                    {onCourt && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        Playing
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {status.matchesPlayed} matches played
                  </p>
                </div>

                {/* Champion count */}
                <div className="text-right">
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <Crown className="w-4 h-4" />
                    <span>{champCount}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">crowns</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});
