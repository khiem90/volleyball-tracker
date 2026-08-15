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

/* ---------------------------------------------------------------------------
   THE STATE A NEW TEAM IS IN

   `readinessPercent` answers 0 for a team that has lost five and 0 for a team
   that has played none, and `readinessStatus` had one branch for both: the
   first thing this app said to a user who had just created their first team
   was `RIVERSIDE ROCKETS  0%  ▬  NEEDS ATTN`, in coral, thirty seconds in.

   A team with no matches played is not failing. It has nothing to report, and
   0 is not what it has to report — the percent is UNKNOWN, which is a different
   claim from zero and needs a different mark, a different word and a different
   ink. Nothing else on the row can carry it: `percent` is a `number`, and both
   teams resolve to the same one.

   So the condition is `played`, which the tally already holds and which the
   percent has thrown away by the time these three functions see it.

   ------------------------------------------------------------------ the shape

   `readinessStatus` is OVERLOADED rather than widened. `MbReadinessStatus`
   lives in `types.ts`, which charter H3 reserves to W1, and `/`'s dashboard
   (`useMatchbookDashboard.ts:341`) assigns this return straight into a field
   typed with that three-word union. A plain widening would break a file this
   workstream does not own; the one-argument signature keeps its exact old type
   and its exact old behaviour, and the two-argument one is the honest form.

   `/`'s readiness panel therefore still prints NEEDS ATTN for an unplayed team.
   That is a one-line change (pass `tally?.played ?? 0`) in a file W2 owns, and
   it is flagged rather than made here.
   --------------------------------------------------------------------------- */

/** `MbReadinessStatus` plus the state that is not a judgement. */
export type MbReadinessState = MbReadinessStatus | "NEW";

export function readinessStatus(percent: number): MbReadinessStatus;
export function readinessStatus(percent: number, played: number): MbReadinessState;
export function readinessStatus(
  percent: number,
  played?: number
): MbReadinessState {
  if (played === 0) return "NEW";
  return percent >= 85 ? "READY" : percent >= 65 ? "GOOD" : "NEEDS ATTN";
}

/**
 * The MARK colour — a meter fill, a dot, a rule. A UI graphic's floor is 3:1
 * and all three clear it on both paper tones.
 *
 * With nothing played there is no fill to colour: the caller draws the track at
 * zero, and the rule tone keeps a stray 1px edge from reading as a result.
 */
export const readinessColor = (percent: number, played?: number): string =>
  played === 0
    ? "var(--mb-rule)"
    : percent >= 85
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
 *
 * NEW takes `--mb-ink-muted` — 5.25:1 on `--mb-paper-bright`, over the 4.5:1
 * floor — because it is the one of the four that is not a verdict, and inking
 * it in the same family as READY/GOOD/NEEDS ATTN would make "you have not
 * played yet" look like a grade.
 */
export const readinessInk = (percent: number, played?: number): string =>
  played === 0
    ? "var(--mb-ink-muted)"
    : percent >= 85
      ? "var(--mb-green-ink)"
      : percent >= 65
        ? "var(--mb-gold-ink)"
        : "var(--mb-red)";
