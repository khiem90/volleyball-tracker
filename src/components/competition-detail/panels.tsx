"use client";

import { useState } from "react";
import { MbBadge } from "@/components/matchbook/Badge";
import { MbButton, MbButtonLink } from "@/components/matchbook/Button";
import { MbDangerZone } from "@/components/matchbook/DangerZone";
import { MbFinalStamp } from "@/components/matchbook/FinalStamp";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { MbIconButton } from "@/components/matchbook/IconButton";
import { MbMeter } from "@/components/matchbook/Meter";
import { MbStat, type MbStatTone } from "@/components/matchbook/Stat";
import { MbTableScroll } from "@/components/matchbook/TableScroll";
import { MbTeamName } from "@/components/matchbook/TeamName";
import { Crest, Panel, PanelEmpty, TeamMark } from "@/components/matchbook/Panel";
import { BracketRail } from "@/components/matchbook/BracketRail";
import { MbCourtCard } from "@/components/matchbook/CourtCard";
import { MbMatchRow, MbSeedBox } from "@/components/matchbook/MatchRow";
import {
  MbStandingsLegend,
  MbStandingsTable,
} from "@/components/matchbook/StandingsTable";
import type {
  MbCompetitionDetail,
  MbMatchLine,
} from "@/components/matchbook/useMatchbookCompetitionDetail";
import type { MbTeam } from "@/components/matchbook/types";
import { teamColorCss } from "@/lib/teamColor";
import type { Match, PersistentTeam } from "@/types/game";
import { pluralise } from "@/lib/text";

/* Shared panel-foot control. The duration token must stay explicit: bare
   `transition-colors` carries Tailwind's own 150ms default, which is off the
   `--mb-dur` scale. */
const PANEL_FOOT_BTN =
  "mb-btn-touch flex w-full items-center justify-center gap-1.5 px-4 text-mb-navy transition-colors duration-[var(--mb-dur-fast)] ease-[var(--mb-ease-out)] hover:bg-[var(--mb-tint-1)]";

/* ------------------------------------------------------------ event status */

/* `Panel tone="navy"` inks the HEAD only — the body ground stays
   `--mb-paper-bright`, so body ink must be picked for cream, not navy. */

const progressTone = (pct: number, total: number): MbStatTone =>
  total === 0 ? "navy" : pct >= 100 ? "green" : "teal";

export const EventStatusPanel = ({
  data,
  status,
}: {
  data: MbCompetitionDetail;
  status: "draft" | "in_progress" | "completed";
}) => (
  <Panel title="Event Status" tone="navy" icon="chart">
    <div className="flex flex-1 flex-col gap-4 p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MbStat
          size="sm"
          icon="check"
          tone={progressTone(data.counts.pct, data.counts.total)}
          label={`${capitaliseWord(data.matchWord.many)} played`}
          value={`${data.counts.completed} / ${data.counts.total}`}
          sub={data.counts.total > 0 ? `${data.counts.pct}%` : undefined}
        />
        <MbStat
          size="sm"
          icon="teams"
          label="Teams entered"
          value={data.teamRefs.length}
        />
        <MbStat size="sm" icon={data.formatIcon} label="Format" value={data.typeLabel} />
        {/* Red = the live semantic, same ink as the live rail and dot. */}
        <MbStat
          size="sm"
          icon="live"
          tone={data.counts.live > 0 ? "red" : "navy"}
          label="Live now"
          value={data.counts.live}
        />
      </div>

      {status !== "draft" && data.counts.total > 0 && (
        <div className="mt-auto">
          <MbMeter value={data.counts.pct} label="Overall progress" />
        </div>
      )}
    </div>
  </Panel>
);

const capitaliseWord = (word: string) =>
  word.length === 0 ? word : word[0].toUpperCase() + word.slice(1);

/* --------------------------------------------------------------- champion */

