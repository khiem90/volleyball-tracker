"use client";

import { memo, useCallback } from "react";
import { Trophy } from "lucide-react";
import { LeaderboardCard } from "./LeaderboardCard";

type TwoMatchLeaderboardEntry = {
  teamId: string;
  totalWins: number;
  totalLosses: number;
  totalMatches: number;
};

type TwoMatchLeaderboardProps = {
  leaderboard: TwoMatchLeaderboardEntry[];
  getTeamName: (teamId: string) => string;
  getTeamColor: (teamId: string) => string;
  isTeamOnCourt: (teamId: string) => boolean;
};

export const TwoMatchLeaderboard = memo(function TwoMatchLeaderboard({
  leaderboard,
  getTeamName,
  getTeamColor,
  isTeamOnCourt,
}: TwoMatchLeaderboardProps) {
  const getRankHighlight = useCallback(() => true, []);

  const getSubtitle = useCallback((entry: TwoMatchLeaderboardEntry) => {
    const winRate =
      entry.totalMatches > 0
        ? Math.round((entry.totalWins / entry.totalMatches) * 100)
        : 0;
    return `${entry.totalMatches} matches • ${winRate}% win rate`;
  }, []);

  const renderStats = useCallback(
    (entry: TwoMatchLeaderboardEntry) => (
      <div className="flex items-center gap-2">
        <span className="text-emerald-500 font-bold">{entry.totalWins}W</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-red-400 font-medium">{entry.totalLosses}L</span>
      </div>
    ),
    []
  );

  return (
    <LeaderboardCard
      icon={<Trophy className="w-5 h-5 text-amber-500" />}
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
