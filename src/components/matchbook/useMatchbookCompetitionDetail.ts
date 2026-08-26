"use client";

import { useMemo } from "react";
import { useTerminology } from "@/hooks/useTerminology";
import { rankTeamsWithMovement } from "@/lib/standings";
import { getRoundName, getTotalRounds } from "@/lib/singleElimination";
import {
  getDoubleBracketStructure,
  getDoubleElimRoundName,
  getTotalWinnersRounds,
} from "@/lib/doubleElimination";
import { getChampionCount, getCurrentChampionStreak } from "@/lib/win2out";
import { getSessionMatchCount } from "@/lib/twoMatchRotation";
import { pluralise } from "@/lib/text";
import {
  DEFAULT_COMPETITION_CONFIG,
  DEFAULT_TERMINOLOGY,
} from "@/types/competition-config";
import type { Competition, Match, PersistentTeam } from "@/types/game";
import { FORMAT_META, isEliminationFormat } from "./formatMeta";
import { buildTeamTallies, recentForm } from "./teamStats";
import { crestForTeam, type MbTeam } from "./types";
import type { MbStandingLine } from "./StandingsTable";
import type {
  MbBracketCellData,
  MbBracketChampion,
  MbBracketRound,
  MbBracketSection,
} from "./BracketRail";

/* ===========================================================================
   THE COMPETITION-DETAIL VIEW MODEL

   Every converted screen shapes its data in a `useMatchbook*` hook and keeps
   the route file to layout. This module owns all of it: crests, ranking,
   bracket rounds, courts, the queue, the leaderboard, the ledger, terminology
   and the config readout. `useCompetitionDetailPage.ts` keeps the MUTATIONS —
   in particular the auto-complete effect and the auto-session effect, which
   are easy to fire twice by changing the identity of `matches`.

   One ranking source: `rankTeams()`, so the live table, the champion the
   auto-complete effect derives and the summary a session generates cannot
   disagree.
   =========================================================================== */

/* ------------------------------------------------------------------ shapes */

export type MbLineStatus = "pending" | "live" | "completed";

/** A match, shaped for `MbMatchRow`, with the match itself kept for actions. */
export interface MbMatchLine {
  id: string;
  match: Match;
  label: string;
  subLabel?: string;
  home: MbTeam | null;
  away: MbTeam | null;
  homeScore: number;
  awayScore: number;
  homeWon: boolean;
  awayWon: boolean;
  status: MbLineStatus;
  /**
   * A walkover. `home` is the team that advanced and `away` is null; the
   * scores are the generator's own bookkeeping and MUST NOT be rendered.
   */
  bye: boolean;
}

export interface MbScheduleRound {
  /** Unique across brackets: a DE schedule has a winners R1 AND a losers R1. */
  id: string;
  round: number;
  label: string;
  /** True when every match in the round is finished. Drives the collapse. */
  complete: boolean;
  lines: MbMatchLine[];
}

export interface MbCourtLine {
  match: Match;
  court: number;
  home: MbTeam;
  away: MbTeam;
  homeScore: number;
  awayScore: number;
  status: "pending" | "live";
  homeSub?: string;
  awaySub?: string;
}

export interface MbQueueLine {
  teamId: string;
  team: MbTeam;
  position: number;
  note: string;
}

export interface MbLeaderLine {
  teamId: string;
  team: MbTeam;
  rank: number;
  /** The format's headline measure — crowns for win2out, wins for rotation. */
  primary: number;
  played: number;
  won: number;
  lost: number;
  pct: string;
  onCourt: boolean;
}

export interface MbConfigLine {
  icon: string;
  label: string;
  value: string;
}

export interface MbDraftPreview {
  /** One sentence: what pressing Start will generate. */
  summary: string;
  /**
   * Seeded round-one pairings for an elimination format, with the seed each
   * team enters on. The seeds are the whole point of a seeded draw — 1 v 8
   * and 4 v 5 are checkable, "Nova v Storm" is not.
   */
  pairings: { home: MbTeam; away: MbTeam; homeSeed: number; awaySeed: number }[];
  /** Teams that receive a first-round bye, with the seed that earned it. */
  byes: { team: MbTeam; seed: number }[];
  /** How many teams must be chosen for play-in matches (0 when none). */
  playInTeamCount: number;
}

