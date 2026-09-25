"use client";

import Link from "next/link";
import { Crest, Panel, PanelEmpty } from "@/components/matchbook/Panel";
import type { BracketView, ConsoleAccess } from "@/lib/console";
import type { Match, Tournament } from "@/types/game";
import { scoringLink } from "./MatchRow";
import type { TeamLookup } from "./teamRefs";

const Slot = ({
  teamId,
  match,
  team,
  last = false,
}: {
  teamId: string;
  match: Match;
  team: TeamLookup;
  last?: boolean;
}) => {
  const completed = match.status === "completed" && !match.isBye;
  const won = completed && match.winnerId === teamId && teamId !== "";
  const lost = completed && match.winnerId !== teamId;
  const score = teamId === match.homeTeamId ? match.homeScore : match.awayScore;
  return (
    <div
      className={`flex min-h-8 items-center gap-1.5 px-2 py-1 ${last ? "" : "border-b border-mb-rule"}`}
    >
      {teamId ? (
        <>
          <Crest team={team(teamId)} size={16} />
          <span
            className={`matchbook-display flex-1 truncate text-[0.7rem] ${
              won ? "font-bold" : lost ? "font-semibold text-mb-ink-muted" : "font-semibold"
            }`}
          >
            {team(teamId).name}
          </span>
        </>
      ) : (
        <span className="matchbook-display flex-1 text-[0.7rem] text-mb-ink-muted">
          {match.isBye ? "Bye" : "TBD"}
        </span>
      )}
      {match.status !== "pending" && !match.isBye && (
        <span
          className={`matchbook-display text-[0.75rem] tabular-nums ${
            won ? "font-bold text-mb-coral" : "font-semibold"
          }`}
        >
          {score}
        </span>
      )}
    </div>
  );
};

const Cell = ({
  match,
  team,
  href,
}: {
  match: Match;
  team: TeamLookup;
  href?: string;
}) => {
  const live = match.status === "in_progress";
  const body = (
    <>
      <Slot teamId={match.homeTeamId} match={match} team={team} />
      <Slot teamId={match.awayTeamId} match={match} team={team} last={!live} />
      {live && (
        <div className="flex items-center justify-end gap-1 border-t border-mb-rule px-2 py-0.5">
          <span className="mb-live-dot" />
          <span className="matchbook-display text-[0.56rem] font-bold text-mb-red">Live</span>
        </div>
      )}
    </>
  );
  const className = `block w-[156px] shrink-0 bg-mb-paper-bright ${
    match.isBye ? "border-[1.5px] border-dashed border-mb-rule" : "border-[1.5px] border-mb-navy"
  }`;
  return href ? (
    <Link href={href} className={`${className} transition-colors hover:bg-[rgba(238,75,52,0.06)]`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
};

/**
 * The Bracket tab: each round as a column, cells spread to line up with the
 * round before. A pending or live match opens scoring for an owner or
 * scorer. A completed cell just shows its result; correcting it arrives with
 * ticket 11.
 */
export const BracketPanel = ({
  tournament,
  view,
  team,
  access,
}: {
  tournament: Tournament;
  view: BracketView;
  team: TeamLookup;
  access: ConsoleAccess;
}) => {
  const drawn = view.sections.some((section) =>
    section.rounds.some((round) => round.matches.length > 0),
  );
  return (
    <Panel title="Bracket">
      {tournament.status === "draft" || !drawn ? (
        <PanelEmpty message="The bracket is drawn when the tournament starts." />
      ) : (
        <div className="flex flex-col divide-y divide-mb-rule">
          {view.sections.map((section) => (
            <div key={section.title ?? "bracket"} className="p-4">
              {section.title && <p className="mb-kicker mb-2">{section.title}</p>}
              {section.rounds.length === 0 ? (
                <p className="text-[0.8rem] text-mb-ink-muted">Not drawn yet.</p>
              ) : (
                <div className="flex items-stretch gap-5 overflow-x-auto pb-2">
                  {section.rounds.map((round) => (
                    <div key={round.label} className="flex flex-col gap-3">
                      <p className="mb-kicker">{round.label}</p>
                      <div className="flex flex-1 flex-col justify-around gap-3">
                        {round.matches.map((match) => (
                          <Cell
                            key={match.id}
                            match={match}
                            team={team}
                            href={scoringLink(match, access)}
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
    </Panel>
  );
};
