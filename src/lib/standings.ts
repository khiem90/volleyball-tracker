import type { Match, RoundRobinStanding } from "@/types/game";
import type { CompetitionConfig } from "@/types/competition-config";
import { DEFAULT_COMPETITION_CONFIG } from "@/types/competition-config";

/**
 * The single ranking authority for the app — every table must come from here
 * so a live session and its generated summary cannot order teams differently.
 *
 * Canonical rules the code below encodes:
 * - Byes are skipped, and a match counts only when BOTH sides are in `teamIds`
 *   (a fixture against a deleted team must not inflate one column).
 * - Draws increment `tied` even when `allowTies` is false — `allowTies` gates
 *   the points, not the bookkeeping, so `played === won + lost + tied` holds.
 * - The final tiebreak is the caller's `teamIds` order via stable sort, which
 *   keeps results deterministic. Head-to-head is deliberately NOT a tiebreaker:
 *   it is non-transitive once three teams are level.
 */

/** A standings line plus its finishing position. */
export interface RankedStanding extends RoundRobinStanding {
  /** 1-based competition rank. Teams that compare equal share a rank. */
  rank: number;
  /** True when at least one other line has the same rank. */
  sharesRank: boolean;
}

/** Points actually applied to a table, after config and defaults are resolved. */
export interface ResolvedPointsSystem {
  pointsForWin: number;
  pointsForTie: number;
  pointsForLoss: number;
  allowTies: boolean;
}

/** Fill config holes from defaults. A tie is worth 0 when ties are not allowed,
 *  whatever `pointsForTie` says. */
export const resolvePointsSystem = (
  config?: Partial<CompetitionConfig>
): ResolvedPointsSystem => {
  const allowTies = config?.allowTies ?? DEFAULT_COMPETITION_CONFIG.allowTies;

  return {
    pointsForWin: config?.pointsForWin ?? DEFAULT_COMPETITION_CONFIG.pointsForWin,
    pointsForTie: allowTies ? (config?.pointsForTie ?? 0) : 0,
    pointsForLoss: config?.pointsForLoss ?? DEFAULT_COMPETITION_CONFIG.pointsForLoss,
    allowTies,
  };
};

const emptyStanding = (teamId: string): RoundRobinStanding => ({
  teamId,
  played: 0,
  won: 0,
  lost: 0,
  tied: 0,
  pointsFor: 0,
  pointsAgainst: 0,
  pointsDiff: 0,
  competitionPoints: 0,
});

/**
 * Which side won, or `null` for a draw. `winnerId` wins over the scoreline
 * because instant-win and forfeit flows set it without a meaningful score.
 */
const outcomeOf = (match: Match): "home" | "away" | null => {
  if (match.winnerId === match.homeTeamId) return "home";
  if (match.winnerId === match.awayTeamId) return "away";
  if (match.homeScore > match.awayScore) return "home";
  if (match.awayScore > match.homeScore) return "away";
  return null;
};

const countsTowardStandings = (match: Match): boolean =>
  match.status === "completed" && !match.isBye;

/** One line per team, in `teamIds` order, unsorted — `rankTeams` is what you
 *  almost always want. */
export const tallyTeams = (
  teamIds: string[],
  matches: Match[],
  config?: Partial<CompetitionConfig>
): RoundRobinStanding[] => {
  const { pointsForWin, pointsForTie, pointsForLoss } = resolvePointsSystem(config);

  const table = new Map<string, RoundRobinStanding>();
  teamIds.forEach((teamId) => table.set(teamId, emptyStanding(teamId)));

  matches.filter(countsTowardStandings).forEach((match) => {
    const home = table.get(match.homeTeamId);
    const away = table.get(match.awayTeamId);
    if (!home || !away) return;

    home.played += 1;
    away.played += 1;
    home.pointsFor += match.homeScore;
    home.pointsAgainst += match.awayScore;
    away.pointsFor += match.awayScore;
    away.pointsAgainst += match.homeScore;

    const outcome = outcomeOf(match);

    if (outcome === "home") {
      home.won += 1;
      home.competitionPoints += pointsForWin;
      away.lost += 1;
      away.competitionPoints += pointsForLoss;
    } else if (outcome === "away") {
      away.won += 1;
      away.competitionPoints += pointsForWin;
      home.lost += 1;
      home.competitionPoints += pointsForLoss;
    } else {
      home.tied += 1;
      away.tied += 1;
      home.competitionPoints += pointsForTie;
      away.competitionPoints += pointsForTie;
    }

    home.pointsDiff = home.pointsFor - home.pointsAgainst;
    away.pointsDiff = away.pointsFor - away.pointsAgainst;
  });

  return teamIds.map((teamId) => table.get(teamId) ?? emptyStanding(teamId));
};

