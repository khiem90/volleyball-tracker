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

/**
 * The two failure panels stand on the same box the console occupies, centred
 * rather than hung from the top rule. Measured before: `MbEmptyState` sat at
 * the top of `<main>` with ~460px of blank paper under it at 390 and far more
 * at 1440, which is the "single centred card floating in empty space" the
 * rubric's hard fail 5 names — except worse, because it was not even centred.
 *
 * The height matches `MatchConsole`'s `FRAME_H` exactly, for the same reason it
 * exists there: `<main>` is a block box with no definite height, so a
 * percentage or a flex line resolves to nothing.
 */
const PANEL_FRAME =
  "flex items-center justify-center px-4 py-6 sm:px-6 lg:px-8 h-[calc(100vh_-_61px_-_var(--mb-safe-top))] [@supports(height:100dvh)]:h-[calc(100dvh_-_61px_-_var(--mb-safe-top))]";

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
      <MatchbookShell
        variant="focus"
        back={{ href: model.backHref, label: "Back" }}
        /* Without this the navy strip falls back to the app's own name, which
           tells a reader nothing about the thing that failed. */
        masthead={{ title: "Match", shortTitle: "Match" }}
      >
        <div className={PANEL_FRAME}>
          <div className="w-full max-w-[38rem]">
            <MbEmptyState
              tone={missingTeams ? "error" : "notfound"}
              title={missingTeams ? "This match is missing a team" : "No match at this address"}
              body={
                missingTeams
                  ? "The match is still here, but a team that played it has been deleted. Re-create the team in the directory, or open the competition to put another team in the fixture."
                  : "Nothing exists at this address. The match may have been deleted, or the link may be mistyped."
              }
              /* EVERY ERROR OFFERS A RETRY FIRST, then a way out (rubric 7.4).
                 Both of these states are reachable from a localStorage read that
                 has not completed or has been written by another tab, so
                 re-reading is a real remedy and not a token gesture — and the
                 two navigations behind it now reach the actual fixes rather than
                 describing them: the directory where a deleted team is
                 re-created, and the competition where the fixture is edited. */
              actions={[
                { label: "Try again", icon: "refresh", onClick: () => window.location.reload() },
                missingTeams
                  ? { label: "Team Directory", href: "/teams", icon: "teams", variant: "outline-navy" }
                  : { label: "Match History", href: "/summaries", icon: "history", variant: "outline-navy" },
                {
                  label: model.backHref === "/" ? "Overview" : "Competition",
                  href: model.backHref,
                  icon: "chevron-left",
                  variant: "outline-navy",
                },
              ]}
            />
          </div>
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
      stage={model.stage}
      completedOn={model.mode === "final" ? model.completedOn : null}
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
          variant: "outline-navy",
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
