import type { ReactNode } from "react";
import Link from "next/link";
import { boldSide, type MatchLine, type Score, type ScoreSide } from "@/lib/scoreLine";
import type { Team } from "@/lib/teamShapes";
import { cn } from "@/lib/utils";
import { EMPTY_SLOT } from "./ScoreLine";
import { TeamMark } from "./TeamMark";

/**
 * One side of a bracket match: the team's mark and name, then its score once
 * there is one. The winner or the leader is bold and the other side is
 * dimmed, by the rule every score line follows.
 */
const Side = ({
  team,
  empty,
  score,
  standing,
  live,
}: {
  /** The side's team, or null for a side nobody holds. */
  team: Team | null;
  /** What an empty side reads. */
  empty: string;
  score: Score;
  /** Ahead, behind, or neither while the match has no leader. */
  standing: "ahead" | "behind" | null;
  live: boolean;
}) => (
  <span className="flex min-h-9 items-center gap-1.5 px-2.5 py-1">
    {team ? (
      <>
        <TeamMark name={team.name} color={team.color} size={18} />
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-caption",
            standing === "ahead"
              ? "font-bold text-ink"
              : standing === "behind"
                ? "font-medium text-ink-soft"
                : "font-semibold text-ink",
          )}
        >
          {team.name}
        </span>
      </>
    ) : (
      <span className="flex-1 text-caption font-medium text-ink-soft">{empty}</span>
    )}
    {score != null && (
      <span
        className={cn(
          "text-label tabular-nums",
          standing === "behind" ? "font-medium" : "font-extrabold",
          live ? "text-action" : standing === "behind" ? "text-ink-soft" : "text-ink",
        )}
      >
        {score}
      </span>
    )}
  </span>
);

/**
 * One match of a bracket: the score line stacked, a side on each line of a
 * small grey tile. Every bracket draws its matches with this, so a match
 * reads the same wherever its bracket is shown.
 *
 * Spread `matchLine()` from src/lib/scoreLine.ts into it. A match still to
 * be played shows no score. A live match shows its score in green and says
 * Live at the foot. A forfeit has a winner and no score, and says Forfeit at
 * the foot. A bye is nobody's match, so its tile is a dashed outline whose
 * empty side reads "Bye". Any other side nobody holds yet reads "TBD".
 *
 * With `href` the tile opens that page, and with `onClick` it is a button.
 * `action` is the page's own words for what a tap does, at the foot's end.
 */
export const BracketTile = ({
  home,
  away,
  homeScore,
  awayScore,
  winner,
  decidedBy,
  live,
  href,
  onClick,
  action,
}: MatchLine & {
  /** A side's team, or null for a side nobody holds. */
  home: Team | null;
  away: Team | null;
  href?: string;
  onClick?: () => void;
  /** What sits at the end of the foot, such as "Correct" and a chevron. */
  action?: ReactNode;
}) => {
  const bold = boldSide(homeScore, awayScore, winner);
  const bye = decidedBy === "bye";
  const forfeit = decidedBy === "forfeit";
  const side = (which: ScoreSide, team: Team | null, score: Score) => (
    <Side
      team={team}
      empty={bye ? "Bye" : EMPTY_SLOT}
      score={score}
      standing={bold === null ? null : bold === which ? "ahead" : "behind"}
      live={live}
    />
  );
  const body = (
    <>
      {side("home", home, homeScore)}
      {side("away", away, awayScore)}
      {(live || forfeit || action) && (
        <span className="flex items-center justify-end gap-1.5 px-2.5 py-1.5 text-caption text-ink-soft">
          {live && (
            <span className="inline-flex items-center gap-1.5 font-semibold text-action">
              <span className="live-dot" aria-hidden="true" />
              Live
            </span>
          )}
          {forfeit && <span className="font-semibold">Forfeit</span>}
          {action}
        </span>
      )}
    </>
  );
  // The two sides and the foot are divided by a line of the card's own white.
  const className = cn(
    "flex w-40 shrink-0 flex-col divide-y divide-surface rounded-tile border",
    bye ? "border-dashed border-ink-soft/50" : "border-transparent bg-fill",
  );
  // The focus ring is drawn inside the tile, because the row of rounds clips what reaches past it.
  const tappable = cn(className, "transition-colors hover:bg-ink/10 focus-visible:-outline-offset-2");
  if (href) {
    return (
      <Link href={href} className={tappable}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(tappable, "text-left")}>
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
};
