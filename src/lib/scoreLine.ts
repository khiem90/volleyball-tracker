import type { Match } from "@/types/game";

/** One of the two sides of a match. */
export type ScoreSide = "home" | "away";

/** A side's score, or nothing while the match has no score to show. */
export type Score = number | null | undefined;

/**
 * The side a score line shows in bold, with the other side dimmed. It is the
 * winner once the match has one, because a forfeit or an instant win ends a
 * match with no points played. Until then it is whoever is ahead. It is
 * neither side while the score is level or there is none, and then nothing
 * is dimmed.
 */
export const boldSide = (
  homeScore: Score,
  awayScore: Score,
  winner?: ScoreSide | null,
): ScoreSide | null => {
  if (winner) return winner;
  if (homeScore == null || awayScore == null || homeScore === awayScore) return null;
  return homeScore > awayScore ? "home" : "away";
};

/** How a match ended when nobody played it: a bye, or one team's forfeit. */
export type DecidedBy = "bye" | "forfeit";

/** What a score line is told about one match. */
export interface MatchLine {
  /** Both scores, or null for both while the match has no score to show. */
  homeScore: Score;
  awayScore: Score;
  /** The side that won, once the match is completed. */
  winner: ScoreSide | null;
  /** Set when the match has a result and no score. */
  decidedBy: DecidedBy | null;
  /** True while the match is being scored. */
  live: boolean;
}

/** The parts of a match its score line reads. */
type LineMatch = Pick<
  Match,
  | "status"
  | "homeTeamId"
  | "awayTeamId"
  | "homeScore"
  | "awayScore"
  | "winnerId"
  | "forfeitedBy"
  | "isBye"
>;

/** The side that won a completed match, if the match names one of its two teams as the winner. */
const winnerOf = (match: LineMatch): ScoreSide | null => {
  if (match.status !== "completed" || !match.winnerId) return null;
  if (match.winnerId === match.homeTeamId) return "home";
  return match.winnerId === match.awayTeamId ? "away" : null;
};

const NO_SCORE = { homeScore: null, awayScore: null, live: false };

/**
 * What a match shows on its score line. A stored match holds 0 and 0 from
 * the moment it is made, so the scores are passed on only once play has
 * started. A bye and a forfeit have a result and no score. Nobody lost a
 * bye, so it names no winner and neither side is dimmed.
 */
export const matchLine = (match: LineMatch): MatchLine => {
  if (match.isBye) return { ...NO_SCORE, winner: null, decidedBy: "bye" };
  if (match.forfeitedBy) return { ...NO_SCORE, winner: winnerOf(match), decidedBy: "forfeit" };
  if (match.status === "pending") return { ...NO_SCORE, winner: null, decidedBy: null };
  return {
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    winner: winnerOf(match),
    decidedBy: null,
    live: match.status === "in_progress",
  };
};
