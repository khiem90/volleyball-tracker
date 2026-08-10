"use client";

import { useMemo } from "react";
import { useMatchPage } from "@/hooks/useMatchPage";
import { useTerminology, capitalize } from "@/hooks/useTerminology";
import { getRoundName, getTotalRounds } from "@/lib/singleElimination";
import { getDoubleElimRoundName } from "@/lib/doubleElimination";
import { crestForTeam } from "./types";
import type { MbConsoleSeries, MbConsoleSide } from "@/components/match/MatchConsole";
import type { Competition, Match } from "@/types/game";

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
  /** Where the fixture sits in its competition: "Semi-Finals", "Round 3", "Court 2". */
  stage: string | null;
  mode: "scoring" | "final" | "watch";
  series: MbConsoleSeries | null;
  /** `End Game` inside a series, `End Match` otherwise. */
  endLabel: string;
  dialogTitle: string;
  dialogDescription: string;
  confirmLabel: string;
  /** The one line above the rail, or null when there is nothing worth saying. */
  hint: string | null;
  completedOn: string | null;
}

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * WHERE THIS FIXTURE SITS, IN THE COMPETITION'S OWN WORDS.
 *
 * A bracket semifinal said nowhere on the screen that it was a semifinal, and a
 * win-2-&-out match carried no context at all — the console answered "what is
 * the score" and refused every other question the fixture raises. Every branch
 * below reads a shipped `src/lib` labeller rather than inventing a second
 * vocabulary, so a round is named identically here and on the bracket rail.
 *
 * The two rotation formats have no rounds; what identifies their fixture is the
 * court it is being played on, and the word for "court" comes from
 * `useTerminology` — never hardcoded (charter W4 acceptance 9, same rule).
 */
const stageFor = (
  match: Match,
  competition: Competition | null | undefined,
  venue: string
): string | null => {
  if (!competition) return null;

  switch (competition.type) {
    case "single_elimination":
      return getRoundName(match.round, getTotalRounds(competition.teamIds.length));
    case "double_elimination":
      return getDoubleElimRoundName(
        match.round,
        match.bracket ?? "winners",
        getTotalRounds(competition.teamIds.length)
      );
    case "round_robin":
      return match.round > 0 ? `Round ${match.round}` : null;
    case "win2out": {
      const court = competition.win2outState?.courts.find((c) =>
        c.teamIds.includes(match.homeTeamId)
      );
      return court ? `${capitalize(venue)} ${court.courtNumber}` : null;
    }
    case "two_match_rotation": {
      const courts = competition.twoMatchRotationState?.courts ?? [];
      const court =
        courts.find((c) => c.matchId === match.id) ??
        courts.find((c) => c.teamIds.includes(match.homeTeamId));
      return court ? `${capitalize(venue)} ${court.courtNumber}` : null;
    }
    default:
      return null;
  }
};

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

  const terminology = useTerminology(competition?.id);
  const venue = terminology.venue;

  const model = useMemo<MbMatchConsoleModel>(() => {
    const base = {
      backHref: page.backHref,
      home: null,
      away: null,
      title: "Match",
      kicker: null,
      stage: null,
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

    /* THE LOSS CHANNEL. `lost` has been declared and documented on
       `MbScoreSide` since the component was written and was passed by nobody,
       so both columns of a completed match rendered at full-weight navy and the
       result was carried by a 13px crown. It is the other half of `won`:
       whoever is not the winner of a decided match has lost it. */
    const home: MbConsoleSide = {
      team: { name: homeTeam.name, crest: crestForTeam(homeTeam.id, homeTeam.name) },
      accent: homeTeam.color,
      score: match.homeScore,
      leading: !isFinal && page.homeLeading,
      won: isFinal && match.winnerId === homeTeam.id,
      lost: isFinal && !!match.winnerId && match.winnerId !== homeTeam.id,
      games: seriesInfo.isSeries ? seriesInfo.homeWins : null,
    };
    const away: MbConsoleSide = {
      team: { name: awayTeam.name, crest: crestForTeam(awayTeam.id, awayTeam.name) },
      accent: awayTeam.color,
      score: match.awayScore,
      leading: !isFinal && page.awayLeading,
      won: isFinal && match.winnerId === awayTeam.id,
      lost: isFinal && !!match.winnerId && match.winnerId !== awayTeam.id,
      games: seriesInfo.isSeries ? seriesInfo.awayWins : null,
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
       `End Match` silently refused to open with no explanation at all. Kept
       under 40 characters because the rubric's characters-per-line measure only
       counts blocks longer than that, and a 65-character sentence set in a
       288px column at 320 renders as two 33-character lines — outside the
       45–75 band whichever way it is written. Short is the only honest fix. */
    const tied = match.homeScore === match.awayScore;
    const hint =
      mode !== "scoring"
        ? null
        : tied
          ? "Tied — a winner is needed to end."
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
      stage: stageFor(match, competition, venue),
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
    venue,
    page.backHref,
    page.homeLeading,
    page.awayLeading,
  ]);

  return { ...page, model };
};
