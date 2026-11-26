"use client";

import Link from "next/link";
import { Chip } from "@/components/shared/Chip";
import { Icon } from "@/components/shared/Icon";
import { ScoreLine } from "@/components/shared/ScoreLine";
import { isPlayable, type ConsoleAccess } from "@/lib/console";
import { matchLine } from "@/lib/scoreLine";
import { scoringHref } from "@/lib/scoring";
import type { Match } from "@/types/game";
import type { TeamLookup } from "./teamRefs";

/**
 * The green chip with the live dot, "Live" unless the place it sits says
 * more. It is the size of any other chip, so it can stand in a card's head
 * or beside a grey chip in a list.
 */
export const LiveTag = ({ label = "Live" }: { label?: string }) => <Chip live>{label}</Chip>;

/**
 * Where a tap on the match goes: its scoring page while the role may score
 * and the match is still to be played, nowhere otherwise.
 */
export const scoringLink = (match: Match, access: ConsoleAccess): string | undefined =>
  access.canScore && match.status !== "completed" && isPlayable(match)
    ? scoringHref(match)
    : undefined;

/**
 * "Reds won": the instant win button for one side of a match. A long name
 * is cut short and the word "won" stays, so two of these fit side by side
 * under a court or a row.
 */
export const WinButton = ({ name, onClick }: { name: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={`${name} won`}
    className="btn btn-fill min-w-0 gap-1 px-3"
  >
    <span className="truncate">{name}</span>
    <span className="shrink-0">won</span>
  </button>
);

/**
 * One match as a row: a line saying where it sits, then its score line.
 * With `href` the whole row opens that page, which is how a tap on a match
 * opens scoring. With `onCorrect` the whole row is a button that opens the
 * correction of its result. With `onInstantWin` the row ends in a button
 * per team that records that team as the winner.
 *
 * A side with no team id is a bracket slot nobody holds yet. The winner is
 * bold and the other side dimmed, which is how a completed match reads as
 * completed. A live match says Live and a forfeit says Forfeit beside the
 * label.
 */
export const MatchRow = ({
  match,
  team,
  label,
  href,
  onCorrect,
  onInstantWin,
}: {
  match: Match;
  team: TeamLookup;
  /** Where the match sits: its round or court. */
  label?: string;
  href?: string;
  onCorrect?: () => void;
  onInstantWin?: (winnerId: string) => void;
}) => {
  const line = matchLine(match);
  const opens = href !== undefined || onCorrect !== undefined;
  const forfeit = line.decidedBy === "forfeit";
  const side = (teamId: string) => (teamId ? team(teamId) : null);
  const body = (
    <>
      {(label || line.live || forfeit || opens) && (
        // The label sits over the score, and what a tap does sits at the row's end.
        <span className="grid grid-cols-[1fr_minmax(0,auto)_1fr] items-center gap-x-2 text-caption text-ink-soft">
          <span />
          <span className="flex min-w-0 items-center justify-center gap-x-2">
            {label && <span className="truncate">{label}</span>}
            {/* The dot and the word at the label's size. A chip would make this line taller than the score. */}
            {line.live && (
              <span className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-action">
                <span className="live-dot" aria-hidden="true" />
                Live
              </span>
            )}
            {forfeit && <span className="shrink-0 font-semibold">Forfeit</span>}
          </span>
          <span className="flex items-center justify-end gap-1">
            {onCorrect && <span className="font-semibold text-ink">Correct</span>}
            {opens && <Icon id="chevron-right" size={12} />}
          </span>
        </span>
      )}
      <ScoreLine home={side(match.homeTeamId)} away={side(match.awayTeamId)} {...line} />
    </>
  );
  // 16px at the sides, the same as a card's other rows.
  const className = "flex min-h-11 flex-col justify-center gap-1.5 px-4 pb-3 pt-2.5";
  // The focus ring is drawn inside the row, because a card clips what reaches past its edge.
  const tappable = `${className} transition-colors hover:bg-ink/4 focus-visible:-outline-offset-2`;

  const row = href ? (
    <Link href={href} className={tappable}>
      {body}
    </Link>
  ) : onCorrect ? (
    <button type="button" onClick={onCorrect} className={`${tappable} w-full text-left`}>
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  );

  if (!onInstantWin) return row;
  return (
    <div className="flex flex-col">
      {row}
      <div className="grid grid-cols-2 gap-2 px-4 pb-3">
        <WinButton name={team(match.homeTeamId).name} onClick={() => onInstantWin(match.homeTeamId)} />
        <WinButton name={team(match.awayTeamId).name} onClick={() => onInstantWin(match.awayTeamId)} />
      </div>
    </div>
  );
};
