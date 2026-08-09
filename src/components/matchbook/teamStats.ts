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

/**
 * The MARK colour — a meter fill, a dot, a rule. A UI graphic's floor is 3:1
 * and all three clear it on both paper tones.
 */
export const readinessColor = (percent: number): string =>
  percent >= 85
    ? "var(--mb-green)"
    : percent >= 65
      ? "var(--mb-gold)"
      : "var(--mb-red)";

/**
 * The LETTERFORM colour, and the reason it is a second function rather than the
 * same one. `readinessColor()` was being spent on both the bar and the word
 * beside it, and measured at 0.64–0.66rem/700 on `--mb-paper-bright` the words
 * were: gold 2.15:1, green 4.28:1, red 4.58:1 — two live HF-6s against the
 * 4.5:1 floor for text under 18.66px.
 *
 * The ink twins `globals.css` already declares for this exact problem measure
 * 5.59:1 (gold-ink) and 5.13:1 (green-ink); red is the one tone that already
 * cleared, so it is unchanged and the three still read as one family.
 *
 * The 4.58:1 on red assumes the panel ground. Every caller today is inside
 * `.mb-panel` (`--mb-paper-bright`); on bare `--mb-paper` red drops to 4.20:1,
 * so a future caller on the page ground needs a red ink twin, which the token
 * set does not yet have.
 *
 * The bar keeps `readinessColor()`. A mark may be bright; a word may not.
 */
export const readinessInk = (percent: number): string =>
  percent >= 85
    ? "var(--mb-green-ink)"
    : percent >= 65
      ? "var(--mb-gold-ink)"
      : "var(--mb-red)";
