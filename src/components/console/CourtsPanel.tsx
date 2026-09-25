"use client";

import Link from "next/link";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { Crest, Panel, PanelEmpty, TeamMark } from "@/components/matchbook/Panel";
import {
  capitalize,
  courtLabel,
  courtsWord,
  matchLabel,
  type ConsoleAccess,
  type CourtView,
  type CourtsView,
} from "@/lib/console";
import { getChampionCount } from "@/lib/win2out";
import type { Match, Tournament } from "@/types/game";
import { LiveTag, MatchRow, scoringHref, scoringLink } from "./MatchRow";
import type { TeamLookup } from "./teamRefs";

/** What a court card says under each team: streaks, titles, or where it is in its two-match run. */
const teamNotes = (tournament: Tournament, court: CourtView, teamId: string): string[] => {
  const notes: string[] = [];
  const win2out = tournament.win2outState;
  if (win2out) {
    const status = win2out.teamStatuses.find((s) => s.teamId === teamId);
    const championCount = getChampionCount(win2out, teamId);
    if (status && status.winStreak > 0) notes.push("1 win, one more to be champion");
    if (championCount > 0) notes.push(`Champion ×${championCount}`);
  }
  const twoMatch = tournament.twoMatchRotationState;
  if (twoMatch) {
    const state = twoMatch.courts.find((c) => c.courtNumber === court.court);
    const status = twoMatch.teamStatuses.find((s) => s.teamId === teamId);
    notes.push(state?.isFirstMatch ? "First match" : `${status?.sessionMatches ?? 0}/2 matches`);
  }
  return notes;
};

const CourtSide = ({ teamId, notes, team }: { teamId: string; notes: string[]; team: TeamLookup }) => {
  const ref = team(teamId);
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 text-center">
      <Crest team={ref} size={40} />
      <span className="matchbook-display text-[0.82rem] font-bold leading-tight [overflow-wrap:anywhere]">
        {ref.name}
      </span>
      {notes.map((note) => (
        <span key={note} className="mb-kicker normal-case tracking-[0.06em]">
          {note}
        </span>
      ))}
    </div>
  );
};

const CourtCard = ({
  tournament,
  court,
  team,
  access,
  onInstantWin,
  onEditMatch,
}: {
  tournament: Tournament;
  court: CourtView;
  team: TeamLookup;
  access: ConsoleAccess;
  onInstantWin: (match: Match, winnerId: string) => void;
  onEditMatch: (match: Match) => void;
}) => {
  const match = court.match;
  const live = match?.status === "in_progress";
  const [homeId, awayId] = match ? [match.homeTeamId, match.awayTeamId] : court.teamIds;
  const instantWin = tournament.settings.instantWin && access.canScore && match;

  return (
    <article className="flex flex-col border-[1.5px] border-mb-navy bg-mb-paper-bright">
      <header className="flex items-center justify-between gap-2 border-b border-mb-rule px-3 py-2">
        <span className="matchbook-display text-[0.8rem] font-bold tracking-[0.08em]">
          {courtLabel(tournament, court.court)}
        </span>
        <span className="flex items-center gap-2">
          {live ? <LiveTag /> : <span className="mb-kicker">{match ? "Waiting" : "Empty"}</span>}
          {access.canEditCourts && match?.status === "pending" && (
            <button
              type="button"
              onClick={() => onEditMatch(match)}
              className="mb-btn mb-btn-outline-navy px-2 py-1 text-[0.66rem]"
            >
              Edit
            </button>
          )}
        </span>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 py-3">
        <CourtSide teamId={homeId} notes={teamNotes(tournament, court, homeId)} team={team} />
        <div className="flex flex-col items-center gap-1">
          {live && match ? (
            <span className="matchbook-display whitespace-nowrap text-3xl font-bold tabular-nums text-mb-coral">
              {match.homeScore} – {match.awayScore}
            </span>
          ) : (
            <span className="mb-score-box px-2 text-[0.7rem] tracking-[0.1em]">VS</span>
          )}
        </div>
        <CourtSide teamId={awayId} notes={teamNotes(tournament, court, awayId)} team={team} />
      </div>

      {access.canScore && match && (
        <footer className="flex flex-wrap gap-2 border-t border-mb-rule p-2">
          {instantWin && (
            <>
              <button
                type="button"
                onClick={() => onInstantWin(match, match.homeTeamId)}
                className="mb-btn mb-btn-outline-navy min-h-11 min-w-0 flex-1 whitespace-normal py-1.5 leading-tight"
              >
                {team(match.homeTeamId).name} won
              </button>
              <button
                type="button"
                onClick={() => onInstantWin(match, match.awayTeamId)}
                className="mb-btn mb-btn-outline-navy min-h-11 min-w-0 flex-1 whitespace-normal py-1.5 leading-tight"
              >
                {team(match.awayTeamId).name} won
              </button>
            </>
          )}
          <Link
            href={scoringHref(match)}
            className={`mb-btn mb-btn-coral min-h-11 ${instantWin ? "basis-full" : "flex-1"}`}
          >
            <MbIcon id="live" size={14} />
            {live ? "Continue scoring" : "Score"}
          </Link>
        </footer>
      )}
    </article>
  );
};

