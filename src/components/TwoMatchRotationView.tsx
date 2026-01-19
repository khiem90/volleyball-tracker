"use client";

import { useMemo, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, RotateCw } from "lucide-react";
import { getTeamsByStatus, getSessionMatchCount, processMatchResult } from "@/lib/twoMatchRotation";
import { useApp } from "@/context/AppContext";
import type { MatchStatus } from "@/types/game";
import { useTeamsMap } from "@/hooks/useTeamsMap";
import { useTerminology, capitalize } from "@/hooks/useTerminology";
import { EditMatchDialog } from "@/components/EditMatchDialog";
import { EditQueueDialog } from "@/components/EditQueueDialog";
import {
  TwoMatchCourtCard,
  TwoMatchQueueSection,
  TwoMatchLeaderboard,
  MatchHistorySection,
} from "@/components/rotation-views";
import type {
  Match,
  PersistentTeam,
  TwoMatchRotationState,
  Competition,
} from "@/types/game";

interface TwoMatchRotationViewProps {
  state: TwoMatchRotationState;
  matches: Match[];
  teams: PersistentTeam[];
  competition?: Competition | null;
  onMatchClick?: (match: Match) => void;
}

export const TwoMatchRotationView = ({
  state,
  matches,
  teams,
  competition,
  onMatchClick,
}: TwoMatchRotationViewProps) => {
  const { canEdit, completeMatchWithNextMatch, startMatch, updateMatchScore } = useApp();
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [showEditQueue, setShowEditQueue] = useState(false);
  const canPlayMatch = canEdit && Boolean(onMatchClick);

  const { getTeamName, getTeamColor } = useTeamsMap(teams);

  // Get dynamic terminology from competition config
  const terminology = useTerminology(competition?.id);
  const venueName = terminology.venue;
  const venueNameCapitalized = capitalize(venueName);

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
        twoMatchRotationState: updatedState,
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

  const { inQueue, leaderboard } = useMemo(
    () => getTeamsByStatus(state),
    [state]
  );

  // Get active matches - ONE match per court where both teams match the court's teams
  const activeMatches = useMemo(() => {
    const result: Match[] = [];
    const seenCourts = new Set<number>();

    state.courts.forEach((court) => {
      const [team1, team2] = court.teamIds;

      const courtMatches = matches.filter((m) => {
        const isActiveStatus =
          m.status === "pending" || m.status === "in_progress";
        const teamsMatch =
          (m.homeTeamId === team1 && m.awayTeamId === team2) ||
          (m.homeTeamId === team2 && m.awayTeamId === team1);
        return isActiveStatus && teamsMatch;
      });

      if (courtMatches.length > 0 && !seenCourts.has(court.courtNumber)) {
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

  const getSessionDisplay = useCallback(
    (teamId: string, court: (typeof state.courts)[0] | undefined) => {
      const sessionMatches = getSessionMatchCount(state, teamId);
      if (court?.isFirstMatch) {
        return "First match";
      }
      return `${sessionMatches}/2 matches`;
    },
    [state]
  );

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

  const isTeamOnCourt = useCallback(
    (teamId: string) => {
      return state.courts.some((c) => c.teamIds.includes(teamId));
    },
    [state.courts]
  );

  const handleEditMatch = useCallback((match: Match) => {
    setEditingMatch(match);
  }, []);

  const handleEditQueue = useCallback(() => {
    setShowEditQueue(true);
  }, []);

  return (
    <div className="space-y-6">
      {/* Mode Banner */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-card/30 rounded-lg py-2 px-4">
        <RotateCw className="w-4 h-4" />
        <span>
          2 Match Rotation • {state.numberOfCourts} {venueNameCapitalized}
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
              <TwoMatchCourtCard
                key={match.id}
                match={match}
                courtNumber={court?.courtNumber || match.position}
                venueName={venueName}
                isFirstMatch={court?.isFirstMatch}
                homeSessionDisplay={getSessionDisplay(match.homeTeamId, court)}
                awaySessionDisplay={getSessionDisplay(match.awayTeamId, court)}
                getTeamName={getTeamName}
                getTeamColor={getTeamColor}
                canEdit={canEdit}
                canPlayMatch={canPlayMatch}
                instantWinEnabled={competition?.instantWinEnabled}
                onMatchClick={onMatchClick}
                onEditMatch={handleEditMatch}
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
      <TwoMatchQueueSection
        queue={inQueue}
        getTeamName={getTeamName}
        getTeamColor={getTeamColor}
        canEdit={canEdit}
        onEditQueue={handleEditQueue}
        venueName={venueName}
      />

      {/* Leaderboard */}
      <TwoMatchLeaderboard
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
