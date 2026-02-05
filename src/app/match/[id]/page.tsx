"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeftIcon,
  TrophyIcon,
  ArrowUturnLeftIcon,
  CheckIcon,
  ArrowsPointingOutIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import { useMatchPage } from "@/hooks/useMatchPage";
import {
  TeamScorePanel,
  FullscreenControls,
  MatchCompleteDialog,
  RotateDeviceDialog,
} from "@/components/match";

export default function MatchPage() {
  const {
    awayColor,
    awayLeading,
    awayTeam,
    canComplete,
    canEdit,
    handleAddPoint,
    handleBack,
    handleCompleteMatch,
    handleDeductPoint,
    handleFullscreenToggle,
    handleOpenCompleteDialog,
    handleUndo,
    history,
    homeColor,
    homeLeading,
    homeTeam,
    isFullscreen,
    isSharedMode,
    match,
    seriesInfo,
    setShowCompleteDialog,
    setShowRotatePrompt,
    showCompleteDialog,
    showRotatePrompt,
  } = useMatchPage();

  if (!match || !homeTeam || !awayTeam) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-muted/30 flex items-center justify-center">
            <TrophyIcon className="w-10 h-10 text-muted-foreground/30" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Match not found</h2>
          <p className="text-muted-foreground mb-6">
            This match may have been deleted.
          </p>
          <Link href="/">
            <Button variant="outline" className="gap-2 rounded-xl glass-input">
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const endLabel = seriesInfo.isSeries ? "End Game" : "End Match";
  const dialogTitle = seriesInfo.isSeries ? "End Game?" : "End Match?";
  const dialogDescription = seriesInfo.isSeries
    ? "Confirm the final score for this game"
    : "Confirm the final score and winner";
  const confirmLabel = seriesInfo.isSeries
    ? "Confirm Result"
    : "Confirm Winner";

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
              onClick={handleBack}
              className="gap-2 rounded-xl"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <Badge className="status-live gap-1">
                  <PlayIcon className="w-3 h-3" />
                  Live
                </Badge>
                {seriesInfo.isSeries && (
                  <>
                    <Badge variant="secondary" className="text-xs">
                      Best of {seriesInfo.seriesLength}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Game {seriesInfo.gameNumber}
                    </Badge>
                  </>
                )}
              </div>
              {seriesInfo.isSeries && (
                <p className="text-xs text-muted-foreground mt-1">
                  {homeTeam.name} {seriesInfo.homeWins} -{" "}
                  {seriesInfo.awayWins} {awayTeam.name}
                </p>
              )}
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
              {canEdit && (
                <>
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
                    <span className="hidden sm:inline">{endLabel}</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </motion.header>
      )}

      <FullscreenControls
        isFullscreen={isFullscreen}
        canEdit={canEdit}
        canComplete={canComplete}
        historyLength={history.length}
        endLabel={endLabel}
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
          score={match.homeScore}
          isLeading={homeLeading}
          isFullscreen={isFullscreen}
          canEdit={canEdit}
          isSharedMode={isSharedMode}
          onAddPoint={() => handleAddPoint("home")}
          onDeductPoint={() => handleDeductPoint("home")}
        />

        {/* Divider */}
        <div className="hidden md:block w-1 bg-background/50" />
        <div className="block md:hidden h-1 bg-background/50" />

        <TeamScorePanel
          teamName={awayTeam.name}
          teamColor={awayColor}
          score={match.awayScore}
          isLeading={awayLeading}
          isFullscreen={isFullscreen}
          canEdit={canEdit}
          isSharedMode={isSharedMode}
          onAddPoint={() => handleAddPoint("away")}
          onDeductPoint={() => handleDeductPoint("away")}
        />
      </div>

      <MatchCompleteDialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        homeTeamName={homeTeam.name}
        awayTeamName={awayTeam.name}
        homeScore={match.homeScore}
        awayScore={match.awayScore}
        homeColor={homeColor}
        awayColor={awayColor}
        dialogTitle={dialogTitle}
        dialogDescription={dialogDescription}
        confirmLabel={confirmLabel}
        onConfirm={handleCompleteMatch}
      />

      <RotateDeviceDialog
        open={showRotatePrompt}
        onOpenChange={setShowRotatePrompt}
      />
    </div>
  );
}
