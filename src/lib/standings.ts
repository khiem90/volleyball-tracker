import type { Match, RoundRobinStanding } from "@/types/game";
import type { CompetitionConfig } from "@/types/competition-config";
import { DEFAULT_COMPETITION_CONFIG } from "@/types/competition-config";

/**
 * The single ranking authority for the app.
 *
 * Four implementations of "who is top of the table" ship today and three of
 * them disagree, so a live session and its own generated summary can order the
 * same teams differently:
 *
 * | source                          | tie points        | ties counted            | winner from | order                       |
 * | ------------------------------- | ----------------- | ----------------------- | ----------- | --------------------------- |
 * | `lib/roundRobin.calculateStandings` | `pointsForTie ?? 0` | only when `allowTies` | score       | Pts, Diff, PF               |
 * | `hooks/useSessionPage`          | `pointsForTie ?? 1` | always                  | score       | Pts, Diff                   |
 * | `hooks/useSummaryPage`          | n/a               | never (a draw is two losses) | `winnerId` | Wins, Diff             |
 * | `components/Standings.tsx`      | renders whatever order it is handed — never sorts |
 *
 * `rankTeams` replaces all of them. The rules below are the canonical ones;
 * every difference from a current call site is deliberate and listed in
 * MIGRATION at the bottom of this file.
 *
 * 1. Only `status === "completed"` matches count.
 * 2. Synthetic bye matches (`isBye`) are skipped — a walkover is not a result.
 *    This matches `components/matchbook/teamStats.ts`, which already skips them.
 * 3. A match is skipped entirely unless *both* sides are in `teamIds`, so a
 *    fixture against a deleted team cannot inflate one column of the table.
 * 4. The winner is `match.winnerId` when it names one of the two sides, and the
 *    higher score otherwise. Score-only detection would score every
 *    instant-win rotation match as a draw if the app ever stopped writing 25-0.
 * 5. Equal scores with no winner are a draw: `tied` increments for both sides
 *    whether or not the competition allows ties, so `played === won + lost + tied`
 *    always holds. `allowTies` gates the *points*, not the bookkeeping.
 * 6. Order: competition points, then point difference, then points for, then
 *    wins, then the caller's `teamIds` order. `Array.prototype.sort` is stable
 *    in every runtime this app targets, so the last key makes the result
 *    deterministic — a live table and the summary generated from it cannot
 *    reorder.
 *
 * Head-to-head is deliberately *not* a tiebreaker: it is non-transitive as soon
 * as three teams are level, so it cannot produce a total order, and no current
 * call site implements it.
 *
 * The module is pure — no React, no context, no fetching.
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

/**
 * Resolve the configurable points system, filling every hole from
 * `DEFAULT_COMPETITION_CONFIG`. A tie is worth nothing when the competition
 * does not allow ties, whatever `pointsForTie` says.
 */
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

/**
 * Build one standings line per team, in the order `teamIds` was given.
 * Unsorted — `rankTeams` is what you almost always want.
 */
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

/**
 * The canonical ordering. Negative when `a` finishes above `b`, `0` when the
 * two are genuinely level and only the caller's input order separates them.
 */
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

/**
 * Number an already-sorted table. Level lines share a rank and the next rank
 * skips accordingly (1, 2, 2, 4), which is what a printed table does.
 */
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

/**
 * Rank every team in `teamIds` from the completed matches in `matches`.
 *
 * @param teamIds team ids to include, in the order that breaks a dead heat
 * @param matches every match to consider; non-completed and bye matches are ignored
 * @param config the competition's points system; defaults are used for holes
 */
export const rankTeams = (
  teamIds: string[],
  matches: Match[],
  config?: Partial<CompetitionConfig>
): RankedStanding[] =>
  assignRanks(tallyTeams(teamIds, matches, config).sort(compareStandings));

/*
 * ---------------------------------------------------------------------------
 * MIGRATION — how each caller repoints (not done here; W8 P2b / the screen
 * workstreams land the edits so the visual diff stays attributable).
 * ---------------------------------------------------------------------------
 *
 * 1. `src/lib/roundRobin.ts` — `calculateStandings(teamIds, matches, config)`
 *    becomes a one-line re-export:
 *        export const calculateStandings = rankTeams;
 *    `RankedStanding extends RoundRobinStanding`, so its three consumers
 *    (`useCompetitionDetailPage.ts:227,326`, `useMatchPage.ts:410`,
 *    `useMatchbookCompete.ts:194`) compile untouched and gain `rank`.
 *    Behaviour changes to expect: bye matches stop counting (elimination
 *    formats only), `winnerId` beats the scoreline, drawn matches now increment
 *    `tied` even when `allowTies` is false, and `won` is a fourth tiebreaker.
 *
 * 2. `src/hooks/useSessionPage.ts:81-150` — delete the whole inline `standings`
 *    memo body and return
 *        rankTeams(competition.teamIds, matches, competition.config)
 *    keeping the `competition.type !== "round_robin" -> null` guard. This is
 *    the fix for the live/final disagreement: the hook currently defaults
 *    `pointsForTie` to **1**, counts ties even when the competition forbids
 *    them, and never uses points-for as a tiebreaker.
 *
 * 3. `src/hooks/useSummaryPage.ts:116-162` — `teamStats` keeps its
 *    `{ team, wins, losses, pointsFor, pointsAgainst }` shape for the four
 *    `Summary*.tsx` renderers, but is built by zipping
 *        rankTeams(summary.teams.map(t => t.id), summary.matches, summary.config)
 *    against `summary.teams`. Today a draw is recorded as a loss for both
 *    sides (`match.winnerId === match.homeTeamId ? wins++ : losses++`), and the
 *    order is wins-first rather than points-first, so a session with
 *    `pointsForWin: 2, allowTies: true` can rank its summary differently from
 *    the live table it was generated from. `SessionSummary` has no `config`
 *    field yet — W6 either threads it through when the summary is written or
 *    passes `undefined` and accepts the 3/0/0 default.
 *
 * 4. `src/components/Standings.tsx` — no ranking change; it renders the array
 *    it is given. When W4 replaces it with `MbStandingsTable`, read `rank` /
 *    `sharesRank` off the row instead of `index + 1`, which is what makes
 *    joint positions renderable at all.
 *
 * 5. `src/components/session/SessionRoundRobinStandings.tsx` — consumes
 *    `useSessionPage().standings`, so it inherits (2) for free.
 */
