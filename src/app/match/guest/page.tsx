"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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
import {
  ArrowLeftIcon,
  MinusIcon,
  PlusIcon,
  TrophyIcon,
  ArrowUturnLeftIcon,
  CheckIcon,
  PlayIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { CrownIcon } from "@/lib/icons";
import { useGuestQuickMatch } from "@/hooks/useGuestQuickMatch";
import { useFullscreen } from "@/hooks/useFullscreen";
import { GuestMatchComplete } from "@/components/GuestMatchComplete";

export default function GuestMatchPage() {
  const {
    match,
    history,
    homeLeading,
    awayLeading,
    canComplete,
    winner,
    showCompleteDialog,
    showResultModal,
    startMatch,
    handleAddPoint,
    handleDeductPoint,
    handleUndo,
    handleOpenCompleteDialog,
    handleCompleteMatch,
    resetMatch,
    setShowCompleteDialog,
    setShowResultModal,
  } = useGuestQuickMatch();

  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [showRotatePrompt, setShowRotatePrompt] = useState(false);

  const { homeTeam, awayTeam, homeScore, awayScore, status } = match;
  const homeColor = homeTeam.color || "#3b82f6";
  const awayColor = awayTeam.color || "#f97316";

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

  // Auto-exit fullscreen when device rotates to portrait
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

  // Auto-start match on mount
  useEffect(() => {
    if (status === "pending") {
      startMatch();
    }
  }, [status, startMatch]);

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
            <Link href="/quick-match">
              <Button variant="ghost" size="sm" className="gap-2 rounded-xl cursor-pointer">
                <ArrowLeftIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </Link>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <Badge className="status-live gap-1">
                  <PlayIcon className="w-3 h-3" />
                  Live
                </Badge>
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                  Guest Mode
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleFullscreenToggle}
                className="gap-2 rounded-xl glass-input"
                title="Enter fullscreen mode (landscape only)"
              >
                <ArrowsPointingOutIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Fullscreen</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={history.length < 2}
                className="gap-2 rounded-xl glass-input"
              >
                <ArrowUturnLeftIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Undo</span>
              </Button>
              <Button
                size="sm"
                onClick={handleOpenCompleteDialog}
                disabled={!canComplete}
                className="gap-2 btn-teal-gradient rounded-xl"
              >
                <CheckIcon className="w-4 h-4" />
                <span className="hidden sm:inline">End Match</span>
              </Button>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              disabled={history.length < 2}
              className="gap-2 rounded-full"
            >
              <ArrowUturnLeftIcon className="w-4 h-4" />
              Undo
            </Button>
            <div className="w-px h-6 bg-border/30" />
            <Button
              size="sm"
              onClick={handleOpenCompleteDialog}
              disabled={!canComplete}
              className="gap-2 rounded-full btn-teal-gradient"
            >
              <CheckIcon className="w-4 h-4" />
              End Match
            </Button>
            <div className="w-px h-6 bg-border/30" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFullscreenToggle}
              className="gap-2 rounded-full"
              title="Exit fullscreen"
            >
              <ArrowsPointingInIcon className="w-4 h-4" />
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
          role="button"
          tabIndex={0}
          onClick={() => handleAddPoint("home")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleAddPoint("home");
          }}
          whileTap={{ scale: 0.99 }}
          className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none focus:outline-none cursor-pointer"
          style={{
            background: `linear-gradient(135deg, ${homeColor}, ${homeColor}bb)`,
          }}
          aria-label={`Add point to ${homeTeam.name}. Current score: ${homeScore}`}
        >
          {/* Decorative elements */}
          <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute top-0 right-0 w-full h-full bg-linear-to-br from-white/10 to-transparent" />

          {/* Leading indicator */}
          <AnimatePresence>
            {homeLeading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-amber-500/30 backdrop-blur-sm rounded-full px-3 py-1.5 border border-amber-400/30"
              >
                <CrownIcon className="w-4 h-4 text-amber-300" />
                <span className="text-xs font-semibold text-white">Leading</span>
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
                key={homeScore}
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
                {homeScore}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Controls - hidden in fullscreen */}
          {!isFullscreen && (
            <div className="flex items-center gap-4 mt-6 relative z-10">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
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
                  <MinusIcon className="w-5 h-5" />
                </Button>
              </motion.div>
              <span className="text-white/50 text-sm font-medium px-2">
                Tap to score
              </span>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
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
                  <PlusIcon className="w-5 h-5" />
                </Button>
              </motion.div>
            </div>
          )}

          {/* Fullscreen tap indicator */}
          {isFullscreen && (
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
          role="button"
          tabIndex={0}
          onClick={() => handleAddPoint("away")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleAddPoint("away");
          }}
          whileTap={{ scale: 0.99 }}
          className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none focus:outline-none cursor-pointer"
          style={{
            background: `linear-gradient(135deg, ${awayColor}, ${awayColor}bb)`,
          }}
          aria-label={`Add point to ${awayTeam.name}. Current score: ${awayScore}`}
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
                <CrownIcon className="w-4 h-4 text-amber-300" />
                <span className="text-xs font-semibold text-white">Leading</span>
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
                key={awayScore}
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
                {awayScore}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Controls - hidden in fullscreen */}
          {!isFullscreen && (
            <div className="flex items-center gap-4 mt-6 relative z-10">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
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
                  <MinusIcon className="w-5 h-5" />
                </Button>
              </motion.div>
              <span className="text-white/50 text-sm font-medium px-2">
                Tap to score
              </span>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
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
                  <PlusIcon className="w-5 h-5" />
                </Button>
              </motion.div>
            </div>
          )}

          {/* Fullscreen tap indicator */}
          {isFullscreen && (
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
              <TrophyIcon className="w-5 h-5 text-primary" />
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
                  className="w-12 h-12 rounded-xl mx-auto mb-2 shadow-lg flex items-center justify-center"
                  style={{
                    backgroundColor: homeColor,
                    boxShadow: `0 8px 20px ${homeColor}40`,
                  }}
                >
                  <span className="text-lg font-bold text-white">A</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{homeTeam.name}</p>
                <p className="text-3xl font-bold">{homeScore}</p>
              </div>
              <span className="text-2xl text-muted-foreground font-light">:</span>
              <div className="text-center">
                <div
                  className="w-12 h-12 rounded-xl mx-auto mb-2 shadow-lg flex items-center justify-center"
                  style={{
                    backgroundColor: awayColor,
                    boxShadow: `0 8px 20px ${awayColor}40`,
                  }}
                >
                  <span className="text-lg font-bold text-white">B</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{awayTeam.name}</p>
                <p className="text-3xl font-bold">{awayScore}</p>
              </div>
            </div>
            <div className="text-center pt-2 pb-2">
              <p className="text-sm text-muted-foreground mb-1">Winner</p>
              <p className="font-semibold text-xl text-emerald-400">
                {homeScore > awayScore ? homeTeam.name : awayTeam.name}
              </p>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCompleteDialog(false)}
              className="flex-1 rounded-xl cursor-pointer"
            >
              Continue Playing
            </Button>
            <Button
              onClick={handleCompleteMatch}
              className="flex-1 gap-2 btn-teal-gradient rounded-xl cursor-pointer"
            >
              <TrophyIcon className="w-4 h-4" />
              Confirm Winner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guest Match Complete Modal */}
      <GuestMatchComplete
        open={showResultModal}
        onOpenChange={setShowResultModal}
        winner={winner}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        homeScore={homeScore}
        awayScore={awayScore}
        onPlayAgain={resetMatch}
      />

      {/* Rotate Device Prompt */}
      <Dialog open={showRotatePrompt} onOpenChange={setShowRotatePrompt}>
        <DialogContent className="sm:max-w-sm glass-card border-glass-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowPathIcon className="w-5 h-5 text-primary" />
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
                <ArrowPathIcon className="w-8 h-8 text-primary" />
              </div>
            </motion.div>
            <p className="text-sm text-muted-foreground text-center">
              Please rotate your device to landscape mode, then try again.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowRotatePrompt(false)}
              className="w-full btn-teal-gradient rounded-xl cursor-pointer"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
