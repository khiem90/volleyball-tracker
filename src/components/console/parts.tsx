import type { ReactNode } from "react";
import { TeamMark } from "@/components/shared/TeamMark";
import type { Team } from "@/lib/teamShapes";

/**
 * The class of the table cell that holds a team. The column takes the width
 * the other columns leave and no more, so a long name wraps inside it where
 * it would have pushed the table past its card. Below 104px the table
 * scrolls sideways before the name is squeezed further.
 */
export const TEAM_CELL = "w-full max-w-0 min-w-26";

/**
 * A team in a table row: its mark, then its name on up to two lines.
 * Children sit under the name, for a line such as "Withdrawn" or a mixed
 * team's players.
 */
export const TeamLabel = ({ team, children }: { team: Team; children?: ReactNode }) => (
  <span className="flex min-w-0 items-center gap-2.5 whitespace-normal">
    <TeamMark name={team.name} color={team.color} size={22} />
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="line-clamp-2 font-semibold leading-tight wrap-break-word">{team.name}</span>
      {children}
    </span>
  </span>
);

/** A small line under a team's name or a control: 13px in soft ink. */
export const NOTE = "text-caption text-ink-soft";

/** A pill for a control on a row or beside a court: 44px tall, with a label one step smaller than a button's. It takes a button kind beside it. */
export const ROW_BUTTON = "btn shrink-0 gap-1.5 px-3.5 text-caption";