export const ChampionPanel = ({ data }: { data: MbCompetitionDetail }) => {
  const top = data.standings[0];
  const record = top ? `${top.won}W – ${top.lost}L` : null;
  return (
    <Panel title="Champion" tone="navy" icon="trophy">
      {!data.winner ? (
        <PanelEmpty message="No champion exists yet — the last match decides it." />
      ) : (
        <div className="flex flex-1 flex-col gap-4 p-5">
          {/* `flex-wrap` needs the BASIS: a `flex-1 min-w-0` item shrinks
              instead of wrapping. basis-[106px] is eight characters of the
              24px display face, so the stamp wraps to its own line before the
              name can drop below the name floor. */}
          <div className="flex min-w-0 flex-wrap items-center gap-4">
            <Crest team={data.winner} size={56} />
            <div className="min-w-0 flex-1 basis-[106px]">
              <p className="mb-kicker">Winner</p>
              {/* `MbTeamName`, not `truncate`: end-truncation renders
                  "Westhill Wanderers" and "Westhill Wanderers II" identical. */}
              <MbTeamName
                name={data.winner.name}
                className="matchbook-display mt-1 text-[1.5rem] mb-track-display font-bold leading-none"
              />
              {record && (
                <p className="matchbook-display mt-1.5 text-[0.74rem] mb-track-status font-bold tabular-nums">
                  {record}
                  {data.champion?.score ? ` · ${data.champion.score}` : ""}
                </p>
              )}
            </div>
            <MbFinalStamp className="shrink-0" />
          </div>
          <p className="mt-auto border-t border-mb-rule pt-3 text-[0.85rem] leading-[1.5] tabular-nums">
            {data.counts.completed} of {data.counts.total}{" "}
            {data.matchWord.many} were played across {data.teamRefs.length} teams.
          </p>
        </div>
      )}
    </Panel>
  );
};

/* ---------------------------------------------------------------- standings */

export const StandingsPanel = ({
  data,
  competitionName,
}: {
  data: MbCompetitionDetail;
  competitionName: string;
}) => (
  <Panel
    title="Standings"
    meta={
      /* Entrant count, not row count — `standings` stays empty until a match
         has been played. */
      <span className="mb-kicker tabular-nums">
        {data.teamRefs.length} {pluralise("team", data.teamRefs.length)}
      </span>
    }
  >
    {data.standings.length === 0 ? (
      <PanelEmpty message="No standings exist yet — play a match and the table builds itself." />
    ) : (
      <>
        <MbStandingsTable
          rows={data.standings}
          caption={`${competitionName} standings`}
        />
        <div className="mt-auto">
          <MbStandingsLegend />
        </div>
      </>
    )}
  </Panel>
);

/* ----------------------------------------------------------------- schedule */

const SCHEDULE_PAGE = 8;