/** Canonical ordering; `0` means genuinely level. */
export const compareStandings = (
  a: RoundRobinStanding,
  b: RoundRobinStanding
): number => {
  if (b.competitionPoints !== a.competitionPoints) {
    return b.competitionPoints - a.competitionPoints;
  }
  if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;
  if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
  if (b.won !== a.won) return b.won - a.won;
  return 0;
};

/** Number an already-sorted table; level lines share a rank and the next rank
 *  skips (1, 2, 2, 4). */
export const assignRanks = (
  sorted: readonly RoundRobinStanding[]
): RankedStanding[] => {
  const ranked = sorted.map((standing, index) => {
    const previous = sorted[index - 1];
    const rank =
      previous && compareStandings(previous, standing) === 0 ? -1 : index + 1;
    return { ...standing, rank, sharesRank: false };
  });

  // Second pass: carry forward shared ranks now that every row exists.
  ranked.forEach((row, index) => {
    if (row.rank === -1) row.rank = ranked[index - 1].rank;
  });
  ranked.forEach((row, index) => {
    const before = ranked[index - 1];
    const after = ranked[index + 1];
    row.sharesRank = before?.rank === row.rank || after?.rank === row.rank;
  });

  return ranked;
};

/** Rank every team in `teamIds` (their order breaks a dead heat) from the
 *  completed matches in `matches`. */
export const rankTeams = (
  teamIds: string[],
  matches: Match[],
  config?: Partial<CompetitionConfig>
): RankedStanding[] =>
  assignRanks(tallyTeams(teamIds, matches, config).sort(compareStandings));

/** A ranked line that also knows which way it moved since the previous round. */
export interface MovingStanding extends RankedStanding {
  /**
   * Places gained (+) or lost (-) since the previous round; `0` = held.
   * `undefined` = no earlier round exists — consumers must render NOTHING for
   * it, not a dash.
   */
  movement?: number;
}

/**
 * `rankTeams` plus rank movement. "Previous round" = the table with the latest
 * COUNTED round excluded (same completed/non-bye/both-listed filter as the
 * tally, so a round of nothing but byes is not history). Movement needs two or
 * more distinct counted rounds — one round has no previous table to compare
 * against, hence the `undefined` contract above.
 */
export const rankTeamsWithMovement = (
  teamIds: string[],
  matches: Match[],
  config?: Partial<CompetitionConfig>
): MovingStanding[] => {
  const ranked: MovingStanding[] = rankTeams(teamIds, matches, config);

  const listed = new Set(teamIds);
  const counted = matches.filter(
    (match) =>
      countsTowardStandings(match) &&
      listed.has(match.homeTeamId) &&
      listed.has(match.awayTeamId)
  );
  const rounds = new Set(counted.map((match) => match.round));
  if (rounds.size < 2) return ranked;

  const latest = Math.max(...rounds);
  const before = rankTeams(
    teamIds,
    matches.filter((match) => match.round !== latest),
    config
  );
  const previousRank = new Map(before.map((row) => [row.teamId, row.rank]));

  return ranked.map((row) => ({
    ...row,
    movement: (previousRank.get(row.teamId) ?? row.rank) - row.rank,
  }));
};
