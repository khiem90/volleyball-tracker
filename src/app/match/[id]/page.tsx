"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { useSession } from "@/context/SessionContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShareButton } from "@/components/ShareSession";
import {
  ArrowLeft,
  Minus,
  Plus,
  Trophy,
  Undo2,
  Check,
  Crown,
  Eye,
  Shield,
} from "lucide-react";
import { advanceWinner } from "@/lib/singleElimination";
import { processMatchResult } from "@/lib/win2out";
import { processMatchResult as processTwoMatchRotationResult } from "@/lib/twoMatchRotation";

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
    completeMatchWithNextMatch,
    canEdit,
    isSharedMode,
  } = useApp();

  const { role } = useSession();

  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [history, setHistory] = useState<{ home: number; away: number }[]>([]);

  const match = useMemo(() => getMatchById(matchId), [getMatchById, matchId]);
  const competition = useMemo(
    () =>
      match?.competitionId ? getCompetitionById(match.competitionId) : null,
    [match, getCompetitionById]
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

  const handleAddPoint = useCallback(
    (team: "home" | "away") => {
      if (!match || !canEdit) return;
      const currentHome = match.homeScore;
      const currentAway = match.awayScore;
      const newHome = team === "home" ? currentHome + 1 : currentHome;
      const newAway = team === "away" ? currentAway + 1 : currentAway;
      setHistory((prev) => {
        const seeded =
          prev.length === 0 ? [{ home: currentHome, away: currentAway }] : prev;
        const last = seeded[seeded.length - 1];
        if (!last || last.home !== newHome || last.away !== newAway) {
          return [...seeded, { home: newHome, away: newAway }];
        }
        return seeded;
      });
      updateMatchScore(matchId, newHome, newAway);
    },
    [match, matchId, updateMatchScore, canEdit]
  );

  const handleDeductPoint = useCallback(
    (team: "home" | "away") => {
      if (!match || !canEdit) return;
      const currentHome = match.homeScore;
      const currentAway = match.awayScore;
      const newHome =
        team === "home" ? Math.max(0, currentHome - 1) : currentHome;
      const newAway =
        team === "away" ? Math.max(0, currentAway - 1) : currentAway;
      setHistory((prev) => {
        const seeded =
          prev.length === 0 ? [{ home: currentHome, away: currentAway }] : prev;
        const last = seeded[seeded.length - 1];
        if (!last || last.home !== newHome || last.away !== newAway) {
          return [...seeded, { home: newHome, away: newAway }];
        }
        return seeded;
      });
      updateMatchScore(matchId, newHome, newAway);
    },
    [match, matchId, updateMatchScore, canEdit]
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

    // Handle Win 2 & Out format - use atomic function to avoid race conditions
    if (
      competition &&
      competition.type === "win2out" &&
      competition.win2outState
    ) {
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

      const updatedCompetition = {
        ...competition,
        win2outState: updatedState,
        status: updatedState.isComplete
          ? ("completed" as const)
          : ("in_progress" as const),
      };

      completeMatchWithNextMatch(
        matchId,
        winnerId,
        updatedCompetition,
        nextMatch
      );
      setShowCompleteDialog(false);
      router.push(`/competitions/${competition.id}`);
      return;
    }

    // Handle Two Match Rotation format - use atomic function to avoid race conditions
    if (
      competition &&
      competition.type === "two_match_rotation" &&
      competition.twoMatchRotationState
    ) {
      const completedMatch = {
        ...match,
        winnerId,
        status: "completed" as const,
        completedAt: Date.now(),
      };

      const { updatedState, nextMatch } = processTwoMatchRotationResult(
        competition.twoMatchRotationState,
        completedMatch
      );

      const updatedCompetition = {
        ...competition,
        twoMatchRotationState: updatedState,
        status: updatedState.isComplete
          ? ("completed" as const)
          : ("in_progress" as const),
      };

      completeMatchWithNextMatch(
        matchId,
        winnerId,
        updatedCompetition,
        nextMatch
      );
      setShowCompleteDialog(false);
      router.push(`/competitions/${competition.id}`);
      return;
    }

    // For other formats (round_robin, elimination), use the standard flow
    completeMatch(matchId, winnerId);

    // Handle bracket advancement for elimination tournaments
    if (
      competition &&
      (competition.type === "single_elimination" ||
        competition.type === "double_elimination")
    ) {
      const competitionMatches = state.matches.filter(
        (m) => m.competitionId === competition.id
      );
      const updatedMatches = advanceWinner(competitionMatches, match, winnerId);

      updatedMatches.forEach((updatedMatch) => {
        if (updatedMatch.id !== match.id) {
          const original = competitionMatches.find(
            (m) => m.id === updatedMatch.id
          );
          if (
            original &&
            (original.homeTeamId !== updatedMatch.homeTeamId ||
              original.awayTeamId !== updatedMatch.awayTeamId)
          ) {
            updateMatchScore(
              updatedMatch.id,
              updatedMatch.homeScore,
              updatedMatch.awayScore
            );
          }
        }
      });
    }

    setShowCompleteDialog(false);

    // Navigate back to competition or dashboard
    if (competition) {
      router.push(`/competitions/${competition.id}`);
    } else {
      router.push("/");
    }
  }, [
    match,
    matchId,
    competition,
    state.matches,
    completeMatch,
    completeMatchWithNextMatch,
    updateMatchScore,
    router,
  ]);

  const handleOpenCompleteDialog = useCallback(() => {
    if (!match) return;
    if (match.homeScore === match.awayScore) {
      return;
    }
    setShowCompleteDialog(true);
  }, [match]);

  if (!match || !homeTeam || !awayTeam) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-muted/50 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-muted-foreground/30" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Match not found</h2>
          <p className="text-muted-foreground mb-6">
            This match may have been deleted.
          </p>
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
  const homeLeading = match.homeScore > match.awayScore;
  const awayLeading = match.awayScore > match.homeScore;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="glass border-b border-border/40 px-4 py-3 z-50">
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
            <Badge variant="secondary" className="mt-1 text-xs">
              {match.status === "in_progress" ? "Live" : "In Progress"}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {isSharedMode && (
              <Badge
                variant="outline"
                className={`gap-1 text-xs ${
                  role === "viewer"
                    ? "bg-muted text-muted-foreground"
                    : "bg-blue-500/20 text-blue-500 border-blue-500/30"
                }`}
              >
                {role === "viewer" ? (
                  <Eye className="w-3 h-3" />
                ) : (
                  <Shield className="w-3 h-3" />
                )}
                {role}
              </Badge>
            )}
            {isSharedMode && <ShareButton />}
            {canEdit && (
              <>
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
                  className="gap-2 shadow-lg shadow-primary/20"
                >
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline">End Match</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Score Panels */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Home Team */}
        <div
          role={canEdit ? "button" : undefined}
          tabIndex={canEdit ? 0 : undefined}
          onClick={canEdit ? () => handleAddPoint("home") : undefined}
          onKeyDown={
            canEdit
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ")
                    handleAddPoint("home");
                }
              : undefined
          }
          className={`flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none focus:outline-none transition-transform ${
            canEdit ? "cursor-pointer active:scale-[0.99]" : ""
          }`}
          style={{
            background: `linear-gradient(135deg, ${homeColor}, ${homeColor}cc)`,
          }}
          aria-label={
            canEdit
              ? `Add point to ${homeTeam.name}. Current score: ${match.homeScore}`
              : `${homeTeam.name}: ${match.homeScore}`
          }
        >
          {/* Decorative elements */}
          <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute top-0 right-0 w-full h-full bg-linear-to-br from-white/5 to-transparent" />

          {/* View-only indicator */}
          {!canEdit && isSharedMode && (
            <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
              <Eye className="w-4 h-4 text-white/80" />
              <span className="text-xs font-medium text-white/80">
                View Only
              </span>
            </div>
          )}

          {/* Leading indicator */}
          {homeLeading && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
              <Crown className="w-4 h-4 text-amber-300" />
              <span className="text-xs font-semibold text-white">Leading</span>
            </div>
          )}

          {/* Team Name */}
          <h2 className="text-white/90 text-lg md:text-xl font-semibold mb-4 relative z-10">
            {homeTeam.name}
          </h2>

          {/* Score */}
          <span
            className="text-white font-black text-[6rem] md:text-[12rem] leading-none tracking-tighter min-w-[1.5ch] text-center drop-shadow-2xl relative z-10"
            style={{
              textShadow:
                "0 4px 40px rgba(0,0,0,0.3), 0 0 80px rgba(255,255,255,0.15)",
            }}
          >
            {match.homeScore}
          </span>

          {/* Controls - only show if can edit */}
          {canEdit ? (
            <div className="flex items-center gap-4 mt-6 relative z-10">
              <Button
                variant="outline"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeductPoint("home");
                }}
                aria-label={`Deduct point from ${homeTeam.name}`}
                className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 border-white/20 text-white transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <Minus className="w-5 h-5" />
              </Button>
              <span className="text-white/60 text-sm font-medium px-2">
                Tap to score
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddPoint("home");
                }}
                aria-label={`Add point to ${homeTeam.name}`}
                className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 border-white/20 text-white transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          ) : (
            <div className="mt-6 relative z-10">
              <span className="text-white/40 text-sm font-medium">
                Live Score
              </span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="hidden md:block w-1 bg-background" />
        <div className="block md:hidden h-1 bg-background" />

        {/* Away Team */}
        <div
          role={canEdit ? "button" : undefined}
          tabIndex={canEdit ? 0 : undefined}
          onClick={canEdit ? () => handleAddPoint("away") : undefined}
          onKeyDown={
            canEdit
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ")
                    handleAddPoint("away");
                }
              : undefined
          }
          className={`flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none focus:outline-none transition-transform ${
            canEdit ? "cursor-pointer active:scale-[0.99]" : ""
          }`}
          style={{
            background: `linear-gradient(135deg, ${awayColor}, ${awayColor}cc)`,
          }}
          aria-label={
            canEdit
              ? `Add point to ${awayTeam.name}. Current score: ${match.awayScore}`
              : `${awayTeam.name}: ${match.awayScore}`
          }
        >
          {/* Decorative elements */}
          <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute top-0 right-0 w-full h-full bg-linear-to-br from-white/5 to-transparent" />

          {/* Leading indicator */}
          {awayLeading && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
              <Crown className="w-4 h-4 text-amber-300" />
              <span className="text-xs font-semibold text-white">Leading</span>
            </div>
          )}

          {/* Team Name */}
          <h2 className="text-white/90 text-lg md:text-xl font-semibold mb-4 relative z-10">
            {awayTeam.name}
          </h2>

          {/* Score */}
          <span
            className="text-white font-black text-[6rem] md:text-[12rem] leading-none tracking-tighter min-w-[1.5ch] text-center drop-shadow-2xl relative z-10"
            style={{
              textShadow:
                "0 4px 40px rgba(0,0,0,0.3), 0 0 80px rgba(255,255,255,0.15)",
            }}
          >
            {match.awayScore}
          </span>

          {/* Controls - only show if can edit */}
          {canEdit ? (
            <div className="flex items-center gap-4 mt-6 relative z-10">
              <Button
                variant="outline"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeductPoint("away");
                }}
                aria-label={`Deduct point from ${awayTeam.name}`}
                className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 border-white/20 text-white transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <Minus className="w-5 h-5" />
              </Button>
              <span className="text-white/60 text-sm font-medium px-2">
                Tap to score
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddPoint("away");
                }}
                aria-label={`Add point to ${awayTeam.name}`}
                className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 border-white/20 text-white transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          ) : (
            <div className="mt-6 relative z-10">
              <span className="text-white/40 text-sm font-medium">
                Live Score
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Complete Match Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              End Match?
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <div className="flex items-center justify-center gap-4 p-4 rounded-xl bg-muted/50">
                <div className="text-center">
                  <div
                    className="w-10 h-10 rounded-lg mx-auto mb-1"
                    style={{ backgroundColor: homeColor }}
                  />
                  <p className="text-xs text-muted-foreground">
                    {homeTeam.name}
                  </p>
                  <p className="text-2xl font-bold">{match.homeScore}</p>
                </div>
                <span className="text-muted-foreground">-</span>
                <div className="text-center">
                  <div
                    className="w-10 h-10 rounded-lg mx-auto mb-1"
                    style={{ backgroundColor: awayColor }}
                  />
                  <p className="text-xs text-muted-foreground">
                    {awayTeam.name}
                  </p>
                  <p className="text-2xl font-bold">{match.awayScore}</p>
                </div>
              </div>
              <div className="text-center pt-2">
                <p className="text-sm text-muted-foreground">Winner</p>
                <p className="font-semibold text-lg text-emerald-500">
                  {match.homeScore > match.awayScore
                    ? homeTeam.name
                    : awayTeam.name}
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCompleteDialog(false)}
              className="flex-1"
            >
              Continue Playing
            </Button>
            <Button
              onClick={handleCompleteMatch}
              className="flex-1 gap-2 shadow-lg shadow-primary/20"
            >
              <Trophy className="w-4 h-4" />
              Confirm Winner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
