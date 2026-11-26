import type { ReactNode } from "react";
import { boldSide, type DecidedBy, type Score, type ScoreSide } from "@/lib/scoreLine";
import type { Team } from "@/lib/teamShapes";
import { cn } from "@/lib/utils";
import { TeamMark } from "./TeamMark";

/** The three columns of both sizes. The two sides are equal, so the score stays in the middle whatever the names' lengths. */
const COLUMNS = "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center";

/** What a side with no team yet reads, such as a bracket slot waiting on an earlier round. */
const EMPTY_SLOT = "TBD";

/** A side's name: ink and bold for the winner or leader, soft for the side behind. */
const nameTone = (side: ScoreSide, bold: ScoreSide | null, plain: string): string =>
  bold === null ? plain : bold === side ? "font-bold text-ink" : "font-medium text-ink-soft";

/** A side's score: the side behind is the only one dimmed. A live score is green on both sides. */
const scoreTone = (side: ScoreSide, bold: ScoreSide | null, live: boolean): string => {
  const ahead = bold === null || bold === side;
  if (live) return ahead ? "font-extrabold" : "font-medium";
  return ahead ? "font-extrabold text-ink" : "font-medium text-ink-soft";
};

/** A side's mark, or a blank shield of the same size for a side with no team yet. */
const Mark = ({ team, size }: { team: Team | null; size?: number }) =>
  team ? (
    <TeamMark name={team.name} color={team.color} size={size} />
  ) : (
    <span aria-hidden="true" className="team-mark bg-fill" style={{ width: size ?? 22, height: size ?? 22 }} />
  );

/** The grey pill that stands where a score would be: "vs" before play, "Bye" for a bye. */
const Pill = ({ children }: { children: ReactNode }) => (
  <span className="rounded-pill bg-fill px-3 py-1 text-caption font-bold text-ink-soft">
    {children}
  </span>
);

/** The middle of the line: both scores, a dash for a forfeit, or a pill while there is no score. */
const Middle = ({
  homeScore,
  awayScore,
  bold,
  court,
  decidedBy,
  live,
}: {
  homeScore: Score;
  awayScore: Score;
  bold: ScoreSide | null;
  court: boolean;
  decidedBy: DecidedBy | null;
  live: boolean;
}) => {
  if (decidedBy === "bye") return <Pill>Bye</Pill>;
  const forfeit = decidedBy === "forfeit";
  if (!forfeit && (homeScore == null || awayScore == null)) return <Pill>vs</Pill>;
  const tinted = live && !court;
  return (
    <span
      className={cn(
        "tabular-nums",
        court
          ? "flex items-center gap-2 text-score"
          : "flex flex-1 items-center justify-center gap-1.5 rounded-chip px-2.5 py-[5px] text-title",
        !court && (tinted ? "bg-action-tint text-action" : "bg-fill"),
      )}
    >
      {!forfeit && <span className={scoreTone("home", bold, tinted)}>{homeScore}</span>}
      <span className={cn(!tinted && "text-ink-soft", court && "text-[0.64em]")}>-</span>
      {!forfeit && <span className={scoreTone("away", bold, tinted)}>{awayScore}</span>}
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
 * At the row size a long name is cut short. At the court size it takes a
 * second line first. Either way the score stays in the middle.
 *
 * `matchLine()` in src/lib/scoreLine.ts turns a stored match into the
 * scores, `winner`, `decidedBy`, and `live` this takes.
 */
export const ScoreLine = ({
  home,
  away,
  homeScore,
  awayScore,
  winner,
  decidedBy = null,
  live = false,
  size = "row",
  homeBelow,
  awayBelow,
  className,
}: {
  /** A side's team, or null for a side nobody holds yet. That side reads "TBD". */
  home: Team | null;
  away: Team | null;
  /** Leave both scores out, or pass null, while the match has no score to show. */
  homeScore?: Score;
  awayScore?: Score;
  /** The side that won. Without it the side ahead on the score is the bold one. */
  winner?: ScoreSide | null;
  /** A result with no score: the middle reads "Bye" for a bye and a lone dash for a forfeit. */
  decidedBy?: DecidedBy | null;
  /** True while the match is being scored. At the row size the score turns green on the green tint. */
  live?: boolean;
  size?: "row" | "court";
  /** At the court size, what sits under a side's name: its notes, its swap control. */
  homeBelow?: ReactNode;
  awayBelow?: ReactNode;
  className?: string;
}) => {
  const bold = boldSide(homeScore, awayScore, winner);
  const court = size === "court";
  const middle = (
    <Middle
      homeScore={homeScore}
      awayScore={awayScore}
      bold={bold}
      court={court}
      decidedBy={decidedBy}
      live={live}
    />
  );
  /** A side's name in the tone its side has earned. An empty slot is always soft. */
  const name = (which: ScoreSide, team: Team | null, plain: string, shape: string) => (
    <span className={cn(shape, team ? nameTone(which, bold, plain) : "font-medium text-ink-soft")}>
      {team ? team.name : EMPTY_SLOT}
    </span>
  );

  if (court) {
    const side = (which: ScoreSide, team: Team | null, below: ReactNode) => (
      <div className="flex min-w-0 flex-col items-center gap-[3px] text-center">
        <Mark team={team} size={44} />
        {name(
          which,
          team,
          "font-bold text-ink",
          "mt-[5px] line-clamp-2 max-w-full text-body leading-tight wrap-break-word",
        )}
        {below}
      </div>
    );
    return (
      <div className={cn(COLUMNS, "gap-2", className)}>
        {side("home", home, homeBelow)}
        {middle}
        {side("away", away, awayBelow)}
      </div>
    );
  }

  return (
    <span className={cn(COLUMNS, "gap-2.5 text-body", className)}>
      <span className="flex min-w-0 items-center justify-end gap-2">
        {name("home", home, "font-medium text-ink", "truncate")}
        <Mark team={home} />
      </span>
      <span className="flex min-w-[78px] justify-center">{middle}</span>
      <span className="flex min-w-0 items-center gap-2">
        <Mark team={away} />
        {name("away", away, "font-medium text-ink", "truncate")}
      </span>
    </span>
  );
};
