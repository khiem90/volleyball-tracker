import { dateTileParts } from "@/lib/dateTile";
import { Icon } from "./Icon";

/** A stored time as a tile: the short month over the day, read in the viewer's zone. */
export const DateTile = ({
  at,
  zone,
  className = "",
}: {
  /** The time in epoch milliseconds. */
  at: number;
  /** The viewer's time zone, as `deviceZone()` gives it. */
  zone: string;
  className?: string;
}) => {
  const { month, day } = dateTileParts(at, zone);
  return (
    <span className={`date-tile ${className}`}>
      <span className="date-tile-month">{month}</span>
      {day}
    </span>
  );
};

/**
 * In the date tile's place on a list with no scheduled time: a tile of the
 * same size with a calendar in it, so every row's name starts at the same
 * edge. The row says in words that no time is set.
 */
export const NoDateTile = () => (
  <span
    aria-hidden="true"
    className="grid size-11 shrink-0 place-items-center rounded-tile bg-fill text-ink-soft"
  >
    <Icon id="calendar" size={18} />
  </span>
);
