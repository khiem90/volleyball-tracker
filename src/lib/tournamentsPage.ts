import { entryTeams } from "@/lib/entries";
import { FORMAT_LABELS, isBracketFormat, isRotationFormat } from "@/lib/formats";
import { calculateStandings } from "@/lib/roundRobin";
import { matchLine, type MatchLine } from "@/lib/scoreLine";
import type { Team } from "@/lib/teamShapes";
import type { Match, PersistentTeam, Tournament } from "@/types/game";

/**
 * The Tournaments page, the pure part: the list of tournaments still open
 * and what the page shows of the one that is selected, worked out from the
 * account's tournaments, matches, and roster. Nothing in here touches the
 * database or React.
 */

// ============================================
// The list
// ============================================

/** One tournament in the page's list. */
export interface TournamentRow {
  id: string;
  name: string;
  typeLabel: string;
  status: Tournament["status"];
  teamCount: number;
  /** Matches with a result, out of `total`. */
  completed: number;
  total: number;
}

/** The tournaments the page lists: live first, then drafts, the newest first in each. Completed ones are in History. */
export const openTournaments = (tournaments: Tournament[]): Tournament[] => {
  const rank = (tournament: Tournament) => (tournament.status === "live" ? 0 : 1);
  return tournaments
    .filter((tournament) => tournament.status !== "completed")
    .sort((a, b) => rank(a) - rank(b) || b.createdAt - a.createdAt);
};

/** The list's rows, in the order of openTournaments. */
export const tournamentRows = (tournaments: Tournament[], matches: Match[]): TournamentRow[] =>
  openTournaments(tournaments).map((tournament) => {
    const own = matches.filter((match) => match.tournamentId === tournament.id);
    return {
      id: tournament.id,
      name: tournament.name,
      typeLabel: FORMAT_LABELS[tournament.format],
      status: tournament.status,
      teamCount: tournament.teamIds.length,
      completed: own.filter((match) => match.status === "completed").length,
      total: own.length,
    };
  });

// ============================================
// The selected tournament
// ============================================

/** One match of the small bracket. A side with no team yet is null. */
export interface BracketCell {
  home: Team | null;
  away: Team | null;
  homeScore: number;
  awayScore: number;
  homeWon: boolean;
  awayWon: boolean;
  live: boolean;
  pending: boolean;
}

export interface BracketRound {
  label: string;
  cells: BracketCell[];
}

export interface StandingLine {
  team: Team;
  won: number;
  lost: number;
  pct: string;
  pointsFor: number;
  pointsAgainst: number;
  diff: string;
}

/** A match in one of the page's three lists: being scored, waiting, or with a result. */
export interface ListedMatch {
  /** The court of a match being scored, the round of a waiting one, or the day a result came in. */
  label: string;
  home: Team;
  away: Team;
  /** What its score line shows, by the rule every score line reads. */
  line: MatchLine;
}

/** What the page shows of the tournament picked in the list. */
export interface SelectedTournament {
  tournament: Tournament;
  typeLabel: string;
  isElimination: boolean;
  teamCount: number;
  matchTotal: number;
  matchesCompleted: number;
  completionPct: number;
  /** Null for a format that does not play on numbered courts. */
  courtCount: number | null;
  winner: Team | null;
  bracket: BracketRound[];
  standings: StandingLine[];
  liveCourts: ListedMatch[];
  schedule: ListedMatch[];
  recent: ListedMatch[];
  createdDate: string;
  seriesLabel: string;
}

const shortDate = (ts?: number) =>
  ts ? new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD";

const roundLabel = (round: number, maxRound: number, cellsInRound: number): string => {
  if (round === maxRound) return cellsInRound > 1 ? `Round ${round}` : "Final";
  if (round === maxRound - 1 && cellsInRound <= 2) return "Semifinals";
  if (round === maxRound - 2 && cellsInRound <= 4) return "Quarterfinals";
  return `Round ${round}`;
};

