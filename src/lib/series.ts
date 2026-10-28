import type { Match } from "@/types/game";

/**
 * How far a best-of has got, shared by the scoring page and the console. On
 * its own so that the console, which the scoring rules import, can use it
 * without the two importing each other.
 */

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
