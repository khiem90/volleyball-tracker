"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Trophy, Clock, Flame, Play, RefreshCw, Crown } from "lucide-react";
import { getTeamsByStatus, getCurrentChampionStreak, getChampionCount } from "@/lib/win2out";
import type { Match, PersistentTeam, Win2OutState } from "@/types/game";

interface Win2OutViewProps {
  state: Win2OutState;
  matches: Match[];
  teams: PersistentTeam[];
  onMatchClick?: (match: Match) => void;
}

export const Win2OutView = ({
  state,
  matches,
  teams,
  onMatchClick,
}: Win2OutViewProps) => {
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

  const { championsData } = useMemo(
    () => getTeamsByStatus(state),
    [state]
  );

  const currentMatch = useMemo(
    () =>
      matches.find(
        (m) => m.status === "pending" || m.status === "in_progress"
      ),
    [matches]
  );

  const completedMatches = useMemo(
    () =>
      matches
        .filter((m) => m.status === "completed")
        .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)),
    [matches]
  );

  const championStreak = getCurrentChampionStreak(state);

  const handleMatchClick = () => {
    if (currentMatch && onMatchClick) {
      onMatchClick(currentMatch);
    }
  };

  // Build leaderboard sorted by champion count, then matches played
  const leaderboard = useMemo(() => {
    return [...state.teamStatuses]
      .map((status) => ({
        ...status,
        championCount: getChampionCount(state, status.teamId),
      }))
      .sort((a, b) => {
        if (b.championCount !== a.championCount) {
          return b.championCount - a.championCount;
        }
        return b.matchesPlayed - a.matchesPlayed;
      });
  }, [state]);

  return (
    <div className="space-y-6">
      {/* Endless Mode Banner */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-card/30 rounded-lg py-2 px-4">
        <RefreshCw className="w-4 h-4 animate-spin-slow" />
        <span>True Endless Mode - Win 2 in a row → Champion → Back to queue!</span>
      </div>

      {/* Current Match */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            {currentMatch ? (
              <>
                <Play className="w-5 h-5 text-primary" />
                Current Match
              </>
            ) : (
              <>
                <Clock className="w-5 h-5 text-muted-foreground" />
                Waiting for Match
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentMatch ? (
            <div
              className="flex items-center justify-center gap-6 py-4 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleMatchClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleMatchClick();
                }
              }}
            >
              {/* Home Team */}
              <div className="text-center flex-1">
                <div
                  className="w-16 h-16 mx-auto mb-2 rounded-xl flex items-center justify-center relative"
                  style={{
                    background: `linear-gradient(135deg, ${getTeamColor(currentMatch.homeTeamId)}, ${getTeamColor(currentMatch.homeTeamId)}cc)`,
                  }}
                >
                  <Users className="w-8 h-8 text-white" />
                  {state.currentChampionId === currentMatch.homeTeamId && championStreak > 0 && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                      <Flame className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <p className="font-semibold">{getTeamName(currentMatch.homeTeamId)}</p>
                {state.currentChampionId === currentMatch.homeTeamId && championStreak > 0 && (
                  <p className="text-xs text-amber-500 font-medium">
                    🔥 {championStreak} win{championStreak > 1 ? "s" : ""} - 1 more = champion!
                  </p>
                )}
                {getChampionCount(state, currentMatch.homeTeamId) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    👑 ×{getChampionCount(state, currentMatch.homeTeamId)}
                  </p>
                )}
              </div>

              {/* VS */}
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">VS</div>
                <Button size="sm" className="mt-2 gap-1">
                  <Play className="w-4 h-4" />
                  Play
                </Button>
              </div>

              {/* Away Team */}
              <div className="text-center flex-1">
                <div
                  className="w-16 h-16 mx-auto mb-2 rounded-xl flex items-center justify-center relative"
                  style={{
                    background: `linear-gradient(135deg, ${getTeamColor(currentMatch.awayTeamId)}, ${getTeamColor(currentMatch.awayTeamId)}cc)`,
                  }}
                >
                  <Users className="w-8 h-8 text-white" />
                  {state.currentChampionId === currentMatch.awayTeamId && championStreak > 0 && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                      <Flame className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <p className="font-semibold">{getTeamName(currentMatch.awayTeamId)}</p>
                {state.currentChampionId === currentMatch.awayTeamId && championStreak > 0 && (
                  <p className="text-xs text-amber-500 font-medium">
                    🔥 {championStreak} win{championStreak > 1 ? "s" : ""} - 1 more = champion!
                  </p>
                )}
                {getChampionCount(state, currentMatch.awayTeamId) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    👑 ×{getChampionCount(state, currentMatch.awayTeamId)}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No active match
            </div>
          )}
        </CardContent>
      </Card>

      {/* Queue */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-blue-500" />
            Queue ({state.queue.length} waiting)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {state.queue.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              All teams are on court!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {state.queue.map((teamId, index) => {
                const teamStatus = state.teamStatuses.find((s) => s.teamId === teamId);
                const champCount = getChampionCount(state, teamId);

                return (
                  <div
                    key={`${teamId}-${index}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border/50"
                  >
                    <span className="text-xs text-muted-foreground font-medium w-5">
                      #{index + 1}
                    </span>
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${getTeamColor(teamId)}, ${getTeamColor(teamId)}cc)`,
                      }}
                    >
                      <Users className="w-3 h-3 text-white" />
                    </div>
                    <span className="font-medium text-sm">{getTeamName(teamId)}</span>
                    {champCount > 0 && (
                      <span className="text-xs text-amber-500 font-medium">
                        👑×{champCount}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leaderboard */}
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
              const isOnCourt = !state.queue.includes(status.teamId);
              
              return (
                <div
                  key={status.teamId}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg
                    ${index === 0 && champCount > 0 ? "bg-amber-500/20 border border-amber-500/30" : "bg-card border border-border/50"}
                    ${isOnCourt ? "ring-2 ring-primary/30" : ""}
                  `}
                >
                  {/* Rank */}
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                    ${index === 0 && champCount > 0 ? "bg-amber-500 text-white" : ""}
                    ${index === 1 && champCount > 0 ? "bg-slate-400 text-white" : ""}
                    ${index === 2 && champCount > 0 ? "bg-amber-700 text-white" : ""}
                    ${(index > 2 || champCount === 0) ? "bg-card text-muted-foreground" : ""}
                  `}>
                    {index + 1}
                  </div>

                  {/* Team */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${getTeamColor(status.teamId)}, ${getTeamColor(status.teamId)}cc)`,
                    }}
                  >
                    <Users className="w-4 h-4 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium truncate ${index === 0 && champCount > 0 ? "text-amber-500" : ""}`}>
                        {getTeamName(status.teamId)}
                      </p>
                      {isOnCourt && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          On Court
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

      {/* Match History */}
      {completedMatches.length > 0 && (
        <Card className="border-border/50 bg-card/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Match History ({completedMatches.length} matches)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {completedMatches.slice(0, 20).map((match, index) => {
                const homeWon = match.winnerId === match.homeTeamId;

                return (
                  <div
                    key={match.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/50"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs text-muted-foreground w-8 flex-shrink-0">
                        #{completedMatches.length - index}
                      </span>
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getTeamColor(match.homeTeamId) }}
                      />
                      <span className={`truncate ${homeWon ? "font-semibold text-emerald-500" : "text-muted-foreground"}`}>
                        {getTeamName(match.homeTeamId)}
                      </span>
                    </div>

                    <span className="font-bold tabular-nums px-3 flex-shrink-0">
                      {match.homeScore} - {match.awayScore}
                    </span>

                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                      <span className={`truncate ${!homeWon ? "font-semibold text-emerald-500" : "text-muted-foreground"}`}>
                        {getTeamName(match.awayTeamId)}
                      </span>
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getTeamColor(match.awayTeamId) }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