/** The first four rounds of a bracket. A double elimination shows its winners side and the grand final. */
const smallBracket = (matches: Match[], teamOf: (teamId: string) => Team): BracketRound[] => {
  const shown = matches.filter(
    (m) => !m.bracket || m.bracket === "winners" || m.bracket === "grand_finals",
  );
  const maxRound = Math.max(0, ...shown.map((m) => m.round));
  const rounds: BracketRound[] = [];
  for (let round = 1; round <= maxRound; round++) {
    const cells = shown
      .filter((m) => m.round === round)
      .sort((a, b) => a.position - b.position)
      .map((m) => ({
        home: m.homeTeamId ? teamOf(m.homeTeamId) : null,
        away: m.awayTeamId ? teamOf(m.awayTeamId) : null,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        homeWon: m.winnerId === m.homeTeamId && m.status === "completed",
        awayWon: m.winnerId === m.awayTeamId && m.status === "completed",
        live: m.status === "in_progress",
        pending: m.status === "pending",
      }));
    if (cells.length > 0) rounds.push({ label: roundLabel(round, maxRound, cells.length), cells });
  }
  return rounds.slice(0, 4);
};

/** Everything the page shows of one tournament. `allMatches` may hold other tournaments' matches too. */
export const selectedTournament = (
  tournament: Tournament,
  allMatches: Match[],
  roster: PersistentTeam[],
): SelectedTournament => {
  // The entries as they should be shown, so a mixed team, which no roster
  // has, reads its name from its own entry.
  const shown = new Map(entryTeams(tournament, roster).map((team) => [team.id, team]));
  const teamOf = (teamId: string): Team => {
    const team = shown.get(teamId);
    return {
      name: team?.name ?? "Unknown",
      ...(team?.color !== undefined && { color: team.color }),
    };
  };

  const matches = allMatches.filter((m) => m.tournamentId === tournament.id);
  const completed = matches.filter((m) => m.status === "completed");
  const live = matches.filter((m) => m.status === "in_progress");
  const pending = matches.filter((m) => m.status === "pending");
  const isElimination = isBracketFormat(tournament.format);
  const listed = (match: Match, label: string): ListedMatch => ({
    label,
    home: teamOf(match.homeTeamId),
    away: teamOf(match.awayTeamId),
    line: matchLine(match),
  });

  const standings = isElimination
    ? []
    : calculateStandings(tournament.teamIds, matches, tournament.settings).map((s) => ({
        team: teamOf(s.teamId),
        won: s.won,
        lost: s.lost,
        pct: s.played > 0 ? (s.won / s.played).toFixed(3).replace(/^0/, "") : "—",
        pointsFor: s.pointsFor,
        pointsAgainst: s.pointsAgainst,
        diff: `${s.pointsDiff >= 0 ? "+" : ""}${s.pointsDiff}`,
      }));

  return {
    tournament,
    typeLabel: FORMAT_LABELS[tournament.format],
    isElimination,
    teamCount: tournament.teamIds.length,
    matchTotal: matches.length,
    matchesCompleted: completed.length,
    completionPct:
      matches.length > 0 ? Math.round((completed.length / matches.length) * 100) : 0,
    courtCount: isRotationFormat(tournament.format) ? tournament.settings.courts : null,
    winner: tournament.winnerId ? teamOf(tournament.winnerId) : null,
    bracket: isElimination ? smallBracket(matches, teamOf) : [],
    standings,
    liveCourts: live.slice(0, 4).map((m, i) => listed(m, `Court ${i + 1}`)),
    schedule: pending
      .filter((m) => m.homeTeamId && m.awayTeamId)
      .slice(0, 5)
      .map((m) => listed(m, `Round ${m.round}`)),
    recent: [...completed]
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
      .slice(0, 5)
      .map((m) => listed(m, shortDate(m.completedAt))),
    createdDate: new Date(tournament.createdAt).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    seriesLabel:
      tournament.settings.seriesLength > 1
        ? `Best of ${tournament.settings.seriesLength}`
        : "Single match",
  };
};
