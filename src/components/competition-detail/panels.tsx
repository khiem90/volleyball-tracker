"use client";

import { useState } from "react";
import { MbBadge } from "@/components/matchbook/Badge";
import { MbButton } from "@/components/matchbook/Button";
import { MbDangerZone } from "@/components/matchbook/DangerZone";
import { MbFinalStamp } from "@/components/matchbook/FinalStamp";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { MbIconButton } from "@/components/matchbook/IconButton";
import { MbMeter } from "@/components/matchbook/Meter";
import { MbStat, type MbStatTone } from "@/components/matchbook/Stat";
import { MbTableScroll } from "@/components/matchbook/TableScroll";
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

/* ===========================================================================
   THE COMPETITION-DETAIL PANELS

   Every region on this screen is a `<Panel>` (invariant 5). They live here
   rather than in the route file because the route file carries layout only
   (invariant 23) and because five formats reuse the same six of them.

   The panels this replaces: `CompetitionStats` (three shadcn cards + a rounded
   `<Progress>`), `CompetitionWinnerBanner` (amber gradient + `Crown` lucide),
   `CompetitionDraftTeams` (gradient initial-letter tiles), and
   `CompetitionRoundRobinSection` (a `<div role="button">` per row with an
   `opacity-0 group-hover` pencil).
   =========================================================================== */

/**
 * The panel-foot control — "Show 3 completed rounds", "Show 15 more", "Add a
 * team". One string, three call sites, and an EXPLICIT duration token.
 *
 * Tailwind's bare `transition-colors` carries its own 150ms default, which is
 * not `--mb-dur-fast/base/slow` (120/180/280) — it was the largest contributor
 * to the 25 off-token 0.15s durations measured on this screen (rubric 5.2,
 * register D-25). The hover is a paint change on a 44px control, so it takes
 * the fast token, the same one `.mb-btn` already resolves to.
 */
const PANEL_FOOT_BTN =
  "mb-btn-touch flex w-full items-center justify-center gap-1.5 px-4 text-mb-navy transition-colors duration-[var(--mb-dur-fast)] ease-[var(--mb-ease-out)] hover:bg-[var(--mb-tint-1)]";

/* ------------------------------------------------------------ event status */

/**
 * `Panel tone="navy"` inks the HEAD and nothing else — `.mb-panel`'s ground is
 * `--mb-paper-bright` at every tone (`globals.css:491`). The panel body this
 * file used to draw was written against the opposite belief: the eyebrows took
 * `--mb-gold` "because the ground is navy", and measured **2.15:1 on cream**
 * against a 4.5:1 floor, four nodes on all six routes, with the glyph beside
 * them at the same 2.15:1 against a 3:1 floor and its ring painted
 * `--mb-rule-on-navy` — an alpha built for navy — on cream (rubric HF-6,
 * invariant 11). `SetupPanel` had the same premise and was worse: its blurb and
 * its footer note were `--mb-paper-bright` on `--mb-paper-bright`, **1.00:1**,
 * i.e. invisible, which no critic had caught because nothing renders.
 *
 * The fix is not a new hue, it is the shipped primitive. `MbStat` already sets
 * its label in `.mb-kicker` (navy-muted, 5.9:1) and already binds its tone to a
 * shape-and-weight mark so the six tones survive greyscale (invariant 13) — and
 * `competitions/page.tsx`'s `StatusStat`, the closest shipped analogue, is a
 * hand-rolled copy of exactly this. Using `MbStat` closes the contrast failure
 * and the 9.5 re-derivation in one edit, and retires the off-scale
 * 0.62rem/0.14em and 1.2rem/0.02em tuples this file had invented for it.
 */

/** Completion reads as a state, not just a number: none / running / done. */
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
        {/* Coral here is the LIVE job — the same one the live row rail and the
            live bracket elbow already carry — not a second one (rubric 3.4). */}
        <MbStat
          size="sm"
          icon="live"
          tone={data.counts.live > 0 ? "coral" : "navy"}
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

/**
 * The completed competition's centrepiece.
 *
 * Before this the champion was one of four equal `NavyStat` cells — the same
 * 1.2rem as "Teams entered" — on a screen whose entire remaining purpose is to
 * say who won (rubric 8.2). `MbFinalStamp` is the system's own close-out mark
 * and was declared a W4 consumer with zero call sites; this is it.
 */
