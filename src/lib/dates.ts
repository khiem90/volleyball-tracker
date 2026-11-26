/**
 * The dates the pages write the same way in more than one place, read on
 * the device's own clock.
 */

/** "Sep 27": the day a result came in or a fixture was made, in a list. "TBD" for a time that is not set. */
export const shortDate = (ts?: number): string =>
  ts ? new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD";

/**
 * Today as the line beside a page's title: "Thursday, November 26". Home
 * writes it that way. Quick Match and Teams end it with the year.
 */
export const todayLine = ({ year = false, now = new Date() }: { year?: boolean; now?: Date } = {}): string =>
  now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(year && { year: "numeric" }),
  });
