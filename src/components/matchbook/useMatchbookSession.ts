"use client";

/* ===========================================================================
   THE PUBLIC SESSION VIEW

   `/session/<code>` is the only screen in this product a stranger ever sees.
   Someone is handed a link at 7pm, on a phone, in a gym, on bad wifi, and has
   to understand the state of a tournament before they lose interest. Every
   decision in this file is downstream of that sentence.

   It mirrors `useMatchbookHistory` / `useMatchbookCompetitionDetail`: all
   shaping here, the route file carries layout only.
   `useSessionPage` keeps the joining, the roles and the navigation — the two
   are deliberately not merged, because one of them talks to Firestore through
   `SessionContext` and this one is a pure function of a `Session` object.

   ------------------------------------------------------------- the rules

   `counts.upcoming` is pending only — never pending + live, which counts the
   live matches twice on the counter a stranger reads first.

   Ranking goes through `rankTeams()` — `lib/standings.ts` exists to be the
   only answer — so the table cannot reorder the instant a session ends.

   Two match lists exist: `scoped` drives the standings and the bracket, `all`
   drives what is on court, what is next and what just finished, so a quick
   match (`competitionId === null`) inside a shared session stays visible.
   Scoping happens ONCE — re-filtering by `competitionId` downstream wrongly
   drops matches for a competition whose `matchIds` carry a different one.

   The series is handed to `MbScoreboardHero`, which clamps `game` to `of` in
   its own constructor, so "Game 4 of 3" cannot be reintroduced by a caller.

   ------------------------------------------------------------- what it caps

   Nothing on screen is unbounded. The two ledgers come back whole and the
   panels open at `LEDGER_CAP` rows with the rest one press away — the cap is
   exported from here so the two panels cannot disagree, but it is applied at
   the panel, because a hook that truncates its own return value cannot offer
   "show all". The live board is pre-split into `courts.shown` /`courts.rest`
   for the same reason, at `COURTS_SHOWN`. The measured worst case in the
   fixture set is 14 teams / 91 fixtures / 6 live; uncapped that is a 5,000px
   page on a phone before the score is legible.
   =========================================================================== */

import { useMemo } from "react";
import { rankTeamsWithMovement } from "@/lib/standings";
import { getRoundName, getTotalRounds } from "@/lib/singleElimination";
import { teamColorCss } from "@/lib/teamColor";
import type { Match, PersistentTeam } from "@/types/game";
import type { CompetitionType } from "@/types/game";
import type { Session } from "@/types/session";
import { DEFAULT_TERMINOLOGY } from "@/types/competition-config";
import { FORMAT_META, isEliminationFormat } from "./formatMeta";
import { buildTeamTallies, recentForm } from "./teamStats";
import type { MbTeam } from "./types";
import type { MbStandingLine } from "./StandingsTable";
import type { MbMatchRowStatus } from "./MatchRow";
import type { MbScoreboardSeries } from "./ScoreboardHero";
import type { MbBracketRound, MbBracketSection } from "./bracketLayout";
import {
  bracketCellFor,
  buildDoubleBracket,
  createTeamRef,
} from "./useMatchbookCompetitionDetail";

/** Rows a ledger panel opens with before it offers the rest. */
export const LEDGER_CAP = 5;
/** Scoreboards drawn before the board collapses into a "more courts" row. */
export const COURTS_SHOWN = 2;

/** One line of the "Next up" or "Latest results" ledger. */
export interface MbSessionLine {
  id: string;
  label: string;
  home: MbTeam | null;
  away: MbTeam | null;
  homeScore: number;
  awayScore: number;
  homeWon: boolean;
  awayWon: boolean;
  status: MbMatchRowStatus;
}

/** One live scoreboard. */
export interface MbSessionCourt {
  id: string;
  home: MbTeam;
  away: MbTeam;
  homeScore: number;
  awayScore: number;
  /** Team colour, drawn as a contained 3px bar only. */
  homeAccent?: string;
  awayAccent?: string;
  series?: MbScoreboardSeries;
}

/** One team waiting its turn in a rotation format. */
export interface MbSessionQueueEntry {
  teamId: string;
  team: MbTeam;
  /** A quiet measure under the name — "2 played", "on court 1". */
  sub?: string;
}

