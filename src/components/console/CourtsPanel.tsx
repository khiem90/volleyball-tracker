"use client";

import Link from "next/link";
import { Card, CardEmpty } from "@/components/shared/Card";
import { Chip } from "@/components/shared/Chip";
import { Icon } from "@/components/shared/Icon";
import { ScoreLine } from "@/components/shared/ScoreLine";
import { TeamMark } from "@/components/shared/TeamMark";
import {
  capitalize,
  courtLabel,
  courtsWord,
  matchLabel,
  type ConsoleAccess,
  type CourtView,
  type CourtsView,
} from "@/lib/console";
import { scoringHref } from "@/lib/scoring";
import { getChampionCount } from "@/lib/win2out";
import type { Match, Tournament } from "@/types/game";
import { LiveTag, MatchRow, WinButton, scoringLink } from "./MatchRow";
import { ROW_BUTTON } from "./parts";
import type { TeamLookup } from "./teamRefs";

/** The court and queue controls an owner or scorer gets while a rotation tournament is live. */
export interface CourtControls {
  /** The team a swap has started from, if one has. */
  swapping: string | null;
  /** Start a swap from a team on a court, or finish one by naming the team to trade places with. */
  onSwap: (teamId: string) => void;
  onCancelSwap: () => void;
  /** Move a waiting team to a place in the queue, counted from the front. */
  onMove: (teamId: string, position: number) => void;
  /** True while a court or queue edit is being saved. */
  busy: boolean;
}

/** A 44px round button that holds one glyph. */
const ROUND_BUTTON = "btn btn-fill size-11 shrink-0 p-0";

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

/**
 * The Swap button under a team on a court. It starts a swap, finishes one
 * by naming this team as the one to trade places with, or cancels the swap
 * it started. The team a swap started from holds the black pill until the
 * swap ends.
 */
const SwapButton = ({ teamId, controls }: { teamId: string; controls: CourtControls }) => {
  const starting = controls.swapping === teamId;
  return (
    <button
      type="button"
      onClick={() => (starting ? controls.onCancelSwap() : controls.onSwap(teamId))}
      disabled={controls.busy}
      aria-pressed={starting}
      className={`${ROW_BUTTON} mt-1 ${starting ? "btn-ink" : "btn-fill"}`}
    >
      <Icon id="swap" size={14} />
      {starting ? "Cancel" : controls.swapping ? "Swap here" : "Swap"}
    </button>
  );
};

/** What sits under a team's name on a court: its notes, then its Swap button when it can be swapped. */
const UnderTeam = ({
  teamId,
  notes,
  swap,
}: {
  teamId: string;
  notes: string[];
  /** The swap controls, when this team can be swapped. */
  swap?: CourtControls;
}) => (
  <>
    {notes.map((note) => (
      <span key={note} className="text-caption leading-tight text-ink-soft">
        {note}
      </span>
    ))}
    {swap && <SwapButton teamId={teamId} controls={swap} />}
  </>
);

/**
 * One court as a card: the court-size score line, with the score between
 * the teams while the match is in play and "vs" until then. Anyone who may
 * score gets the green button that opens the scoring page, and above it,
 * when the tournament takes instant wins, a button per team.
 */
const CourtCard = ({
  tournament,
  court,
  team,
  access,
  onInstantWin,
  controls,
}: {
  tournament: Tournament;
  court: CourtView;
  team: TeamLookup;
  access: ConsoleAccess;
  onInstantWin: (match: Match, winnerId: string) => void;
  controls: CourtControls | null;
}) => {
  const match = court.match;
  const playing = match?.status === "in_progress" ? match : null;
  const [homeId, awayId] = match ? [match.homeTeamId, match.awayTeamId] : court.teamIds;
  const instantWin = tournament.settings.instantWin && access.canScore && match;
  // Teams can be swapped while the court's match is still waiting. A swap
  // started from one side of a court cannot end on the other side of it.
  const swapFor = (otherId: string) =>
    controls !== null && match?.status === "pending" && controls.swapping !== otherId
      ? controls
      : undefined;

  return (
    // A card written out, because a court is an article and Card draws a section.
    <article className="card h-auto">
      <header className="card-head">
        <h2 className="card-title">{courtLabel(tournament, court.court)}</h2>
        {playing ? (
          <LiveTag />
        ) : (
          <span className="text-caption text-ink-soft">{match ? "Waiting" : "Empty"}</span>
        )}
      </header>

      <ScoreLine
        size="court"
        home={team(homeId)}
        away={team(awayId)}
        homeScore={playing?.homeScore}
        awayScore={playing?.awayScore}
        homeBelow={
          <UnderTeam
            teamId={homeId}
            notes={teamNotes(tournament, court, homeId)}
            swap={swapFor(awayId)}
          />
        }
        awayBelow={
          <UnderTeam
            teamId={awayId}
            notes={teamNotes(tournament, court, awayId)}
            swap={swapFor(homeId)}
          />
        }
        className="px-3 pb-3.5 pt-[18px]"
      />

      {access.canScore && match && (
        <div className="grid grid-cols-2 gap-2 px-3 pb-3">
          {instantWin && (
            <>
              <WinButton
                name={team(match.homeTeamId).name}
                onClick={() => onInstantWin(match, match.homeTeamId)}
              />
              <WinButton
                name={team(match.awayTeamId).name}
                onClick={() => onInstantWin(match, match.awayTeamId)}
              />
            </>
          )}
          <Link href={scoringHref(match)} className="btn btn-action col-span-2">
            <Icon id="live" size={16} />
            {playing ? "Continue scoring" : "Score"}
          </Link>
        </div>
      )}
    </article>
  );
};

