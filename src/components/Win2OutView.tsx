"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Clock,
  Flame,
  Play,
  RefreshCw,
  Crown,
  Pencil,
  Settings2,
} from "lucide-react";
import {
  getTeamsByStatus,
  getCurrentChampionStreak,
  getChampionCount,
} from "@/lib/win2out";
import { useApp } from "@/context/AppContext";
import { EditMatchDialog } from "@/components/EditMatchDialog";
import { EditQueueDialog } from "@/components/EditQueueDialog";
import type {
  Match,
  PersistentTeam,
  Win2OutState,
  Competition,
} from "@/types/game";

interface Win2OutViewProps {
  state: Win2OutState;
  matches: Match[];
  teams: PersistentTeam[];
  competition?: Competition | null;
  onMatchClick?: (match: Match) => void;
}

export const Win2OutView = ({
  state,
  matches,
  teams,
  competition,
  onMatchClick,
}: Win2OutViewProps) => {
  const { canEdit } = useApp();
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [showEditQueue, setShowEditQueue] = useState(false);

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

  const { inQueue } = useMemo(() => getTeamsByStatus(state), [state]);

  // Get active matches (pending or in_progress) - one per court potentially
  const activeMatches = useMemo(
    () =>
      matches.filter(
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

  const handleMatchClick = (match: Match) => {
    if (onMatchClick) {
      onMatchClick(match);
    }
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

  // Get team's streak by finding their court
  const getTeamStreak = (teamId: string) => {
    const court = state.courts.find((c) => c.teamIds.includes(teamId));
    if (court?.currentChampionId === teamId) {
      return getCurrentChampionStreak(state, court.courtNumber);
    }
    return 0;
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
        <span>
          Win 2 & Out • {state.numberOfCourts} Court
          {state.numberOfCourts > 1 ? "s" : ""} • Win 2 in a row → Champion →
          Back to queue!
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
            const homeStreak = getTeamStreak(match.homeTeamId);
            const awayStreak = getTeamStreak(match.awayTeamId);

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
                    {canEdit && match.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMatch(match);
                        }}
                        aria-label="Edit match assignment"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
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
                        className="w-14 h-14 mx-auto mb-2 rounded-xl flex items-center justify-center relative"
                        style={{
                          background: `linear-gradient(135deg, ${getTeamColor(
                            match.homeTeamId
                          )}, ${getTeamColor(match.homeTeamId)}cc)`,
                        }}
                      >
                        <Users className="w-7 h-7 text-white" />
                        {homeStreak > 0 && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                            <Flame className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      <p className="font-semibold text-sm">
                        {getTeamName(match.homeTeamId)}
                      </p>
                      {homeStreak > 0 && (
                        <p className="text-xs text-amber-500 font-medium">
                          🔥 {homeStreak} win - 1 more = crown!
                        </p>
                      )}
                      {getChampionCount(state, match.homeTeamId) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          👑 ×{getChampionCount(state, match.homeTeamId)}
                        </p>
                      )}
                    </div>

                    {/* VS / Score */}
                    <div className="text-center">
                      {match.status === "in_progress" ? (
                        <>
                          <div className="flex items-center justify-center gap-3 mb-2">
                            <span className="text-3xl font-bold tabular-nums text-primary">
                              {match.homeScore}
                            </span>
                            <span className="text-lg text-muted-foreground">
                              :
                            </span>
                            <span className="text-3xl font-bold tabular-nums text-primary">
                              {match.awayScore}
                            </span>
                          </div>
                          <div className="flex items-center justify-center gap-1 text-xs text-amber-500 mb-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            Live
                          </div>
                          <Button size="sm" className="gap-1">
                            <Play className="w-4 h-4" />
                            Continue
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="text-xl font-bold text-muted-foreground">
                            VS
                          </div>
                          <Button size="sm" className="mt-2 gap-1">
                            <Play className="w-4 h-4" />
                            Play
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Away Team */}
                    <div className="text-center flex-1">
                      <div
                        className="w-14 h-14 mx-auto mb-2 rounded-xl flex items-center justify-center relative"
                        style={{
                          background: `linear-gradient(135deg, ${getTeamColor(
                            match.awayTeamId
                          )}, ${getTeamColor(match.awayTeamId)}cc)`,
                        }}
                      >
                        <Users className="w-7 h-7 text-white" />
                        {awayStreak > 0 && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                            <Flame className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      <p className="font-semibold text-sm">
                        {getTeamName(match.awayTeamId)}
                      </p>
                      {awayStreak > 0 && (
                        <p className="text-xs text-amber-500 font-medium">
                          🔥 {awayStreak} win - 1 more = crown!
                        </p>
                      )}
                      {getChampionCount(state, match.awayTeamId) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          👑 ×{getChampionCount(state, match.awayTeamId)}
                        </p>
                      )}
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
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Queue ({inQueue.length} waiting)
            </div>
            {canEdit && inQueue.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-blue-500 hover:text-blue-400"
                onClick={() => setShowEditQueue(true)}
                aria-label="Edit queue order"
              >
                <Settings2 className="w-4 h-4" />
                Reorder
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              All teams are on court!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {inQueue.map((status, index) => {
                const champCount = getChampionCount(state, status.teamId);

                return (
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

      {/* Edit Match Dialog */}
      <EditMatchDialog
        open={!!editingMatch}
        onOpenChange={(open) => !open && setEditingMatch(null)}
        match={editingMatch}
        matches={matches}
        teams={teams}
        competition={competition}
      />

      {/* Edit Queue Dialog */}
      <EditQueueDialog
        open={showEditQueue}
        onOpenChange={setShowEditQueue}
        competition={competition || null}
        teams={teams}
      />
    </div>
  );
};