export const SchedulePanel = ({
  data,
  canEdit,
  onSelect,
  onEdit,
}: {
  data: MbCompetitionDetail;
  canEdit: boolean;
  onSelect: (match: Match) => void;
  onEdit: (match: Match) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const finished = data.scheduleRounds.filter((round) => round.complete);
  const pending = data.scheduleRounds.filter((round) => !round.complete);

  /* Paging applies to the unplayed rounds only, by row — "Show 3 completed
     rounds" always means all three. */
  const limit = page * SCHEDULE_PAGE;
  const pagedPending: typeof pending = [];
  let taken = 0;
  for (const round of pending) {
    if (taken >= limit) break;
    pagedPending.push({ ...round, lines: round.lines.slice(0, limit - taken) });
    taken += Math.min(round.lines.length, limit - taken);
  }
  const remaining =
    pending.reduce((sum, round) => sum + round.lines.length, 0) - taken;
  const shown = expanded ? [...finished, ...pagedPending] : pagedPending;

  /* Count rendered PLAYABLE lines only: the denominator (`counts.total`)
     excludes byes, but a bye still draws a row — counting raw lines can
     exceed the denominator. */
  const rendered = shown.reduce(
    (sum, round) => sum + round.lines.filter((line) => !line.bye).length,
    0
  );

  return (
    <Panel
      title="Schedule"
      meta={
        <span className="mb-kicker tabular-nums">
          {rendered} of {data.counts.total}
        </span>
      }
    >
      {data.scheduleRounds.length === 0 ? (
        <PanelEmpty message="No schedule exists yet — start the competition to generate the fixtures." />
      ) : (
        <>
          {/* `flex-1` lets the empty block centre itself in a stretched panel. */}
          <div className="flex flex-1 flex-col">
            {shown.map((round) => (
              <div key={round.id}>
                {/* Current round is marked by inverting the band — ground and
                    weight survive greyscale where a tint would not. */}
                {round.id === data.currentRoundId ? (
                  <p className="mb-kicker flex items-center justify-between gap-2 border-b border-mb-navy bg-mb-navy px-3 py-1.5 tabular-nums text-mb-paper-bright!">
                    <span>{round.label}</span>
                    {/* `currentRoundId` means "in play OR next to play" — read
                        which of the two off the rows themselves. */}
                    <span>
                      {round.lines.some((line) => line.status === "live")
                        ? "Now playing"
                        : "Up next"}
                    </span>
                  </p>
                ) : (
                  <p className="mb-kicker border-b border-mb-rule bg-[var(--mb-band)] px-3 py-1.5 text-mb-navy tabular-nums">
                    {round.label}
                  </p>
                )}
                <div className="flex flex-col divide-y divide-mb-rule">
                  {round.lines.map((line) => (
                    <ScheduleRow
                      key={line.id}
                      line={line}
                      canEdit={canEdit}
                      onSelect={onSelect}
                      onEdit={onEdit}
                    />
                  ))}
                </div>
              </div>
            ))}
            {shown.length === 0 && (
              <PanelEmpty message="No unplayed matches exist yet — every round is complete." />
            )}
          </div>

          {(remaining > 0 || finished.length > 0) && (
            /* The wrapper's own inset keeps the footer keys >=8px clear of the
               last row's button. */
            <div className="mt-auto flex flex-col gap-2 border-t border-mb-navy p-1">
              {remaining > 0 && (
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  className={PANEL_FOOT_BTN}
                >
                  <span className="matchbook-display text-[0.72rem] mb-track-link font-semibold tabular-nums">
                    Show {Math.min(remaining, SCHEDULE_PAGE)} more
                  </span>
                  <MbIcon id="chevron-down" size={12} />
                </button>
              )}
              {finished.length > 0 && (
                <button
                  type="button"
                  onClick={() => setExpanded((open) => !open)}
                  className={PANEL_FOOT_BTN}
                >
                  <span className="matchbook-display text-[0.72rem] mb-track-link font-semibold tabular-nums">
                    {expanded
                      ? `Hide ${finished.length} completed ${pluralise("round", finished.length)}`
                      : `Show ${finished.length} completed ${pluralise("round", finished.length)}`}
                  </span>
                  <MbIcon id={expanded ? "collapse" : "expand"} size={12} />
                </button>
              )}
            </div>
          )}
        </>
      )}
    </Panel>
  );
};

const ScheduleRow = ({
  line,
  canEdit,
  onSelect,
  onEdit,
}: {
  line: MbMatchLine;
  canEdit: boolean;
  onSelect: (match: Match) => void;
  onEdit: (match: Match) => void;
}) => (
  <MbMatchRow
    label={line.label}
    home={line.home}
    away={line.away}
    homeScore={line.status === "pending" || line.bye ? undefined : line.homeScore}
    awayScore={line.status === "pending" || line.bye ? undefined : line.awayScore}
    homeWon={line.homeWon}
    awayWon={line.awayWon}
    status={line.status}
    /* A walkover carries a generator-written 1–0 and a blank opponent id;
       without this flag the row reads those numbers as a real result. */
    bye={line.bye}
    variant={line.status === "completed" ? "result" : "schedule"}
    /* Completed matches must stay openable for review and correction. */
    onSelect={() => onSelect(line.match)}
    /* No edit control until both slots resolve — TBD has nothing to reassign. */
    onEdit={
      canEdit && line.status === "pending" && line.home && line.away
        ? () => onEdit(line.match)
        : undefined
    }
  />
);

/* --------------------------------------------------------------- live now */

export const LivePanel = ({
  data,
  onSelect,
}: {
  data: MbCompetitionDetail;
  onSelect: (match: Match) => void;
}) => (
  <Panel
    title="Live Now"
    meta={<span className="mb-kicker tabular-nums">{data.counts.live} in play</span>}
  >
    {data.liveLines.length === 0 ? (
      <PanelEmpty message="No matches are live yet — start one and the score appears here." />
    ) : (
      <div className="flex flex-col divide-y divide-mb-rule">
        {data.liveLines.map((line) => (
          <MbMatchRow
            key={line.id}
            label={line.label}
            home={line.home}
            away={line.away}
            homeScore={line.homeScore}
            awayScore={line.awayScore}
            status="live"
            variant="live"
            onSelect={() => onSelect(line.match)}
          />
        ))}
      </div>
    )}
  </Panel>
);

/* ---------------------------------------------------------------- results */

const RESULTS_PAGE = 15;

/* The head count and the rendered count must always agree; extra rows page
   in rather than hide behind an inner scroller. */
export const ResultsPanel = ({
  lines,
  title = "Results",
  emptyMessage = "No results exist yet — finished matches land here.",
  onSelect,
}: {
  lines: MbMatchLine[];
  title?: string;
  emptyMessage?: string;
  onSelect: (match: Match) => void;
}) => {
  const [page, setPage] = useState(1);
  const shown = lines.slice(0, page * RESULTS_PAGE);
  const remaining = lines.length - shown.length;

  return (
    <Panel
      title={title}
      meta={
        <span className="mb-kicker tabular-nums">
          {shown.length} of {lines.length}
        </span>
      }
    >
      {lines.length === 0 ? (
        <PanelEmpty message={emptyMessage} />
      ) : (
        <>
          <div className="flex flex-col divide-y divide-mb-rule">
            {shown.map((line) => (
              <MbMatchRow
                key={line.id}
                label={line.label}
                home={line.home}
                away={line.away}
                homeScore={line.homeScore}
                awayScore={line.awayScore}
                homeWon={line.homeWon}
                awayWon={line.awayWon}
                status="completed"
                variant="result"
                onSelect={() => onSelect(line.match)}
              />
            ))}
          </div>
          {remaining > 0 && (
            <div className="mt-auto border-t border-mb-navy p-1">
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className={PANEL_FOOT_BTN}
            >
              <span className="matchbook-display text-[0.72rem] mb-track-link font-semibold tabular-nums">
                Show {Math.min(remaining, RESULTS_PAGE)} more
              </span>
              <MbIcon id="chevron-down" size={12} />
            </button>
            </div>
          )}
        </>
      )}
    </Panel>
  );
};

/* ---------------------------------------------------------------- bracket */

export const BracketPanel = ({
  data,
  canEdit,
  onSelect,
  onEdit,
}: {
  data: MbCompetitionDetail;
  canEdit: boolean;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
}) => (
  <Panel
    title="Championship Bracket"
    meta={
      <span className="mb-kicker tabular-nums">
        {data.teamRefs.length} {pluralise("team", data.teamRefs.length)}
      </span>
    }
  >
    <BracketRail
      sections={data.bracketSections}
      variant={data.bracketSections.length > 1 ? "double" : "single"}
      champion={data.champion}
      onSelect={onSelect}
      onEdit={canEdit ? onEdit : undefined}
    />
  </Panel>
);

/* ----------------------------------------------------------------- courts */

export const CourtsPanel = ({
  data,
  canEdit,
  canPlay,
  instantWin,
  onPlay,
  onEdit,
  onInstantWin,
}: {
  data: MbCompetitionDetail;
  canEdit: boolean;
  canPlay: boolean;
  instantWin: boolean;
  onPlay: (match: Match) => void;
  onEdit: (match: Match) => void;
  onInstantWin: (match: Match, winnerId: string) => void;
}) => (
  <Panel
    title={`${data.venue.Many} In Play`}
    meta={<span className="mb-kicker tabular-nums">{data.courts.length} active</span>}
  >
    {data.courts.length === 0 ? (
      <PanelEmpty
        message={`No ${data.venue.many} are in play yet — the next ${data.matchWord.one} appears here as soon as the rotation advances.`}
      />
    ) : (
      <div className="flex flex-col divide-y divide-mb-rule">
        {data.courts.map((court) => (
          <MbCourtCard
            key={court.match.id}
            court={court.court}
            venue={data.venue.One}
            home={court.home}
            away={court.away}
            homeScore={court.homeScore}
            awayScore={court.awayScore}
            status={court.status}
            homeSub={court.homeSub}
            awaySub={court.awaySub}
            canEdit={canEdit}
            canPlay={canPlay}
            instantWin={instantWin}
            onPlay={() => onPlay(court.match)}
            onEdit={() => onEdit(court.match)}
            onInstantWin={(side) =>
              onInstantWin(
                court.match,
                side === "home" ? court.match.homeTeamId : court.match.awayTeamId
              )
            }
          />
        ))}
      </div>
    )}
  </Panel>
);

/* ------------------------------------------------------------------ queue */

export const QueuePanel = ({
  data,
  canEdit,
  onReorder,
}: {
  data: MbCompetitionDetail;
  canEdit: boolean;
  onReorder: () => void;
}) => (
  <Panel
    title="Queue"
    meta={
      canEdit ? (
        <button type="button" onClick={onReorder} className="mb-panel-link mb-btn-touch">
          Reorder
          <MbIcon id="drag" size={12} />
        </button>
      ) : (
        <span className="mb-kicker tabular-nums">{data.queue.length} waiting</span>
      )
    }
  >
    {data.queue.length === 0 ? (
      <PanelEmpty
        message={`No teams are waiting yet — every team is on a ${data.venue.one}.`}
      />
    ) : (
      <div className="flex flex-col divide-y divide-mb-rule">
        {data.queue.map((line) => (
          <div
            key={line.teamId}
            className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5"
            /* Teal = the rank-#1 rail, same mark as the standings leader. */
            style={
              line.position === 1
                ? { boxShadow: "inset 3px 0 0 var(--mb-teal)" }
                : undefined
            }
          >
            <span className="matchbook-display text-[0.78rem] mb-track-display font-bold tabular-nums">
              {line.position}
            </span>
            <TeamMark team={line.team} size="sm" />
            <span className="mb-kicker whitespace-nowrap tabular-nums">
              {line.position === 1 ? "Next up" : line.note}
            </span>
          </div>
        ))}
      </div>
    )}
  </Panel>
);

/* ------------------------------------------------------------ leaderboard */

export const LeaderboardPanel = ({
  data,
  primaryLabel,
  caption,
}: {
  data: MbCompetitionDetail;
  /** "Crowns" for win 2 & out, "W" for the rotation formats. */
  primaryLabel: string;
  caption: string;
}) => (
  <Panel
    title="Leaderboard"
    meta={
      <span className="mb-kicker tabular-nums">
        {data.leaderboard.length} {pluralise("team", data.leaderboard.length)}
      </span>
    }
  >
    {data.leaderboard.length === 0 ? (
      <PanelEmpty message="No leaderboard exists yet — finish a match and the order appears." />
    ) : (
      <MbTableScroll>
        <table className="mb-table mb-table-compact w-full border-collapse">
          <caption className="mb-kicker px-4 pb-2 pt-2.5 text-left">{caption}</caption>
          <thead>
            <tr>
              <th scope="col" className="w-9 pl-3! text-center">
                #
              </th>
              <th scope="col">Team</th>
              <th scope="col" className="text-center">
                {primaryLabel}
              </th>
              <th scope="col" className="text-center">
                <abbr title="Won" className="no-underline">
                  W
                </abbr>
              </th>
              <th scope="col" className="text-center">
                <abbr title="Lost" className="no-underline">
                  L
                </abbr>
              </th>
              <th scope="col" className="hidden pr-3! text-center sm:table-cell">
                <abbr title="Win percentage" className="no-underline">
                  Pct
                </abbr>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.leaderboard.map((line) => (
              <tr key={line.teamId} className="mb-row-hover">
                <th
                  scope="row"
                  className="matchbook-display pl-3! text-center text-[0.78rem] mb-track-display font-bold tabular-nums"
                  style={
                    line.rank === 1
                      ? { boxShadow: "inset 3px 0 0 var(--mb-teal)" }
                      : undefined
                  }
                >
                  {line.rank}
                </th>
                <td>
                  <span className="flex min-w-0 items-center gap-2">
                    <TeamMark team={line.team} size="sm" />
                    {line.onCourt && <MbBadge tone="live">Playing</MbBadge>}
                  </span>
                </td>
                <td className="matchbook-display text-center font-bold tabular-nums">
                  {line.primary}
                </td>
                <td className="text-center tabular-nums">{line.won}</td>
                <td className="text-center tabular-nums">{line.lost}</td>
                <td className="hidden pr-3! text-center tabular-nums sm:table-cell">
                  {line.pct}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </MbTableScroll>
    )}
  </Panel>
);

/* ---------------------------------------------------------------- details */

export const DetailsPanel = ({
  data,
  createdDate,
}: {
  data: MbCompetitionDetail;
  createdDate: string;
}) => (
  <Panel title="Event Details">
    <div className="flex flex-1 flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <MbIcon id="calendar" size={18} className="shrink-0 text-mb-navy" />
        <div className="min-w-0">
          <p className="mb-kicker">Created</p>
          <p className="text-[0.78rem] font-semibold tabular-nums" suppressHydrationWarning>
            {createdDate}
          </p>
        </div>
      </div>
      {data.configLines.map((line) => (
        <div key={line.label} className="flex items-center gap-3">
          <MbIcon id={line.icon} size={18} className="shrink-0 text-mb-navy" />
          <div className="min-w-0">
            <p className="mb-kicker">{line.label}</p>
            <p className="text-[0.78rem] font-semibold tabular-nums">{line.value}</p>
          </div>
        </div>
      ))}
    </div>
  </Panel>
);

/* ----------------------------------------------------------------- kickoff */

export const ReadyPanel = ({
  data,
  canEdit,
}: {
  data: MbCompetitionDetail;
  canEdit: boolean;
}) => {
  const rounds = data.scheduleRounds.length;
  const next = data.nextLine;

  return (
    <Panel title="Ready to Play" tone="navy" icon="quick">
      <div className="flex flex-1 flex-col">
        <p className="border-b border-mb-rule px-4 py-3 text-[0.85rem] leading-[1.5] tabular-nums">
          The schedule is written: {data.counts.total} {data.matchWord.many} over{" "}
          {rounds} {pluralise("round", rounds)}. Nothing has been played yet.
        </p>

        {next && (
          <>
            <p className="mb-kicker bg-[var(--mb-band)] px-3 py-1.5 text-mb-navy">
              First {data.matchWord.one}
            </p>
            {/* Static row, not a control — the panel foot is the single way in. */}
            <MbMatchRow
              label={next.label}
              home={next.home}
              away={next.away}
              status="pending"
              variant="schedule"
            />
          </>
        )}

        {canEdit && next && (
          <div className="mt-auto border-t border-mb-navy p-4">
            <MbButtonLink
              href={`/match/${next.id}`}
              variant="coral"
              icon="volleyball"
              fullWidth
            >
              Score first {data.matchWord.one}
            </MbButtonLink>
          </div>
        )}
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ draft */

export const EntrantsPanel = ({
  teams,
  canEdit,
  onRemove,
  onAdd,
  refFor,
}: {
  teams: PersistentTeam[];
  canEdit: boolean;
  onRemove: (teamId: string) => void;
  onAdd: () => void;
  refFor: (teamId: string) => MbTeam;
}) => (
  <Panel
    title="Entrants"
    meta={
      <span className="mb-kicker tabular-nums">
        {teams.length} {pluralise("team", teams.length)}
      </span>
    }
  >
    {teams.length === 0 ? (
      <PanelEmpty
        message="No teams are entered yet — add teams before starting the competition."
        actionLabel={canEdit ? "Add teams" : undefined}
        onAction={canEdit ? onAdd : undefined}
      />
    ) : (
      <div className="flex flex-col divide-y divide-mb-rule">
        {teams.map((team, i) => (
          <div
            key={team.id}
            /* `py-2` keeps the last row's remove key >=8px from the footer
               button. */
            className="mb-row-hover flex items-center gap-2 py-2 pl-3 pr-1.5"
          >
            <span className="matchbook-display w-6 shrink-0 text-[0.78rem] mb-track-display font-bold tabular-nums text-mb-ink-muted">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 py-1.5">
              <TeamMark team={refFor(team.id)} size="md" accent={teamColorCss(team.color)} />
            </span>
            {canEdit && (
              <MbIconButton
                icon="minus"
                label={`Remove ${team.name} from this competition`}
                size="sm"
                onClick={() => onRemove(team.id)}
              />
            )}
          </div>
        ))}
      </div>
    )}
    {canEdit && teams.length > 0 && (
      <div className="mt-auto border-t border-mb-navy p-1">
        <button
          type="button"
          onClick={onAdd}
          className={PANEL_FOOT_BTN}
        >
          <MbIcon id="plus" size={13} />
          <span className="matchbook-display text-[0.72rem] mb-track-link font-semibold">Add a team</span>
        </button>
      </div>
    )}
  </Panel>
);

/* Setup and DetailsPanel both print `data.configLines` — DraftBody renders
   Setup alone (with Created in its head) to avoid the duplication; the other
   bodies render DetailsPanel alone. */
export const SetupPanel = ({
  data,
  createdDate,
}: {
  data: MbCompetitionDetail;
  createdDate: string;
}) => (
  <Panel
    title="Setup"
    tone="navy"
    icon="settings"
    meta={
      /* Not `.mb-kicker` — its `--mb-ink-muted` is a cream-ground ink and this
         head is navy; inherit the head's paper ink instead. */
      <span
        className="matchbook-display shrink-0 text-[0.66rem] mb-track-status font-bold tabular-nums"
        suppressHydrationWarning
      >
        Created {createdDate}
      </span>
    }
  >
    <div className="flex flex-1 flex-col gap-4 p-5">
      <p className="text-[0.85rem] leading-[1.5]">{data.formatBlurb}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {data.configLines.map((line) => (
          <MbStat
            key={line.label}
            size="sm"
            icon={line.icon}
            label={line.label}
            value={line.value}
          />
        ))}
      </div>
      <p className="mt-auto border-t border-mb-rule pt-3 text-[0.78rem] font-semibold text-mb-ink-muted">
        Scoring rules and terminology are set when the competition is created.
      </p>
    </div>
  </Panel>
);

export const PreviewPanel = ({
  data,
  canStart,
  canEdit,
  onStart,
}: {
  data: MbCompetitionDetail;
  canStart: boolean;
  canEdit: boolean;
  onStart: () => void;
}) => (
  <Panel title="What Will Be Generated">
    <div className="flex flex-1 flex-col">
      {!canStart ? (
        <PanelEmpty
          message={`No schedule can be generated yet — this format needs at least ${data.draft.playInTeamCount || 2} teams.`}
        />
      ) : (
        <>
          <p className="border-b border-mb-rule px-4 py-3 text-[0.85rem] leading-[1.5] tabular-nums">
            {data.draft.summary}
          </p>

          {data.draft.pairings.length > 0 && (
            <div className="flex flex-col divide-y divide-mb-rule">
              <p className="mb-kicker bg-[var(--mb-band)] px-3 py-1.5 text-mb-navy">
                Opening round
              </p>
              {data.draft.pairings.map((pair, i) => (
                <MbMatchRow
                  key={`${pair.home.name}-${pair.away.name}-${i}`}
                  label={`M${i + 1}`}
                  home={pair.home}
                  away={pair.away}
                  homeSeed={pair.homeSeed}
                  awaySeed={pair.awaySeed}
                  status="pending"
                  variant="schedule"
                />
              ))}
            </div>
          )}

          {data.draft.byes.length > 0 && (
            <div className="border-t border-mb-rule px-4 py-3">
              <p className="mb-kicker">
                {data.draft.byes.length} {pluralise("bye", data.draft.byes.length)}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                {data.draft.byes.map((bye) => (
                  <span
                    key={bye.team.name}
                    className="inline-flex min-w-0 items-center gap-1.5"
                  >
                    <MbSeedBox value={bye.seed} />
                    <TeamMark team={bye.team} size="sm" />
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[0.78rem] text-mb-ink-muted">
                These teams skip the opening round and enter at round two.
              </p>
            </div>
          )}
        </>
      )}

      {/* The one coral Start on the screen — the masthead's copy stays navy. */}
      {canEdit && (
        <div className="mt-auto border-t border-mb-navy p-4">
          <MbButton
            variant="coral"
            icon="quick"
            fullWidth
            disabled={!canStart}
            onClick={onStart}
          >
            Start competition
          </MbButton>
        </div>
      )}
    </div>
  </Panel>
);

export const DangerPanel = ({
  name,
  onDelete,
  loading,
}: {
  name: string;
  onDelete: () => void;
  loading?: boolean;
}) => (
  <MbDangerZone
    title="Delete this competition"
    description={`"${name}" and every match in it are removed from this device. This cannot be undone.`}
    action={{ label: "Delete competition", onClick: onDelete, loading }}
  />
);