/** The strip that says a swap is under way and how to finish or cancel it. */
const SwapNotice = ({ teamName, onCancel }: { teamName: string; onCancel: () => void }) => (
  <div
    role="status"
    className="flex items-center justify-between gap-3 rounded-card bg-action-tint py-2 pl-4 pr-2"
  >
    <p className="min-w-0 text-label text-ink">
      Swapping <span className="font-semibold">{teamName}</span>. Tap Swap here on the team to
      trade places with.
    </p>
    <button
      type="button"
      onClick={onCancel}
      className={`${ROW_BUTTON} bg-surface text-ink`}
    >
      Cancel
    </button>
  </div>
);

/**
 * The teams waiting for a court as a card of numbered rows, first to play
 * at the top. With controls, each row has up and down buttons that move the
 * team one place, and while a swap is under way a button that brings the
 * team onto that court.
 */
const Queue = ({
  queue,
  team,
  controls,
}: {
  queue: string[];
  team: TeamLookup;
  controls: CourtControls | null;
}) => (
  <Card title="Queue" meta={String(queue.length)} className="h-auto">
    {queue.length === 0 ? (
      <p className="px-4 py-3 text-label text-ink-soft">Every team is on a court.</p>
    ) : (
      <ol className="flex flex-col divide-y divide-line">
        {queue.map((teamId, i) => {
          const ref = team(teamId);
          return (
            <li key={teamId} className="flex min-h-14 items-center gap-2.5 py-1.5 pl-4 pr-2">
              <span className="w-4 shrink-0 text-body font-semibold tabular-nums text-ink-soft">
                {i + 1}
              </span>
              <TeamMark name={ref.name} color={ref.color} size={26} />
              <span className="line-clamp-2 min-w-0 flex-1 text-body font-semibold leading-tight wrap-break-word">
                {ref.name}
              </span>
              {i === 0 && <Chip tone="action">Next up</Chip>}
              {controls &&
                (controls.swapping ? (
                  <button
                    type="button"
                    onClick={() => controls.onSwap(teamId)}
                    disabled={controls.busy}
                    className={`${ROW_BUTTON} btn-fill`}
                  >
                    <Icon id="swap" size={14} />
                    Swap here
                  </button>
                ) : (
                  <span className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => controls.onMove(teamId, i - 1)}
                      disabled={controls.busy || i === 0}
                      aria-label={`Move ${ref.name} up`}
                      className={ROUND_BUTTON}
                    >
                      <Icon id="chevron-down" size={16} className="rotate-180" />
                    </button>
                    <button
                      type="button"
                      onClick={() => controls.onMove(teamId, i + 1)}
                      disabled={controls.busy || i === queue.length - 1}
                      aria-label={`Move ${ref.name} down`}
                      className={ROUND_BUTTON}
                    >
                      <Icon id="chevron-down" size={16} />
                    </button>
                  </span>
                ))}
            </li>
          );
        })}
      </ol>
    )}
  </Card>
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
    <div className="border-line [&:not(:first-child)]:border-t">
      <p className="border-b border-line px-4 py-2 text-caption font-medium text-ink-soft">
        {title}
      </p>
      <div className="flex flex-col divide-y divide-line">
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
 * The Courts tab. Rotation formats show each court as a card with the match
 * on it, and the queue as a card behind them, with tap controls to swap
 * teams and reorder the queue for anyone who may arrange the courts. The
 * other formats show one card of what is live and what is ready to play.
 * Tapping a match opens scoring for an owner or scorer.
 */
export const CourtsPanel = ({
  tournament,
  view,
  team,
  access,
  onInstantWin,
  controls: offered,
}: {
  tournament: Tournament;
  view: CourtsView;
  team: TeamLookup;
  access: ConsoleAccess;
  onInstantWin: (match: Match, winnerId: string) => void;
  controls: CourtControls;
}) => {
  const courts = courtsWord(tournament, 2);
  const title = capitalize(courts);
  const draft = tournament.status === "draft";
  const controls = access.canEditCourts ? offered : null;

  if (view.kind === "rotation") {
    if (draft) {
      return (
        <Card title={title}>
          <CardEmpty message={`Start the tournament to open the ${courts}.`} />
        </Card>
      );
    }
    return (
      <div className="flex flex-col gap-3">
        {controls?.swapping && (
          <SwapNotice teamName={team(controls.swapping).name} onCancel={controls.onCancelSwap} />
        )}
        {view.courts.length === 0 ? (
          <Card title={title} className="h-auto">
            <CardEmpty message={`No ${courts} are in play.`} />
          </Card>
        ) : (
          // A court needs about a phone's width to keep its names whole. Two fit
          // side by side only on a tablet: from lg up the section is one column
          // of the page's grid.
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-1">
            {view.courts.map((court) => (
              <CourtCard
                key={court.court}
                tournament={tournament}
                court={court}
                team={team}
                access={access}
                onInstantWin={onInstantWin}
                controls={controls}
              />
            ))}
          </div>
        )}
        <Queue queue={view.queue} team={team} controls={controls} />
      </div>
    );
  }

  const empty = view.live.length === 0 && view.pending.length === 0;
  return (
    <Card title={title} meta={view.live.length > 0 ? <LiveTag /> : undefined}>
      {draft ? (
        <CardEmpty message="Start the tournament to schedule its matches." />
      ) : empty ? (
        <CardEmpty
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
    </Card>
  );
};
