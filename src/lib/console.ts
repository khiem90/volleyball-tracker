import {
  getDoubleBracketStructure,
  getDoubleElimRoundName,
  getTotalWinnersRounds,
} from "@/lib/doubleElimination";
import { openMatchOn } from "@/lib/engine";
import { isBracketFormat, isRotationFormat } from "@/lib/formats";
import { calculateStandings } from "@/lib/roundRobin";
import { getRoundName, getTotalRounds } from "@/lib/singleElimination";
import { getChampionCount } from "@/lib/win2out";
import type {
  Match,
  PersistentTeam,
  RoundRobinStanding,
  Tournament,
  TournamentStatus,
} from "@/types/game";

/**
 * The tournament console: what each role may do, and what each tab shows,
 * worked out from a tournament and its matches. Nothing in here touches the
 * database or React.
 */

// ============================================
// Roles and access
// ============================================

/** Who is looking at the console. Only the owner is active until ticket 13. */
export type ConsoleRole = "owner" | "scorer" | "spectator";

export interface ConsoleAccess {
  /** Start a draft. Owner only. */
  canStart: boolean;
  /** Open scoring, record instant wins. Owner and scorer while live. */
  canScore: boolean;
  /** Reorder the queue and swap courts. Owner and scorer while live. */
  canEditCourts: boolean;
  /** End, change teams, change courts. Owner while live. */
  canManage: boolean;
  /** Rename. Owner while draft or live; a completed tournament keeps its name. */
  canRename: boolean;
  /** Make a new draft from this tournament. Owner, in any status. */
  canDuplicate: boolean;
  /** Delete the tournament and its matches. Owner, in any status. */
  canDelete: boolean;
}

const NO_ACCESS: ConsoleAccess = {
  canStart: false,
  canScore: false,
  canEditCourts: false,
  canManage: false,
  canRename: false,
  canDuplicate: false,
  canDelete: false,
};

/**
 * What a role may do given the tournament's status. A spectator can only
 * ever watch. A completed tournament is read-only: nothing in it changes,
 * though its owner can still duplicate it into a new draft or delete it.
 */
export const consoleAccess = (role: ConsoleRole, status: TournamentStatus): ConsoleAccess => {
  if (role === "spectator") return NO_ACCESS;
  const owner = role === "owner";
  const ownerOnly = { canDuplicate: owner, canDelete: owner };
  if (status === "draft") return { ...NO_ACCESS, ...ownerOnly, canStart: owner, canRename: owner };
  if (status === "live") {
    return {
      ...NO_ACCESS,
      ...ownerOnly,
      canScore: true,
      canEditCourts: true,
      canManage: owner,
      canRename: owner,
    };
  }
  return { ...NO_ACCESS, ...ownerOnly };
};

// ============================================
// Courts
// ============================================

/** A court in a rotation tournament: who is on it and the match waiting or being played there. */
export interface CourtView {
  court: number;
  teamIds: [string, string];
  match: Match | null;
}

export type CourtsView =
  /** Rotation formats: the courts in play and the teams waiting behind them. */
  | { kind: "rotation"; courts: CourtView[]; queue: string[] }
  /** Every other format: what is being played and what is ready to play. */
  | { kind: "matches"; live: Match[]; pending: Match[] };

const rotationState = (tournament: Tournament) =>
  tournament.win2outState ?? tournament.twoMatchRotationState;

/** A match a scorer could open: both teams known and not decided by a bye. */
export const isPlayable = (match: Match): boolean =>
  match.homeTeamId !== "" && match.awayTeamId !== "" && match.isBye !== true;

/**
 * A completed result the owner could correct. A bye has no score. A
 * forfeit can be corrected into a played result in a round robin, where the
 * standings recalculate, but not in a bracket, where the opponent has
 * already gone through.
 */
export const isCorrectable = (tournament: Tournament, match: Match): boolean =>
  match.status === "completed" &&
  match.isBye !== true &&
  (match.forfeitedBy === undefined || tournament.format === "round_robin");

const SIDE_ORDER = { winners: 0, losers: 1, grand_finals: 2 } as const;

/** Play order: bracket side, then round, then position. */
export const byPlayOrder = (a: Match, b: Match): number =>
  SIDE_ORDER[a.bracket ?? "winners"] - SIDE_ORDER[b.bracket ?? "winners"] ||
  a.round - b.round ||
  a.position - b.position;

/**
 * What the Courts tab shows. For rotation formats that is each court with
 * its open match and the queue; before the tournament starts there are no
 * courts yet. For the other formats it is the live matches and the pending
 * ones a scorer could open.
 */
