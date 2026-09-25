"use client";

import Link from "next/link";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { TeamMark } from "@/components/matchbook/Panel";
import { isPlayable, type ConsoleAccess } from "@/lib/console";
import type { Match } from "@/types/game";
import type { TeamLookup } from "./teamRefs";

export const LiveTag = () => (
  <span className="flex items-center gap-1">
    <span className="mb-live-dot" />
    <span className="matchbook-display text-[0.62rem] font-bold text-mb-red">Live</span>
  </span>
);

/** The scoring page for a match. */
export const scoringHref = (match: Match) => `/match/${match.id}`;

/**
 * Where a tap on the match goes: its scoring page while the role may score
 * and the match is still to be played, nowhere otherwise.
 */
export const scoringLink = (match: Match, access: ConsoleAccess): string | undefined =>
  access.canScore && match.status !== "completed" && isPlayable(match)
    ? scoringHref(match)
    : undefined;

/** A team in a row, or the empty slot a bracket has not filled yet. */
const Side = ({
  teamId,
  team,
  reverse = false,
  faded = false,
}: {
  teamId: string;
  team: TeamLookup;
  reverse?: boolean;
  faded?: boolean;
}) =>
  teamId ? (
    <TeamMark
      team={team(teamId)}
      size={18}
      reverse={reverse}
      className={`${reverse ? "justify-self-end" : "justify-self-start"} ${faded ? "opacity-50" : ""}`}
    />
  ) : (
    <span
      className={`matchbook-display text-[0.78rem] font-semibold text-mb-ink-muted ${
        reverse ? "justify-self-end" : "justify-self-start"
      }`}
    >
      TBD
    </span>
  );

/** The middle of a row: the score once there is one, "vs" until then. */
const Outcome = ({ match }: { match: Match }) => {
  if (match.isBye) return <span className="mb-kicker">Bye</span>;
  if (match.status === "pending") {
    return (
      <span className="matchbook-display text-[0.7rem] font-semibold text-mb-ink-muted">vs</span>
    );
  }
  return (
    <span
      className={`matchbook-display whitespace-nowrap text-[0.95rem] font-bold tabular-nums ${
        match.status === "in_progress" ? "text-mb-coral" : ""
      }`}
    >
      {match.homeScore} – {match.awayScore}
    </span>
  );
};

const Status = ({ match }: { match: Match }) => {
  if (match.status === "in_progress") return <LiveTag />;
  if (match.forfeitedBy) return <span className="mb-kicker">Forfeit</span>;
  if (match.status === "completed" && !match.isBye) {
    return (
      <span className="matchbook-display text-[0.62rem] font-bold text-mb-green">Completed</span>
    );
  }
  return null;
};

/**
 * One match as a row: where it sits, its two teams, and its score or
 * status. With `href` the whole row opens that page, which is how a tap on
 * a match opens scoring.
 */
export const MatchRow = ({
  match,
  team,
  label,
  href,
}: {
  match: Match;
  team: TeamLookup;
  /** Where the match sits: its round or court. */
  label?: string;
  href?: string;
}) => {
  const completed = match.status === "completed";
  const homeLost = completed && !match.isBye && match.winnerId === match.awayTeamId;
  const awayLost = completed && !match.isBye && match.winnerId === match.homeTeamId;
  const body = (
    <>
      {(label || match.status !== "pending" || match.forfeitedBy) && (
        <div className="col-span-3 flex min-h-4 items-center justify-between gap-2">
          <span className="mb-kicker">{label}</span>
          <span className="flex items-center gap-2">
            <Status match={match} />
            {href && <MbIcon id="chevron-right" size={11} className="text-mb-ink-muted" />}
          </span>
        </div>
      )}
      <Side teamId={match.homeTeamId} team={team} faded={homeLost} />
      <Outcome match={match} />
      <Side teamId={match.awayTeamId} team={team} reverse faded={awayLost} />
    </>
  );
  const className =
    "grid min-h-11 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1 px-3 py-2";

  return href ? (
    <Link href={href} className={`${className} transition-colors hover:bg-[rgba(7,50,77,0.04)]`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
};
