import { entryTeams } from "@/lib/entries";
import { formatLabel } from "@/lib/formats";
import { scoringHref } from "@/lib/scoring";
import type { Match, PersistentTeam, Tournament } from "@/types/game";

/**
 * History, the pure part: the account's completed tournaments and past
 * quick matches, worked out from the one account-wide match query.
 * Nothing in here touches the database, the browser, or React.
 */

// ============================================
// Completed tournaments and quick matches
// ============================================

export interface CompletedTournament {
  kind: "tournament";
  tournament: Tournament;
  /** The format's name, so an elimination tournament says which kind it is. */
  format: string;
  /** Teams entered, a team that withdrew included. */
  entered: number;
  /** Matches with a result. A bye is not a match played. */
  played: number;
  /**
   * The winner as the tournament showed it, or null for a tournament the
   * owner ended, since only a format that finishes names a winner.
   */
  winner: PersistentTeam | null;
  completedAt: number;
  /** Its console, read-only now that it is completed. */
  href: string;
}

export interface CompletedQuickMatch {
  kind: "quick_match";
  match: Match;
  /** The two teams as the roster names them now. */
  home: PersistentTeam;
  away: PersistentTeam;
  completedAt: number;
  /** Its own page, which shows it Completed with the final score. */
  href: string;
}

export type HistoryItem = CompletedTournament | CompletedQuickMatch;

/**
 * Completed tournaments and past quick matches, newest first. Every item
 * opens, so a quick match whose team has left the roster is left out: its
 * page cannot show it. The ledger still has its result.
 */
export const historyItems = (
  tournaments: Tournament[],
  matches: Match[],
  roster: PersistentTeam[],
): HistoryItem[] => {
  const played = new Map<string, number>();
  for (const match of matches) {
    if (!match.tournamentId || match.isBye || match.status !== "completed") continue;
    played.set(match.tournamentId, (played.get(match.tournamentId) ?? 0) + 1);
  }

  const items: HistoryItem[] = [];
  for (const tournament of tournaments) {
    if (tournament.status !== "completed") continue;
    const winner = entryTeams(tournament, roster).find((team) => team.id === tournament.winnerId);
    items.push({
      kind: "tournament",
      tournament,
      format: formatLabel(tournament.format),
      entered: tournament.entries.length,
      played: played.get(tournament.id) ?? 0,
      winner: winner ?? null,
      completedAt: tournament.completedAt ?? tournament.updatedAt,
      href: `/competitions/${tournament.id}`,
    });
  }
  const rosterTeams = new Map(roster.map((team) => [team.id, team]));
  for (const match of matches) {
    if (match.tournamentId || match.status !== "completed") continue;
    const home = rosterTeams.get(match.homeTeamId);
    const away = rosterTeams.get(match.awayTeamId);
    if (!home || !away) continue;
    items.push({
      kind: "quick_match",
      match,
      home,
      away,
      completedAt: match.completedAt ?? 0,
      href: scoringHref(match),
    });
  }
  return items.sort((a, b) => b.completedAt - a.completedAt);
};

// ============================================
// The ledger
// ============================================

/** A team in a ledger row. `deleted` marks one the roster no longer has, which a quick match outlives. */
export interface LedgerTeam extends PersistentTeam {
  deleted?: true;
}

export interface LedgerRow {
  match: Match;
  home: LedgerTeam;
  away: LedgerTeam;
  /** The tournament it was played in, or null for a quick match. */
  tournament: Tournament | null;
  /**
   * Where a tap goes: the tournament's console, or the quick match's own
   * page. Undefined for a quick match whose team has left the roster, which
   * that page cannot show.
   */
  href?: string;
}

/** What a team nothing knows any more is called, so a row never says "Unknown". */
const DELETED_TEAM = "Deleted team";

const deletedTeam = (id: string): LedgerTeam => ({ id, name: DELETED_TEAM, createdAt: 0, deleted: true });

/**
 * Every result, newest first: tournaments live or completed, and quick
 * matches. Byes are no result and are left out; forfeits stay, marked. A
 * tournament match names its teams as the tournament shows them, so a
 * completed tournament keeps the names it had, and a quick match names
 * them from the roster. A match whose tournament is gone is left out.
 */
export const ledgerRows = (
  tournaments: Tournament[],
  matches: Match[],
  roster: PersistentTeam[],
): LedgerRow[] => {
  const tournamentsById = new Map(tournaments.map((t) => [t.id, t]));
  const rosterTeams = new Map(roster.map((team) => [team.id, team]));
  const teamsOf = new Map<string, Map<string, PersistentTeam>>();
  const tournamentTeams = (tournament: Tournament) => {
    let teams = teamsOf.get(tournament.id);
    if (!teams) {
      teams = new Map(entryTeams(tournament, roster).map((team) => [team.id, team]));
      teamsOf.set(tournament.id, teams);
    }
    return teams;
  };

  const rows: LedgerRow[] = [];
  const completed = matches
    .filter((match) => match.status === "completed" && !match.isBye)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  for (const match of completed) {
    const tournament = match.tournamentId ? tournamentsById.get(match.tournamentId) : null;
    if (tournament === undefined) continue;
    const teams = tournament ? tournamentTeams(tournament) : rosterTeams;
    const home = teams.get(match.homeTeamId);
    const away = teams.get(match.awayTeamId);
    const opens = tournament !== null || (home !== undefined && away !== undefined);
    rows.push({
      match,
      home: home ?? deletedTeam(match.homeTeamId),
      away: away ?? deletedTeam(match.awayTeamId),
      tournament,
      ...(opens && { href: tournament ? `/competitions/${tournament.id}` : scoringHref(match) }),
    });
  }
  return rows;
};

