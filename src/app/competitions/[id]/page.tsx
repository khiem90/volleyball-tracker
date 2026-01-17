"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { CreateSessionDialog } from "@/components/CreateSessionDialog";
import { CompetitionNotFound } from "@/components/competition-detail/CompetitionNotFound";
import { CompetitionHeader } from "@/components/competition-detail/CompetitionHeader";
import { CompetitionWinnerBanner } from "@/components/competition-detail/CompetitionWinnerBanner";
import { CompetitionStats } from "@/components/competition-detail/CompetitionStats";
import { CompetitionDraftTeams } from "@/components/competition-detail/CompetitionDraftTeams";
import { CompetitionRoundRobinSection } from "@/components/competition-detail/CompetitionRoundRobinSection";
import { StartCompetitionDialog } from "@/components/competition-detail/StartCompetitionDialog";
import { MatchActionDialog } from "@/components/competition-detail/MatchActionDialog";
import { EndCompetitionDialog } from "@/components/competition-detail/EndCompetitionDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Trophy,
} from "lucide-react";
import { EditMatchDialog } from "@/components/EditMatchDialog";
import { useCompetitionDetailPage } from "@/hooks/useCompetitionDetailPage";

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

const typeLabels: Record<string, string> = {
  round_robin: "Round Robin",
  single_elimination: "Single Elimination",
  double_elimination: "Double Elimination",
  win2out: "Win 2 & Out",
  two_match_rotation: "2 Match Rotation",
};

export default function CompetitionDetailPage() {
  const {
    canEdit,
    competition,
    competitionTeams,
    completedMatches,
    editingMatch,
    handleMatchClick,
    handlePlayMatch,
    handleStartCompetition,
    handleEndCompetition,
    inProgressMatches,
    isSharedMode,
    isCreator,
    isEndingCompetition,
    matches,
    pendingMatches,
    roundRobinMatches,
    selectedMatch,
    setEditingMatch,
    setSelectedMatch,
    setShowCreateSession,
    setShowStartConfirm,
    setShowEndConfirm,
    showCreateSession,
    showStartConfirm,
    showEndConfirm,
    standings,
    totalProgress,
    winner,
  } = useCompetitionDetailPage();

  if (!competition) {
    return <CompetitionNotFound />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link href="/competitions">
          <Button
            variant="ghost"
            className="mb-6 gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Competitions
          </Button>
        </Link>

        {/* Header */}
        <CompetitionHeader
          competition={competition}
          typeLabel={typeLabels[competition.type]}
          isSharedMode={isSharedMode}
          isCreator={isCreator}
          onShowStartConfirm={() => setShowStartConfirm(true)}
          onShowCreateSession={() => setShowCreateSession(true)}
          onShowEndConfirm={() => setShowEndConfirm(true)}
        />

        <CompetitionWinnerBanner winner={winner} />

        <CompetitionStats
          status={competition.status}
          completedMatches={completedMatches}
          inProgressMatches={inProgressMatches}
          pendingMatches={pendingMatches}
          matchesCount={matches.length}
          totalProgress={totalProgress}
        />

        {competition.status === "draft" && (
          <CompetitionDraftTeams teams={competitionTeams} />
        )}

        {/* Round Robin - Show standings and matches */}
        {competition.status !== "draft" &&
          competition.type === "round_robin" &&
          standings && (
            <CompetitionRoundRobinSection
              standings={standings}
              teams={competitionTeams}
              matches={roundRobinMatches}
              canEdit={canEdit}
              onMatchClick={handleMatchClick}
              onEditMatch={setEditingMatch}
            />
          )}

        {/* Single Elimination Bracket */}
        {competition.status !== "draft" &&
          competition.type === "single_elimination" && (
            <Card className="border-border/40 bg-card/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  Tournament Bracket
                </CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4">
                <Bracket
                  matches={matches}
                  teams={competitionTeams}
                  totalTeams={competition.teamIds.length}
                  onMatchClick={handleMatchClick}
                  onEditMatch={canEdit ? setEditingMatch : undefined}
                />
              </CardContent>
            </Card>
          )}

        {/* Double Elimination Bracket */}
        {competition.status !== "draft" &&
          competition.type === "double_elimination" && (
            <Card className="border-border/40 bg-card/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  Tournament Bracket
                </CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4">
                <DoubleBracket
                  matches={matches}
                  teams={competitionTeams}
                  totalTeams={competition.teamIds.length}
                  onMatchClick={handleMatchClick}
                  onEditMatch={canEdit ? setEditingMatch : undefined}
                />
              </CardContent>
            </Card>
          )}

        {/* Win 2 & Out View */}
        {competition.status !== "draft" &&
          competition.type === "win2out" &&
          competition.win2outState && (
            <Win2OutView
              state={competition.win2outState}
              matches={matches}
              teams={competitionTeams}
              competition={competition}
              onMatchClick={handleMatchClick}
            />
          )}

        {/* Two Match Rotation View */}
        {competition.status !== "draft" &&
          competition.type === "two_match_rotation" &&
          competition.twoMatchRotationState && (
            <TwoMatchRotationView
              state={competition.twoMatchRotationState}
              matches={matches}
              teams={competitionTeams}
              competition={competition}
              onMatchClick={handleMatchClick}
            />
          )}
      </main>

      {/* Start Competition Confirmation */}
      <StartCompetitionDialog
        open={showStartConfirm}
        onOpenChange={setShowStartConfirm}
        typeLabel={typeLabels[competition.type]}
        teamCount={competition.teamIds.length}
        onStart={handleStartCompetition}
      />

      {/* Match Action Dialog */}
      <MatchActionDialog
        open={!!selectedMatch}
        onOpenChange={(open) => !open && setSelectedMatch(null)}
        match={selectedMatch}
        teams={competitionTeams}
        onPlayMatch={handlePlayMatch}
      />

      {/* Create Session Dialog */}
      <CreateSessionDialog
        open={showCreateSession}
        onOpenChange={setShowCreateSession}
        defaultName={competition?.name}
        competitionData={
          competition
            ? {
                competition,
                teams: competitionTeams,
                matches,
              }
            : undefined
        }
      />

      {/* End Competition Confirmation Dialog */}
      <EndCompetitionDialog
        open={showEndConfirm}
        onOpenChange={setShowEndConfirm}
        isEnding={isEndingCompetition}
        onEndCompetition={handleEndCompetition}
      />

      {/* Edit Match Dialog */}
      <EditMatchDialog
        open={!!editingMatch}
        onOpenChange={(open) => !open && setEditingMatch(null)}
        match={editingMatch}
        matches={matches}
        teams={competitionTeams}
        competition={competition}
      />
    </div>
  );
}