export const ChampionPanel = ({ data }: { data: MbCompetitionDetail }) => {
  const top = data.standings[0];
  const record = top ? `${top.won}W – ${top.lost}L` : null;
  return (
    <Panel title="Champion" tone="navy" icon="trophy">
      {!data.winner ? (
        <PanelEmpty message="No champion exists yet — the last match decides it." />
      ) : (
        <div className="flex flex-1 flex-col gap-4 p-5">
          <div className="flex min-w-0 items-center gap-4">
            <Crest team={data.winner} size={56} />
            <div className="min-w-0 flex-1">
              {/* Just "Winner". The competition name is the `<h1>` two rows up,
                  and repeating it wrapped this eyebrow onto two lines at 390. */}
              <p className="mb-kicker">Winner</p>
              <p className="matchbook-display mt-1 truncate text-[1.5rem] font-bold leading-none">
                {data.winner.name}
              </p>
              {record && (
                <p className="matchbook-display mt-1.5 text-[0.74rem] font-bold tracking-[0.1em] tabular-nums">
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
      <span className="mb-kicker tabular-nums">
        {data.standings.length} {pluralise("team", data.standings.length)}
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

/**
 * Grouped by round, with finished rounds folded away and the tail paged.
 *
 * The 16-team fixture in the audit renders 120 rows in one flat list with the
 * live match somewhere in the middle of it (BUG-12). Grouping by round is free
 * — `match.round` has always been there — and collapsing the completed groups
 * turns a 10,000px page into the two rounds that still matter.
 *
 * Paging the remainder is the second half of that. On `rr-live` the 16 unplayed
 * fixtures made this panel **1,056px** tall at 1440 — the single tallest object
 * on the screen and, at 390, a scroll the reader has to make before anything
 * else — and its 5-wide row-mate then stretched to match with 726px of bare
 * paper inside it, which was the largest remaining 2.3 finding after
 * `items-start` came off. Measured after: the panel opens at ~640px and the
 * pair leaves ~310px against 726px before.
 */
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

  /* Paging applies to the UNPLAYED rounds only, and by row rather than by
     round, so the budget cannot be eaten by history the reader explicitly
     asked to see — "Show 3 completed rounds" means all three. Rounds stay in
     chronological order either way: `finished` are always the earlier ones. */
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

  /* The head count is the RENDERED count, never the total — printing 30 over a
     list of 7 is the same lie `MatchHistorySection` told (BUG-8).
     ...
     BUT BOTH NUMBERS MUST COUNT THE SAME THING, and they did not. The
     denominator is `counts.total`, which is `playable.length` — byes excluded,
     because `useMatchbookCompetitionDetail` decided a walkover is not a match
     and every other readout in the app agrees. The numerator counted LINES, and
     a bye still draws a line (the draw is where a walkover is a fact). So a
     bracket with byes printed a numerator that could exceed its own
     denominator. Measured at 390px on `/competitions/s-se-13` — a 13-team
     single elimination, 15 slots of which 3 are byes — the Schedule head read
     **"15 of 12"** with the completed rounds shown. The same arithmetic on a
     5-team draw (8 slots, 3 byes, 4 real matches) prints "7 of 4", which is
     the figure the second critic reported.
     Counting the rendered PLAYABLE lines puts the two halves back on one
     basis: "5 of 12" over eight rows, three of which are walkovers. */
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
          {/* `flex-1`, so the empty block can centre itself in the panel it
              was handed. Without it the state block sat hard against the head
              with the rest of the stretched frame blank under it — visible on
              `rr-completed`, where the schedule has nothing left to show. */}
          <div className="flex flex-1 flex-col">
            {shown.map((round) => (
              <div key={round.id}>
                {/* The current round is marked by INVERTING the band — navy
                    ground, paper letterforms — not by tinting it. Three
                    identical `.mb-kicker` bands told the reader nothing about
                    where the competition actually is (rubric 4, "current round
                    unmarked"), and ground/weight is a channel that survives a
                    desaturated capture where a hue would not. */}
                {round.id === data.currentRoundId ? (
                  <p className="mb-kicker flex items-center justify-between gap-2 border-b border-mb-navy bg-mb-navy px-3 py-1.5 tabular-nums text-mb-paper-bright!">
                    <span>{round.label}</span>
                    <span>Now playing</span>
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
            /* The footer keys are INSIDE a bordered wrapper with its own 4px
               inset, not the bordered elements themselves. Flush against the
               frame they measured 4px from the last row's button — under the
               8px separation floor, and they are different actions. The two
               disclosures are stacked with a rule between them because they
               reveal different things: more of THIS list, and the rounds
               already played. */
            <div className="mt-auto flex flex-col gap-2 border-t border-mb-navy p-1">
              {remaining > 0 && (
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  className={PANEL_FOOT_BTN}
                >
                  <span className="matchbook-display text-[0.72rem] font-semibold tabular-nums">
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
                  <span className="matchbook-display text-[0.72rem] font-semibold tabular-nums">
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
    /* A walkover carries a generator-written 1–0 and a blank opponent id
       (`lib/singleElimination.ts:164-175`). Without this flag the row read the
       two numbers as a result and printed "1 – 0 · TBD" on three rows of
       `/competitions/s-se-13` while the Bracket panel beside it said BYE
       (F12). `MbMatchRow` also drops its Open and Change controls for a bye —
       there is no sheet to open and no pair of teams to swap. */
    bye={line.bye}
    variant={line.status === "completed" ? "result" : "schedule"}
    /* Every match opens, including a completed one. The shipped row gated the
       handler on `status !== "completed"`, so a finished match could not be
       reviewed or corrected from anywhere (BUG-7). */
    onSelect={() => onSelect(line.match)}
    /* A fixture with no teams in it yet has nothing to reassign — the bracket
       fills those slots as its feeders resolve. The shipped screen painted a
       pencil on "TBD vs TBD". */
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

/**
 * The ledger. `MatchHistorySection` printed the true count in its heading and
 * then rendered `.slice(0, 20)` inside a `max-h-60` scroller with no "view
 * all", so past 20 matches the operator simply lost data (BUG-8). Here the
 * head count and the rendered count always agree, and the extra rows are one
 * button away rather than behind an inner scrollport.
 */
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
              <span className="matchbook-display text-[0.72rem] font-semibold tabular-nums">
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
            /* The team that plays next is the one fact this panel exists for,
               so it takes the coral selection rail — the same mark the schedule
               spine uses (coral job 2). */
            style={
              line.position === 1
                ? { boxShadow: "inset 3px 0 0 var(--mb-coral)" }
                : undefined
            }
          >
            <span className="matchbook-display text-[0.78rem] font-bold tabular-nums">
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
      /* `LeaderboardCard.tsx:32` returned `null`, so the whole panel vanished
         with no explanation (invariant 25). */
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
                  className="matchbook-display pl-3! text-center text-[0.78rem] font-bold tabular-nums"
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
            /* `py-2`, not `py-1`: at `py-1` the last row's remove key sat 5px
               above the "Add a team" footer button — measured on
               `competition-de-draft@390`. */
            className="mb-row-hover flex items-center gap-2 py-2 pl-3 pr-1.5"
          >
            {/* 0.8rem/700 is the screen's one rank-numeral step — the standings
                rank cell, the queue position and the leaderboard rank all set
                it. 0.75rem was a 28th step on a named scale of 23. */}
            <span className="matchbook-display w-6 shrink-0 text-[0.78rem] font-bold tabular-nums text-mb-ink-muted">
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
          <span className="matchbook-display text-[0.72rem] font-semibold">Add a team</span>
        </button>
      </div>
    )}
  </Panel>
);

/**
 * Both paragraphs here were `--mb-paper-bright` on `--mb-paper-bright` —
 * **1.00:1**, measured, i.e. the format blurb and the footer note rendered as
 * blank paper on every draft competition. Same false premise as the old
 * `NavyStat`: `Panel tone="navy"` inks the head, never the body.
 */
export const SetupPanel = ({ data }: { data: MbCompetitionDetail }) => (
  <Panel title="Setup" tone="navy" icon="settings">
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

/**
 * The draft screen's centrepiece: what pressing Start will actually build.
 *
 * The play-in decision moves here out of `StartCompetitionDialog`, where it was
 * a 6-row scroller inside a modal that greyed out unselected teams with no
 * explanation and never showed the bracket it was about to generate (brief
 * §2.5). Here there is room to state the pairings and name the teams that get
 * a bye before anything is committed.
 */
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
              {/* Seeded, and shown seeded. "1 Nova v 8 Storm" is a draw the
                  organiser can check against the entry order; "Nova v Storm"
                  is not (rubric 4, "seeds and byes are explicit"). */}
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

      {/* The one coral Start on the screen. The masthead's copy of the same
          action is navy (see `competitions/[id]/page.tsx`) — two coral Starts
          on one 1,129px page was rubric 3.4's clearest breach. */}
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
