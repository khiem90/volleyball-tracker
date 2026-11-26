import { abandonedQuickMatches } from "@/lib/quickMatches";
import type { ScoreSide } from "@/lib/scoreLine";
import type { FormResult, Team } from "@/lib/teamShapes";
import { buildTeamTallies, recentForm } from "@/lib/teamStats";
import type { Match, PersistentTeam } from "@/types/game";

/**
 * The Quick Match page, the pure part: what the page shows of the account's
 * saved matches, worked out from the roster and the matches. Nothing in here
 * touches the database or React.
 */

/** A finished quick match, as one row of the page's recent results. */
export interface QuickMatchRow {
  id: string;
  /** The day it finished, such as "Sep 27". */
  date: string;
  home: Team;
  homeScore: number;
  awayScore: number;
  away: Team;
  winner: ScoreSide;
}

/** A quick match left mid-way, offered to resume or discard. */
export interface AbandonedMatchRow {
  id: string;
  home: Team;
  homeScore: number;
  awayScore: number;
  away: Team;
  /** When the match was set up, such as "Sep 27, 7:42 PM". */
  started: string;
  /** False once a team has left the roster, since the scoring page cannot show the match then. */
  resumable: boolean;
}

/** One side of the page's comparison: a team with its record over every finished match. */
export interface TeamFormSummary {
  team: Team;
  /** The last five results, the oldest first. */
  form: FormResult[];
  /** Wins and losses with an en dash between them. */
  record: string;
  won: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
}

export interface QuickMatchData {
  /** Every finished match of the account's, a tournament's included. */
  matchesCompleted: number;
  /** 1-based number of the quick match being set up. */
  nextMatchNumber: number;
  /** The five quick matches that finished last, the latest first. */
  recentQuickMatches: QuickMatchRow[];
  /** Quick matches left mid-way, the most recently started first. */
  abandonedQuickMatches: AbandonedMatchRow[];
  /** A team's side of the comparison, or null while no team is picked. */
  summaryFor: (teamId: string | null) => TeamFormSummary | null;
}

const shortDate = (ts?: number) =>
  ts
    ? new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "TBD";

const dateAndTime = (ts: number) =>
  new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const quickMatchData = (roster: PersistentTeam[], matches: Match[]): QuickMatchData => {
  /** A team as a screen draws it. A team that has left the roster reads "Unknown". */
  const refFor = (teamId: string): Team => {
    const team = roster.find((t) => t.id === teamId);
    return {
      name: team?.name ?? "Unknown",
      ...(team?.color !== undefined && { color: team.color }),
    };
  };

  const completed = matches
    .filter((m) => m.status === "completed")
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  const tallies = buildTeamTallies(completed);

  const quickMatches = matches.filter((m) => m.tournamentId === null);

  const recentQuickMatches = quickMatches
    .filter((m) => m.status === "completed")
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
    .slice(0, 5)
    .map((m) => ({
      id: m.id,
      date: shortDate(m.completedAt),
      home: refFor(m.homeTeamId),
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      away: refFor(m.awayTeamId),
      winner: m.winnerId === m.homeTeamId ? ("home" as const) : ("away" as const),
    }));

  const onRoster = (teamId: string) => roster.some((t) => t.id === teamId);
  const abandoned = abandonedQuickMatches(matches).map((m) => ({
    id: m.id,
    home: refFor(m.homeTeamId),
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    away: refFor(m.awayTeamId),
    started: dateAndTime(m.createdAt),
    resumable: onRoster(m.homeTeamId) && onRoster(m.awayTeamId),
  }));

  const summaryFor = (teamId: string | null): TeamFormSummary | null => {
    if (!teamId) return null;
    const tally = tallies.get(teamId);
    return {
      team: refFor(teamId),
      form: recentForm(tally),
      record: `${tally?.won ?? 0}–${tally?.lost ?? 0}`,
      won: tally?.won ?? 0,
      lost: tally?.lost ?? 0,
      pointsFor: tally?.pointsFor ?? 0,
      pointsAgainst: tally?.pointsAgainst ?? 0,
    };
  };

  return {
    matchesCompleted: completed.length,
    nextMatchNumber: quickMatches.length + 1,
    recentQuickMatches,
    abandonedQuickMatches: abandoned,
    summaryFor,
  };
};
