"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { DeleteConfirmDialog } from "@/components/shared";
import { MatchbookShell } from "@/components/matchbook/AppShell";
import { MbPageLoading } from "@/components/matchbook/Loading";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { MbBadge, type MbBadgeTone } from "@/components/matchbook/Badge";
import { MbMenu } from "@/components/matchbook/Menu";
import { MbMatchupPair } from "@/components/matchbook/MatchRow";
import { Crest, Panel, PanelEmpty, TeamMark } from "@/components/matchbook/Panel";
import {
  MB_COMPETITION_FORMATS,
  MB_XL_SPAN,
  mbClosingSpan,
  mbContentsFor,
  MbLedgerPanel,
  type MbOverviewSection,
  MbPanelHeadLink,
  TeamsReadyPanel,
} from "@/components/matchbook/panels";
import {
  MbStandingsLegend,
  MbStandingsTable,
} from "@/components/matchbook/StandingsTable";
import { MbTeamName } from "@/components/matchbook/TeamName";
import type { MbTeam } from "@/components/matchbook/types";
import {
  useMatchbookCompete,
  type MbBracketCell,
  type MbCompeteSelected,
  type MbCompetitionRow,
} from "@/components/matchbook/useMatchbookCompete";

/* COMPETE CONSOLE. A status is a badge tone (MbBadge), never a hue on a
   letterform. `EventConsole` and `FirstRunConsole` are the screen's two
   compositions — the empty one is its own design, not the populated one with
   the data removed. `EventConsole` withholds strips that have nothing to
   print (`muteSections`) and names them in one index instead; the main panel
   is exempt, since its empty state names the one thing to do next. */

/** in_progress / draft / completed as the badge system already names them. */
const STATUS_TONE: Record<MbCompetitionRow["status"], MbBadgeTone> = {
  in_progress: "live",
  draft: "draft",
  completed: "final",
};

const STATUS_LABEL: Record<MbCompetitionRow["status"], string> = {
  in_progress: "Live",
  draft: "Draft",
  completed: "Final",
};

/* What the event's own control is called, per state. One table, ONE call
   site — a second call site prints the same words and destination twice in
   one viewport. */
const EVENT_ACTION: Record<
  MbCompetitionRow["status"],
  { label: string; icon: string }
> = {
  draft: { label: "Set Up & Start", icon: "quick" },
  in_progress: { label: "Score Matches", icon: "volleyball" },
  completed: { label: "View Results", icon: "chart" },
};