export interface MbCompetitionDetail {
  typeLabel: string;
  formatIcon: string;
  formatBlurb: string;
  isElimination: boolean;
  isRotation: boolean;
  venue: { one: string; many: string; One: string; Many: string };
  matchWord: { one: string; many: string };
  teamRefs: MbTeam[];
  refFor: (teamId: string) => MbTeam;
  winner: MbTeam | null;
  counts: {
    completed: number;
    live: number;
    pending: number;
    total: number;
    pct: number;
  };
  /**
   * Empty until a match has actually been played: a table of all-zero rows
   * claims an order that means nothing, and the condition is "nothing
   * played", not "not started" — a competition one second past Start has it
   * too. The rule lives HERE, where every body inherits it, rather than in
   * each panel that might forget.
   */
  standings: MbStandingLine[];
  scheduleRounds: MbScheduleRound[];
  /**
   * The competition has started, has fixtures, and none of them has been
   * played or is being played — the window between pressing Start and the
   * first point of the first match.
   *
   * It is a state with its own composition, for the same reason a draft is:
   * every readout the live console exists to carry (the table, the live board,
   * the results, the completion meter) is at zero, and the one thing that is
   * true — there are fixtures, here is the first — is the thing it did not
   * say. See `ReadyBody` in `competition-detail/bodies.tsx`.
   */
  unplayed: boolean;
  /**
   * The fixture to play next: the earliest pending match with both sides
   * resolved. `upcomingLines` is already sorted by round then position, so
   * this is its head — declared rather than re-derived so the panel that
   * offers "score the first match" and the schedule beneath it cannot disagree
   * about which match that is.
   */
  nextLine: MbMatchLine | null;
  /**
   * The `id` of the round being played, or of the next one to be played — the
   * one round the schedule marks.
   */
  currentRoundId: string | null;
  liveLines: MbMatchLine[];
  resultLines: MbMatchLine[];
  upcomingLines: MbMatchLine[];
  bracketSections: MbBracketSection[];
  champion: MbBracketChampion | null;
  courts: MbCourtLine[];
  queue: MbQueueLine[];
  leaderboard: MbLeaderLine[];
  configLines: MbConfigLine[];
  createdDate: string;
  draft: MbDraftPreview;
}

/* ------------------------------------------------------------------ helpers */

const capitalise = (word: string) =>
  word.length === 0 ? word : word[0].toUpperCase() + word.slice(1);

const seriesLabel = (competition: Competition) =>
  competition.matchSeriesLength && competition.matchSeriesLength > 1
    ? `Best of ${competition.matchSeriesLength}`
    : "Single match";

const statusOf = (match: Match): MbLineStatus =>
  match.status === "in_progress"
    ? "live"
    : match.status === "completed"
      ? "completed"
      : "pending";

/**
 * Seeded first-round order for `n` teams, mirroring `getSeededMatchups` in
 * `lib/singleElimination.ts`. Duplicated deliberately and kept private: that
 * function is not exported, `src/lib/singleElimination.ts` is W8-owned, and a
 * preview that guesses a different order than the generator would be worse
 * than no preview at all — so the recursion is copied exactly rather than
 * approximated.
 */
const seededOrder = (n: number): number[] => {
  if (n <= 1) return [0];
  if (n === 2) return [0, 1];
  const half = seededOrder(n / 2);
  const out: number[] = [];
  for (const seed of half) {
    out.push(seed);
    out.push(n - 1 - seed);
  }
  return out;
};

const nextPowerOf2 = (n: number) => {
  let power = 1;
  while (power < n) power *= 2;
  return power;
};

/**
 * What pressing Start will actually build, in one sentence. A pure function
 * because TWO screens print it — one function, both call it, so the
 * arithmetics cannot drift. Terminology is read off the competition itself
 * (the same merge `useTerminology` performs): a hook cannot be called per row
 * of a list.
 */
