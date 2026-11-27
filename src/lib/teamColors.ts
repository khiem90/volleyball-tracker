/**
 * Team colors: the palette, and the rule that hands a new team the color
 * used least so teams stay easy to tell apart on the court. Nothing in here
 * touches the database.
 */

import { contrastRatio } from "./contrast";
import { nameKey } from "./utils";

/** The colors a team can have, in the order the color picker shows them. */
export const TEAM_COLORS = [
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#6366f1", // Indigo
  "#8b5cf6", // Purple
  "#ec4899", // Pink
];

/** The color of the letter on a team's mark, by the name of its token. */
export type LetterColor = "ink" | "white";

/** The value of the ink token in src/app/globals.css. A test holds the two together. */
export const INK = "#15181b";
const WHITE = "#ffffff";

/**
 * The letter on a team's mark: ink or white, whichever stands out more on
 * the team's color. The palette is bright, and white on its yellow is under
 * 2 to 1, so no one letter color works for every team.
 */
export const letterColor = (color: string): LetterColor =>
  contrastRatio(color, INK) >= contrastRatio(color, WHITE) ? "ink" : "white";

/**
 * The color to draw a team in when it has none of its own: a palette color
 * picked by a hash of its name, so the same team gets the same color on
 * every screen and on every visit. It serves anything with a name and no
 * color, an RSVP by team included. Case and outer spaces do not count, as
 * in the roster. An empty name gets the palette's first color.
 */
export const fallbackColor = (name: string): string => {
  const key = nameKey(name);
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return TEAM_COLORS[hash % TEAM_COLORS.length];
};

/**
 * Hands out colors for new teams joining teams that already have the
 * colors in `taken`. Each call gives the palette color with the fewest
 * uses so far, counting the ones it has already given, and palette order
 * breaks ties. A color outside the palette, or none, counts for nothing.
 */
export const leastUsedColors = (taken: (string | undefined)[]): (() => string) => {
  const uses = new Map<string, number>();
  const count = (color: string) => uses.set(color, (uses.get(color) ?? 0) + 1);
  for (const color of taken) if (color) count(color);
  return () => {
    const color = TEAM_COLORS.reduce((best, next) =>
      (uses.get(next) ?? 0) < (uses.get(best) ?? 0) ? next : best,
    );
    count(color);
    return color;
  };
};