const BracketBox = ({ cell }: { cell: MbBracketCell }) => {
  const side = (
    team: MbBracketCell["home"],
    score: number,
    won: boolean,
    last = false
  ) => (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 ${last ? "" : "border-b border-mb-rule"}`}
    >
      {team ? (
        <>
          <Crest team={team} size={16} />
          {/* `display/link` — 0.72rem at 0.04em. 0.7rem (11.2px) was between
              steps, and the tracking is declared so this pair does not carry
              two values against `.mb-panel-link`, which owns 0.72rem/600 on
              this screen. */}
          <MbTeamName
            name={team.name}
            className={`matchbook-display min-w-0 flex-1 text-[0.72rem] mb-track-link ${won ? "font-bold" : "font-semibold text-mb-ink-muted"}`}
          />
        </>
      ) : (
        /* Two words for two states, matching `BracketRail`'s cell and
           `MbMatchRow` exactly: "TBD" is a slot awaiting a winner, "—" is a
           side that does not exist because the other team had a bye (F12). */
        <span className="matchbook-display flex-1 text-[0.72rem] mb-track-link text-mb-ink-muted">
          {cell.bye ? (
            <>
              <span aria-hidden="true">—</span>
              <span className="sr-only">No opponent</span>
            </>
          ) : (
            "TBD"
          )}
        </span>
      )}
      {!cell.pending && !cell.bye && (
        /* The winner was marked in coral at 12px/700 — 3.55:1, and a fifth
           coral job besides. Weight already says who won; the loser's score is
           muted, so the pair reads in greyscale too. */
        /* `display/team-mark`'s size — 0.82rem, the step `TeamMark` already
           prints beside it — so the cell's score outranks its 0.72rem name.
           0.75rem (12px) was between steps. */
        <span
          className={`matchbook-display text-[0.82rem] mb-track-display tabular-nums ${won ? "font-bold" : "font-semibold text-mb-ink-muted"}`}
        >
          {score}
        </span>
      )}
    </div>
  );

  return (
    <div className="w-[148px] shrink-0 border border-mb-navy bg-mb-paper-bright">
      {side(cell.home, cell.homeScore, cell.homeWon)}
      {side(cell.away, cell.awayScore, cell.awayWon, !cell.live && !cell.bye)}
      {cell.live && (
        <div className="flex items-center justify-end gap-1.5 border-t border-mb-rule px-2 py-0.5">
          <MbBadge tone="live">Live</MbBadge>
        </div>
      )}
      {/* The word the full rail's cell foot carries, so the compact cut of the
          same bracket says the same thing about the same match. */}
      {cell.bye && (
        <div className="mb-kicker border-t border-mb-rule px-2 py-0.5 text-right">
          Bye
        </div>
      )}
    </div>
  );
};

const StatusStat = ({
  icon,
  value,
  label,
  sub,
}: {
  icon: string;
  value: string;
  label: string;
  sub?: string;
}) => (
  <div className="flex items-center gap-3">
    {/* The named 999px, not `rounded-full`'s `calc(infinity * 1px)`. */}
    <span className="mb-icon-disc h-10 w-10">
      <MbIcon id={icon} size={18} />
    </span>
    <div>
      <p className="mb-kicker">{label}</p>
      <p className="matchbook-display text-[1.2rem] mb-track-display font-bold leading-tight tabular-nums">
        {value}
        {/* Inside a `.matchbook-display` paragraph, so this is display type at
            0.72rem/600 — the `display/link` pair. It declares 0.04em rather
            than inheriting 0.02em, because `.mb-panel-link` owns that pair on
            this screen and one pair carries one tracking. */}
        {sub && (
          <span className="ml-2 text-[0.72rem] mb-track-link font-semibold text-mb-ink-muted">
            {sub}
          </span>
        )}
      </p>
    </div>
  </div>
);

/* A draft is not a competition with zeros in it. These two panels are the
   draft's own composition — it has not started, here is what starting will
   build, here is who is entered — and nothing else on the screen repeats
   them. */

const NotStartedPanel = ({ selected }: { selected: MbCompeteSelected }) => (
  <Panel title="Not Started Yet" tone="navy" icon="clock">
    <div className="flex flex-1 flex-col gap-4 p-5">
      <p className="text-[0.85rem] leading-[1.5]">
        {selected.competition.name} has no fixtures. Nothing is scheduled, and no
        result can exist until it is started.
      </p>
      <div className="border-t border-mb-rule pt-3">
        <p className="mb-kicker">Starting will generate</p>
        {/* The same sentence the setup console's own preview prints, from
            `mbDraftSummary` — one arithmetic, so the two screens cannot promise
            different schedules for the same draft. */}
        <p className="mt-1 text-[0.85rem] font-semibold leading-[1.5] tabular-nums">
          {selected.draftSummary}
        </p>
      </div>
      <p className="mt-auto text-[0.78rem] leading-[1.5] text-mb-ink-muted">
        Teams can still be added or removed until then.
      </p>
    </div>
  </Panel>
);

const EntrantsPreviewPanel = ({ selected }: { selected: MbCompeteSelected }) => (
  <Panel
    title="Entrants"
    meta={
      <MbPanelHeadLink
        href={`/competitions/${selected.competition.id}`}
        label="Edit Entrants"
      />
    }
  >
    {selected.entrants.length === 0 ? (
      <PanelEmpty message="No teams are entered yet — add teams before starting the competition." />
    ) : (
      <div className="flex flex-col divide-y divide-mb-rule">
        {selected.entrants.map((team, i) => (
          <div key={`${team.name}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
            {/* The screen's one rank-numeral step, the same 0.78rem/700 the
                standings rank cell and the setup console's entrant list set.
                In a draft the number is the SEED — the entry order every
                bracket generator draws from. */}
            <span className="matchbook-display w-6 shrink-0 text-[0.78rem] mb-track-display font-bold tabular-nums text-mb-ink-muted">
              {i + 1}
            </span>
            <TeamMark team={team} size="md" />
          </div>
        ))}
      </div>
    )}
  </Panel>
);

