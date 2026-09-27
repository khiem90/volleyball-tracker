"use client";

import { useEffect } from "react";
import { ScoringScreen } from "@/components/match";
import { GuestMatchComplete } from "@/components/GuestMatchComplete";
import { useGuestQuickMatch } from "@/hooks/useGuestQuickMatch";
import { blockMessage, scoringAccess, seriesInfo, winnerSide } from "@/lib/scoring";

/**
 * A guest's quick match: two stock teams, scored in memory and never
 * saved. The same scoring screen as a signed-in match, with a Guest tag
 * and the result shown in a dialog at the end.
 */
export default function GuestMatchPage() {
  const {
    match,
    history,
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

  // A guest match starts as soon as the page opens.
  useEffect(() => {
    if (match.status === "pending") startMatch();
  }, [match.status, startMatch]);

  const { homeTeam, awayTeam, homeScore, awayScore, status } = match;
  const sides = { homeTeamId: homeTeam.id, awayTeamId: awayTeam.id };
  const access = scoringAccess("owner", { status, ...sides }, null);
  const notice = access.canScore ? null : blockMessage(access.reason, "guest");

  return (
    <ScoringScreen
      home={{ name: homeTeam.name, color: homeTeam.color, score: homeScore }}
      away={{ name: awayTeam.name, color: awayTeam.color, score: awayScore }}
      status={status}
      series={seriesInfo({ status })}
      winner={winnerSide({ winnerId: match.winnerId, ...sides })}
      access={access}
      notice={notice}
      // Closing the result leaves the completed match on screen, so the
      // guest can still start the next one from here.
      noticeAction={status === "completed" ? { label: "Play again", onClick: resetMatch } : undefined}
      backHref="/quick-match"
      backLabel="Quick match"
      tag="Guest"
      canUndo={history.length >= 2}
      onAddPoint={handleAddPoint}
      onDeductPoint={handleDeductPoint}
      onUndo={handleUndo}
      onOpenCompleteDialog={handleOpenCompleteDialog}
      complete={{
        open: showCompleteDialog,
        isBusy: false,
        error: null,
        onOpenChange: setShowCompleteDialog,
        onConfirm: handleCompleteMatch,
      }}
    >
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
    </ScoringScreen>
  );
}