const Queue = ({
  queue,
  team,
  canReorder,
  onReorder,
}: {
  queue: string[];
  team: TeamLookup;
  canReorder: boolean;
  onReorder: () => void;
}) => (
  <div className="border-t border-mb-rule">
    <div className="flex items-center justify-between gap-2 px-4 py-2">
      <span className="matchbook-display text-[0.8rem] font-bold tracking-[0.06em]">
        Queue
        <span className="ml-2 text-mb-ink-muted">{queue.length}</span>
      </span>
      {canReorder && queue.length > 1 && (
        <button
          type="button"
          onClick={onReorder}
          className="mb-btn mb-btn-outline-navy px-2.5 py-1 text-[0.66rem]"
        >
          <MbIcon id="swap" size={12} />
          Reorder
        </button>
      )}
    </div>
    {queue.length === 0 ? (
      <p className="px-4 pb-3 text-[0.8rem] text-mb-ink-muted">Every team is on a court.</p>
    ) : (
      <ol className="flex flex-col divide-y divide-mb-rule border-t border-mb-rule">
        {queue.map((teamId, i) => (
          <li key={`${teamId}-${i}`} className="flex min-h-11 items-center gap-3 px-4 py-1.5">
            <span className="matchbook-display w-5 text-center text-[0.8rem] font-bold tabular-nums text-mb-ink-muted">
              {i + 1}
            </span>
            <TeamMark team={team(teamId)} size={20} />
            {i === 0 && <span className="mb-kicker ml-auto text-mb-coral">Next up</span>}
          </li>
        ))}
      </ol>
    )}
  </div>
);

const MatchList = ({
  title,
  tournament,
  matches,
  team,
  access,
}: {
  title: string;
  tournament: Tournament;
  matches: Match[];
  team: TeamLookup;
  access: ConsoleAccess;
}) =>
  matches.length === 0 ? null : (
    <div>
      <p className="mb-kicker border-b border-mb-rule px-3 py-1.5">{title}</p>
      <div className="flex flex-col divide-y divide-mb-rule">
        {matches.map((match) => (
          <MatchRow
            key={match.id}
            match={match}
            team={team}
            label={matchLabel(tournament, match)}
            href={scoringLink(match, access)}
          />
        ))}
      </div>
    </div>
  );

/**
 * The Courts tab. Rotation formats show each court with the match on it and
 * the queue behind them; the other formats show what is live and what is
 * ready to play. Tapping a match opens scoring for an owner or scorer.
 */
export const CourtsPanel = ({
  tournament,
  view,
  team,
  access,
  onInstantWin,
  onEditMatch,
  onReorderQueue,
}: {
  tournament: Tournament;
  view: CourtsView;
  team: TeamLookup;
  access: ConsoleAccess;
  onInstantWin: (match: Match, winnerId: string) => void;
  onEditMatch: (match: Match) => void;
  onReorderQueue: () => void;
}) => {
  const courts = courtsWord(tournament, 2);
  const title = capitalize(courts);
  const draft = tournament.status === "draft";

  if (view.kind === "rotation") {
    const live = view.courts.filter((c) => c.match?.status === "in_progress").length;
    return (
      <Panel title={title} meta={live > 0 ? <LiveTag /> : undefined}>
        {draft ? (
          <PanelEmpty message={`Start the tournament to open the ${courts}.`} />
        ) : view.courts.length === 0 ? (
          <PanelEmpty message={`No ${courts} are in play.`} />
        ) : (
          <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {view.courts.map((court) => (
              <CourtCard
                key={court.court}
                tournament={tournament}
                court={court}
                team={team}
                access={access}
                onInstantWin={onInstantWin}
                onEditMatch={onEditMatch}
              />
            ))}
          </div>
        )}
        {!draft && (
          <Queue
            queue={view.queue}
            team={team}
            canReorder={access.canEditCourts}
            onReorder={onReorderQueue}
          />
        )}
      </Panel>
    );
  }

  const empty = view.live.length === 0 && view.pending.length === 0;
  return (
    <Panel title={title} meta={view.live.length > 0 ? <LiveTag /> : undefined}>
      {draft ? (
        <PanelEmpty message="Start the tournament to schedule its matches." />
      ) : empty ? (
        <PanelEmpty
          message={
            tournament.status === "completed"
              ? "Every match has been played."
              : "Nothing is waiting to be played."
          }
        />
      ) : (
        <div className="flex flex-col">
          <MatchList
            title="Live now"
            tournament={tournament}
            matches={view.live}
            team={team}
            access={access}
          />
          <MatchList
            title="Up next"
            tournament={tournament}
            matches={view.pending}
            team={team}
            access={access}
          />
        </div>
      )}
    </Panel>
  );
};