export const courtsView = (tournament: Tournament, matches: Match[]): CourtsView => {
  if (isRotationFormat(tournament.format)) {
    const state = rotationState(tournament);
    if (!state) return { kind: "rotation", courts: [], queue: [] };
    const courts = [...state.courts]
      .sort((a, b) => a.courtNumber - b.courtNumber)
      .map((court) => ({
        court: court.courtNumber,
        teamIds: court.teamIds,
        match: openMatchOn(matches, court.courtNumber) ?? null,
      }));
    return { kind: "rotation", courts, queue: [...state.queue] };
  }
  const ordered = [...matches].sort(byPlayOrder);
  return {
    kind: "matches",
    live: ordered.filter((m) => m.status === "in_progress"),
    pending: ordered.filter((m) => m.status === "pending" && isPlayable(m)),
  };
};

// ============================================
// Terminology
// ============================================

export const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** "Court 2", or "Field 2" when the tournament calls its courts fields. */
export const courtLabel = (tournament: Tournament, court: number): string =>
  `${capitalize(tournament.settings.terminology.venue)} ${court}`;

/** The tournament's word for its courts: "court" or "courts", "field" or "fields". */
export const courtsWord = (tournament: Tournament, count: number): string =>
  count === 1
    ? tournament.settings.terminology.venue
    : tournament.settings.terminology.venuePlural;

// ============================================
// Schedule
// ============================================

export interface ScheduleRow {
  match: Match;
  /** Where the match sits: its round, its bracket round, or its court. */
  label: string;
}

/**
 * Where a match sits: its round, its bracket round, or its court, in the
 * words the tournament uses.
 */
export const matchLabel = (tournament: Tournament, match: Match): string => {
  if (isRotationFormat(tournament.format)) {
    return courtLabel(tournament, match.court ?? match.position);
  }
  const teamCount = tournament.teamIds.length;
  if (tournament.format === "single_elimination") {
    return getRoundName(match.round, getTotalRounds(teamCount));
  }
  if (tournament.format === "double_elimination") {
    return getDoubleElimRoundName(
      match.round,
      match.bracket ?? "winners",
      getTotalWinnersRounds(teamCount),
    );
  }
  return `Round ${match.round}`;
};

/**
 * Every match of the tournament in play order with a label saying where it
 * sits. Rotation formats have no rounds, so their matches run in the order
 * they were scheduled, each labelled with its court.
 */
export const scheduleView = (tournament: Tournament, matches: Match[]): ScheduleRow[] => {
  const ordered = isRotationFormat(tournament.format)
    ? [...matches].sort((a, b) => a.createdAt - b.createdAt)
    : [...matches].sort(byPlayOrder);
  return ordered.map((match) => ({ match, label: matchLabel(tournament, match) }));
};

// ============================================
// Teams
// ============================================

export interface TeamRow {
  teamId: string;
  name: string;
  color?: string;
  withdrawn: boolean;
  played: number;
  won: number;
  lost: number;
}

/**
 * The entries with each team's record in this tournament. Names and colors
 * come from `teams`, the entries as they should be shown (see entryTeams),
 * with the entry's own snapshot as the fallback. A forfeit counts as a win
 * and a loss; byes are not played.
 */
export const teamsView = (
  tournament: Tournament,
  matches: Match[],
  teams: PersistentTeam[],
): TeamRow[] => {
  const shown = new Map(teams.map((team) => [team.id, team]));
  const record = new Map<string, { played: number; won: number; lost: number }>();
  const tally = (teamId: string, won: boolean) => {
    const line = record.get(teamId) ?? { played: 0, won: 0, lost: 0 };
    line.played += 1;
    if (won) line.won += 1;
    else line.lost += 1;
    record.set(teamId, line);
  };
  for (const match of matches) {
    if (match.status !== "completed" || match.isBye || !match.winnerId) continue;
    tally(match.homeTeamId, match.winnerId === match.homeTeamId);
    tally(match.awayTeamId, match.winnerId === match.awayTeamId);
  }
  return tournament.entries.map((entry) => {
    const team = shown.get(entry.teamId);
    const color = team?.color ?? entry.color;
    return {
      teamId: entry.teamId,
      name: team?.name ?? entry.name,
      ...(color !== undefined && { color }),
      withdrawn: entry.withdrawnAt !== undefined,
      ...(record.get(entry.teamId) ?? { played: 0, won: 0, lost: 0 }),
    };
  });
};

// ============================================
// Standings
// ============================================

/** Where a rotation team is right now: on a court, or waiting at a queue position (from 1). */
interface Whereabouts {
  court?: number;
  queuePosition?: number;
}

