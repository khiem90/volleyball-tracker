"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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
  Maximize,
  Minimize,
  RotateCcw,
  Play,
} from "lucide-react";
import { useFullscreen } from "@/hooks/useFullscreen";
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
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [history, setHistory] = useState<{ home: number; away: number }[]>([]);
  const [showRotatePrompt, setShowRotatePrompt] = useState(false);

  const isLandscape = useCallback(() => {
    return window.innerWidth > window.innerHeight;
  }, []);

  const handleFullscreenToggle = useCallback(() => {
    if (isFullscreen) {
      toggleFullscreen();
    } else {
      if (isLandscape()) {
        toggleFullscreen();
      } else {
        setShowRotatePrompt(true);
      }
    }
  }, [isFullscreen, isLandscape, toggleFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;

    const handleOrientationChange = () => {
      if (!isLandscape()) {
        toggleFullscreen();
      }
    };

    window.addEventListener("resize", handleOrientationChange);
    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      window.removeEventListener("resize", handleOrientationChange);
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, [isFullscreen, isLandscape, toggleFullscreen]);

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

    completeMatch(matchId, winnerId);

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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-muted/30 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-muted-foreground/30" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Match not found</h2>
          <p className="text-muted-foreground mb-6">
            This match may have been deleted.
          </p>
          <Link href="/">
            <Button variant="outline" className="gap-2 rounded-xl glass-input">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const canComplete = match.homeScore !== match.awayScore;
  const homeColor = homeTeam.color || "#3b82f6";
  const awayColor = awayTeam.color || "#f97316";
  const homeLeading = match.homeScore > match.awayScore;
  const awayLeading = match.awayScore > match.homeScore;

  return (
    <div
      className={`min-h-screen bg-background flex flex-col ${
        isFullscreen ? "fullscreen-mode" : ""
      }`}
    >
      {/* Header - hidden in fullscreen mode */}
      {!isFullscreen && (
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass-nav border-b border-border/20 px-4 py-3 z-50"
        >
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
              className="gap-2 rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>

            <div className="text-center">
              <h1 className="text-sm font-medium text-muted-foreground">
                {competition?.name || "Quick Match"}
              </h1>
              <Badge className="mt-1 status-live gap-1">
                <Play className="w-3 h-3" />
                Live
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              {isSharedMode && (
                <Badge
                  variant="outline"
                  className={`gap-1 text-xs rounded-lg ${
                    role === "viewer"
                      ? "bg-muted/50 text-muted-foreground"
                      : "bg-primary/20 text-primary border-primary/30"
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleFullscreenToggle}
                className="gap-2 rounded-xl glass-input"
                title="Enter fullscreen mode (landscape only)"
              >
                <Maximize className="w-4 h-4" />
                <span className="hidden sm:inline">Fullscreen</span>
              </Button>
              {canEdit && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUndo}
                    disabled={history.length < 2}
                    className="gap-2 rounded-xl glass-input"
                  >
                    <Undo2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Undo</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleOpenCompleteDialog}
                    disabled={!canComplete}
                    className="gap-2 btn-orange-gradient rounded-xl"
                  >
                    <Check className="w-4 h-4" />
                    <span className="hidden sm:inline">End Match</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </motion.header>
      )}

      {/* Fullscreen Controls - floating bar at bottom */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 glass-nav rounded-full px-4 py-2"
          >
            {canEdit && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUndo}
                  disabled={history.length < 2}
                  className="gap-2 rounded-full"
                >
                  <Undo2 className="w-4 h-4" />
                  Undo
                </Button>
                <div className="w-px h-6 bg-border/30" />
                <Button
                  size="sm"
                  onClick={handleOpenCompleteDialog}
                  disabled={!canComplete}
                  className="gap-2 rounded-full btn-orange-gradient"
                >
                  <Check className="w-4 h-4" />
                  End Match
                </Button>
                <div className="w-px h-6 bg-border/30" />
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFullscreenToggle}
              className="gap-2 rounded-full"
              title="Exit fullscreen"
            >
              <Minimize className="w-4 h-4" />
              Exit
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Score Panels */}
      <div
        className={`flex-1 flex ${
          isFullscreen ? "flex-row" : "flex-col md:flex-row"
        }`}
      >
        {/* Home Team */}
        <motion.div
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
          whileTap={canEdit ? { scale: 0.99 } : undefined}
          className={`flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none focus:outline-none ${
            canEdit ? "cursor-pointer" : ""
          }`}
          style={{
            background: `linear-gradient(135deg, ${homeColor}, ${homeColor}bb)`,
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
          <div className="absolute top-0 right-0 w-full h-full bg-linear-to-br from-white/10 to-transparent" />

          {/* View-only indicator */}
          {!canEdit && isSharedMode && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5"
            >
              <Eye className="w-4 h-4 text-white/80" />
              <span className="text-xs font-medium text-white/80">
                View Only
              </span>
            </motion.div>
          )}

          {/* Leading indicator */}
          <AnimatePresence>
            {homeLeading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-amber-500/30 backdrop-blur-sm rounded-full px-3 py-1.5 border border-amber-400/30"
              >
                <Crown className="w-4 h-4 text-amber-300" />
                <span className="text-xs font-semibold text-white">
                  Leading
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Team Name */}
          <h2
            className={`text-white/90 font-semibold relative z-10 ${
              isFullscreen
                ? "text-2xl md:text-3xl mb-2"
                : "text-lg md:text-xl mb-4"
            }`}
          >
            {homeTeam.name}
          </h2>

          {/* Animated Score */}
          <div className="relative z-10">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={match.homeScore}
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={`text-white font-black leading-none tracking-tighter min-w-[1.5ch] text-center inline-block score-text ${
                  isFullscreen
                    ? "text-[10rem] md:text-[16rem] lg:text-[20rem]"
                    : "text-[6rem] md:text-[12rem]"
                }`}
              >
                {match.homeScore}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Controls */}
          {!isFullscreen &&
            (canEdit ? (
              <div className="flex items-center gap-4 mt-6 relative z-10">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeductPoint("home");
                    }}
                    aria-label={`Deduct point from ${homeTeam.name}`}
                    className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 border-white/20 text-white"
                  >
                    <Minus className="w-5 h-5" />
                  </Button>
                </motion.div>
                <span className="text-white/50 text-sm font-medium px-2">
                  Tap to score
                </span>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddPoint("home");
                    }}
                    aria-label={`Add point to ${homeTeam.name}`}
                    className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 border-white/20 text-white"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </motion.div>
              </div>
            ) : (
              <div className="mt-6 relative z-10">
                <span className="text-white/40 text-sm font-medium">
                  Live Score
                </span>
              </div>
            ))}

          {isFullscreen && canEdit && (
            <span className="text-white/40 text-sm font-medium mt-4 relative z-10">
              Tap to score
            </span>
          )}
        </motion.div>

        {/* Divider */}
        <div className="hidden md:block w-1 bg-background/50" />
        <div className="block md:hidden h-1 bg-background/50" />

        {/* Away Team */}
        <motion.div
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
          whileTap={canEdit ? { scale: 0.99 } : undefined}
          className={`flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none focus:outline-none ${
            canEdit ? "cursor-pointer" : ""
          }`}
          style={{
            background: `linear-gradient(135deg, ${awayColor}, ${awayColor}bb)`,
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
          <div className="absolute top-0 right-0 w-full h-full bg-linear-to-br from-white/10 to-transparent" />

          {/* Leading indicator */}
          <AnimatePresence>
            {awayLeading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-amber-500/30 backdrop-blur-sm rounded-full px-3 py-1.5 border border-amber-400/30"
              >
                <Crown className="w-4 h-4 text-amber-300" />
                <span className="text-xs font-semibold text-white">
                  Leading
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Team Name */}
          <h2
            className={`text-white/90 font-semibold relative z-10 ${
              isFullscreen
                ? "text-2xl md:text-3xl mb-2"
                : "text-lg md:text-xl mb-4"
            }`}
          >
            {awayTeam.name}
          </h2>

          {/* Animated Score */}
          <div className="relative z-10">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={match.awayScore}
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={`text-white font-black leading-none tracking-tighter min-w-[1.5ch] text-center inline-block score-text ${
                  isFullscreen
                    ? "text-[10rem] md:text-[16rem] lg:text-[20rem]"
                    : "text-[6rem] md:text-[12rem]"
                }`}
              >
                {match.awayScore}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Controls */}
          {!isFullscreen &&
            (canEdit ? (
              <div className="flex items-center gap-4 mt-6 relative z-10">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeductPoint("away");
                    }}
                    aria-label={`Deduct point from ${awayTeam.name}`}
                    className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 border-white/20 text-white"
                  >
                    <Minus className="w-5 h-5" />
                  </Button>
                </motion.div>
                <span className="text-white/50 text-sm font-medium px-2">
                  Tap to score
                </span>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddPoint("away");
                    }}
                    aria-label={`Add point to ${awayTeam.name}`}
                    className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 border-white/20 text-white"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </motion.div>
              </div>
            ) : (
              <div className="mt-6 relative z-10">
                <span className="text-white/40 text-sm font-medium">
                  Live Score
                </span>
              </div>
            ))}

          {isFullscreen && canEdit && (
            <span className="text-white/40 text-sm font-medium mt-4 relative z-10">
              Tap to score
            </span>
          )}
        </motion.div>
      </div>

      {/* Complete Match Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="sm:max-w-md glass-card border-glass-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              End Match?
            </DialogTitle>
            <DialogDescription>
              Confirm the final score and winner
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-center gap-6 p-4 rounded-xl bg-accent/20">
              <div className="text-center">
                <div
                  className="w-12 h-12 rounded-xl mx-auto mb-2 shadow-lg"
                  style={{
                    backgroundColor: homeColor,
                    boxShadow: `0 8px 20px ${homeColor}40`,
                  }}
                />
                <p className="text-xs text-muted-foreground mb-1">
                  {homeTeam.name}
                </p>
                <p className="text-3xl font-bold">{match.homeScore}</p>
              </div>
              <span className="text-2xl text-muted-foreground font-light">
                :
              </span>
              <div className="text-center">
                <div
                  className="w-12 h-12 rounded-xl mx-auto mb-2 shadow-lg"
                  style={{
                    backgroundColor: awayColor,
                    boxShadow: `0 8px 20px ${awayColor}40`,
                  }}
                />
                <p className="text-xs text-muted-foreground mb-1">
                  {awayTeam.name}
                </p>
                <p className="text-3xl font-bold">{match.awayScore}</p>
              </div>
            </div>
            <div className="text-center pt-2 pb-2">
              <p className="text-sm text-muted-foreground mb-1">Winner</p>
              <p className="font-semibold text-xl text-emerald-400">
                {match.homeScore > match.awayScore
                  ? homeTeam.name
                  : awayTeam.name}
              </p>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCompleteDialog(false)}
              className="flex-1 rounded-xl"
            >
              Continue Playing
            </Button>
            <Button
              onClick={handleCompleteMatch}
              className="flex-1 gap-2 btn-orange-gradient rounded-xl"
            >
              <Trophy className="w-4 h-4" />
              Confirm Winner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rotate Device Prompt */}
      <Dialog open={showRotatePrompt} onOpenChange={setShowRotatePrompt}>
        <DialogContent className="sm:max-w-sm glass-card border-glass-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-primary" />
              Rotate Your Device
            </DialogTitle>
            <DialogDescription>
              Fullscreen mode is only available in landscape orientation
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            <motion.div
              animate={{ rotate: [0, 90, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-24 h-16 border-4 border-primary rounded-xl mb-4"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <RotateCcw className="w-8 h-8 text-primary" />
              </div>
            </motion.div>
            <p className="text-sm text-muted-foreground text-center">
              Please rotate your device to landscape mode, then try again.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowRotatePrompt(false)}
              className="w-full btn-orange-gradient rounded-xl"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
