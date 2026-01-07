"use client";

import { useEffect, useMemo, useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { Standings } from "@/components/Standings";
import { Bracket } from "@/components/Bracket";
import { DoubleBracket } from "@/components/DoubleBracket";
import { Win2OutView } from "@/components/Win2OutView";
import { TwoMatchRotationView } from "@/components/TwoMatchRotationView";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Play,
  Trophy,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  Swords,
} from "lucide-react";
import { generateRoundRobinSchedule, calculateStandings } from "@/lib/roundRobin";
import { generateSingleEliminationBracket } from "@/lib/singleElimination";
import { generateDoubleEliminationBracket } from "@/lib/doubleElimination";
import { initializeWin2OutState, generateInitialMatches as generateWin2OutInitialMatches } from "@/lib/win2out";
import { 
  initializeTwoMatchRotationState, 
  generateInitialMatches as generateTwoMatchRotationInitialMatches 
} from "@/lib/twoMatchRotation";
import type { Match } from "@/types/game";

const typeLabels: Record<string, string> = {
  round_robin: "Round Robin",
  single_elimination: "Single Elimination",
  double_elimination: "Double Elimination",
  win2out: "Win 2 & Out",
  two_match_rotation: "2 Match Rotation",
};

export default function CompetitionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const competitionId = params.id as string;

  const {
    state,
    getCompetitionById,
    getMatchesByCompetition,
    addMatches,
    startCompetition,
    updateCompetition,
    completeCompetition,
  } = useApp();

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showStartConfirm, setShowStartConfirm] = useState(false);

  const competition = useMemo(
    () => getCompetitionById(competitionId),
    [getCompetitionById, competitionId]
  );

  const matches = useMemo(
    () => getMatchesByCompetition(competitionId),
    [getMatchesByCompetition, competitionId]
  );

  const competitionTeams = useMemo(() => {
    if (!competition) return [];
    return state.teams.filter((t) => competition.teamIds.includes(t.id));
  }, [competition, state.teams]);

  // Generate matches when competition starts
  const handleStartCompetition = useCallback(() => {
    if (!competition) return;

    let newMatches: Omit<Match, "id" | "createdAt">[] = [];

    switch (competition.type) {
      case "round_robin":
        newMatches = generateRoundRobinSchedule(competition.teamIds, competition.id);
        break;
      case "single_elimination":
        newMatches = generateSingleEliminationBracket(competition.teamIds, competition.id);
        break;
      case "double_elimination":
        newMatches = generateDoubleEliminationBracket(competition.teamIds, competition.id);
        break;
      case "win2out": {
        const numCourts = competition.numberOfCourts || 1;
        const win2outState = initializeWin2OutState(competition.id, competition.teamIds, numCourts);
        const initialMatches = generateWin2OutInitialMatches(competition.id, competition.teamIds, numCourts);
        newMatches = initialMatches;
        
        updateCompetition({
          ...competition,
          win2outState,
          status: "in_progress",
        });
        addMatches(newMatches);
        setShowStartConfirm(false);
        return;
      }
      case "two_match_rotation": {
        const numCourts = competition.numberOfCourts || 1;
        const twoMatchRotationState = initializeTwoMatchRotationState(competition.id, competition.teamIds, numCourts);
        const initialMatches = generateTwoMatchRotationInitialMatches(competition.id, competition.teamIds, numCourts);
        newMatches = initialMatches;
        
        updateCompetition({
          ...competition,
          twoMatchRotationState,
          status: "in_progress",
        });
        addMatches(newMatches);
        setShowStartConfirm(false);
        return;
      }
    }

    addMatches(newMatches);
    startCompetition(competition.id);
    setShowStartConfirm(false);
  }, [competition, addMatches, startCompetition, updateCompetition]);

  // Handle match click for scoring
  const handleMatchClick = useCallback((match: Match) => {
    setSelectedMatch(match);
  }, []);

  // Navigate to match page
  const handlePlayMatch = useCallback(() => {
    if (!selectedMatch) return;
    router.push(`/match/${selectedMatch.id}`);
  }, [selectedMatch, router]);

  // Check if competition is complete
  useEffect(() => {
    if (!competition || competition.status !== "in_progress") return;

    const allMatchesComplete = matches.length > 0 && matches.every((m) => m.status === "completed");

    if (allMatchesComplete) {
      let winnerId: string | undefined;

      if (competition.type === "round_robin") {
        const standings = calculateStandings(competition.teamIds, matches);
        winnerId = standings[0]?.teamId;
      } else {
        const finalMatch = matches.find((m) => {
          if (competition.type === "single_elimination") {
            const totalRounds = Math.log2(competition.teamIds.length);
            return m.round === totalRounds && !m.bracket;
          }
          return m.bracket === "grand_finals";
        });
        winnerId = finalMatch?.winnerId;
      }

      if (winnerId) {
        completeCompetition(competition.id, winnerId);
      }
    }
  }, [competition, matches, completeCompetition]);

  if (!competition) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-muted/50 flex items-center justify-center">
              <Trophy className="w-12 h-12 text-muted-foreground/30" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">Competition not found</h2>
            <p className="text-muted-foreground mb-8">
              This competition may have been deleted.
            </p>
            <Link href="/competitions">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Competitions
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const completedMatches = matches.filter((m) => m.status === "completed").length;
  const inProgressMatches = matches.filter((m) => m.status === "in_progress").length;
  const pendingMatches = matches.filter((m) => m.status === "pending").length;
  const totalProgress = matches.length > 0 ? (completedMatches / matches.length) * 100 : 0;

  const standings = competition.type === "round_robin"
    ? calculateStandings(competition.teamIds, matches)
    : null;

  const winner = competition.winnerId
    ? state.teams.find((t) => t.id === competition.winnerId)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link href="/competitions">
          <Button variant="ghost" className="mb-6 gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Back to Competitions
          </Button>
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-3xl font-bold tracking-tight">{competition.name}</h1>
              <Badge className={`
                ${competition.status === "draft" ? "status-draft" : ""}
                ${competition.status === "in_progress" ? "status-active" : ""}
                ${competition.status === "completed" ? "status-complete" : ""}
              `}>
                {competition.status === "draft" && "Draft"}
                {competition.status === "in_progress" && "Live"}
                {competition.status === "completed" && "Completed"}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-primary" />
                {typeLabels[competition.type]}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {competition.teamIds.length} teams
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {new Date(competition.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {competition.status === "draft" && (
            <Button onClick={() => setShowStartConfirm(true)} className="gap-2 shadow-lg shadow-primary/20" size="lg">
              <Play className="w-5 h-5" />
              Start Competition
            </Button>
          )}
        </div>

        {/* Winner Banner */}
        {winner && (
          <Card className="mb-8 border-amber-500/40 bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent overflow-hidden">
            <div className="h-1 w-full bg-linear-to-r from-amber-500 to-amber-600" />
            <CardContent className="py-6">
              <div className="flex items-center justify-center gap-6">
                <div className="relative">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl"
                    style={{
                      background: `linear-gradient(135deg, ${winner.color || "#f59e0b"}, ${winner.color || "#f59e0b"}99)`,
                    }}
                  >
                    <span className="text-3xl font-bold text-white">
                      {winner.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
                    <Crown className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-amber-500 font-semibold uppercase tracking-wider mb-1">Champion</p>
                  <p className="text-3xl font-bold">{winner.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        {competition.status !== "draft" && (
          <div className="mb-8">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Card className="border-border/40 bg-card/30">
                <CardContent className="py-4 text-center">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
                  <div className="text-2xl font-bold">{completedMatches}</div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Completed</p>
                </CardContent>
              </Card>
              <Card className="border-border/40 bg-card/30">
                <CardContent className="py-4 text-center">
                  <Clock className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                  <div className="text-2xl font-bold">{inProgressMatches}</div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">In Progress</p>
                </CardContent>
              </Card>
              <Card className="border-border/40 bg-card/30">
                <CardContent className="py-4 text-center">
                  <Play className="w-6 h-6 mx-auto mb-2 text-sky-500" />
                  <div className="text-2xl font-bold">{pendingMatches}</div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending</p>
                </CardContent>
              </Card>
            </div>
            {matches.length > 0 && (
              <div className="px-1">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Overall Progress</span>
                  <span>{Math.round(totalProgress)}%</span>
                </div>
                <Progress value={totalProgress} className="h-2" />
              </div>
            )}
          </div>
        )}

        {/* Draft State - Show teams */}
        {competition.status === "draft" && (
          <Card className="border-border/40 bg-card/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Participating Teams
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {competitionTeams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md"
                      style={{
                        background: `linear-gradient(135deg, ${team.color || "#3b82f6"}, ${team.color || "#3b82f6"}99)`,
                      }}
                    >
                      <span className="text-sm font-bold text-white">
                        {team.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium truncate">{team.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Round Robin - Show standings and matches */}
        {competition.status !== "draft" && competition.type === "round_robin" && standings && (
          <div className="space-y-6">
            <Standings standings={standings} teams={competitionTeams} />

            {/* Match Schedule */}
            <Card className="border-border/40 bg-card/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Swords className="w-5 h-5 text-primary" />
                  Match Schedule
                </CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {matches
                    .sort((a, b) => {
                      const statusOrder = { in_progress: 0, pending: 1, completed: 2 };
                      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
                      if (statusDiff !== 0) return statusDiff;
                      if (a.round !== b.round) return a.round - b.round;
                      return a.position - b.position;
                    })
                    .map((match) => {
                      const homeTeam = competitionTeams.find((t) => t.id === match.homeTeamId);
                      const awayTeam = competitionTeams.find((t) => t.id === match.awayTeamId);
                      const homeWon = match.winnerId === match.homeTeamId;
                      const awayWon = match.winnerId === match.awayTeamId;

                      return (
                        <div
                          key={match.id}
                          className={`
                            p-4 rounded-xl border transition-all duration-200
                            ${match.status === "in_progress"
                              ? "border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/20"
                              : "border-border/40 bg-card"
                            }
                            ${match.status !== "completed" ? "cursor-pointer hover:border-primary/40 hover:bg-accent/30" : ""}
                          `}
                          onClick={() => {
                            if (match.status === "pending" || match.status === "in_progress") {
                              handleMatchClick(match);
                            }
                          }}
                          role={match.status !== "completed" ? "button" : undefined}
                          tabIndex={match.status !== "completed" ? 0 : undefined}
                          onKeyDown={(e) => {
                            if ((e.key === "Enter" || e.key === " ") && match.status !== "completed") {
                              handleMatchClick(match);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: homeTeam?.color || "#3b82f6" }}
                              />
                              <span className={`truncate ${homeWon ? "font-semibold text-emerald-500" : ""}`}>
                                {homeTeam?.name || "TBD"}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 shrink-0 px-4">
                              {match.status === "completed" ? (
                                <span className="text-lg font-bold tabular-nums">
                                  {match.homeScore} - {match.awayScore}
                                </span>
                              ) : (
                                <Badge className={match.status === "in_progress" ? "status-active" : "status-draft"}>
                                  {match.status === "in_progress" ? "Live" : "Pending"}
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                              <span className={`truncate ${awayWon ? "font-semibold text-emerald-500" : ""}`}>
                                {awayTeam?.name || "TBD"}
                              </span>
                              <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: awayTeam?.color || "#f97316" }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Single Elimination Bracket */}
        {competition.status !== "draft" && competition.type === "single_elimination" && (
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
              />
            </CardContent>
          </Card>
        )}

        {/* Double Elimination Bracket */}
        {competition.status !== "draft" && competition.type === "double_elimination" && (
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
              />
            </CardContent>
          </Card>
        )}

        {/* Win 2 & Out View */}
        {competition.status !== "draft" && competition.type === "win2out" && competition.win2outState && (
          <Win2OutView
            state={competition.win2outState}
            matches={matches}
            teams={competitionTeams}
            onMatchClick={handleMatchClick}
          />
        )}

        {/* Two Match Rotation View */}
        {competition.status !== "draft" && competition.type === "two_match_rotation" && competition.twoMatchRotationState && (
          <TwoMatchRotationView
            state={competition.twoMatchRotationState}
            matches={matches}
            teams={competitionTeams}
            onMatchClick={handleMatchClick}
          />
        )}
      </main>

      {/* Start Competition Confirmation */}
      <Dialog open={showStartConfirm} onOpenChange={setShowStartConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-primary" />
              Start Competition?
            </DialogTitle>
            <DialogDescription>
              This will generate the {typeLabels[competition.type].toLowerCase()} schedule for{" "}
              {competition.teamIds.length} teams. You won&apos;t be able to add or remove teams after starting.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setShowStartConfirm(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleStartCompetition} className="flex-1 gap-2 shadow-lg shadow-primary/20">
              <Play className="w-4 h-4" />
              Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Match Action Dialog */}
      <Dialog open={!!selectedMatch} onOpenChange={() => setSelectedMatch(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-primary" />
              {selectedMatch?.status === "in_progress" ? "Continue Match" : "Start Match"}
            </DialogTitle>
            <DialogDescription>
              {competitionTeams.find((t) => t.id === selectedMatch?.homeTeamId)?.name} vs{" "}
              {competitionTeams.find((t) => t.id === selectedMatch?.awayTeamId)?.name}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setSelectedMatch(null)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handlePlayMatch} className="flex-1 gap-2 shadow-lg shadow-primary/20">
              <Play className="w-4 h-4" />
              {selectedMatch?.status === "in_progress" ? "Continue" : "Play Match"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
