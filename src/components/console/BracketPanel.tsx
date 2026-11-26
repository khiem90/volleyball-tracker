"use client";

import Link from "next/link";
import { Card, CardEmpty } from "@/components/shared/Card";
import { Icon } from "@/components/shared/Icon";
import { TeamMark } from "@/components/shared/TeamMark";
import { isCorrectable, type BracketView, type ConsoleAccess } from "@/lib/console";
import { boldSide, matchLine, type Score, type ScoreSide } from "@/lib/scoreLine";
import type { Match, Tournament } from "@/types/game";
import { scoringLink } from "./MatchRow";
import { LABEL } from "./parts";
import type { ConsoleTeam, TeamLookup } from "./teamRefs";

/**
 * One side of a bracket match: the team's mark and name, then its score
 * once there is one. The winner or the leader is bold and the other side is
 * dimmed, by the rule every score line follows. A side nobody holds yet
 * reads "TBD", or "Bye" when the match is one.
 */
const Slot = ({
  team,
  empty,
  score,
  standing,
  live,
}: {
  /** The side's team, or null for a side nobody holds. */
  team: ConsoleTeam | null;
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
          className={`min-w-0 flex-1 truncate text-caption ${
            standing === "ahead"
              ? "font-bold text-ink"
              : standing === "behind"
                ? "font-medium text-ink-soft"
                : "font-semibold text-ink"
          }`}
        >
          {team.name}
        </span>
      </>
    ) : (
      <span className="flex-1 text-caption font-medium text-ink-soft">{empty}</span>
    )}
    {score != null && (
      <span
        className={`text-label tabular-nums ${
          standing === "behind" ? "font-medium" : "font-extrabold"
        } ${live ? "text-action" : standing === "behind" ? "text-ink-soft" : "text-ink"}`}
      >
        {score}
      </span>
    )}
  </span>
);

/**
 * One match of the bracket as a small grey tile on the card. With `href`
 * the tile opens that page, which is how a tap opens scoring. With
 * `onCorrect` the tile is a button that opens the correction of its result,
 * and says so under the score.
 */
const Cell = ({
  match,
  team,
  href,
  onCorrect,
}: {
  match: Match;
  team: TeamLookup;
  href?: string;
  onCorrect?: () => void;
}) => {
  const line = matchLine(match);
  const bold = boldSide(line.homeScore, line.awayScore, line.winner);
  const forfeit = line.decidedBy === "forfeit";
  const footer = line.live || forfeit || onCorrect !== undefined;
  const slot = (side: ScoreSide, teamId: string, score: Score) => (
    <Slot
      team={teamId ? team(teamId) : null}
      empty={match.isBye ? "Bye" : "TBD"}
      score={score}
      standing={bold === null ? null : bold === side ? "ahead" : "behind"}
      live={line.live}
    />
  );
  const body = (
    <>
      {slot("home", match.homeTeamId, line.homeScore)}
      {slot("away", match.awayTeamId, line.awayScore)}
      {footer && (
        <span className="flex items-center justify-end gap-1.5 px-2.5 py-1.5 text-caption text-ink-soft">
          {line.live && (
            <span className="inline-flex items-center gap-1.5 font-semibold text-action">
              <span className="live-dot" aria-hidden="true" />
              Live
            </span>
          )}
          {forfeit && <span className="font-semibold">Forfeit</span>}
          {onCorrect && (
            <>
              <span className="font-semibold text-ink">Correct</span>
              <Icon id="chevron-right" size={12} />
            </>
          )}
        </span>
      )}
    </>
  );
  // The two sides and the foot are divided by a line of the card's own white.
  // A bye is nobody's match, so its tile is an outline with nothing filled in.
  const className = `flex w-40 shrink-0 flex-col divide-y divide-surface rounded-tile border ${
    match.isBye ? "border-dashed border-ink-soft/50" : "border-transparent bg-fill"
  }`;
  // The focus ring is drawn inside the tile, because the row of rounds clips what reaches past it.
  const tappable = `${className} transition-colors hover:bg-ink/10 focus-visible:-outline-offset-2`;
  if (href) {
    return (
      <Link href={href} className={tappable}>
        {body}
      </Link>
    );
  }
  if (onCorrect) {
    return (
      <button type="button" onClick={onCorrect} className={`${tappable} text-left`}>
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
};

/**
 * The Bracket tab: each round as a column, cells spread to line up with the
 * round before. A pending or live match opens scoring for an owner or
 * scorer. With `onCorrect`, a completed match opens the correction of its
 * result; a bye or a forfeit has no score to correct and stays as it is.
 */
export const BracketPanel = ({
  tournament,
  view,
  team,
  access,
  onCorrect,
}: {
  tournament: Tournament;
  view: BracketView;
  team: TeamLookup;
  access: ConsoleAccess;
  /** Offered when completed results can be corrected: the owner of a live bracket. */
  onCorrect?: (match: Match) => void;
}) => {
  const drawn = view.sections.some((section) =>
    section.rounds.some((round) => round.matches.length > 0),
  );
  return (
    <Card title="Bracket">
      {tournament.status === "draft" || !drawn ? (
        <CardEmpty message="The bracket is drawn when the tournament starts." />
      ) : (
        <div className="flex flex-col divide-y divide-line">
          {view.sections.map((section) => (
            <div key={section.title ?? "bracket"} className="p-4">
              {section.title && <p className="mb-2 text-label font-bold">{section.title}</p>}
              {section.rounds.length === 0 ? (
                <p className="text-label text-ink-soft">Not drawn yet.</p>
              ) : (
                // The rounds scroll out to the card's two edges, past the section's padding.
                <div className="-mx-4 flex items-stretch gap-5 overflow-x-auto px-4 pb-2">
                  {section.rounds.map((round) => (
                    <div key={round.label} className="flex flex-col gap-3">
                      <p className={LABEL}>{round.label}</p>
                      <div className="flex flex-1 flex-col justify-around gap-3">
                        {round.matches.map((match) => (
                          <Cell
                            key={match.id}
                            match={match}
                            team={team}
                            href={scoringLink(match, access)}
                            onCorrect={
                              onCorrect && isCorrectable(tournament, match)
                                ? () => onCorrect(match)
                                : undefined
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