export interface MbSessionView {
  /** False for a session whose competition has not been attached yet (S8). */
  hasCompetition: boolean;
  format: CompetitionType | null;
  typeLabel: string;
  typeIcon: string;
  teamCount: number;
  /** "Round Robin · 8 teams" — the strip's kicker, without the share code. */
  metaLine: string;
  counts: { upcoming: number; live: number; final: number };
  live: MbSessionCourt[];
  /** Live matches beyond `COURTS_SHOWN`, so the board can offer them. */
  courts: { shown: MbSessionCourt[]; rest: MbSessionCourt[] };
  /** Every unplayed fixture, in the order it will be played. */
  nextUp: MbSessionLine[];
  /** Every finished match, newest first. */
  latest: MbSessionLine[];
  standings: MbStandingLine[] | null;
  bracket: { sections: MbBracketSection[] } | null;
  queue: MbSessionQueueEntry[] | null;
  /** Capitalised venue word from this competition's own terminology. */
  venueWord: string;
  /**
   * One plain sentence describing the state of play. It is what the ended
   * state prints, and what a link preview would carry if `generateMetadata`
   * ever gets a server-side read.
   */
  storyLine: string;
}

const EMPTY: MbSessionView = {
  hasCompetition: false,
  format: null,
  typeLabel: "Event",
  typeIcon: "compete",
  teamCount: 0,
  metaLine: "",
  counts: { upcoming: 0, live: 0, final: 0 },
  live: [],
  courts: { shown: [], rest: [] },
  nextUp: [],
  latest: [],
  standings: null,
  bracket: null,
  queue: null,
  venueWord: "Court",
  storyLine: "",
};

const capitalise = (word: string) =>
  word.length === 0 ? word : word[0].toUpperCase() + word.slice(1);

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * Team colour, only when it is a real value.
 *
 * `PersistentTeam.color` is optional. Never fall back to a grey: that turns
 * "this team has no colour" into "this team's colour is grey". No colour
 * means no bar; the crest already carries the identity.
 */
const accentOf = (team?: PersistentTeam) => teamColorCss(team?.color);

const seriesOf = (match: Match): MbScoreboardSeries | undefined => {
  const of = match.seriesLength ?? 1;
  if (of <= 1) return undefined;
  const homeWins = match.homeWins ?? 0;
  const awayWins = match.awayWins ?? 0;
  return { game: homeWins + awayWins + 1, of, homeWins, awayWins };
};

const statusOf = (match: Match): MbMatchRowStatus =>
  match.status === "in_progress"
    ? "live"
    : match.status === "completed"
      ? "completed"
      : "pending";

