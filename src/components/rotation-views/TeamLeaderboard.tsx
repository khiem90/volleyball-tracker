"use client";

import { memo, useCallback } from "react";
import { Crown } from "lucide-react";
import type { TeamLeaderboardProps } from "./types";
import { LeaderboardCard } from "./LeaderboardCard";

type TeamLeaderboardEntry = {
  teamId: string;
  championCount: number;
  matchesPlayed: number;
};

export const TeamLeaderboard = memo(function TeamLeaderboard({
  leaderboard,
  getTeamName,
  getTeamColor,
  isTeamOnCourt,
}: TeamLeaderboardProps) {
  const getRankHighlight = useCallback(
    (entry: TeamLeaderboardEntry) => entry.championCount > 0,
    []
  );

  const getSubtitle = useCallback(
    (entry: TeamLeaderboardEntry) => `${entry.matchesPlayed} matches played`,
    []
  );

  const renderStats = useCallback(
    (entry: TeamLeaderboardEntry) => (
      <>
        <div className="flex items-center gap-1 text-amber-500 font-bold">
          <Crown className="w-4 h-4" />
          <span>{entry.championCount}</span>
        </div>
        <p className="text-xs text-muted-foreground">crowns</p>
      </>
    ),
    []
  );

  return (
    <LeaderboardCard
      icon={<Crown className="w-5 h-5 text-amber-500" />}
      entries={leaderboard}
      getTeamName={getTeamName}
      getTeamColor={getTeamColor}
      isTeamOnCourt={isTeamOnCourt}
      getRankHighlight={getRankHighlight}
      getSubtitle={getSubtitle}
      renderStats={renderStats}
    />
  );
});
