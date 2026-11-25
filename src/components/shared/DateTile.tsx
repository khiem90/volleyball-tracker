import { dateTileParts } from "@/lib/dateTile";

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