export const useMatchbookSession = ({
  session,
}: {
  session: Session | null;
}): MbSessionView =>
  useMemo(() => {
    if (!session) return EMPTY;

    const competition = session.competition;
    const teams = session.teams ?? [];
    const all = session.matches ?? [];
    const refFor = createTeamRef(teams);
    const teamById = new Map(teams.map((team) => [team.id, team]));

    /* Scoped ONCE, here. `matchIds` wins when the competition carries it,
       because a rotation format's matches are enumerated there and may not
       carry a matching `competitionId` at all. */
    const scoped = !competition
      ? []
      : competition.matchIds && competition.matchIds.length > 0
        ? (() => {
            const ids = new Set(competition.matchIds);
            return all.filter((match) => ids.has(match.id));
          })()
        : all.filter((match) => match.competitionId === competition.id);

    const liveMatches = all.filter((m) => m.status === "in_progress");
    const pending = all.filter((m) => m.status === "pending");
    const completed = all.filter((m) => m.status === "completed" && !m.isBye);

    const terminology = {
      ...DEFAULT_TERMINOLOGY,
      ...competition?.config?.terminology,
    };
    const venueWord = capitalise(terminology.venue);

    /* ------------------------------------------------------------- courts */

    const live: MbSessionCourt[] = liveMatches.map((match) => ({
      id: match.id,
      home: refFor(match.homeTeamId),
      away: refFor(match.awayTeamId),
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      homeAccent: accentOf(teamById.get(match.homeTeamId)),
      awayAccent: accentOf(teamById.get(match.awayTeamId)),
      series: seriesOf(match),
    }));

    /* ------------------------------------------------------------- ledgers */

    const isElimination = competition
      ? isEliminationFormat(competition.type)
      : false;

    const labelFor = (match: Match) => {
      if (match.competitionId === null) return "Quick";
      if (isElimination) {
        const side = match.bracket === "losers" ? "L" : "";
        return `${side}R${match.round} · M${match.position}`;
      }
      return `R${match.round} · M${match.position}`;
    };

    const lineFor = (match: Match): MbSessionLine => ({
      id: match.id,
      label: labelFor(match),
      home: match.homeTeamId ? refFor(match.homeTeamId) : null,
      away: match.awayTeamId ? refFor(match.awayTeamId) : null,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      homeWon: match.status === "completed" && match.winnerId === match.homeTeamId,
      awayWon: match.status === "completed" && match.winnerId === match.awayTeamId,
      status: statusOf(match),
    });

    /* Fixtures in the order they will be played; results newest first, which is
       the order a person asks about them in. */
    const nextSorted = [...pending].sort(
      (a, b) => a.round - b.round || a.position - b.position
    );
    const resultsSorted = [...completed].sort(
      (a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)
    );

    /* ----------------------------------------------------------- standings */

    const tallies = buildTeamTallies(resultsSorted);

    const standings: MbStandingLine[] | null =
      competition && competition.type === "round_robin"
        ? rankTeamsWithMovement(competition.teamIds, scoped, competition.config).map((row) => ({
            teamId: row.teamId,
            team: refFor(row.teamId),
            rank: row.rank,
            sharesRank: row.sharesRank,
            played: row.played,
            won: row.won,
            lost: row.lost,
            tied: row.tied,
            pointsFor: row.pointsFor,
            pointsAgainst: row.pointsAgainst,
            diff: row.pointsDiff,
            points: row.competitionPoints,
            form: recentForm(tallies.get(row.teamId)),
            movement: row.movement,
          }))
        : null;

    /* ------------------------------------------------------------- bracket */

    /* `buildDoubleBracket` is imported rather than reimplemented — it is the
       W4 builder the competition console already uses, so the two screens
       cannot draw the same tournament two different ways. The single-
       elimination path is inlined only because W4's `buildSingleBracket` also
       returns a champion block this screen has no room for. */
    let bracket: { sections: MbBracketSection[] } | null = null;
    if (competition && isElimination) {
      if (competition.type === "double_elimination") {
        bracket = {
          sections: buildDoubleBracket(
            scoped,
            competition.teamIds.length,
            refFor
          ).sections,
        };
      } else {
        const total = getTotalRounds(competition.teamIds.length);
        const rounds: MbBracketRound[] = [];
        for (let round = 1; round <= total; round += 1) {
          const cells = scoped
            .filter((m) => m.round === round)
            .sort((a, b) => a.position - b.position)
            .map((m) => bracketCellFor(m, refFor));
          if (cells.length > 0) {
            rounds.push({ label: getRoundName(round, total), cells });
          }
        }
        /* `current` marks the round the event is ON — the earliest with a live
           cell, else the earliest with an unplayed one. Without it every round
           head reads identically and the rail gives a stranger no anchor. */
        let at = rounds.findIndex((r) => r.cells.some((c) => c.live));
        if (at === -1)
          at = rounds.findIndex((r) => r.cells.some((c) => c.pending && !c.bye));
        bracket =
          rounds.length > 0
            ? {
                sections: [
                  {
                    id: "main",
                    label: "Bracket",
                    accent: "teal",
                    rounds: rounds.map((round, i) => ({
                      ...round,
                      current: i === at,
                    })),
                  },
                ],
              }
            : null;
      }
    }

    /* --------------------------------------------------------------- queue */

    const rotation =
      competition?.win2outState?.queue ??
      competition?.twoMatchRotationState?.queue ??
      null;

    const queue: MbSessionQueueEntry[] | null = rotation
      ? rotation.map((teamId) => {
          const tally = tallies.get(teamId);
          return {
            teamId,
            team: refFor(teamId),
            sub: tally ? `${plural(tally.played, "match", "matches")} played` : undefined,
          };
        })
      : null;

    /* ----------------------------------------------------------- storyline */

    const storyLine = (() => {
      if (live.length === 1) {
        const one = live[0];
        return `${one.home.name} ${one.homeScore} – ${one.awayScore} ${one.away.name}`;
      }
      if (live.length > 1) return `${live.length} matches on court right now`;
      if (nextSorted.length > 0) {
        const next = nextSorted[0];
        return `Next up: ${refFor(next.homeTeamId).name} v ${refFor(next.awayTeamId).name}`;
      }
      if (completed.length > 0) return `All ${completed.length} matches finished`;
      return "No matches have been played yet";
    })();

    const meta = competition ? FORMAT_META[competition.type] : null;

    return {
      hasCompetition: Boolean(competition),
      format: competition?.type ?? null,
      typeLabel: meta?.label ?? "Event",
      typeIcon: meta?.icon ?? "compete",
      teamCount: teams.length,
      metaLine: [meta?.label, plural(teams.length, "team")]
        .filter(Boolean)
        .join(" · "),
      counts: {
        upcoming: pending.length,
        live: liveMatches.length,
        final: completed.length,
      },
      live,
      courts: {
        shown: live.slice(0, COURTS_SHOWN),
        rest: live.slice(COURTS_SHOWN),
      },
      nextUp: nextSorted.map(lineFor),
      latest: resultsSorted.map(lineFor),
      standings,
      bracket,
      queue,
      venueWord,
      storyLine,
    };
  }, [session]);
