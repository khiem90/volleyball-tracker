"use client";

import { useEffect, useMemo } from "react";
import { GUEST_ACCENTS, useGuestQuickMatch } from "@/hooks/useGuestQuickMatch";
import { crestForTeam } from "@/components/matchbook/types";
import { GuestMatchComplete } from "@/components/GuestMatchComplete";
import { MatchCompleteDialog, MatchConsole } from "@/components/match";

/* ===========================================================================
   /match/guest — LAYOUT ONLY

   The same console as `/match/[id]`, which is the point: this route used to be
   a 240-line copy of it that had already drifted — `canEdit={true}` hard-coded
   in three places, its own verbatim copy of the orientation effect, and its own
   `Guest Mode` chip in amber, a colour the system does not have.

   What is genuinely different is stated once, here: two fixed teams, a gold
   `Guest` mark in the fixture line, a rail line saying nothing is saved, and a
   result dialog that offers a sign-in instead of a bracket.
   =========================================================================== */

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

  return (
    <MatchConsole
      home={{
        team: home,
        accent: GUEST_ACCENTS.home,
        score: homeScore,
        leading: !isFinal && homeLeading,
        won: isFinal && winner?.id === homeTeam.id,
      }}
      away={{
        team: away,
        accent: GUEST_ACCENTS.away,
        score: awayScore,
        leading: !isFinal && awayLeading,
        won: isFinal && winner?.id === awayTeam.id,
      }}
      title={`${homeTeam.name} v ${awayTeam.name}`}
      kicker="Guest match"
      back={{ href: "/quick-match", label: "Back" }}
      mode={isFinal ? "final" : "scoring"}
      guest
      endLabel="End Match"
      hint={
        isFinal
          ? "Nothing from this match was saved."
          : tied
            ? "Scores are level — a winner is needed before this can be recorded."
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
        secondary: { label: "Sign In", icon: "login", href: "/login?redirect=/quick-match", tone: "outline-navy" },
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
