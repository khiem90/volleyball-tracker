"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeftIcon,
  ArrowUturnLeftIcon,
  CheckIcon,
  ArrowsPointingOutIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import { useGuestQuickMatch } from "@/hooks/useGuestQuickMatch";
import { useFullscreen } from "@/hooks/useFullscreen";
import { GuestMatchComplete } from "@/components/GuestMatchComplete";
import {
  TeamScorePanel,
  FullscreenControls,
  MatchCompleteDialog,
  RotateDeviceDialog,
} from "@/components/match";

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

      <FullscreenControls
        isFullscreen={isFullscreen}
        canEdit={true}
        canComplete={canComplete}
        historyLength={history.length}
        endLabel="End Match"
        onUndo={handleUndo}
        onOpenCompleteDialog={handleOpenCompleteDialog}
        onFullscreenToggle={handleFullscreenToggle}
      />

      {/* Score Panels */}
      <div
        className={`flex-1 flex ${
          isFullscreen ? "flex-row" : "flex-col md:flex-row"
        }`}
      >
        <TeamScorePanel
          teamName={homeTeam.name}
          teamColor={homeColor}
          score={homeScore}
          isLeading={homeLeading}
          isFullscreen={isFullscreen}
          canEdit={true}
          onAddPoint={() => handleAddPoint("home")}
          onDeductPoint={() => handleDeductPoint("home")}
        />

        {/* Divider */}
        <div className="hidden md:block w-1 bg-background/50" />
        <div className="block md:hidden h-1 bg-background/50" />

        <TeamScorePanel
          teamName={awayTeam.name}
          teamColor={awayColor}
          score={awayScore}
          isLeading={awayLeading}
          isFullscreen={isFullscreen}
          canEdit={true}
          onAddPoint={() => handleAddPoint("away")}
          onDeductPoint={() => handleDeductPoint("away")}
        />
      </div>

      <MatchCompleteDialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        homeTeamName={homeTeam.name}
        awayTeamName={awayTeam.name}
        homeScore={homeScore}
        awayScore={awayScore}
        homeColor={homeColor}
        awayColor={awayColor}
        dialogTitle="End Match?"
        dialogDescription="Confirm the final score and winner"
        confirmLabel="Confirm Winner"
        onConfirm={handleCompleteMatch}
      />

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

      <RotateDeviceDialog
        open={showRotatePrompt}
        onOpenChange={setShowRotatePrompt}
      />
    </div>
  );
}
