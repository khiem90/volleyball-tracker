import { consoleAccess, isPlayable, type ConsoleRole } from "@/lib/console";
import type { Match, Tournament } from "@/types/game";

/**
 * The scoring page's pure part: whether the visitor may change the score and
 * why not, where Back goes, what the status badge says, how far a best-of
 * has got, and how taps that have not come back from the database yet are
 * counted. Nothing in here touches the database, the browser, or React.
 */

export type Side = "home" | "away";

// ============================================
// Access
// ============================================

/** Why taps on the score do nothing. */
export type ScoringBlock =
  /** The match has a result. Its score is corrected from the console, not here. */
  | "match_completed"
  /** The tournament is completed, so a match it left unplayed stays unplayed. */
  | "tournament_completed"
  /** A bracket slot nothing has filled yet. */
  | "not_ready"
  /** The visitor may watch but not score. */
  | "watch_only";

export type ScoringAccess = { canScore: true } | { canScore: false; reason: ScoringBlock };

const CANNOT = (reason: ScoringBlock): ScoringAccess => ({ canScore: false, reason });

/**
 * Whether a role may score a match. The most specific reason wins: a
 * completed match is over for everyone, then a completed tournament refuses
 * the matches it left behind, then a match still waiting for a team, then
 * the role. A quick match has no tournament, so anyone but a spectator may
 * score it.
 */
export const scoringAccess = (
  role: ConsoleRole,
  match: Pick<Match, "status" | "homeTeamId" | "awayTeamId" | "isBye">,
  tournament: Pick<Tournament, "status"> | null,
): ScoringAccess => {
  if (match.status === "completed") return CANNOT("match_completed");
  if (!tournament) return role === "spectator" ? CANNOT("watch_only") : { canScore: true };
  if (tournament.status === "completed") return CANNOT("tournament_completed");
  if (!isPlayable(match)) return CANNOT("not_ready");
  if (!consoleAccess(role, tournament.status).canScore) return CANNOT("watch_only");
  return { canScore: true };
};

/** Which kind of match the page shows, for the wording of a block. */
export type MatchKind = "tournament" | "quick" | "guest";

export const matchKind = (match: Pick<Match, "tournamentId">): MatchKind =>
  match.tournamentId ? "tournament" : "quick";

const OVER = "This match is over, so taps here do nothing.";

/** What the page says under the score when taps do nothing. */
export const blockMessage = (reason: ScoringBlock, kind: MatchKind): string => {
  switch (reason) {
    case "match_completed":
      if (kind === "tournament") {
        return `${OVER} The owner can correct its result from the console's Schedule tab.`;
      }
      if (kind === "quick") return `${OVER} Its result is in your history.`;
      return `${OVER} Play again to start a fresh one.`;
    case "tournament_completed":
      return "This tournament is completed, so this match cannot be scored.";
    case "not_ready":
      return "This match is waiting for its teams, so it cannot be scored yet.";
    case "watch_only":
      return "You can watch this match, but only a scorer can change the score.";
  }
};

/** A result can be confirmed by someone who may score, once one side leads. */
export const canComplete = (score: Score, access: ScoringAccess): boolean =>
  access.canScore && score.home !== score.away;

// ============================================
// Navigation and labels
// ============================================

/** The scoring page for a match. */
export const scoringHref = (match: Pick<Match, "id">): string => `/match/${match.id}`;

/** Where Back goes: the tournament's console, or the Quick page for a quick match. */
export const backHref = (match: Pick<Match, "tournamentId">): string =>
  match.tournamentId ? `/competitions/${match.tournamentId}` : "/quick-match";

export const backLabel = (match: Pick<Match, "tournamentId">): string =>
  match.tournamentId ? "Console" : "Quick match";

export type ScoringStatus = "Live" | "Completed" | "Not started";