export const mbDraftSummary = (competition: Competition): string => {
  const words = { ...DEFAULT_TERMINOLOGY, ...(competition.config?.terminology ?? {}) };
  const teamCount = competition.teamIds.length;
  const bracketSize = nextPowerOf2(Math.max(teamCount, 2));

  if (competition.type === "round_robin") {
    const perRound = Math.floor(teamCount / 2);
    const rounds = teamCount % 2 === 0 ? teamCount - 1 : teamCount;
    const total = perRound * rounds;
    return `${total} ${pluralise(words.match, total)} over ${rounds} rounds.`;
  }

  /* Round counts come from the app's own tested generators, never from a second
     arithmetic. `Math.log2(bracketSize) + 1` told an 8-team draft it would build
     "4 winners rounds"; `getTotalWinnersRounds(8)` says 3. The double-
     elimination total is `2n - 1` — every team but the champion loses twice,
     plus the grand final. */
  if (competition.type === "single_elimination") {
    const total = bracketSize - 1;
    return `${total} ${pluralise(words.match, total)} over ${getTotalRounds(teamCount)} rounds.`;
  }
  if (competition.type === "double_elimination") {
    const total = Math.max(0, teamCount * 2 - 1);
    return `Up to ${total} ${pluralise(words.match, total)}: a winners bracket over ${getTotalWinnersRounds(teamCount)} rounds, a losers bracket and a grand final.`;
  }

  const numCourts = competition.numberOfCourts ?? 1;
  return `${numCourts} ${pluralise(words.venue, numCourts)} in play, ${Math.max(
    0,
    teamCount - numCourts * 2
  )} teams in the queue.`;
};

/* --------------------------------------------------- shared pure builders */

/**
 * One shared team resolver, memoised per call, so every surface reaches
 * `crestForTeam` and none draws a coloured dot where a crest belongs.
 */
export const createTeamRef = (teams: PersistentTeam[]) => {
  const byId = new Map(teams.map((team) => [team.id, team]));
  const cache = new Map<string, MbTeam>();
  return (teamId: string): MbTeam => {
    const cached = cache.get(teamId);
    if (cached) return cached;
    const team = byId.get(teamId);
    const ref: MbTeam = {
      name: team?.name ?? "Unknown team",
      crest: crestForTeam(teamId, team?.name ?? ""),
    };
    cache.set(teamId, ref);
    return ref;
  };
};

/**
 * Seeds are drawn on the OPENING round only.
 *
 * A seed is the position a team entered the draw on; past round one a cell's
 * occupants are whoever won, and printing "1" beside a semi-finalist would be
 * stating a fact about a different match. Losers-bracket cells never carry one
 * for the same reason. This is the rule that lets `.mb-seed-box` — shipped with
 * zero consumers — mean exactly one thing wherever it appears.
 */
const seedsApply = (match: Match) =>
  match.round === 1 && match.bracket !== "losers" && match.bracket !== "grand_finals";

/** A `Match` as the rail's cell contract. Byes carry the advancing team only. */
export const bracketCellFor = (
  match: Match,
  refFor: (teamId: string) => MbTeam,
  seedOf?: (teamId: string) => number | undefined
): MbBracketCellData => {
  const bye = match.isBye === true;
  const advancing = bye
    ? (match.winnerId ?? match.homeTeamId ?? match.awayTeamId)
    : null;
  const seed = (teamId: string | undefined | null) =>
    seedOf && teamId && seedsApply(match) ? seedOf(teamId) : undefined;
  return {
    id: match.id,
    label: `M${match.position}`,
    home: bye
      ? advancing
        ? refFor(advancing)
        : null
      : match.homeTeamId
        ? refFor(match.homeTeamId)
        : null,
    away: bye ? null : match.awayTeamId ? refFor(match.awayTeamId) : null,
    homeSeed: seed(bye ? advancing : match.homeTeamId),
    awaySeed: bye ? undefined : seed(match.awayTeamId),
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    homeWon:
      bye || (match.status === "completed" && match.winnerId === match.homeTeamId),
    awayWon:
      !bye && match.status === "completed" && match.winnerId === match.awayTeamId,
    live: match.status === "in_progress",
    pending: match.status === "pending",
    bye,
    tbd: !bye && !match.homeTeamId && !match.awayTeamId,
  };
};

