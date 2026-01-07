"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Trophy, Clock, Play, RotateCw } from "lucide-react";
import { getTeamsByStatus, getSessionMatchCount } from "@/lib/twoMatchRotation";
import type {
  Match,
  PersistentTeam,
  TwoMatchRotationState,
} from "@/types/game";

interface TwoMatchRotationViewProps {
  state: TwoMatchRotationState;
  matches: Match[];
  teams: PersistentTeam[];
  onMatchClick?: (match: Match) => void;
}

export const TwoMatchRotationView = ({
  state,
  matches,
  teams,
  onMatchClick,
}: TwoMatchRotationViewProps) => {
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

  const { inQueue, leaderboard } = useMemo(
    () => getTeamsByStatus(state),
    [state]
  );

  // Get active matches - ONE match per court where both teams match the court's teams
  const activeMatches = useMemo(() => {
    const result: Match[] = [];
    const seenCourts = new Set<number>();

    // For each court, find the most recent pending/in_progress match for those teams
    state.courts.forEach((court) => {
      const [team1, team2] = court.teamIds;

      // Find matches where both teams are exactly the ones on this court
      const courtMatches = matches.filter((m) => {
        const isActiveStatus =
          m.status === "pending" || m.status === "in_progress";
        const teamsMatch =
          (m.homeTeamId === team1 && m.awayTeamId === team2) ||
          (m.homeTeamId === team2 && m.awayTeamId === team1);
        return isActiveStatus && teamsMatch;
      });

      // Only take the most recent one (by createdAt or id)
      if (courtMatches.length > 0 && !seenCourts.has(court.courtNumber)) {
        // Sort by createdAt descending, take the most recent
        const sortedMatches = courtMatches.sort(
          (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
        );
        result.push(sortedMatches[0]);
        seenCourts.add(court.courtNumber);
      }
    });

    return result;
  }, [matches, state.courts]);

  const completedMatches = useMemo(
    () =>
      matches
        .filter((m) => m.status === "completed")
        .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)),
    [matches]
  );

  const handleMatchClick = (match: Match) => {
    if (onMatchClick) {
      onMatchClick(match);
    }
  };

  const getSessionDisplay = (
    teamId: string,
    court: (typeof state.courts)[0] | undefined
  ) => {
    const sessionMatches = getSessionMatchCount(state, teamId);
    if (court?.isFirstMatch) {
      return "First match";
    }
    return `${sessionMatches}/2 matches`;
  };

  // Get court info for a match
  const getCourtForMatch = (match: Match) => {
    return state.courts.find(
      (c) =>
        c.teamIds.includes(match.homeTeamId) &&
        c.teamIds.includes(match.awayTeamId)
    );
  };

  // Check if a team is on any court
  const isTeamOnCourt = (teamId: string) => {
    return state.courts.some((c) => c.teamIds.includes(teamId));
  };

  return (
    <div className="space-y-6">
      {/* Mode Banner */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-card/30 rounded-lg py-2 px-4">
        <RotateCw className="w-4 h-4" />
        <span>
          2 Match Rotation • {state.numberOfCourts} Court
          {state.numberOfCourts > 1 ? "s" : ""} • Play 2 matches then rotate
        </span>
      </div>

      {/* Active Courts / Matches */}
      {activeMatches.length > 0 ? (
        <div
          className={`grid gap-4 ${
            activeMatches.length > 1 ? "md:grid-cols-2" : ""
          }`}
        >
          {activeMatches.map((match) => {
            const court = getCourtForMatch(match);

            return (
              <Card
                key={match.id}
                className="border-primary/30 bg-linear-to-br from-primary/5 to-primary/10"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                      <Play className="w-5 h-5 text-primary" />
                      Court {court?.courtNumber || match.position}
                    </div>
                    {court?.isFirstMatch && (
                      <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-1 rounded-full">
                        First Match
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="flex items-center justify-center gap-4 py-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleMatchClick(match)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleMatchClick(match);
                      }
                    }}
                    aria-label={`Click to play match on Court ${
                      court?.courtNumber || match.position
                    }`}
                  >
                    {/* Home Team */}
                    <div className="text-center flex-1">
                      <div
                        className="w-14 h-14 mx-auto mb-2 rounded-xl flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${getTeamColor(
                            match.homeTeamId
                          )}, ${getTeamColor(match.homeTeamId)}cc)`,
                        }}
                      >
                        <Users className="w-7 h-7 text-white" />
                      </div>
                      <p className="font-semibold text-sm">
                        {getTeamName(match.homeTeamId)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getSessionDisplay(match.homeTeamId, court)}
                      </p>
                    </div>

                    {/* VS */}
                    <div className="text-center">
                      <div className="text-xl font-bold text-muted-foreground">
                        VS
                      </div>
                      <Button size="sm" className="mt-2 gap-1">
                        <Play className="w-4 h-4" />
                        Play
                      </Button>
                    </div>

                    {/* Away Team */}
                    <div className="text-center flex-1">
                      <div
                        className="w-14 h-14 mx-auto mb-2 rounded-xl flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${getTeamColor(
                            match.awayTeamId
                          )}, ${getTeamColor(match.awayTeamId)}cc)`,
                        }}
                      >
                        <Users className="w-7 h-7 text-white" />
                      </div>
                      <p className="font-semibold text-sm">
                        {getTeamName(match.awayTeamId)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getSessionDisplay(match.awayTeamId, court)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-border/50 bg-card/30">
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No active matches</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queue */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-blue-500" />
            Queue ({inQueue.length} waiting)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              All teams are on court!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {inQueue.map((status, index) => (
                <div
                  key={`${status.teamId}-${index}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border/50"
                >
                  <span className="text-xs text-muted-foreground font-medium w-5">
                    #{index + 1}
                  </span>
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${getTeamColor(
                        status.teamId
                      )}, ${getTeamColor(status.teamId)}cc)`,
                    }}
                  >
                    <Users className="w-3 h-3 text-white" />
                  </div>
                  <span className="font-medium text-sm">
                    {getTeamName(status.teamId)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({status.totalWins}W/{status.totalLosses}L)
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="w-5 h-5 text-amber-500" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leaderboard.map((status, index) => {
                const onCourt = isTeamOnCourt(status.teamId);
                const winRate =
                  status.totalMatches > 0
                    ? Math.round((status.totalWins / status.totalMatches) * 100)
                    : 0;

                return (
                  <div
                    key={status.teamId}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg
                      ${
                        index === 0
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
                      ${index === 0 ? "bg-amber-500 text-white" : ""}
                      ${index === 1 ? "bg-slate-400 text-white" : ""}
                      ${index === 2 ? "bg-amber-700 text-white" : ""}
                      ${index > 2 ? "bg-card text-muted-foreground" : ""}
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
                            index === 0 ? "text-amber-500" : ""
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
                        {status.totalMatches} matches • {winRate}% win rate
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-500 font-bold">
                          {status.totalWins}W
                        </span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-red-400 font-medium">
                          {status.totalLosses}L
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Match History */}
      {completedMatches.length > 0 && (
        <Card className="border-border/50 bg-card/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              Match History ({completedMatches.length} matches)
            </CardTitle>
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
                      <span className="text-xs text-muted-foreground w-8 shrink-0">
                        #{completedMatches.length - index}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        C{match.position}
                      </span>
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{
                          backgroundColor: getTeamColor(match.homeTeamId),
                        }}
                      />
                      <span
                        className={`truncate ${
                          homeWon
                            ? "font-semibold text-emerald-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        {getTeamName(match.homeTeamId)}
                      </span>
                    </div>

                    <span className="font-bold tabular-nums px-3 shrink-0">
                      {match.homeScore} - {match.awayScore}
                    </span>

                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                      <span
                        className={`truncate ${
                          !homeWon
                            ? "font-semibold text-emerald-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        {getTeamName(match.awayTeamId)}
                      </span>
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{
                          backgroundColor: getTeamColor(match.awayTeamId),
                        }}
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
