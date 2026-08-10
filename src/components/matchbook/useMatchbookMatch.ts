"use client";

import { useMemo } from "react";
import { useMatchPage } from "@/hooks/useMatchPage";
import { crestForTeam } from "./types";
import type { MbConsoleSeries, MbConsoleSide } from "@/components/match/MatchConsole";

/* ===========================================================================
   THE CONSOLE'S VIEW MODEL (charter §2.3, W5/P3a)

   `useMatchPage` owns the state machine and the completion black box; this
   turns what it returns into the shape the console renders, so the route file
   is layout and nothing else (invariant 23).

   The one piece of product logic that lives here is `state`, and it exists
   because the old route conflated four different situations into one error
   screen:

     hydrating          `AppContext` reads localStorage in an effect, so `!match`
                        on the first client render means "not read yet". Every
                        successful load painted "Match not found" for a frame.
     notfound           there really is no match at this address.
     teams-unavailable  the match exists and one of its teams was deleted. The
                        old copy said "Match not found. This match may have been
                        deleted." about a match that is right there.
     ready              everything else.

   `mode` then splits `ready` three ways, and THIS is where the known bug dies:
   a `status: "completed"` match reports `mode: "final"`, so the console draws no
   Live badge, no "Tap to score" and no steppers. It used to draw all three and
   swallow the taps in silence (`useMatchPage`'s own guards), which is a screen
   telling you it is live while refusing to move.
   =========================================================================== */

export type MbMatchState = "hydrating" | "notfound" | "teams-unavailable" | "ready";

export interface MbMatchConsoleModel {
  state: MbMatchState;
  /** Where "back" goes: the parent competition, else the overview. */
  backHref: string;
  home: MbConsoleSide | null;
  away: MbConsoleSide | null;
  title: string;
  kicker: string | null;
  mode: "scoring" | "final" | "watch";
  series: MbConsoleSeries | null;
  /** `End Game` inside a series, `End Match` otherwise. */
  endLabel: string;
  dialogTitle: string;
  dialogDescription: string;
  confirmLabel: string;
  /** The rail's one line, or null when there is nothing worth saying. */
  hint: string | null;
  completedOn: string | null;
}

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const useMatchbookMatch = () => {
  const page = useMatchPage();
  const {
    match,
    homeTeam,
    awayTeam,
    competition,
    hydrated,
    canEdit,
    isSharedMode,
    seriesInfo,
    canUndo,
    undoRestored,
  } = page;

  const model = useMemo<MbMatchConsoleModel>(() => {
    const base = {
      backHref: page.backHref,
      home: null,
      away: null,
      title: "Match",
      kicker: null,
      mode: "scoring" as const,
      series: null,
      endLabel: "End Match",
      dialogTitle: "End Match?",
      dialogDescription: "Confirm the final score and winner",
      confirmLabel: "Confirm Winner",
      hint: null,
      completedOn: null,
    };

    if (!match) {
      return { ...base, state: hydrated ? "notfound" : "hydrating" };
    }
    if (!homeTeam || !awayTeam) {
      /* A deleted team is NOT a missing match. The old route reported both with
         the same words, so a live fixture whose roster had been edited read as
         gone (brief §2.4.6). */
      return { ...base, state: hydrated ? "teams-unavailable" : "hydrating" };
    }

    const isFinal = match.status === "completed";
    const mode = isFinal ? "final" : !canEdit && isSharedMode ? "watch" : "scoring";

    const home: MbConsoleSide = {
      team: { name: homeTeam.name, crest: crestForTeam(homeTeam.id, homeTeam.name) },
      accent: homeTeam.color,
      score: match.homeScore,
      leading: !isFinal && page.homeLeading,
      won: isFinal && match.winnerId === homeTeam.id,
    };
    const away: MbConsoleSide = {
      team: { name: awayTeam.name, crest: crestForTeam(awayTeam.id, awayTeam.name) },
      accent: awayTeam.color,
      score: match.awayScore,
      leading: !isFinal && page.awayLeading,
      won: isFinal && match.winnerId === awayTeam.id,
    };

    const series: MbConsoleSeries | null = seriesInfo.isSeries
      ? {
          length: seriesInfo.seriesLength,
          game: seriesInfo.gameNumber,
          homeWins: seriesInfo.homeWins,
          awayWins: seriesInfo.awayWins,
        }
      : null;

    /* One line, and only when it earns its row. A tie is the one that matters:
       `End Match` silently refused to open with no explanation at all. */
    const tied = match.homeScore === match.awayScore;
    const hint =
      mode !== "scoring"
        ? null
        : tied
          ? "Scores are level — a winner is needed before this can be recorded."
          : !undoRestored || canUndo
            ? null
            : "Undo starts from the next point.";

    return {
      ...base,
      state: "ready",
      home,
      away,
      title: `${homeTeam.name} v ${awayTeam.name}`,
      kicker: competition?.name ?? "Quick match",
      mode,
      series,
      endLabel: seriesInfo.isSeries ? "End Game" : "End Match",
      dialogTitle: seriesInfo.isSeries ? "End Game?" : "End Match?",
      dialogDescription: seriesInfo.isSeries
        ? "Confirm the final score for this game"
        : "Confirm the final score and winner",
      confirmLabel: seriesInfo.isSeries ? "Confirm Result" : "Confirm Winner",
      hint,
      completedOn: match.completedAt ? DATE.format(match.completedAt) : null,
    };
  }, [
    match,
    homeTeam,
    awayTeam,
    competition,
    hydrated,
    canEdit,
    isSharedMode,
    seriesInfo,
    canUndo,
    undoRestored,
    page.backHref,
    page.homeLeading,
    page.awayLeading,
  ]);

  return { ...page, model };
};