const scoreLine = (match: Match) =>
  `${Math.max(match.homeScore, match.awayScore)} – ${Math.min(match.homeScore, match.awayScore)}`;

export interface MbBracketView {
  sections: MbBracketSection[];
  champion: MbBracketChampion | null;
}

/**
 * Marks the one round a section is ON: the earliest round holding a live
 * cell, else the earliest holding an unplayed one.
 */
const markCurrent = (rounds: MbBracketRound[]): MbBracketRound[] => {
  let index = rounds.findIndex((r) => r.cells.some((c) => c.live));
  if (index === -1)
    index = rounds.findIndex((r) => r.cells.some((c) => c.pending && !c.bye));
  return rounds.map((round, i) => ({ ...round, current: i === index }));
};

/** Single elimination: one section, one round per column, byes included. */
export const buildSingleBracket = (
  matches: Match[],
  totalTeams: number,
  refFor: (teamId: string) => MbTeam,
  seedOf?: (teamId: string) => number | undefined
): MbBracketView => {
  const totalRounds = getTotalRounds(totalTeams);
  const rounds: MbBracketRound[] = [];
  for (let round = 1; round <= totalRounds; round += 1) {
    rounds.push({
      label: getRoundName(round, totalRounds),
      cells: matches
        .filter((m) => m.round === round)
        .sort((a, b) => a.position - b.position)
        .map((m) => bracketCellFor(m, refFor, seedOf)),
    });
  }
  const sections: MbBracketSection[] = rounds.some((r) => r.cells.length > 0)
    ? [{ id: "main", label: "Bracket", accent: "teal", rounds: markCurrent(rounds) }]
    : [];

  const final = matches.find(
    (m) => m.round === totalRounds && m.status === "completed" && m.winnerId
  );
  return {
    sections,
    champion: final?.winnerId
      ? { team: refFor(final.winnerId), score: scoreLine(final) }
      : null,
  };
};

/**
 * Double elimination: winners / losers / grand finals as three labelled
 * sections inside ONE rail.
 */
export const buildDoubleBracket = (
  matches: Match[],
  totalTeams: number,
  refFor: (teamId: string) => MbTeam,
  seedOf?: (teamId: string) => number | undefined
): MbBracketView => {
  const winnersRounds = getTotalWinnersRounds(totalTeams);
  const structure = getDoubleBracketStructure(matches, totalTeams);
  const sections: MbBracketSection[] = [];

  const push = (
    id: string,
    label: string,
    accent: MbBracketSection["accent"],
    groups: Match[][],
    side: "winners" | "losers"
  ) => {
    const rounds = groups
      .map((group, i) => ({
        label: getDoubleElimRoundName(i + 1, side, winnersRounds),
        cells: group.map((m) => bracketCellFor(m, refFor, seedOf)),
      }))
      .filter((round) => round.cells.length > 0);
    if (rounds.length > 0)
      sections.push({ id, label, accent, rounds: markCurrent(rounds) });
  };

  push("winners", "Winners", "teal", structure.winners, "winners");
  push("losers", "Losers", "gold", structure.losers, "losers");

  let champion: MbBracketChampion | null = null;
  const gf = structure.grandFinals;
  if (gf) {
    sections.push({
      id: "grand-finals",
      label: "Grand Finals",
      /* Plum, not coral: a section key is categorical, and coral's declared
         jobs do not include "the climax section". */
      accent: "plum",
      rounds: [{ label: "Grand Finals", cells: [bracketCellFor(gf, refFor)] }],
    });
    if (gf.status === "completed" && gf.winnerId) {
      champion = { team: refFor(gf.winnerId), score: scoreLine(gf) };
    }
  }

  return { sections, champion };
};

/* --------------------------------------------------------------------- hook */

