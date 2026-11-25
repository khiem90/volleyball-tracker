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
