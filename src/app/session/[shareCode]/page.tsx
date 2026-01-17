"use client";

import dynamic from "next/dynamic";
import { SessionAuth } from "@/components/SessionAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSessionPage } from "@/hooks/useSessionPage";

// Lazy load tournament view components - only one is rendered based on competition type
const Bracket = dynamic(
  () => import("@/components/Bracket").then((mod) => ({ default: mod.Bracket })),
  { ssr: false }
);
const DoubleBracket = dynamic(
  () => import("@/components/DoubleBracket").then((mod) => ({ default: mod.DoubleBracket })),
  { ssr: false }
);
const Win2OutView = dynamic(
  () => import("@/components/Win2OutView").then((mod) => ({ default: mod.Win2OutView })),
  { ssr: false }
);
const TwoMatchRotationView = dynamic(
  () => import("@/components/TwoMatchRotationView").then((mod) => ({ default: mod.TwoMatchRotationView })),
  { ssr: false }
);
import { SessionHeader } from "@/components/session/SessionHeader";
import { SessionCompetitionInfo } from "@/components/session/SessionCompetitionInfo";
import { SessionStatsGrid } from "@/components/session/SessionStatsGrid";
import { SessionRoundRobinStandings } from "@/components/session/SessionRoundRobinStandings";
import { SessionLiveMatches } from "@/components/session/SessionLiveMatches";
import { SessionViewerNotice } from "@/components/session/SessionViewerNotice";
import { SessionNotConfigured } from "@/components/session/SessionNotConfigured";
import { SessionLoadingState } from "@/components/session/SessionLoadingState";
import { SessionErrorState } from "@/components/session/SessionErrorState";

export default function SessionPage() {
  const {
    canEdit,
    competition,
    completedMatches,
    error,
    handleLeaveSession,
    handleMatchClick,
    inProgressMatches,
    isConfigured,
    isCreator,
    isLoading,
    matches,
    pendingMatches,
    role,
    session,
    setShowAuth,
    shareCode,
    showAuth,
    standings,
    teams,
    teamsMap,
    user,
  } = useSessionPage();

  // Loading state
  if (!isConfigured) {
    return <SessionNotConfigured />;
  }

  if (isLoading) {
    return <SessionLoadingState />;
  }

  if (error || !session) {
    return <SessionErrorState error={error} shareCode={shareCode} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <SessionHeader
        sessionName={session.name}
        shareCode={session.shareCode}
        role={role}
        user={user}
        isCreator={isCreator}
        onShowAuth={() => setShowAuth(true)}
        onLeaveSession={handleLeaveSession}
      />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Competition Info */}
        {competition && (
          <SessionCompetitionInfo competition={competition} teamsCount={teams.length} />
        )}

        {/* Stats */}
        <SessionStatsGrid
          upcomingCount={pendingMatches.length + inProgressMatches.length}
          liveCount={inProgressMatches.length}
          completedCount={completedMatches.length}
        />

        {/* Competition-specific Views */}
        {competition && (
          <>
            {/* Bracket for elimination tournaments */}
            {competition.type === "single_elimination" && (
              <Card>
                <CardHeader>
                  <CardTitle>Bracket</CardTitle>
                </CardHeader>
                <CardContent>
                  <Bracket
                    matches={matches.filter((m) => m.competitionId === competition.id)}
                    teams={teams}
                    totalTeams={competition.teamIds.length}
                    onMatchClick={canEdit ? handleMatchClick : undefined}
                  />
                </CardContent>
              </Card>
            )}

            {competition.type === "double_elimination" && (
              <Card>
                <CardHeader>
                  <CardTitle>Bracket</CardTitle>
                </CardHeader>
                <CardContent>
                  <DoubleBracket
                    matches={matches.filter((m) => m.competitionId === competition.id)}
                    teams={teams}
                    totalTeams={competition.teamIds.length}
                    onMatchClick={canEdit ? handleMatchClick : undefined}
                  />
                </CardContent>
              </Card>
            )}

            {/* Round Robin Standings */}
            {competition.type === "round_robin" && standings && (
              <SessionRoundRobinStandings
                standings={standings}
                teamsMap={teamsMap}
              />
            )}

            {/* Win 2 Out View */}
            {competition.type === "win2out" && competition.win2outState && (
                <Win2OutView
                  state={competition.win2outState}
                  teams={teams}
                  matches={matches}
                  competition={competition}
                  onMatchClick={canEdit ? handleMatchClick : undefined}
                />
            )}

            {/* Two Match Rotation View */}
            {competition.type === "two_match_rotation" && competition.twoMatchRotationState && (
                <TwoMatchRotationView
                  state={competition.twoMatchRotationState}
                  teams={teams}
                  matches={matches}
                  competition={competition}
                  onMatchClick={canEdit ? handleMatchClick : undefined}
                />
            )}
          </>
        )}

        {/* Live Matches */}
        <SessionLiveMatches
          matches={inProgressMatches}
          teamsMap={teamsMap}
          canEdit={canEdit}
          onMatchClick={handleMatchClick}
        />

        {/* Viewer message */}
        <SessionViewerNotice
          role={role}
          user={user}
          onShowAuth={() => setShowAuth(true)}
        />
      </main>

      <SessionAuth
        open={showAuth}
        onOpenChange={setShowAuth}
        onSuccess={() => {}}
      />

    </div>
  );
}