export const useMatchbookCompetitionDetail = ({
  competition,
  matches,
  teams,
}: {
  competition: Competition | undefined;
  matches: Match[];
  teams: PersistentTeam[];
}): MbCompetitionDetail => {
  const terminology = useTerminology(competition?.id);

  return useMemo(() => {
    const venueOne = terminology.venue;
    const venueMany = terminology.venuePlural || pluralise(venueOne);
    const venue = {
      one: venueOne,
      many: venueMany,
      One: capitalise(venueOne),
      Many: capitalise(venueMany),
    };
    const matchWord = {
      one: terminology.match,
      many: terminology.matchPlural || pluralise(terminology.match),
    };

    const refFor = createTeamRef(teams);

    const empty: MbCompetitionDetail = {
      typeLabel: "",
      formatIcon: "compete",
      formatBlurb: "",
      isElimination: false,
      isRotation: false,
      venue,
      matchWord,
      teamRefs: [],
      refFor,
      winner: null,
      counts: { completed: 0, live: 0, pending: 0, total: 0, pct: 0 },
      standings: [],
      scheduleRounds: [],
      unplayed: false,
      nextLine: null,
      currentRoundId: null,
      liveLines: [],
      resultLines: [],
      upcomingLines: [],
      bracketSections: [],
      champion: null,
      courts: [],
      queue: [],
      leaderboard: [],
      configLines: [],
      createdDate: "",
      draft: { summary: "", pairings: [], byes: [], playInTeamCount: 0 },
    };

    if (!competition) return empty;

    const meta = FORMAT_META[competition.type];
    const isElimination = isEliminationFormat(competition.type);
    const isRotation =
      competition.type === "win2out" || competition.type === "two_match_rotation";

    /* A bye is not a match: it resolves without anybody playing, so it is
       excluded from every COUNT while still appearing in the schedule and
       bracket, where the draw is a fact. `useMatchbookSummary` counts the
       same way, so the live screen agrees with the report it generates. */
    const playable = matches.filter((m) => !m.isBye);
    const completed = playable.filter((m) => m.status === "completed");
    const live = playable.filter((m) => m.status === "in_progress");
    const pending = playable.filter((m) => m.status === "pending");

    const completedNewestFirst = [...completed].sort(
      (a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)
    );
    const tallies = buildTeamTallies(completedNewestFirst);

    /* ------------------------------------------------------------- lines */

    /* ONE SHAPE FOR A WALKOVER, shared with `bracketCellFor`: the generator
       writes a bye as a *completed* match scoring 1–0 with one team id blank,
       so both derive the advancing team / empty away side / no score from
       `isBye` rather than reading the raw fields. */
    const lineFor = (match: Match, label: string, subLabel?: string): MbMatchLine => {
      const bye = match.isBye === true;
      const advancing = bye
        ? (match.winnerId ?? match.homeTeamId ?? match.awayTeamId)
        : null;
      return {
        id: match.id,
        match,
        label,
        subLabel,
        home: bye
          ? advancing
            ? refFor(advancing)
            : null
          : match.homeTeamId
            ? refFor(match.homeTeamId)
            : null,
        away: bye ? null : match.awayTeamId ? refFor(match.awayTeamId) : null,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        homeWon: !bye && match.status === "completed" && match.winnerId === match.homeTeamId,
        awayWon: !bye && match.status === "completed" && match.winnerId === match.awayTeamId,
        status: statusOf(match),
        bye,
      };
    };

    const roundLabel = (match: Match) =>
      isElimination
        ? `${match.bracket === "losers" ? "L" : ""}R${match.round} · M${match.position}`
        : `R${match.round} · M${match.position}`;

    /* -------------------------------------------------------- standings */

    /* No result, no ranking — see the field's own note. `rankTeams` is only
       asked the question once there is something to answer it with. */
    const standings: MbStandingLine[] = completed.length === 0 ? [] : rankTeamsWithMovement(
      competition.teamIds,
      matches,
      competition.config
    ).map((row) => ({
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
    }));

    /* --------------------------------------------------------- schedule */

    /* Grouped by BRACKET and round, not by round alone. A double-elimination
       schedule keyed on `round` puts winners R1 and losers R1 in one group with
       two matches called M1 — the reader has no way to tell which side a
       fixture is on. Single elimination and round robin have one bracket, so
       the key degrades to the round number and the label stays "Round N". */
    const bracketRank: Record<string, number> = {
      winners: 0,
      "": 0,
      losers: 1,
      grand_finals: 2,
    };
    const bracketTag = (match: Match) =>
      match.bracket === "losers"
        ? "L"
        : match.bracket === "grand_finals"
          ? "GF"
          : match.bracket === "winners"
            ? "W"
            : "";
    const groupLabel = (match: Match) => {
      if (match.bracket === "grand_finals") return "Grand Finals";
      if (match.bracket === "losers") return `Losers Round ${match.round}`;
      if (match.bracket === "winners") return `Winners Round ${match.round}`;
      return `Round ${match.round}`;
    };

    const groups = new Map<string, Match[]>();
    matches.forEach((m) => {
      const key = `${bracketRank[m.bracket ?? ""] ?? 9}#${m.round}`;
      const bucket = groups.get(key);
      if (bucket) bucket.push(m);
      else groups.set(key, [m]);
    });

    const scheduleRounds: MbScheduleRound[] = [...groups.entries()]
      .sort(([a], [b]) => {
        const [ra, na] = a.split("#").map(Number);
        const [rb, nb] = b.split("#").map(Number);
        return ra - rb || na - nb;
      })
      .map(([key, inRound]) => {
        const sorted = [...inRound].sort((a, b) => a.position - b.position);
        return {
          id: key,
          round: sorted[0].round,
          label: groupLabel(sorted[0]),
          complete: sorted.every((m) => m.status === "completed"),
          lines: sorted.map((m) => {
            const tag = bracketTag(m);
            return lineFor(m, tag === "GF" ? "GF" : `${tag}M${m.position}`);
          }),
        };
      });

    /* Where the competition IS: the earliest round with something in play,
       else the earliest with something still to play. Null once every round is
       finished — a completed competition has no current round, and marking one
       would be a lie the reader can check. */
    const currentRoundId =
      scheduleRounds.find((round) => round.lines.some((l) => l.status === "live"))
        ?.id ??
      scheduleRounds.find((round) => !round.complete)?.id ??
      null;

    const liveLines = live.map((m) => lineFor(m, roundLabel(m)));
    const upcomingLines = pending
      .filter((m) => m.homeTeamId && m.awayTeamId)
      .sort((a, b) => a.round - b.round || a.position - b.position)
      .map((m) => lineFor(m, roundLabel(m)));
    const resultLines = completedNewestFirst.map((m, i) =>
      lineFor(m, `#${completedNewestFirst.length - i}`)
    );

    /* ---------------------------------------------------------- bracket */

    /* `teamIds` IS the seeding order — the generators index straight into it —
       so the seed is the position plus one, resolved once. */
    const seedIndex = new Map(competition.teamIds.map((id, i) => [id, i + 1]));
    const seedOf = (teamId: string) => seedIndex.get(teamId);

    const bracket: MbBracketView =
      competition.type === "single_elimination"
        ? buildSingleBracket(matches, competition.teamIds.length, refFor, seedOf)
        : competition.type === "double_elimination"
          ? buildDoubleBracket(matches, competition.teamIds.length, refFor, seedOf)
          : { sections: [], champion: null };
    const { sections: bracketSections, champion } = bracket;

    /* --------------------------------------------------------- rotation */

    const courts: MbCourtLine[] = [];
    const queue: MbQueueLine[] = [];
    const leaderboard: MbLeaderLine[] = [];

    const onCourtIds = new Set<string>();
    const w2o = competition.win2outState;
    const tmr = competition.twoMatchRotationState;

    (w2o?.courts ?? []).forEach((court) =>
      court.teamIds.forEach((id) => onCourtIds.add(id))
    );
    (tmr?.courts ?? []).forEach((court) =>
      court.teamIds.forEach((id) => onCourtIds.add(id))
    );

    const activeMatches = matches.filter(
      (m) => m.status === "pending" || m.status === "in_progress"
    );

    if (w2o) {
      const streakOf = (teamId: string) => {
        const court = w2o.courts.find((c) => c.teamIds.includes(teamId));
        return court?.currentChampionId === teamId
          ? getCurrentChampionStreak(w2o, court.courtNumber)
          : 0;
      };
      /* The sub-line carries a team's standing on this court — a live streak,
         or crowns already won. A team with neither has nothing to say:
         `MbCourtCard` renders the line only when truthy, so `undefined`
         removes it rather than leaving a gap. */
      const subFor = (teamId: string) => {
        const streak = streakOf(teamId);
        if (streak > 0) return `Streak ${streak} · crown on the next win`;
        const crowns = getChampionCount(w2o, teamId);
        return crowns > 0 ? `${crowns} ${pluralise("crown", crowns)}` : undefined;
      };

      activeMatches.forEach((match) => {
        const court = w2o.courts.find(
          (c) =>
            c.teamIds.includes(match.homeTeamId) && c.teamIds.includes(match.awayTeamId)
        );
        courts.push({
          match,
          court: court?.courtNumber ?? match.position,
          home: refFor(match.homeTeamId),
          away: refFor(match.awayTeamId),
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          status: match.status === "in_progress" ? "live" : "pending",
          homeSub: subFor(match.homeTeamId),
          awaySub: subFor(match.awayTeamId),
        });
      });

      w2o.queue
        .filter((teamId) => !onCourtIds.has(teamId))
        .forEach((teamId, i) => {
          const crowns = getChampionCount(w2o, teamId);
          queue.push({
            teamId,
            team: refFor(teamId),
            position: i + 1,
            note: crowns > 0 ? `Crowns ${crowns}` : "No crowns",
          });
        });

      [...w2o.teamStatuses]
        .map((status) => ({
          status,
          crowns: getChampionCount(w2o, status.teamId),
        }))
        .sort(
          (a, b) =>
            b.crowns - a.crowns || b.status.matchesPlayed - a.status.matchesPlayed
        )
        .forEach((entry, i) => {
          const tally = tallies.get(entry.status.teamId);
          leaderboard.push({
            teamId: entry.status.teamId,
            team: refFor(entry.status.teamId),
            rank: i + 1,
            primary: entry.crowns,
            played: entry.status.matchesPlayed,
            won: tally?.won ?? 0,
            lost: tally?.lost ?? 0,
            pct:
              tally && tally.played > 0
                ? (tally.won / tally.played).toFixed(3).replace(/^0/, "")
                : "—",
            onCourt: onCourtIds.has(entry.status.teamId),
          });
        });
    }

    if (tmr) {
      const subFor = (teamId: string, firstMatch: boolean | undefined) =>
        firstMatch ? "First match" : `${getSessionMatchCount(tmr, teamId)}/2 matches`;

      const seen = new Set<number>();
      tmr.courts.forEach((court) => {
        const [one, two] = court.teamIds;
        const found = activeMatches
          .filter(
            (m) =>
              (m.homeTeamId === one && m.awayTeamId === two) ||
              (m.homeTeamId === two && m.awayTeamId === one)
          )
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
        if (!found || seen.has(court.courtNumber)) return;
        seen.add(court.courtNumber);
        courts.push({
          match: found,
          court: court.courtNumber,
          home: refFor(found.homeTeamId),
          away: refFor(found.awayTeamId),
          homeScore: found.homeScore,
          awayScore: found.awayScore,
          status: found.status === "in_progress" ? "live" : "pending",
          homeSub: subFor(found.homeTeamId, court.isFirstMatch),
          awaySub: subFor(found.awayTeamId, court.isFirstMatch),
        });
      });

      tmr.queue
        .filter((teamId) => !onCourtIds.has(teamId))
        .forEach((teamId, i) => {
          const status = tmr.teamStatuses.find((s) => s.teamId === teamId);
          queue.push({
            teamId,
            team: refFor(teamId),
            position: i + 1,
            note: `${status?.totalWins ?? 0}W–${status?.totalLosses ?? 0}L`,
          });
        });

      [...tmr.teamStatuses]
        .sort((a, b) => {
          if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;
          const aRate = a.totalMatches > 0 ? a.totalWins / a.totalMatches : 0;
          const bRate = b.totalMatches > 0 ? b.totalWins / b.totalMatches : 0;
          return bRate - aRate;
        })
        .forEach((status, i) => {
          leaderboard.push({
            teamId: status.teamId,
            team: refFor(status.teamId),
            rank: i + 1,
            primary: status.totalWins,
            played: status.totalMatches,
            won: status.totalWins,
            lost: status.totalLosses,
            pct:
              status.totalMatches > 0
                ? (status.totalWins / status.totalMatches)
                    .toFixed(3)
                    .replace(/^0/, "")
                : "—",
            onCourt: onCourtIds.has(status.teamId),
          });
        });
    }

    /* ----------------------------------------------------------- config */

    const config = competition.config ?? DEFAULT_COMPETITION_CONFIG;
    const configLines: MbConfigLine[] = [
      { icon: meta.icon, label: "Format", value: meta.label },
      { icon: "teams", label: "Teams entered", value: String(competition.teamIds.length) },
    ];
    if (meta.supports.series) {
      configLines.push({
        icon: "volleyball",
        label: `${capitalise(matchWord.one)} format`,
        value: seriesLabel(competition),
      });
    }
    if (meta.supports.courts) {
      configLines.push({
        icon: "court",
        label: venue.Many,
        value: String(competition.numberOfCourts ?? 1),
      });
    }
    if (meta.supports.scoringMode) {
      configLines.push({
        icon: "check",
        label: "Scoring",
        value: competition.instantWinEnabled ? "Instant win" : "Score points",
      });
    }
    if (meta.supports.standingsPoints) {
      configLines.push({
        icon: "chart",
        label: "Points",
        value: `${config.pointsForWin} win · ${config.pointsForLoss} loss${
          config.allowTies ? ` · ${config.pointsForTie ?? 0} tie` : ""
        }`,
      });
    }
    configLines.push({
      icon: "location",
      label: "Venue word",
      value: venue.One,
    });

    /* ------------------------------------------------------------ draft */

    const teamCount = competition.teamIds.length;
    const bracketSize = nextPowerOf2(Math.max(teamCount, 2));
    const draft: MbDraftPreview = {
      summary: "",
      pairings: [],
      byes: [],
      playInTeamCount: 0,
    };

    if (competition.status === "draft") {
      /* One sentence, one source — `/competitions` prints the same string for
         the same draft (see `mbDraftSummary`). */
      draft.summary = mbDraftSummary(competition);
      if (isElimination) {
        const order = seededOrder(bracketSize);
        const byes: { team: MbTeam; seed: number }[] = [];
        for (let i = 0; i < order.length; i += 2) {
          const homeIndex = order[i];
          const awayIndex = order[i + 1];
          const home = competition.teamIds[homeIndex];
          const away = competition.teamIds[awayIndex];
          /* The seed IS the index in `teamIds` + 1 — that array is the entry
             order the generator seeds from, which is why `seededOrder` indexes
             straight into it. Printing them is what makes the preview
             checkable: 1 v 8, 4 v 5, and the byes named by seed. */
          if (home && away)
            draft.pairings.push({
              home: refFor(home),
              away: refFor(away),
              homeSeed: homeIndex + 1,
              awaySeed: awayIndex + 1,
            });
          else if (home) byes.push({ team: refFor(home), seed: homeIndex + 1 });
          else if (away) byes.push({ team: refFor(away), seed: awayIndex + 1 });
        }
        draft.byes = byes;
        draft.playInTeamCount = byes.length > 0 ? teamCount - (bracketSize / 2) : 0;
      }
    }

    return {
      typeLabel: meta.label,
      formatIcon: meta.icon,
      formatBlurb: meta.blurb,
      isElimination,
      isRotation,
      venue,
      matchWord,
      teamRefs: competition.teamIds.map(refFor),
      refFor,
      winner: competition.winnerId ? refFor(competition.winnerId) : null,
      counts: {
        completed: completed.length,
        live: live.length,
        pending: pending.length,
        total: playable.length,
        pct:
          playable.length > 0
            ? Math.round((completed.length / playable.length) * 100)
            : 0,
      },
      standings,
      scheduleRounds,
      unplayed:
        competition.status === "in_progress" &&
        playable.length > 0 &&
        completed.length === 0 &&
        live.length === 0,
      nextLine: upcomingLines[0] ?? null,
      currentRoundId,
      liveLines,
      resultLines,
      upcomingLines,
      bracketSections,
      champion,
      courts,
      queue,
      leaderboard,
      configLines,
      createdDate: new Date(competition.createdAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      draft,
    };
  }, [competition, matches, teams, terminology]);
};
