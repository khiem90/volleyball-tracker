"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Minus, Plus, Trophy, Undo2, Check } from "lucide-react";
import { advanceWinner } from "@/lib/singleElimination";
import { processMatchResult } from "@/lib/win2out";

export default function MatchPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;

  const {
    state,
    getMatchById,
    getCompetitionById,
    updateMatchScore,
    startMatch,
    completeMatch,
    updateCompetition,
    addMatch,
  } = useApp();

  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [history, setHistory] = useState<{ home: number; away: number }[]>([]);

  const match = useMemo(() => getMatchById(matchId), [getMatchById, matchId]);
  const competition = useMemo(
    () => (match?.competitionId ? getCompetitionById(match.competitionId) : null),
    [match?.competitionId, getCompetitionById]
  );

  const homeTeam = useMemo(
    () => state.teams.find((t) => t.id === match?.homeTeamId),
    [state.teams, match?.homeTeamId]
  );
  const awayTeam = useMemo(
    () => state.teams.find((t) => t.id === match?.awayTeamId),
    [state.teams, match?.awayTeamId]
  );

  // Start match if pending
  useEffect(() => {
    if (match && match.status === "pending") {
      startMatch(matchId);
    }
  }, [match, matchId, startMatch]);

  // Track score history for undo
  useEffect(() => {
    if (match) {
      setHistory((prev) => {
        const last = prev[prev.length - 1];
        if (!last || last.home !== match.homeScore || last.away !== match.awayScore) {
          return [...prev, { home: match.homeScore, away: match.awayScore }];
        }
        return prev;
      });
    }
  }, [match?.homeScore, match?.awayScore]);

  const handleAddPoint = useCallback(
    (team: "home" | "away") => {
      if (!match) return;
      const newHome = team === "home" ? match.homeScore + 1 : match.homeScore;
      const newAway = team === "away" ? match.awayScore + 1 : match.awayScore;
      updateMatchScore(matchId, newHome, newAway);
    },
    [match, matchId, updateMatchScore]
  );

  const handleDeductPoint = useCallback(
    (team: "home" | "away") => {
      if (!match) return;
      const newHome = team === "home" ? Math.max(0, match.homeScore - 1) : match.homeScore;
      const newAway = team === "away" ? Math.max(0, match.awayScore - 1) : match.awayScore;
      updateMatchScore(matchId, newHome, newAway);
    },
    [match, matchId, updateMatchScore]
  );

  const handleUndo = useCallback(() => {
    if (!match || history.length < 2) return;
    const prevState = history[history.length - 2];
    setHistory((prev) => prev.slice(0, -1));
    updateMatchScore(matchId, prevState.home, prevState.away);
  }, [match, matchId, history, updateMatchScore]);

  const handleCompleteMatch = useCallback(() => {
    if (!match) return;

    const winnerId =
      match.homeScore > match.awayScore ? match.homeTeamId : match.awayTeamId;

    completeMatch(matchId, winnerId);

    // Handle bracket advancement for elimination tournaments
    if (competition && (competition.type === "single_elimination" || competition.type === "double_elimination")) {
      const competitionMatches = state.matches.filter(
        (m) => m.competitionId === competition.id
      );
      const updatedMatches = advanceWinner(competitionMatches, match, winnerId);

      // Update the competition with advanced bracket
      // This is a simplified version - in production you'd want more sophisticated bracket management
      updatedMatches.forEach((updatedMatch) => {
        if (updatedMatch.id !== match.id) {
          const original = competitionMatches.find((m) => m.id === updatedMatch.id);
          if (original && (original.homeTeamId !== updatedMatch.homeTeamId || original.awayTeamId !== updatedMatch.awayTeamId)) {
            updateMatchScore(updatedMatch.id, updatedMatch.homeScore, updatedMatch.awayScore);
          }
        }
      });
    }

    // Handle Win 2 & Out format
    if (competition && competition.type === "win2out" && competition.win2outState) {
      // Create a completed match object for processing
      const completedMatch = {
        ...match,
        winnerId,
        status: "completed" as const,
        completedAt: Date.now(),
      };

      const { updatedState, nextMatch } = processMatchResult(
        competition.win2outState,
        completedMatch
      );

      // Update competition with new state
      updateCompetition({
        ...competition,
        win2outState: updatedState,
        status: updatedState.isComplete ? "completed" : "in_progress",
      });

      // Create next match if there is one
      if (nextMatch) {
        addMatch(nextMatch);
      }
    }

    setShowCompleteDialog(false);

    // Navigate back to competition or dashboard
    if (competition) {
      router.push(`/competitions/${competition.id}`);
    } else {
      router.push("/");
    }
  }, [match, matchId, competition, state.matches, completeMatch, updateMatchScore, updateCompetition, addMatch, router]);

  const handleOpenCompleteDialog = useCallback(() => {
    if (!match) return;
    if (match.homeScore === match.awayScore) {
      // Don't allow ties - need a winner
      return;
    }
    setShowCompleteDialog(true);
  }, [match]);

  if (!match || !homeTeam || !awayTeam) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="text-xl font-semibold mb-2">Match not found</h2>
          <p className="text-muted-foreground mb-4">This match may have been deleted.</p>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const canComplete = match.homeScore !== match.awayScore;
  const homeColor = homeTeam.color || "#3b82f6";
  const awayColor = awayTeam.color || "#f97316";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="glass border-b border-border/50 px-4 py-3 z-50">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (competition) {
                router.push(`/competitions/${competition.id}`);
              } else {
                router.push("/");
              }
            }}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          <div className="text-center">
            <h1 className="text-sm font-medium text-muted-foreground">
              {competition?.name || "Quick Match"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={history.length < 2}
              className="gap-2"
            >
              <Undo2 className="w-4 h-4" />
              <span className="hidden sm:inline">Undo</span>
            </Button>
            <Button
              size="sm"
              onClick={handleOpenCompleteDialog}
              disabled={!canComplete}
              className="gap-2"
            >
              <Check className="w-4 h-4" />
              <span className="hidden sm:inline">End Match</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Score Panels */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Home Team */}
        <div
          className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${homeColor}, ${homeColor}cc)`,
          }}
        >
          {/* Decorative elements */}
          <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-white/5 blur-3xl" />

          {/* Team Name */}
          <h2 className="text-white/90 text-lg md:text-xl font-semibold mb-4 relative z-10">
            {homeTeam.name}
          </h2>

          {/* Score Controls */}
          <div className="flex items-center gap-4 md:gap-8 relative z-10">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleDeductPoint("home")}
              aria-label={`Deduct point from ${homeTeam.name}`}
              className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-white/10 hover:bg-white/20 border-white/20 text-white transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <Minus className="w-5 h-5 md:w-6 md:h-6" />
            </Button>

            <span
              className="text-white font-black text-[5rem] md:text-[10rem] leading-none tracking-tighter min-w-[1.2ch] text-center drop-shadow-2xl"
              style={{
                textShadow: "0 4px 30px rgba(0,0,0,0.3), 0 0 60px rgba(255,255,255,0.1)",
              }}
            >
              {match.homeScore}
            </span>

            <Button
              variant="outline"
              size="icon"
              onClick={() => handleAddPoint("home")}
              aria-label={`Add point to ${homeTeam.name}`}
              className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-white/10 hover:bg-white/20 border-white/20 text-white transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <Plus className="w-5 h-5 md:w-6 md:h-6" />
            </Button>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-0.5 bg-background" />
        <div className="block md:hidden h-0.5 bg-background" />

        {/* Away Team */}
        <div
          className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${awayColor}, ${awayColor}cc)`,
          }}
        >
          {/* Decorative elements */}
          <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-white/5 blur-3xl" />

          {/* Team Name */}
          <h2 className="text-white/90 text-lg md:text-xl font-semibold mb-4 relative z-10">
            {awayTeam.name}
          </h2>

          {/* Score Controls */}
          <div className="flex items-center gap-4 md:gap-8 relative z-10">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleDeductPoint("away")}
              aria-label={`Deduct point from ${awayTeam.name}`}
              className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-white/10 hover:bg-white/20 border-white/20 text-white transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <Minus className="w-5 h-5 md:w-6 md:h-6" />
            </Button>

            <span
              className="text-white font-black text-[5rem] md:text-[10rem] leading-none tracking-tighter min-w-[1.2ch] text-center drop-shadow-2xl"
              style={{
                textShadow: "0 4px 30px rgba(0,0,0,0.3), 0 0 60px rgba(255,255,255,0.1)",
              }}
            >
              {match.awayScore}
            </span>

            <Button
              variant="outline"
              size="icon"
              onClick={() => handleAddPoint("away")}
              aria-label={`Add point to ${awayTeam.name}`}
              className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-white/10 hover:bg-white/20 border-white/20 text-white transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <Plus className="w-5 h-5 md:w-6 md:h-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Complete Match Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>End Match?</DialogTitle>
            <DialogDescription>
              Final score: {homeTeam.name} {match.homeScore} - {match.awayScore} {awayTeam.name}
              <br />
              <br />
              Winner:{" "}
              <strong className="text-emerald-500">
                {match.homeScore > match.awayScore ? homeTeam.name : awayTeam.name}
              </strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)} className="flex-1">
              Continue Playing
            </Button>
            <Button onClick={handleCompleteMatch} className="flex-1 gap-2">
              <Trophy className="w-4 h-4" />
              Confirm Winner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