export interface Win2OutRow extends Whereabouts {
  teamId: string;
  /** Times the team has won two in a row on a court. */
  championCount: number;
  /** Wins in a row on its current court; one more makes it champion. */
  winStreak: number;
  matchesPlayed: number;
}

export interface TwoMatchRow extends Whereabouts {
  teamId: string;
  played: number;
  won: number;
  lost: number;
}

export type StandingsView =
  | { kind: "round_robin"; rows: RoundRobinStanding[] }
  | { kind: "win2out"; rows: Win2OutRow[] }
  | { kind: "two_match"; rows: TwoMatchRow[] }
  /** Bracket formats have a bracket instead; see bracketView. */
  | { kind: "bracket" };

const whereabouts = (
  state: { courts: { courtNumber: number; teamIds: [string, string] }[]; queue: string[] },
  teamId: string,
): Whereabouts => {
  const court = state.courts.find((c) => c.teamIds.includes(teamId));
  if (court) return { court: court.courtNumber };
  const position = state.queue.indexOf(teamId);
  return position === -1 ? {} : { queuePosition: position + 1 };
};

/**
 * The Standings tab. Round Robin ranks by standings points; Win 2 & Out by
 * times champion, then matches played; Two Match Rotation by wins, then win
 * rate. Every entered team is listed, including ones that have not played.
 */
export const standingsView = (tournament: Tournament, matches: Match[]): StandingsView => {
  if (isBracketFormat(tournament.format)) return { kind: "bracket" };

  if (tournament.format === "win2out") {
    const state = tournament.win2outState;
    if (!state) return { kind: "win2out", rows: [] };
    const rows = state.teamStatuses
      .map((status) => ({
        teamId: status.teamId,
        championCount: getChampionCount(state, status.teamId),
        winStreak: status.winStreak,
        matchesPlayed: status.matchesPlayed,
        ...whereabouts(state, status.teamId),
      }))
      .sort((a, b) => b.championCount - a.championCount || b.matchesPlayed - a.matchesPlayed);
    return { kind: "win2out", rows };
  }

  if (tournament.format === "two_match_rotation") {
    const state = tournament.twoMatchRotationState;
    if (!state) return { kind: "two_match", rows: [] };
    const rate = (row: TwoMatchRow) => (row.played === 0 ? 0 : row.won / row.played);
    const rows = state.teamStatuses
      .map((status) => ({
        teamId: status.teamId,
        played: status.totalMatches,
        won: status.totalWins,
        lost: status.totalLosses,
        ...whereabouts(state, status.teamId),
      }))
      .sort((a, b) => b.won - a.won || rate(b) - rate(a));
    return { kind: "two_match", rows };
  }

  return {
    kind: "round_robin",
    rows: calculateStandings(tournament.teamIds, matches, tournament.settings),
  };
};

// ============================================
// Bracket
// ============================================

export interface BracketRound {
  label: string;
  matches: Match[];
}

export interface BracketSection {
  /** Null for a single elimination, which has only one bracket. */
  title: string | null;
  rounds: BracketRound[];
}

export interface BracketView {
  sections: BracketSection[];
}

/**
 * The Bracket tab: rounds of matches in position order. A single
 * elimination is one section; a double elimination is the winners bracket,
 * the losers bracket, and the grand final.
 */
export const bracketView = (tournament: Tournament, matches: Match[]): BracketView => {
  const teamCount = tournament.teamIds.length;

  if (tournament.format === "single_elimination") {
    const total = getTotalRounds(teamCount);
    const rounds: BracketRound[] = [];
    for (let round = 1; round <= total; round++) {
      rounds.push({
        label: getRoundName(round, total),
        matches: matches.filter((m) => m.round === round).sort(byPlayOrder),
      });
    }
    return { sections: [{ title: null, rounds }] };
  }

  if (tournament.format === "double_elimination") {
    const winnersRounds = getTotalWinnersRounds(teamCount);
    const structure = getDoubleBracketStructure(matches, teamCount);
    const label = (side: "winners" | "losers") => (round: number) =>
      getDoubleElimRoundName(round, side, winnersRounds);
    const rounds = (side: "winners" | "losers", groups: Match[][]) =>
      groups.map((group, i) => ({ label: label(side)(i + 1), matches: group }));
    return {
      sections: [
        { title: "Winners", rounds: rounds("winners", structure.winners) },
        { title: "Losers", rounds: rounds("losers", structure.losers) },
        {
          title: "Grand Final",
          rounds: structure.grandFinals
            ? [{ label: "Grand Finals", matches: [structure.grandFinals] }]
            : [],
        },
      ],
    };
  }

  return { sections: [] };
};
