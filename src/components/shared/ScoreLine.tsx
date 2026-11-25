import type { ReactNode } from "react";
import { boldSide, type Score, type ScoreSide } from "@/lib/scoreLine";
import type { Team } from "@/lib/teamShapes";
import { cn } from "@/lib/utils";
import { TeamMark } from "./TeamMark";

/** The three columns of both sizes. The two sides are equal, so the score stays in the middle whatever the names' lengths. */
const COLUMNS = "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center";

/** A side's name: ink and bold for the winner or leader, soft for the side behind. */
const nameTone = (side: ScoreSide, bold: ScoreSide | null, plain: string): string =>
  bold === null ? plain : bold === side ? "font-bold text-ink" : "font-medium text-ink-soft";

/** A side's score: the side behind is the only one dimmed. */
const scoreTone = (side: ScoreSide, bold: ScoreSide | null): string =>
  bold === null || bold === side ? "font-extrabold text-ink" : "font-medium text-ink-soft";

/** The middle of the line: both scores, or "vs" while the match has none. */
const Middle = ({
  homeScore,
  awayScore,
  bold,
  court,
}: {
  homeScore: Score;
  awayScore: Score;
  bold: ScoreSide | null;
  court: boolean;
}) => {
  if (homeScore == null || awayScore == null) {
    return (
      <span className="rounded-pill bg-fill px-3 py-1 text-caption font-bold text-ink-soft">vs</span>
    );
  }
  return (
    <span
      className={
        court
          ? "flex items-center gap-2 text-score tabular-nums"
          : "flex flex-1 items-center justify-center gap-1.5 rounded-chip bg-fill px-2.5 py-[5px] text-title tabular-nums"
      }
    >
      <span className={scoreTone("home", bold)}>{homeScore}</span>
      <span className={cn("text-ink-soft", court && "text-[0.64em]")}>-</span>
      <span className={scoreTone("away", bold)}>{awayScore}</span>
    </span>
  );
};

/**
 * One match on one line: a team, the score, the other team. Every place
 * that shows a match draws it with this.
 *
 * The row size is a result in a list, with each name beside its mark and
 * the score in a grey chip. It is built from spans, so it can sit inside a
 * link or a button. The court size is the same line made large for a court
 * on the console, with each name under a 44px mark and the score at the
 * largest type on the page.
 *
 * The winner or the leader is bold and the other side is dimmed. Pass
 * `winner` once the match has one, because a forfeit or an instant win ends
 * with no points played. Leave both scores out and the middle reads "vs".
 * A long name is cut short and the score stays in the middle.
 */
export const ScoreLine = ({
  home,
  away,
  homeScore,
  awayScore,
  winner,
  size = "row",
  homeBelow,
  awayBelow,
  className,
}: {
  home: Team;
  away: Team;
  /** Leave both scores out, or pass null, while the match has no score to show. */
  homeScore?: Score;
  awayScore?: Score;
  /** The side that won. Without it the side ahead on the score is the bold one. */
  winner?: ScoreSide | null;
  size?: "row" | "court";
  /** At the court size, what sits under a side's name: its notes, its swap control. */
  homeBelow?: ReactNode;
  awayBelow?: ReactNode;
  className?: string;
}) => {
  const bold = boldSide(homeScore, awayScore, winner);

  if (size === "court") {
    const side = (which: ScoreSide, team: Team, below: ReactNode) => (
      <div className="flex min-w-0 flex-col items-center gap-[3px] text-center">
        <TeamMark name={team.name} color={team.color} size={44} />
        <span
          className={cn(
            "mt-[5px] max-w-full truncate text-body leading-tight",
            nameTone(which, bold, "font-bold text-ink"),
          )}
        >
          {team.name}
        </span>
        {below}
      </div>
    );
    return (
      <div className={cn(COLUMNS, "gap-2", className)}>
        {side("home", home, homeBelow)}
        <Middle homeScore={homeScore} awayScore={awayScore} bold={bold} court />
        {side("away", away, awayBelow)}
      </div>
    );
  }

  return (
    <span className={cn(COLUMNS, "gap-2.5 text-body", className)}>
      <span className="flex min-w-0 items-center justify-end gap-2">
        <span className={cn("truncate", nameTone("home", bold, "font-medium text-ink"))}>
          {home.name}
        </span>
        <TeamMark name={home.name} color={home.color} />
      </span>
      <span className="flex min-w-[78px] justify-center">
        <Middle homeScore={homeScore} awayScore={awayScore} bold={bold} court={false} />
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <TeamMark name={away.name} color={away.color} />
        <span className={cn("truncate", nameTone("away", bold, "font-medium text-ink"))}>
          {away.name}
        </span>
      </span>
    </span>
  );
};
