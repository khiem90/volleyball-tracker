"use client";

import { useMemo, useState } from "react";
import { exportMatchesCsv } from "@/lib/exportCsv";
import { rankTeams } from "@/lib/standings";
import { teamColorCss } from "@/lib/teamColor";
import { useSummaryPage, type MbSummaryStatus } from "@/hooks/useSummaryPage";
import type { Match, PersistentTeam } from "@/types/game";
import { FORMAT_META } from "./formatMeta";
import { shareLink } from "./ShareAction";
import type { MbStandingLine } from "./StandingsTable";
import { buildTeamTallies, recentForm } from "./teamStats";
import { toast } from "./Toast";
import { createTeamRef } from "./useMatchbookCompetitionDetail";
import { type MbTeam } from "./types";

/* ===========================================================================
   THE MATCH REPORT, SHAPED (charter §2.3 `useMatchbookSummary`, W6 / P3b)

   `/summary/[shareCode]` is the only artefact of this product that outlives
   the event: a frozen record somebody pastes into a group chat, screenshots,
   or prints. Everything it draws is computed here so the route file is layout
   and nothing else (invariant 23).

   ------------------------------------------------- ONE ranking, one champion

   Register D-40, found the week this route first rendered populated: on
   `/summary/SPRNG7` the hero read "Champion — Tide, 3 wins" while the final
   table put Apex 1st and Tide 4th. Two rankings on one screen, and the screen
   is the *public* one.

   The cause is that `computeSessionStats` (`lib/sessions.ts`) picks the first
   team to reach the highest win count — no tiebreak, iteration order deciding
   — and it is frozen into `summary.stats.winner` at end time. Four teams were
   level on three wins in that fixture, so the two disagreed by construction.

   `summary.stats.winner` is therefore NOT read for the champion. The champion
   is `rankTeams(...)[0]` — the same function the live table uses (charter N10)
   — and it is only named when that line does not share its rank. A knockout
   competition names its champion from `competition.winnerId` instead, because
   a bracket winner is a fact about the draw and not about a points table.

   When nobody can be named, the block says so and lists who was level. It is
   never omitted silently: brief S19.
   =========================================================================== */

/** Rows shown before the ledger asks to be opened (brief §3.5, S22). */
export const MB_SUMMARY_LEDGER_CAP = 25;

export interface MbSummaryEntry {
  id: string;
  /** Chronological position in the event: `#1` is the first match played. */
  label: string;
  time: string;
  home: MbTeam;
  away: MbTeam;
  homeScore: number;
  awayScore: number;
  homeWon: boolean;
  awayWon: boolean;
  /** Margin of victory. `0` is a draw. */
  margin: number;
}

export interface MbSummaryDay {
  /** Empty when this group continues the day above it. */
  label: string;
  entries: MbSummaryEntry[];
}

export interface MbSummaryChampion {
  teamId: string;
  team: MbTeam;
  /** Team colour, drawn as a contained bar only (charter D-9). */
  accent?: string;
  /** How the title was won — the honest provenance of the name above. */
  basis: string;
  /** `5 P · 4 W · 1 L · +10 PD · 12 PTS`, already `tabular-nums` at the call site. */
  record: string;
  form: MbStandingLine["form"];
}

export interface MbSummaryDecider {
  /** "The final" for a bracket, "Last match played" otherwise. */
  kicker: string;
  entry: MbSummaryEntry;
}

export interface MbSummaryHighlight {
  entry: MbSummaryEntry;
  note: string;
}

export interface MbSummaryStatLine {
  icon: string;
  label: string;
  value: string;
  sub?: string;
}

export interface MbSummaryData {
  status: MbSummaryStatus;
  shareCode: string;
  shareUrl: string;
  name: string;
  formatLabel: string;
  formatIcon: string;
  /** `6 Teams · 10 Matches · Round Robin` — the masthead's sub-line. */
  metaLine: string;
  startedLine: string;
  endedLine: string;
  endedShort: string;

  playedAny: boolean;
  champion: MbSummaryChampion | null;
  /** Set when the top line is shared, so no champion can be named. */
  levelAtTop: { teams: MbTeam[]; points: number } | null;
  decider: MbSummaryDecider | null;
  standings: MbStandingLine[];
  /** Everyone who entered, for a session that recorded no result (brief S18). */
  entered: { id: string; team: MbTeam; accent?: string }[];
  stats: MbSummaryStatLine[];
  biggestWin: MbSummaryHighlight | null;
  closestMatch: MbSummaryHighlight | null;

