import type { Team } from "@/lib/teamShapes";
import { cn } from "@/lib/utils";
import { TeamMark } from "./TeamMark";

/**
 * A team in a row: its mark, then its name, which is cut short when the row
 * runs out of room. `reverse` puts the name first, for the side of a pair
 * that reads toward the middle.
 */
export const TeamName = ({
  team,
  size = 24,
  reverse = false,
  className,
}: {
  team: Team;
  /** The mark's width and height in px. */
  size?: number;
  reverse?: boolean;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex min-w-0 max-w-full items-center gap-2",
      reverse && "flex-row-reverse",
      className,
    )}
  >
    <TeamMark name={team.name} color={team.color} size={size} />
    <span className="truncate text-caption font-semibold">{team.name}</span>
  </span>
);