/** The tournament filter's value for the quick matches, which have no tournament. */
export const QUICK_MATCHES = "quick";

export interface LedgerFilters {
  /** A tournament's id, QUICK_MATCHES, or empty for everything. */
  tournamentId: string;
  /** A team's id, or empty for every team. */
  teamId: string;
  /** Text to find in the teams' names, the tournament's name, or the day played. */
  query: string;
}

/** Where a row was played, in words: the tournament's name, or "Quick match". */
export const playedIn = (row: Pick<LedgerRow, "tournament">): string =>
  row.tournament?.name ?? "Quick match";

/** The day a result was confirmed, as the ledger heads it: "Sunday, July 12, 2026". */
const dayLabel = (ts: number | undefined): string =>
  ts
    ? new Date(ts).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Unknown date";

/**
 * The rows every filter lets through. The search looks at what a row
 * shows, and at the day heading above it, so "July" finds July's results.
 */
export const filterLedger = (rows: LedgerRow[], filters: LedgerFilters): LedgerRow[] => {
  const query = filters.query.trim().toLowerCase();
  return rows.filter((row) => {
    const { match } = row;
    if (filters.tournamentId && (match.tournamentId ?? QUICK_MATCHES) !== filters.tournamentId) {
      return false;
    }
    if (filters.teamId && match.homeTeamId !== filters.teamId && match.awayTeamId !== filters.teamId) {
      return false;
    }
    if (!query) return true;
    const shown = [row.home.name, row.away.name, playedIn(row), dayLabel(match.completedAt)];
    return shown.join(" ").toLowerCase().includes(query);
  });
};

export interface FilterOption {
  id: string;
  name: string;
}

export interface LedgerFilterOptions {
  tournaments: FilterOption[];
  teams: FilterOption[];
}

/**
 * What the filters offer: each tournament with a result, the latest first,
 * then the quick matches if there are any; and each team that played, by
 * name, named as its latest result names it. A team the roster no longer
 * has is left out, since every one of them would read "Deleted team".
 */
export const ledgerFilterOptions = (rows: LedgerRow[]): LedgerFilterOptions => {
  const tournaments = new Map<string, FilterOption>();
  const teams = new Map<string, FilterOption>();
  let quickMatches = false;
  for (const row of rows) {
    if (row.tournament) {
      const { id, name } = row.tournament;
      if (!tournaments.has(id)) tournaments.set(id, { id, name });
    } else {
      quickMatches = true;
    }
    for (const team of [row.home, row.away]) {
      if (!team.deleted && !teams.has(team.id)) teams.set(team.id, { id: team.id, name: team.name });
    }
  }
  return {
    tournaments: [
      ...tournaments.values(),
      ...(quickMatches ? [{ id: QUICK_MATCHES, name: "Quick matches" }] : []),
    ],
    teams: [...teams.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
};

export interface LedgerDay {
  label: string;
  rows: LedgerRow[];
}

/** The rows under a heading for each day, in the order they come. Days are local days. */
export const ledgerDays = (rows: LedgerRow[]): LedgerDay[] => {
  const days: LedgerDay[] = [];
  for (const row of rows) {
    const label = dayLabel(row.match.completedAt);
    const last = days[days.length - 1];
    if (last?.label === label) last.rows.push(row);
    else days.push({ label, rows: [row] });
  }
  return days;
};

// ============================================
// CSV export
// ============================================

const pad = (n: number) => String(n).padStart(2, "0");

/** A local date as 2026-07-12, which spreadsheets read as a date whatever their locale. */
const isoDay = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/**
 * One cell: quoted, with its quotes doubled. Team names are typed by
 * people, so text a spreadsheet would run as a formula, starting with
 * = + - @ or a tab, gets a leading apostrophe and stays text.
 */
const csvCell = (value: string) => {
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${text.replaceAll('"', '""')}"`;
};

const CSV_HEADER = [
  "Date",
  "Time",
  "Tournament",
  "Home",
  "Away",
  "Home Score",
  "Away Score",
  "Home Games",
  "Away Games",
  "Winner",
  "Forfeited By",
];

/** The row's team with this id, if it is one of the two. */
const teamWithId = (row: LedgerRow, teamId: string | undefined) =>
  teamId === row.home.id ? row.home : teamId === row.away.id ? row.away : undefined;

/**
 * The rows as CSV, one line each under a header, lines ending CRLF. The
 * date and time are local, so an evening's results stay on its day. A
 * forfeit has no score. A best-of gives the games each team won beside
 * the deciding game's points; any other match leaves the games empty.
 */
export const ledgerCsv = (rows: LedgerRow[]): string => {
  const lines = rows.map((row) => {
    const { match } = row;
    const when = match.completedAt ? new Date(match.completedAt) : null;
    const scored = match.forfeitedBy === undefined;
    const series = scored && (match.seriesLength ?? 1) > 1;
    return [
      when ? isoDay(when) : "",
      when ? `${pad(when.getHours())}:${pad(when.getMinutes())}` : "",
      playedIn(row),
      row.home.name,
      row.away.name,
      scored ? String(match.homeScore) : "",
      scored ? String(match.awayScore) : "",
      series ? String(match.homeWins ?? 0) : "",
      series ? String(match.awayWins ?? 0) : "",
      teamWithId(row, match.winnerId)?.name ?? "",
      teamWithId(row, match.forfeitedBy)?.name ?? "",
    ];
  });
  return [CSV_HEADER, ...lines].map((line) => line.map(csvCell).join(",")).join("\r\n");
};

/** The export's file name, for the local day it was made: history-2026-07-12.csv. */
export const ledgerFileName = (now: number): string => `history-${isoDay(new Date(now))}.csv`;
