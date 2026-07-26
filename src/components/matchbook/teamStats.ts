import type { Match } from "@/types/game";
import type { MbFormResult, MbReadinessStatus } from "./types";

// Per-team aggregates derived from completed matches. Shared by the overview
// dashboard and the team directory so both report identical numbers.
export interface TeamTally {
  played: number;
  won: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
  /** Match results, most recent first. */
  results: MbFormResult[];
  /** Current unbroken win streak counted back from the most recent match. */
  streak: number;
}

export const emptyTally = (): TeamTally => ({
  played: 0,
  won: 0,
  lost: 0,
  pointsFor: 0,
  pointsAgainst: 0,
  results: [],
  streak: 0,
});

/**
 * Build per-team tallies from completed matches.
 * `completedNewestFirst` must be sorted newest-first so `results` and `streak`
 * read chronologically backwards from the latest match.
 */
export const buildTeamTallies = (
  completedNewestFirst: Match[]
): Map<string, TeamTally> => {
  const tallies = new Map<string, TeamTally>();

  const tallyFor = (teamId: string): TeamTally => {
    let tally = tallies.get(teamId);
    if (!tally) {
      tally = emptyTally();
      tallies.set(teamId, tally);
    }
    return tally;
  };

  const record = (
    match: Match,
    teamId: string,
    scored: number,
    conceded: number
  ) => {
    const tally = tallyFor(teamId);
    tally.played += 1;
    tally.pointsFor += scored;
    tally.pointsAgainst += conceded;
    const won = match.winnerId === teamId;
    if (won) tally.won += 1;
    else tally.lost += 1;
    tally.results.push(won ? "W" : "L");
    if (tally.results.length === tally.streak + 1 && won) tally.streak += 1;
  };

  for (const match of completedNewestFirst) {
    if (match.isBye) continue;
    record(match, match.homeTeamId, match.homeScore, match.awayScore);
    record(match, match.awayTeamId, match.awayScore, match.homeScore);
  }

  return tallies;
};

/** Last five results, oldest-to-newest for left-to-right display. */
export const recentForm = (tally?: TeamTally): MbFormResult[] =>
  (tally?.results.slice(0, 5) ?? []).reverse();

/** Blend of overall win rate and recent form, as a 0-100 readiness score. */
export const readinessPercent = (tally?: TeamTally): number => {
  const winRate = tally && tally.played > 0 ? tally.won / tally.played : 0;
  const recent = tally?.results.slice(0, 5) ?? [];
  const recentRate =
    recent.length > 0
      ? recent.filter((result) => result === "W").length / recent.length
      : 0;
  return Math.round((winRate * 0.5 + recentRate * 0.5) * 100);
};

export const readinessStatus = (percent: number): MbReadinessStatus =>
  percent >= 85 ? "READY" : percent >= 65 ? "GOOD" : "NEEDS ATTN";

export const readinessColor = (percent: number): string =>
  percent >= 85
    ? "var(--mb-green)"
    : percent >= 65
      ? "var(--mb-gold)"
      : "var(--mb-red)";
