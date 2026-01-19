"use client";

import { useMemo, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, RefreshCw } from "lucide-react";
import {
  getTeamsByStatus,
  getCurrentChampionStreak,
  getChampionCount,
  processMatchResult,
} from "@/lib/win2out";
import { useApp } from "@/context/AppContext";
import type { MatchStatus } from "@/types/game";
import { useTeamsMap } from "@/hooks/useTeamsMap";
import { EditMatchDialog } from "@/components/EditMatchDialog";
import { EditQueueDialog } from "@/components/EditQueueDialog";
import {
  ActiveCourtCard,
  TeamQueueSection,
  TeamLeaderboard,
  MatchHistorySection,
} from "@/components/rotation-views";
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
  const { canEdit, completeMatchWithNextMatch, startMatch, updateMatchScore } = useApp();
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [showEditQueue, setShowEditQueue] = useState(false);
  const canPlayMatch = canEdit && Boolean(onMatchClick);

  // Instant win handler
  const handleInstantWin = useCallback(
    (winnerId: string, match: Match) => {
      if (!competition || !canEdit) return;

      // Determine scores (winner gets 25, loser gets 0)
      const homeScore = winnerId === match.homeTeamId ? 25 : 0;
      const awayScore = winnerId === match.awayTeamId ? 25 : 0;

      // Ensure match is started first if pending
      if (match.status === "pending") {
        startMatch(match.id);
      }

      // Update the match score first
      updateMatchScore(match.id, homeScore, awayScore);

      // Create the completed match object for processing
      const completedMatch: Match = {
        ...match,
        homeScore,
        awayScore,
        winnerId,
        status: "completed" as MatchStatus,
        completedAt: Date.now(),
      };

      // Process the result to get updated state and next match
      const { updatedState, nextMatch } = processMatchResult(
        state,
        completedMatch
      );

      // Update competition with new state
      const updatedCompetition = {
        ...competition,
        win2outState: updatedState,
      };

      // Complete match and set up next match
      completeMatchWithNextMatch(
        match.id,
        winnerId,
        updatedCompetition,
        nextMatch
      );
    },
    [competition, canEdit, state, completeMatchWithNextMatch, startMatch, updateMatchScore]
  );

  const { getTeamName, getTeamColor } = useTeamsMap(teams);

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

  // Get court info for a match
  const getCourtForMatch = useCallback(
    (match: Match) => {
      return state.courts.find(
        (c) =>
          c.teamIds.includes(match.homeTeamId) &&
          c.teamIds.includes(match.awayTeamId)
      );
    },
    [state.courts]
  );

  // Check if a team is on any court
  const isTeamOnCourt = useCallback(
    (teamId: string) => {
      return state.courts.some((c) => c.teamIds.includes(teamId));
    },
    [state.courts]
  );

  // Get team's streak by finding their court
  const getTeamStreak = useCallback(
    (teamId: string) => {
      const court = state.courts.find((c) => c.teamIds.includes(teamId));
      if (court?.currentChampionId === teamId) {
        return getCurrentChampionStreak(state, court.courtNumber);
      }
      return 0;
    },
    [state]
  );

  // Build leaderboard sorted by champion count, then matches played
  const leaderboard = useMemo(() => {
    return [...state.teamStatuses]
      .map((status) => ({
        teamId: status.teamId,
        championCount: getChampionCount(state, status.teamId),
        matchesPlayed: status.matchesPlayed,
      }))
      .sort((a, b) => {
        if (b.championCount !== a.championCount) {
          return b.championCount - a.championCount;
        }
        return b.matchesPlayed - a.matchesPlayed;
      });
  }, [state]);

  // Transform queue for TeamQueueSection
  const queueWithChampionCount = useMemo(() => {
    return inQueue.map((status) => ({
      teamId: status.teamId,
      championCount: getChampionCount(state, status.teamId),
    }));
  }, [inQueue, state]);

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
            return (
              <ActiveCourtCard
                key={match.id}
                match={match}
                courtNumber={court?.courtNumber || match.position}
                homeStreak={getTeamStreak(match.homeTeamId)}
                awayStreak={getTeamStreak(match.awayTeamId)}
                homeChampionCount={getChampionCount(state, match.homeTeamId)}
                awayChampionCount={getChampionCount(state, match.awayTeamId)}
                getTeamName={getTeamName}
                getTeamColor={getTeamColor}
                canEdit={canEdit}
                canPlayMatch={canPlayMatch}
                instantWinEnabled={competition?.instantWinEnabled}
                onMatchClick={onMatchClick}
                onEditMatch={setEditingMatch}
                onInstantWin={(winnerId) => handleInstantWin(winnerId, match)}
              />
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
      <TeamQueueSection
        queue={queueWithChampionCount}
        getTeamName={getTeamName}
        getTeamColor={getTeamColor}
        canEdit={canEdit}
        onEditQueue={() => setShowEditQueue(true)}
      />

      {/* Leaderboard */}
      <TeamLeaderboard
        leaderboard={leaderboard}
        getTeamName={getTeamName}
        getTeamColor={getTeamColor}
        isTeamOnCourt={isTeamOnCourt}
      />

      {/* Match History */}
      <MatchHistorySection
        matches={completedMatches}
        getTeamName={getTeamName}
        getTeamColor={getTeamColor}
      />

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