/** The status badge's word. A match with a result is Completed, never Live. */
export const statusLabel = (match: Pick<Match, "status">): ScoringStatus => {
  if (match.status === "completed") return "Completed";
  if (match.status === "in_progress") return "Live";
  return "Not started";
};

/** Which side won, once the match has a winner. */
export const winnerSide = (
  match: Pick<Match, "winnerId" | "homeTeamId" | "awayTeamId">,
): Side | null => {
  if (!match.winnerId) return null;
  if (match.winnerId === match.homeTeamId) return "home";
  if (match.winnerId === match.awayTeamId) return "away";
  return null;
};

// ============================================
// Series
// ============================================

export interface SeriesInfo {
  isSeries: boolean;
  seriesLength: number;
  homeWins: number;
  awayWins: number;
  winsNeeded: number;
  /** The game being played, or the last one played once the series is decided. */
  gameNumber: number;
}

/** How far a best-of has got. A match that is not a series is game one of one. */
export const seriesInfo = (
  match: Pick<Match, "status" | "seriesLength" | "homeWins" | "awayWins">,
): SeriesInfo => {
  const seriesLength = match.seriesLength ?? 1;
  const isSeries = seriesLength > 1;
  const homeWins = isSeries ? (match.homeWins ?? 0) : 0;
  const awayWins = isSeries ? (match.awayWins ?? 0) : 0;
  const gamesPlayed = homeWins + awayWins;
  return {
    isSeries,
    seriesLength,
    homeWins,
    awayWins,
    winsNeeded: isSeries ? Math.ceil(seriesLength / 2) : 1,
    gameNumber: !isSeries ? 1 : match.status === "completed" ? gamesPlayed : gamesPlayed + 1,
  };
};

// ============================================
// Taps that have not come back yet
// ============================================

/** The points on the board. */
export interface Score {
  home: number;
  away: number;
}

export const NO_SCORE: Score = { home: 0, away: 0 };

export const sameScore = (a: Score, b: Score): boolean => a.home === b.home && a.away === b.away;

/**
 * Scores this page has written that the subscription has not shown yet,
 * oldest first, once it shows `shown`. Local writes come back in order, so
 * everything up to the one shown has landed. A score this page never wrote
 * is another device's, and nothing of ours is pending any more.
 */
export const afterSnapshot = (pending: Score[], shown: Score): Score[] => {
  const index = pending.findIndex((score) => sameScore(score, shown));
  return index === -1 ? [] : pending.slice(index + 1);
};

/** The score the next tap builds on: the last one written, or the one shown. */
export const latestScore = (pending: Score[], shown: Score): Score =>
  pending.length > 0 ? pending[pending.length - 1] : shown;

/** The score after a tap: one point to a side, or one point off it, never below zero. */
export const tapped = (score: Score, side: Side, delta: 1 | -1): Score => ({
  home: side === "home" ? Math.max(0, score.home + delta) : score.home,
  away: side === "away" ? Math.max(0, score.away + delta) : score.away,
});

// ============================================
// The device
// ============================================

/**
 * The parts of `document` the fullscreen check reads. Safari names them
 * with a webkit prefix, and an iPhone has neither, so the page hides the
 * button there rather than offering one that does nothing.
 */
export interface FullscreenHost {
  fullscreenEnabled?: boolean;
  webkitFullscreenEnabled?: boolean;
  documentElement: {
    requestFullscreen?: unknown;
    webkitRequestFullscreen?: unknown;
  };
}

export const fullscreenSupported = (host: FullscreenHost): boolean => {
  const root = host.documentElement;
  const standard = host.fullscreenEnabled === true && typeof root.requestFullscreen === "function";
  const webkit =
    host.webkitFullscreenEnabled === true && typeof root.webkitRequestFullscreen === "function";
  return standard || webkit;
};

/** The screen is kept awake while the match is still to be played. */
export const keepsScreenAwake = (match: Pick<Match, "status">): boolean =>
  match.status !== "completed";
