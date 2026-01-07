"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Trophy, Clock, Flame, Play, RefreshCw } from "lucide-react";
import { getTeamsByStatus, getCurrentChampionStreak } from "@/lib/win2out";
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

  const { champions, inQueue } = useMemo(
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

  // Calculate total active teams (not champions yet)
  const activeTeamsCount = state.teamStatuses.filter((s) => !s.isEliminated).length;

  return (
    <div className="space-y-6">
      {/* Endless Mode Banner */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-card/30 rounded-lg py-2 px-4">
        <RefreshCw className="w-4 h-4" />
        <span>Endless Mode - Losers go back to the queue</span>
      </div>

      {/* Current Match */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            {state.isComplete ? (
              <>
                <Trophy className="w-5 h-5 text-amber-500" />
                All Teams Crowned!
              </>
            ) : currentMatch ? (
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
                    🔥 {championStreak} win{championStreak > 1 ? "s" : ""} - 1 more to crown!
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
                    🔥 {championStreak} win{championStreak > 1 ? "s" : ""} - 1 more to crown!
                  </p>
                )}
              </div>
            </div>
          ) : state.isComplete ? (
            <div className="text-center py-6">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-amber-500" />
              <p className="text-lg font-semibold text-amber-500">Everyone's a Champion!</p>
              <p className="text-muted-foreground">All {champions.length} teams have won 2 in a row</p>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No active match
            </div>
          )}
        </CardContent>
      </Card>

      {/* Queue - Now more prominent since losers go back here */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-blue-500" />
            Queue ({state.queue.length} waiting)
            {activeTeamsCount > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                • {activeTeamsCount} teams still playing
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {state.queue.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {activeTeamsCount <= 2 ? "All teams are on court or crowned!" : "Queue is empty"}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {state.queue.map((teamId, index) => {
                const teamStatus = state.teamStatuses.find((s) => s.teamId === teamId);
                const matchesPlayed = teamStatus?.matchesPlayed || 0;

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
                    {matchesPlayed > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({matchesPlayed} played)
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Champions */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="w-5 h-5 text-amber-500" />
            Champions ({champions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {champions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Win 2 in a row to become a champion! 🏆
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {champions.map((status, index) => (
                <div
                  key={status.teamId}
                  className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10"
                >
                  <div className="flex items-center justify-center w-6 text-amber-500 font-bold">
                    #{index + 1}
                  </div>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${getTeamColor(status.teamId)}, ${getTeamColor(status.teamId)}cc)`,
                    }}
                  >
                    <Trophy className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-amber-500 truncate">
                      {getTeamName(status.teamId)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {status.matchesPlayed} matches
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Match History */}
      {completedMatches.length > 0 && (
        <Card className="border-border/50 bg-card/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Match History ({completedMatches.length} matches)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {completedMatches.map((match, index) => {
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
