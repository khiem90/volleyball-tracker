/** The two lines of a date tile. */
export interface DateTileParts {
  /** The short month: "Nov". */
  month: string;
  /** The day of the month with no leading zero: "3". */
  day: string;
}

/** A stored time as the month and day a viewer in `zone` reads on a date tile. */
export const dateTileParts = (ms: number, zone: string): DateTileParts => {
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { timeZone: zone, ...options }).format(ms);
  return { month: part({ month: "short" }), day: part({ day: "numeric" }) };
};
