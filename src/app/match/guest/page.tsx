"use client";

import { useEffect, useMemo } from "react";
import { GUEST_ACCENTS, useGuestQuickMatch } from "@/hooks/useGuestQuickMatch";
import { crestForTeam } from "@/components/matchbook/types";
import { GuestMatchComplete } from "@/components/GuestMatchComplete";
import { MatchCompleteDialog, MatchConsole } from "@/components/match";

/* /match/guest — the same console as /match/[id], deliberately. What differs
   is stated once here: two fixed teams, a gold Guest mark, a rail line saying
   nothing is saved, and a result dialog offering sign-in instead of a bracket. */

export default function GuestMatchPage() {
  const {
    match,
    canUndo,
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

  const { homeTeam, awayTeam, homeScore, awayScore, status } = match;

  useEffect(() => {
    if (status === "pending") startMatch();
  }, [status, startMatch]);

  const home = useMemo(
    () => ({ name: homeTeam.name, crest: crestForTeam(homeTeam.id, homeTeam.name) }),
    [homeTeam]
  );
  const away = useMemo(
    () => ({ name: awayTeam.name, crest: crestForTeam(awayTeam.id, awayTeam.name) }),
    [awayTeam]
  );

  const isFinal = status === "completed";
  const tied = homeScore === awayScore;
  /* `lost` must be passed alongside `won`, or a finished match renders both
     columns at full weight and leaves the result to the crown alone. */
  const decided = isFinal && !!winner;

  return (
    <MatchConsole
      home={{
        team: home,
        accent: GUEST_ACCENTS.home,
        score: homeScore,
        leading: !isFinal && homeLeading,
        won: isFinal && winner?.id === homeTeam.id,
        lost: decided && winner?.id !== homeTeam.id,
      }}
      away={{
        team: away,
        accent: GUEST_ACCENTS.away,
        score: awayScore,
        leading: !isFinal && awayLeading,
        won: isFinal && winner?.id === awayTeam.id,
        lost: decided && winner?.id !== awayTeam.id,
      }}
      title={`${homeTeam.name} v ${awayTeam.name}`}
      kicker="Guest match"
      back={{ href: "/quick-match", label: "Back" }}
      mode={isFinal ? "final" : "scoring"}
      guest
      endLabel="End Match"
      /* Every hint stays under 40 characters so it holds one line in the
         narrow rail at 320px. */
      hint={
        isFinal
          ? "Nothing here was saved."
          : tied
            ? "Tied — a winner is needed to end."
            : "Guest match — nothing is saved."
      }
      canUndo={canUndo}
      canComplete={canComplete}
      onScore={handleAddPoint}
      onAdjust={(side, delta) =>
        delta > 0 ? handleAddPoint(side) : handleDeductPoint(side)
      }
      onUndo={handleUndo}
      onEnd={handleOpenCompleteDialog}
      finalActions={{
        secondary: { label: "Sign In", icon: "login", href: "/login?redirect=/quick-match", variant: "outline-navy" },
        primary: { label: "Play Again", icon: "refresh", onClick: resetMatch },
      }}
    >
      <MatchCompleteDialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        homeTeam={home}
        awayTeam={away}
        homeScore={homeScore}
        awayScore={awayScore}
        homeAccent={GUEST_ACCENTS.home}
        awayAccent={GUEST_ACCENTS.away}
        dialogTitle="End Match?"
        dialogDescription="Confirm the final score and winner"
        confirmLabel="Confirm Winner"
        onConfirm={handleCompleteMatch}
      />

      <GuestMatchComplete
        open={showResultModal}
        onOpenChange={setShowResultModal}
        winner={winner ? (winner.id === homeTeam.id ? home : away) : null}
        homeTeam={home}
        awayTeam={away}
        homeScore={homeScore}
        awayScore={awayScore}
        homeAccent={GUEST_ACCENTS.home}
        awayAccent={GUEST_ACCENTS.away}
        onPlayAgain={resetMatch}
      />
    </MatchConsole>
  );
}