const MainPanel = ({ selected }: { selected: MbCompeteSelected }) => {
  if (selected.notStarted) {
    return <EntrantsPreviewPanel selected={selected} />;
  }

  if (selected.isElimination) {
    return (
      <Panel
        title="Championship Bracket"
        meta={
          <MbPanelHeadLink
            href={`/competitions/${selected.competition.id}`}
            label="View Full Bracket"
          />
        }
      >
        {selected.bracket.length === 0 ? (
          <PanelEmpty message="No bracket exists yet — start the competition to generate it." />
        ) : (
          <div className="flex flex-1 items-stretch gap-4 overflow-x-auto p-4">
            {selected.bracket.map((round) => (
              <div key={round.label} className="flex flex-col gap-3">
                <p className="mb-kicker tabular-nums">{round.label}</p>
                <div className="flex flex-1 flex-col justify-around gap-3">
                  {round.cells.map((cell, i) => (
                    <BracketBox key={i} cell={cell} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    );
  }

  return (
    <Panel
      title="Standings"
      meta={
        <MbPanelHeadLink
          href={`/competitions/${selected.competition.id}`}
          label="View Full Standings"
        />
      }
    >
      {selected.standings.length === 0 ? (
        <PanelEmpty message="No standings exist yet — play matches to build the table." />
      ) : (
        /* The one standings component, one column order, one legend —
           `compact` keeps the row height this narrow column had. */
        <>
          <MbStandingsTable
            rows={selected.standings}
            caption={`${selected.competition.name} standings`}
            compact
          />
          <MbStandingsLegend />
        </>
      )}
    </Panel>
  );
};

/* One event in the list. The row is a real <button> (keyboard-selectable) and
   its actions collapse into one 48px MbMenu disc, with the destructive item
   toned and named in full. */
const EventRow = ({
  row,
  selected,
  onSelect,
  onOpen,
  onDelete,
}: {
  row: MbCompetitionRow;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onDelete: () => void;
}) => (
  /* `py-1` keeps consecutive rows' 48px menu discs >=8px apart. */
  <div
    className="mb-row-hover grid grid-cols-[1fr_auto_auto] items-center gap-2 py-1 pr-2"
    style={selected ? { boxShadow: "inset 3px 0 0 var(--mb-coral)" } : undefined}
  >
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="mb-btn-touch flex min-w-0 flex-col justify-center px-4 py-2 text-left"
      /* Inline because `.mb-btn-touch`'s 44px floor is unlayered — a Tailwind
         `min-h-14` would never apply. */
      style={{ minHeight: 56 }}
    >
      <span className="matchbook-display truncate text-[0.9rem] mb-track-display font-bold">
        {row.name}
      </span>
      {/* Wraps, never truncates — a meta line is prose. A draft has no
          fixtures, so it prints "not started", never "0/0 matches". */}
      <span className="text-[0.72rem] tabular-nums text-mb-ink-muted">
        {row.typeLabel} • {row.teamCount} teams •{" "}
        {row.status === "draft"
          ? "not started"
          : `${row.completed}/${row.total} matches`}
      </span>
    </button>

    <MbBadge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</MbBadge>

    <MbMenu
      label={`Actions for ${row.name}`}
      items={[
        { label: "Open event", icon: "chevron-right", onSelect: onOpen },
        {
          label: "Delete competition",
          icon: "warning",
          tone: "danger",
          onSelect: onDelete,
        },
      ]}
    />
  </div>
);

/* The zero state: two panels, neither an empty one. `MB_COMPETITION_FORMATS`
   derives from `FORMAT_META`, so the five rows match the wizard's own.
   `TeamsReadyPanel` is the only object here that can be empty. */
const FirstRunConsole = ({
  teams,
  teamCount,
}: {
  teams: MbTeam[];
  teamCount: number;
}) => (
  <div className="mb-enter-grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
    <div className="md:col-span-2 xl:col-span-7">
      <MbLedgerPanel
        title="Competition Formats"
        rows={MB_COMPETITION_FORMATS}
        meta={
          <span className="mb-kicker tabular-nums">
            {MB_COMPETITION_FORMATS.length} Formats
          </span>
        }
      />
    </div>
    <div className="md:col-span-2 xl:col-span-5">
      <TeamsReadyPanel teams={teams} total={teamCount} />
    </div>
  </div>
);

/* ---------------------------------------------------------------------------
   THE POPULATED CONSOLE

   Unchanged from the shipped screen except that it no longer has to answer for
   the case where no competition exists: `selected` is non-null by type here,
   so the four `!selected` branches that printed "No competition exists yet"
   twice and "No bracket exists yet" once are gone rather than merely unvisited.
   --------------------------------------------------------------------------- */
const EventConsole = ({
  rows,
  selectedId,
  selected,
  onSelect,
  onOpen,
  onDelete,
}: {
  rows: MbCompetitionRow[];
  selectedId: string | null;
  selected: MbCompeteSelected;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  /* Arms at two: one mute strip beside four populated panels is what a
     `PanelEmpty` is for. On a full fixture `muteSections` is empty and every
     span resolves to the standard composition. */
  const collapsed = selected.muteSections.length >= 2;
  const kept = (key: MbOverviewSection) =>
    !collapsed || !selected.muteSections.includes(key);

  /* The main panel and Live Courts are the 7+5 pair, the same shape Standings
     and Match of the Day make on the Overview. Withhold the courts and the
     main panel closes the row itself. */
  const mainSpan = kept("live") ? 7 : 8;
  const keptSpans = [
    7,
    5,
    mainSpan,
    kept("live") && 5,
    kept("schedule") && 4,
    kept("results") && 4,
    4,
  ].filter((span): span is number => span !== false);

  return (
  <div className="mb-enter-grid grid grid-cols-1 gap-4 xl:grid-cols-12">
    {/* All events */}
    <div className="xl:col-span-7">
      <Panel
        title="All Events"
        meta={<span className="mb-kicker tabular-nums">{rows.length} Total</span>}
      >
        <div className="flex flex-col divide-y divide-mb-rule">
          {rows.map((row) => (
            <EventRow
              key={row.id}
              row={row}
              selected={row.id === selectedId}
              onSelect={() => onSelect(row.id)}
              onOpen={() => onOpen(row.id)}
              onDelete={() => onDelete(row.id)}
            />
          ))}
        </div>
      </Panel>
    </div>

    {/* Tournament status — or, before there is any, what starting will do. */}
    <div className="xl:col-span-5">
      {selected.notStarted ? (
      <NotStartedPanel selected={selected} />
      ) : (
      <Panel title="Tournament Status" tone="navy" icon="compete">
        <div className="grid flex-1 grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <StatusStat
            icon="check"
            label="Matches Completed"
            value={`${selected.matchesCompleted} / ${selected.matchTotal}`}
            sub={selected.matchTotal > 0 ? `${selected.completionPct}%` : undefined}
          />
          <StatusStat
            icon="teams"
            label="Teams Entered"
            value={String(selected.teamCount)}
          />
          <StatusStat icon="clipboard" label="Format" value={selected.typeLabel} />
          {selected.winner ? (
            <div className="flex items-center gap-3">
              <Crest team={selected.winner} size={36} />
              <div>
                <p className="mb-kicker">Champion</p>
                <p className="matchbook-display text-[1.2rem] mb-track-display font-bold leading-tight">
                  {selected.winner.name}
                </p>
              </div>
            </div>
          ) : (
            <StatusStat
              icon="live"
              label="Live Now"
              value={String(selected.liveCourts.length)}
            />
          )}
        </div>
      </Panel>
      )}
    </div>

    {/* Bracket / standings */}
    <div className={MB_XL_SPAN[mainSpan]}>
      <MainPanel selected={selected} />
    </div>

    {/* Live courts */}
    {kept("live") && (
    <div className="xl:col-span-5">
      <Panel
        title="Live Courts"
        meta={
          <MbPanelHeadLink
            href={`/competitions/${selected.competition.id}`}
            label="View All"
          />
        }
      >
        {selected.liveCourts.length === 0 ? (
          <PanelEmpty message="No live matches exist yet — matches in progress will appear here." />
        ) : (
          <div className="flex flex-col divide-y divide-mb-rule">
            {selected.liveCourts.map((line, i) => (
              <div
                key={i}
                /* The matchup is ONE cell: `MbMatchupPair` gives each team a
                   line from its own container width instead of splitting the
                   row into starving 1fr tracks. `decided={false}` — neither
                   side mutes while live. */
                className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5"
              >
                <p className="matchbook-display border-r border-mb-rule pr-2 text-[0.72rem] mb-track-link font-bold tabular-nums">
                  {line.court}
                </p>
                <MbMatchupPair
                  home={line.home}
                  away={line.away}
                  homeScore={line.homeScore}
                  awayScore={line.awayScore}
                  decided={false}
                />
                <MbBadge tone="live">Live</MbBadge>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
    )}

    {/* Upcoming schedule */}
    {kept("schedule") && (
    <div className="xl:col-span-4">
      <Panel title="Upcoming Schedule">
        {selected.schedule.length === 0 ? (
          <PanelEmpty message="No upcoming matches exist yet." />
        ) : (
          /* Navy edge spine — a timeline axis is structure, not selection;
             same solid-navy edge as `SchedulePanel` on `/`. */
          <div className="ml-3 flex flex-col divide-y divide-mb-rule border-l-[1.5px] border-mb-navy">
            {selected.schedule.map((line, i) => (
              <div
                key={i}
                className="grid grid-cols-[58px_minmax(0,1fr)] items-center gap-2 py-2 pl-3 pr-3"
              >
                {/* `display/status` — 0.66rem/700 at 0.1em, the tracking
                    `.mb-badge` already declares for that pair here. */}
                <p className="matchbook-display text-[0.66rem] mb-track-status font-bold tabular-nums">
                  {line.label}
                </p>
                {/* Equal halves of a cell too narrow for either half is a
                    fair failure, not a fixed one: this row was
                    `basis-0 flex-1` on both names, and at 320 that gave each
                    side 57px and painted "Great… CC" against "Marl… VC" —
                    six and seven characters, under the eight-character floor
                    `NAME_FLOOR` sets, with the two clubs distinguished only
                    by a two-letter suffix. `MbMatchupPair` puts one team per
                    line below its own container's threshold and keeps the
                    single line above it, which is the only shape that gives
                    both names the floor at both widths. `1fr` becomes
                    `minmax(0,1fr)` so the pair is sized by the track rather
                    than the track by the pair. */}
                <MbMatchupPair home={line.home} away={line.away} note="vs" size="sm" />
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
    )}

    {/* Recent results */}
    {kept("results") && (
    <div className="xl:col-span-4">
      <Panel title="Recent Results">
        {selected.recent.length === 0 ? (
          <PanelEmpty message="No results exist yet — finished matches will land here." />
        ) : (
          <div className="flex flex-col divide-y divide-mb-rule">
            {selected.recent.map((line, i) => (
              <div
                key={i}
                /* Same one-cell matchup as the Live Courts row above. */
                className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-1.5 px-3 py-2"
              >
                <p className="matchbook-display text-[0.66rem] mb-track-status font-bold tabular-nums text-mb-ink-muted">
                  {line.label}
                </p>
                {/* `decided` only when the figures differ: `MbMatchLine`
                    carries no winner, so a level result must mute neither
                    side rather than guess one. */}
                <MbMatchupPair
                  home={line.home}
                  away={line.away}
                  homeScore={line.homeScore}
                  awayScore={line.awayScore}
                  homeWon={(line.homeScore ?? 0) > (line.awayScore ?? 0)}
                  awayWon={(line.awayScore ?? 0) > (line.homeScore ?? 0)}
                  decided={line.homeScore !== line.awayScore}
                  size="sm"
                />
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
    )}

    {/* Event details */}
    <div className="xl:col-span-4">
      {/* One primary, one control: the masthead owns `EVENT_ACTION`; this
          panel gets a quiet head link named for the destination, so the two
          cannot read as copies of one button. */}
      <Panel
        title="Event Details"
        meta={
          <MbPanelHeadLink
            href={`/competitions/${selected.competition.id}`}
            label="Open Event"
          />
        }
      >
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            <MbIcon id="calendar" size={18} className="shrink-0 text-mb-navy" />
            <div>
              <p className="mb-kicker">Created</p>
              <p className="text-[0.78rem] font-semibold tabular-nums">
                {selected.createdDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MbIcon id="bracket" size={18} className="shrink-0 text-mb-navy" />
            <div>
              <p className="mb-kicker">Format</p>
              <p className="text-[0.78rem] font-semibold tabular-nums">
                {selected.teamCount} teams • {selected.typeLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MbIcon id="volleyball" size={18} className="shrink-0 text-mb-navy" />
            <div>
              <p className="mb-kicker">Match Format</p>
              <p className="text-[0.78rem] font-semibold tabular-nums">
                {selected.seriesLabel}
              </p>
            </div>
          </div>
        </div>
      </Panel>
    </div>

    {/* The withheld strips as one index, same object and rows the Overview
        uses so the two screens cannot drift apart. */}
    {collapsed && (
      <div className={MB_XL_SPAN[mbClosingSpan(keptSpans)]}>
        <MbLedgerPanel
          title="Still to Come"
          rows={mbContentsFor(selected.muteSections)}
          dense
          wide
        />
      </div>
    )}
  </div>
  );
};

export default function CompetitionsPage() {
  const { isLoading, isAuthenticated } = useRequireAuth();
  const router = useRouter();
  const data = useMatchbookCompete();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (isLoading || !isAuthenticated) {
    return <MbPageLoading active="/competitions" />;
  }

  const selected = data.selected;
  const deleteTarget = data.rows.find((r) => r.id === deleteId);

  return (
    <MatchbookShell
      active="/competitions"
      /* The rail key IS this screen's primary action, so it keeps the coral and
         the masthead's action takes navy — one coral fill. */
      cta={{ href: "/competitions/new", label: "New Competition", icon: "plus" }}
      /* The masthead names the ROUTE, not the selection — a selection-derived
         title duplicates the event's own screen and changes after data
         resolves with no navigation, which also broke the shell's focus
         handling. */
      masthead={{
        title: (
          <>
            Compete<span className="text-mb-coral">.</span>
          </>
        ),
        shortTitle: "Compete",
        subLine: selected ? data.inventory : "No competitions yet",
        /* Navy in both branches — the rail already spends the screen's one
           coral fill on `New Competition`. */
        actions: selected
          ? [
              {
                label: EVENT_ACTION[selected.competition.status].label,
                href: `/competitions/${selected.competition.id}`,
                icon: EVENT_ACTION[selected.competition.status].icon,
                variant: "navy",
              },
            ]
          : [
              {
                label: "Create Your First Competition",
                href: "/competitions/new",
                icon: "plus",
                variant: "navy",
              },
            ],
      }}
    >
      {selected ? (
        <EventConsole
          rows={data.rows}
          selectedId={data.selectedId}
          selected={selected}
          onSelect={data.setSelectedId}
          onOpen={(id) => router.push(`/competitions/${id}`)}
          onDelete={setDeleteId}
        />
      ) : (
        <FirstRunConsole teams={data.teams} teamCount={data.teamCount} />
      )}

      <DeleteConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Competition?"
        description={`This will permanently delete "${deleteTarget?.name ?? ""}" and all of its matches.`}
        onConfirm={() => {
          if (deleteId) data.deleteCompetition(deleteId);
          setDeleteId(null);
        }}
      />
    </MatchbookShell>
  );
}
