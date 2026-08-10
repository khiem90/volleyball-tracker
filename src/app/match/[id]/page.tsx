"use client";

import { MatchbookShell } from "@/components/matchbook/AppShell";
import { MbEmptyState } from "@/components/matchbook/EmptyState";
import { useMatchbookMatch } from "@/components/matchbook/useMatchbookMatch";
import {
  MatchCompleteDialog,
  MatchConsole,
  MatchConsoleSkeleton,
} from "@/components/match";

/* ===========================================================================
   /match/[id] — LAYOUT ONLY

   Every number, label and branch comes from `useMatchbookMatch`; every pixel
   comes from `MatchConsole`. What is left here is which of four screens the
   route is showing, which is the one decision a route file should own.
   =========================================================================== */

export default function MatchPage() {
  const {
    model,
    match,
    canComplete,
    canUndo,
    undoRestored,
    handleAddPoint,
    handleCompleteMatch,
    handleDeductPoint,
    handleOpenCompleteDialog,
    handleUndo,
    setShowCompleteDialog,
    showCompleteDialog,
  } = useMatchbookMatch();

  /* The first paint of a successful load. This used to be the error screen. */
  if (model.state === "hydrating") return <MatchConsoleSkeleton />;

  if (model.state !== "ready" || !model.home || !model.away || !match) {
    const missingTeams = model.state === "teams-unavailable";
    return (
      <MatchbookShell variant="focus" back={{ href: model.backHref, label: "Back" }}>
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <MbEmptyState
            tone={missingTeams ? "error" : "notfound"}
            title={missingTeams ? "This match is missing a team" : "No match at this address"}
            body={
              missingTeams
                ? "The match is still here, but one of the teams that played it has been deleted. Re-create the team, or open the competition to edit the fixture."
                : "Nothing exists at this address. The match may have been deleted, or the link may be mistyped."
            }
            actions={[
              { label: "Back", href: model.backHref, icon: "chevron-left" },
              { label: "Match History", href: "/summaries", icon: "history", tone: "outline-navy" },
            ]}
          />
        </div>
      </MatchbookShell>
    );
  }

  return (
    <MatchConsole
      home={model.home}
      away={model.away}
      title={model.title}
      kicker={model.kicker}
      /* A destination, not an `onClick` — the shell renders an anchor with the
         word "Back" for one and an icon-only disc for the other, and a header
         control with no visible word is exactly what this redesign removed. */
      back={{ href: model.backHref, label: "Back" }}
      mode={model.mode}
      series={model.series}
      endLabel={model.endLabel}
      hint={model.hint}
      canUndo={canUndo}
      undoRestored={undoRestored}
      canComplete={canComplete}
      onScore={handleAddPoint}
      onAdjust={(side, delta) =>
        delta > 0 ? handleAddPoint(side) : handleDeductPoint(side)
      }
      onUndo={handleUndo}
      onEnd={handleOpenCompleteDialog}
      finalActions={{
        secondary: {
          label: "Match History",
          icon: "history",
          href: "/summaries",
          tone: "outline-navy",
        },
        primary: {
          label: model.backHref === "/" ? "Back to Overview" : "Back to Competition",
          icon: "chevron-left",
          href: model.backHref,
        },
      }}
      live={{ status: "live" }}
    >
      <MatchCompleteDialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        homeTeam={model.home.team}
        awayTeam={model.away.team}
        homeScore={model.home.score}
        awayScore={model.away.score}
        homeAccent={model.home.accent}
        awayAccent={model.away.accent}
        dialogTitle={model.dialogTitle}
        dialogDescription={model.dialogDescription}
        confirmLabel={model.confirmLabel}
        onConfirm={handleCompleteMatch}
      />
    </MatchConsole>
  );
}