  totalResults: number;
  ledger: MbSummaryDay[];
  /** Rows past the cap. Rendered hidden on screen and visible in print. */
  ledgerRest: MbSummaryDay[];
  showAll: boolean;
  setShowAll: (open: boolean) => void;
  downloadCsv: () => void;
  /** Native share sheet → clipboard → an instruction. Never silent. */
  share: () => void;

  isCreator: boolean;
  isDeleting: boolean;
  showDeleteDialog: boolean;
  setShowDeleteDialog: (open: boolean) => void;
  handleDelete: () => void;
  retry: () => void;
}

/* ------------------------------------------------------------------ format */

const signed = (n: number) => `${n > 0 ? "+" : ""}${n}`;

const formatDuration = (ms: number): string => {
  const minutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
};

const dayLabel = (ts: number) =>
  new Date(ts).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const timeLabel = (ts?: number) =>
  ts
    ? new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "";

const stampLabel = (ts: number) =>
  `${new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}, ${timeLabel(ts)}`;

const shortDate = (ts: number) =>
  new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** `Friday Night League` -> `friday-night-league-results.csv`. */
const csvName = (name: string) =>
  `${
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "match-report"
  }-results.csv`;

/* -------------------------------------------------------------------- hook */

export const useMatchbookSummary = (): MbSummaryData => {
  const page = useSummaryPage();
  const [showAll, setShowAll] = useState(false);
  const { summary } = page;

  const shaped = useMemo(() => {
    const teams: PersistentTeam[] = summary?.teams ?? [];
    const matches: Match[] = summary?.matches ?? [];
    const competition = summary?.competition ?? null;

    const teamById = new Map(teams.map((t) => [t.id, t]));
    /* The shared resolver, so the report names a missing team exactly as the
       live screen it was generated from does. */
    const refFor = createTeamRef(teams);
    const nameOf = (id: string) => refFor(id).name;
    const accentOf = (id: string) => teamColorCss(teamById.get(id)?.color);

    /* Bye matches are skipped everywhere a result is counted — `rankTeams` and
       `buildTeamTallies` both already do it, and a walkover in the ledger
       would print a scoreline nobody played. */
    const completed = matches
      .filter((m) => m.status === "completed" && !m.isBye)
      .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0));

    const toEntry = (match: Match, chronological: number): MbSummaryEntry => {
      const homeWon = match.winnerId
        ? match.winnerId === match.homeTeamId
        : match.homeScore > match.awayScore;
      const awayWon = match.winnerId
        ? match.winnerId === match.awayTeamId
        : match.awayScore > match.homeScore;
      return {
        id: match.id,
        label: `#${chronological}`,
        time: timeLabel(match.completedAt),
        home: refFor(match.homeTeamId),
        away: refFor(match.awayTeamId),
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        homeWon,
        awayWon,
        margin: Math.abs(match.homeScore - match.awayScore),
      };
    };

    const entries = completed.map((m, i) => toEntry(m, i + 1));
    const newestFirst = [...entries].reverse();

    /* ------------------------------------------------------- final table */

    const teamIds = competition?.teamIds?.length
      ? competition.teamIds.filter((id) => teamById.has(id))
      : teams.map((t) => t.id);

    const tallies = buildTeamTallies(
      [...completed].sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
    );

    const ranked = rankTeams(teamIds, matches, competition?.config);
    const standings: MbStandingLine[] = ranked.map((line) => ({
      teamId: line.teamId,
      team: refFor(line.teamId),
      rank: line.rank,
      sharesRank: line.sharesRank,
      played: line.played,
      won: line.won,
      lost: line.lost,
      tied: line.tied,
      pointsFor: line.pointsFor,
      pointsAgainst: line.pointsAgainst,
      diff: line.pointsDiff,
      points: line.competitionPoints,
      form: recentForm(tallies.get(line.teamId)),
    }));

    /* --------------------------------------------------------- champion */

    const isBracket =
      competition?.type === "single_elimination" ||
      competition?.type === "double_elimination";

    const bracketWinner =
      competition?.winnerId && teamById.has(competition.winnerId)
        ? competition.winnerId
        : null;

    const top = standings[0] ?? null;
    const championId =
      entries.length === 0
        ? null
        : (bracketWinner ?? (top && !top.sharesRank ? top.teamId : null));

    const championLine = standings.find((line) => line.teamId === championId) ?? null;

    const champion: MbSummaryChampion | null =
      championId && championLine
        ? {
            teamId: championId,
            team: championLine.team,
            accent: accentOf(championId),
            /* Deliberately not "top of the table on 9 points": three other
               teams were also on 9 in the fixture this was built against, and
               the record line directly underneath already prints the points
               and the difference that actually separated them. */
            basis: isBracket ? "Won the bracket" : "Top of the final table",
            record: [
              `${championLine.played} P`,
              `${championLine.won} W`,
              ...(championLine.tied > 0 ? [`${championLine.tied} T`] : []),
              `${championLine.lost} L`,
              `${signed(championLine.diff)} PD`,
              `${championLine.points} PTS`,
            ].join(" · "),
            form: championLine.form,
          }
        : null;

    const levelAtTop =
      !champion && top && entries.length > 0
        ? {
            teams: standings
              .filter((line) => line.rank === top.rank)
              .map((line) => line.team),
            points: top.points,
          }
        : null;

    /* ---------------------------------------------------------- decider */

    let deciderMatch: Match | null = null;
    if (completed.length > 0) {
      deciderMatch = isBracket
        ? [...completed].sort(
            (a, b) => b.round - a.round || (b.completedAt ?? 0) - (a.completedAt ?? 0)
          )[0]
        : completed[completed.length - 1];
    }
    const deciderEntry = deciderMatch
      ? (entries[completed.indexOf(deciderMatch)] ?? null)
      : null;
    const decider: MbSummaryDecider | null = deciderEntry
      ? { kicker: isBracket ? "The final" : "Last match played", entry: deciderEntry }
      : null;

    /* ------------------------------------------------------- highlights */

    const byMargin = [...entries].sort((a, b) => b.margin - a.margin);
    const widest = byMargin[0] ?? null;
    const tightest = byMargin[byMargin.length - 1] ?? null;
    const winnerOf = (entry: MbSummaryEntry) =>
      entry.homeWon ? entry.home.name : entry.away.name;

    const biggestWin: MbSummaryHighlight | null =
      widest && widest.margin > 0
        ? {
            entry: widest,
            note: `${winnerOf(widest)} by ${widest.margin} ${
              widest.margin === 1 ? "point" : "points"
            }`,
          }
        : null;

    const closestMatch: MbSummaryHighlight | null =
      tightest && widest && tightest.id !== widest.id
        ? {
            entry: tightest,
            note:
              tightest.margin === 0
                ? "Level at the final whistle"
                : `Decided by ${tightest.margin} ${
                    tightest.margin === 1 ? "point" : "points"
                  }`,
          }
        : null;

    /* ----------------------------------------------------------- ledger */

    const groupDays = (rows: MbSummaryEntry[], previousLabel: string | null) => {
      const days: MbSummaryDay[] = [];
      let last = previousLabel;
      for (const entry of rows) {
        const match = completed.find((m) => m.id === entry.id);
        const label = match?.completedAt ? dayLabel(match.completedAt) : "Undated";
        if (days.length > 0 && days[days.length - 1].entries.length > 0 && label === last) {
          days[days.length - 1].entries.push(entry);
        } else {
          days.push({ label: label === last ? "" : label, entries: [entry] });
          last = label;
        }
      }
      return { days, last };
    };

    const shownRows = newestFirst.slice(0, MB_SUMMARY_LEDGER_CAP);
    const restRows = newestFirst.slice(MB_SUMMARY_LEDGER_CAP);
    const shown = groupDays(shownRows, null);
    const rest = groupDays(restRows, shown.last);

    /* ------------------------------------------------------------ stats */

    const pointsScored = completed.reduce(
      (total, m) => total + m.homeScore + m.awayScore,
      0
    );
    const totalMatches = matches.filter((m) => !m.isBye).length;

    const stats: MbSummaryStatLine[] = [
      {
        icon: "check",
        label: "Matches played",
        value: String(completed.length),
        sub: totalMatches > completed.length ? `of ${totalMatches}` : undefined,
      },
      { icon: "teams", label: "Teams", value: String(teams.length) },
      {
        icon: "clock",
        label: "Duration",
        value: summary ? formatDuration(summary.stats.duration) : "—",
      },
      { icon: "chart", label: "Points scored", value: String(pointsScored) },
      {
        icon: "volleyball",
        label: "Points per match",
        value:
          completed.length > 0
            ? (pointsScored / completed.length).toFixed(1)
            : "0.0",
      },
      {
        icon: "calendar",
        label: "Ended",
        value: summary ? shortDate(summary.endedAt) : "—",
      },
    ];

    const downloadCsv = () => {
      const result = exportMatchesCsv(
        [...completed].reverse().map((m) => ({
          completedAt: m.completedAt ?? null,
          home: nameOf(m.homeTeamId),
          away: nameOf(m.awayTeamId),
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          winner: m.winnerId ? nameOf(m.winnerId) : "",
          competition: competition?.name ?? summary?.name ?? "Session",
        })),
        csvName(summary?.name ?? "match-report")
      );
      if (result.ok) {
        toast({
          tone: "success",
          message: `${completed.length} ${
            completed.length === 1 ? "result" : "results"
          } exported to ${csvName(summary?.name ?? "match-report")}`,
        });
      } else {
        toast({ tone: "danger", message: result.reason, duration: 0 });
      }
    };

    const format = competition ? FORMAT_META[competition.type] : null;

    return {
      name: summary?.name ?? "",
      formatLabel: format?.label ?? "Session",
      formatIcon: format?.icon ?? "history",
      metaLine: [
        `${teams.length} ${teams.length === 1 ? "Team" : "Teams"}`,
        `${completed.length} ${completed.length === 1 ? "Match" : "Matches"}`,
        format?.label ?? "Session",
      ].join(" · "),
      startedLine: summary ? stampLabel(summary.createdAt) : "",
      endedLine: summary ? stampLabel(summary.endedAt) : "",
      endedShort: summary ? shortDate(summary.endedAt) : "",
      playedAny: completed.length > 0,
      champion,
      levelAtTop,
      decider,
      standings,
      entered: teams.map((team) => ({
        id: team.id,
        team: refFor(team.id),
        accent: teamColorCss(team.color),
      })),
      stats,
      biggestWin,
      closestMatch,
      totalResults: completed.length,
      ledger: shown.days,
      ledgerRest: rest.days,
      downloadCsv,
    };
  }, [summary]);

  /**
   * THE ONE SHARE PATH, called from the masthead's action row.
   *
   * `MastheadProps.actions` is a list of action *descriptions* — the charter's
   * `MbAction` — not a node slot, so `MbShareAction` cannot be rendered into
   * it. What matters is that there is one implementation, and there is:
   * `shareLink()` is `MbShareAction`'s own core, exported from the same file,
   * so the sheet-then-clipboard chain and its outcome union are shared rather
   * than forked (charter §2.3, brief N4).
   *
   * The share sits in the masthead and NOT in the panel below because of what
   * a phone does with it: the masthead's action row is full-width at 390px, so
   * whichever action goes there is the loudest thing on the screen. A report
   * that is loudest about *printing* has its hierarchy backwards. Print keeps
   * its key inside the Share & Print panel, where it is still the only place
   * in the app that offers it.
   *
   * `shared` and `dismissed` are deliberately silent: the OS sheet has already
   * confirmed itself, and cancelling is a decision rather than a failure.
   */
  const share = async () => {
    const outcome = await shareLink({
      url: page.shareUrl,
      title: `${shaped.name} — match report`,
      text: shaped.champion
        ? `${shaped.champion.team.name} win ${shaped.name} — ${shaped.totalResults} matches played.`
        : `${shaped.name} — the full match report.`,
    });
    if (outcome === "copied") {
      toast({ tone: "success", message: "Report link copied to your clipboard." });
    } else if (outcome === "manual") {
      toast({
        tone: "danger",
        message:
          "Your browser blocked sharing. The link is under Share & Print below — copy it from there.",
        duration: 0,
      });
    }
  };

  return {
    status: page.status,
    shareCode: page.shareCode,
    shareUrl: page.shareUrl,
    ...shaped,
    share: () => void share(),
    showAll,
    setShowAll,
    isCreator: page.isCreator,
    isDeleting: page.isDeleting,
    showDeleteDialog: page.showDeleteDialog,
    setShowDeleteDialog: page.setShowDeleteDialog,
    handleDelete: page.handleDelete,
    retry: page.retry,
  };
};
