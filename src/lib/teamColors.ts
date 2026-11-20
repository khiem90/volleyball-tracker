/**
 * Team colors: the palette, and the rule that hands a new team the color
 * used least so teams stay easy to tell apart on the court. Nothing in here
 * touches the database.
 */

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
