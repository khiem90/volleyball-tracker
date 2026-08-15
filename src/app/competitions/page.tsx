"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { DeleteConfirmDialog } from "@/components/shared";
import { MatchbookShell } from "@/components/matchbook/AppShell";
import { MbPageLoading } from "@/components/matchbook/Loading";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { MbBadge, type MbBadgeTone } from "@/components/matchbook/Badge";
import { MbButtonLink } from "@/components/matchbook/Button";
import { MbMenu } from "@/components/matchbook/Menu";
import { Crest, Panel, PanelEmpty, TeamMark } from "@/components/matchbook/Panel";
import {
  MB_COMPETITION_FORMATS,
  MbLedgerPanel,
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

/* ===========================================================================
   COMPETE CONSOLE

   Three defects the critics measured here, all of them the same mistake:
   a status was being carried by a hue on a letterform.

     "Draft"  --mb-gold  10.56px/700  2.15:1   (floor 4.5)
     "Live"   --mb-red   14.4px/700   4.20:1
     "Final"  --mb-green 14.4px/700   3.93:1

   The fix is not three darker hexes — it is `MbBadge`, which already solved
   this: the letterforms are navy (11.79:1 on paper, 12.84:1 in a panel) and
   the tone rides a MARK instead, one shape per tone, so the status survives a
   greyscale capture as well as the contrast floor. The local STATUS_STYLES
   table is gone; a status is a badge tone now, in one place.

   -------------------------------------------- the screen with nothing on it

   Measured on a brand-new account at 390px, this route was 4551px of paper
   carrying SEVEN panels that each said the same thing in a different noun:

     All Events            "No competitions exist yet"      button
     Tournament Status     "No competition exists yet"      no button
     Championship Bracket  "No bracket exists yet"          button
     Live Courts           "No live matches exist yet"      no button
     Upcoming Schedule     "No upcoming matches exist yet"  no button
     Recent Results        "No results exist yet"           no button
     Event Details         "No competition exists yet"      no button

   Seven `display/stat-sm` headlines of identical size and weight; "no
   competition exists yet" printed TWICE and separated from the third by an
   invisible plural; four of the seven with nothing to press, while the
   identically-named panels on `/` all offered an action. And the masthead — on
   the screen whose entire job is creating a competition — carried ZERO
   buttons. The create action hid as a 121px outline button inside two panel
   bodies. The rail's coral CTA is that action too, but the rail is not
   rendered below `lg`, so on a phone the only way in was 400px down the page.

   `EventConsole` and `FirstRunConsole` below are the two compositions this
   screen actually has. The empty one is not the populated one with the data
   removed: two panels, both with something true to say — the five formats the
   reader is about to choose between, and the teams already on the books, which
   is the one fact that decides whether the wizard has anything to schedule —
   and ONE action, in the masthead, where a thumb reaches first.

   Populated behaviour is untouched. Every panel renders as it did, in the same
   twelve-column spans, and each keeps its own empty state for the states it
   can still reach on a real competition: a draft has no fixtures generated, a
   finished event has no live courts. What is gone is all seven of them being
   empty at once, for one reason, with no way out of it.
   =========================================================================== */

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
            className={`matchbook-display min-w-0 flex-1 text-[0.72rem] tracking-[0.04em] ${won ? "font-bold" : "font-semibold text-mb-ink-muted"}`}
          />
        </>
      ) : (
        /* Two words for two states, matching `BracketRail`'s cell and
           `MbMatchRow` exactly: "TBD" is a slot awaiting a winner, "—" is a
           side that does not exist because the other team had a bye (F12). */
        <span className="matchbook-display flex-1 text-[0.72rem] tracking-[0.04em] text-mb-ink-muted">
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
          className={`matchbook-display text-[0.82rem] tabular-nums ${won ? "font-bold" : "font-semibold text-mb-ink-muted"}`}
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
        <div className="flex items-center justify-end gap-1 border-t border-mb-rule px-2 py-0.5">
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
      <p className="matchbook-display text-[1.2rem] font-bold leading-tight tabular-nums">
        {value}
        {/* Inside a `.matchbook-display` paragraph, so this is display type at
            0.72rem/600 — the `display/link` pair. It declares 0.04em rather
            than inheriting 0.02em, because `.mb-panel-link` owns that pair on
            this screen and one pair carries one tracking. */}
        {sub && (
          <span className="ml-2 text-[0.72rem] font-semibold tracking-[0.04em] text-mb-ink-muted">
            {sub}
          </span>
        )}
      </p>
    </div>
  </div>
);

const MainPanel = ({ selected }: { selected: MbCompeteSelected }) => {
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
          <div className="flex flex-1 items-stretch gap-5 overflow-x-auto p-4">
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
        /* This was the app's fourth standings table and its only one ranked by
           a measure it did not print: `W L Pct PF PA PD`, no Pts, no Form, no
           legend, rank read off the map index. Measured against the SAME
           league on `/competitions/s-rr-28`, it showed two teams on `.667` and
           three on `.500` in an order the detail screen explained with 13/12
           and 10/10/9 competition points — so a reader who saw both screens
           could not reconcile them (F14). It is the one component now, with
           the one column order and the legend that names every abbreviation.
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

/**
 * One event in the list. Rebuilt around three findings on the shipped row:
 *
 *   - the row was a `<div onClick>`, so selecting an event was impossible from
 *     a keyboard (HF-15). It is a `<button>` now, and the whole name block is
 *     its label.
 *   - `Open` measured 40.5 x 44 and the delete key 14 x 14 — two of the twelve
 *     sub-44 targets `audit.mjs` counted on this route (HF-2).
 *   - the delete key sat 12px from `Open`, the highest-frequency control in the
 *     row (HF-14).
 *
 * All three answer to the same move: the row's own actions collapse into one
 * 48px `MbMenu` disc, where Open and Delete are menu items with room between
 * them and the destructive one is toned and named in full.
 */
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
  /* `py-1` is measured, not decorative. Without it the row is 55.4px, the 48px
     menu disc fills all but 7.4px of it, and consecutive discs land under the
     8px separation floor — six stacked 48px targets with 7px between them is
     the mis-tap the floor exists to prevent. */
  <div
    className="mb-row-hover grid grid-cols-[1fr_auto_auto] items-center gap-2 py-1 pr-2"
    style={selected ? { boxShadow: "inset 3px 0 0 var(--mb-coral)" } : undefined}
  >
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="mb-btn-touch flex min-w-0 flex-col justify-center px-4 py-2 text-left"
    >
      <span className="matchbook-display truncate text-[0.9rem] font-bold">
        {row.name}
      </span>
      {/* `body/2xs`, and it WRAPS. `truncate` cost this line 12px at 390 —
          "Double Elimination • 8 teams • 0/0 matches" lost the word "matches"
          on the width where it is the only description of the event. A meta
          line is prose, not a label, so it takes a second line rather than an
          ellipsis; the row's height already floats on `mb-btn-touch`. */}
      <span className="text-[0.72rem] tabular-nums text-mb-ink-muted">
        {row.typeLabel} • {row.teamCount} teams • {row.completed}/{row.total} matches
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

/* ---------------------------------------------------------------------------
   THE ZERO STATE

   Two panels, and neither of them is an empty one. `MB_COMPETITION_FORMATS` is
   derived from `FORMAT_META`, so the five rows are the same five the wizard
   itself offers, with the same blurbs and the same contained accents.

   `TeamsReadyPanel` is the only object on the screen that CAN be empty, and on
   a brand-new account it is — one `PanelEmpty`, with an action, which is
   invariant 25 doing its job rather than seven of them shouting in unison.
   The wizard quick-adds teams as you go, so this is a head start and not a
   gate; the copy says so, and the masthead action stays performable either
   way.
   --------------------------------------------------------------------------- */
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
}) => (
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

    {/* Tournament status */}
    <div className="xl:col-span-5">
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
                <p className="matchbook-display text-[1.2rem] font-bold leading-tight">
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
    </div>

    {/* Bracket / standings */}
    <div className="xl:col-span-7">
      <MainPanel selected={selected} />
    </div>

    {/* Live courts */}
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
                /* NO `justify-self`, and `minmax(0,1fr)` on the name
                   tracks. A grid item with `justify-self` other than
                   `stretch` is sized by its MAX-CONTENT, which is the
                   whole name whatever the ellipsis does — `text-overflow`
                   paints, it does not reduce an intrinsic contribution.
                   Measured on the stress fixture at 320: this mark
                   reported 291px inside a 320px viewport and pushed
                   `body.scrollWidth` 50px past the document. `reverse` is
                   what puts the away mark against the right edge; it
                   never needed `justify-self` to do it. */
                className="grid grid-cols-[52px_minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5"
              >
                <p className="matchbook-display border-r border-mb-rule pr-2 text-[0.72rem] font-bold tracking-[0.04em] tabular-nums">
                  {line.court}
                </p>
                <TeamMark team={line.home} />
                {/* Navy. A live score in coral measured 3.55:1 at
                    15.2px/700 — and it is the one number on the row a
                    reader must not have to work for. */}
                <span className="matchbook-display whitespace-nowrap text-[0.95rem] font-bold tracking-[0.05em] tabular-nums">
                  {line.homeScore} – {line.awayScore}
                </span>
                <TeamMark team={line.away} reverse />
                <MbBadge tone="live">Live</MbBadge>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>

    {/* Upcoming schedule */}
    <div className="xl:col-span-4">
      <Panel title="Upcoming Schedule">
        {selected.schedule.length === 0 ? (
          <PanelEmpty message="No upcoming matches exist yet." />
        ) : (
          /* The coral on this list is the 2px spine (job 4). The round
             label beside it was a second coral as a LETTERFORM — "Round 4"
             at 10.56px/700, 3.55:1 — so it takes navy. */
          <div className="ml-3 flex flex-col divide-y divide-mb-rule border-l-2 border-mb-coral">
            {selected.schedule.map((line, i) => (
              <div
                key={i}
                className="grid grid-cols-[58px_1fr] items-center gap-2 py-2 pl-3 pr-3"
              >
                {/* `display/status` — 0.66rem/700 at 0.1em, the tracking
                    `.mb-badge` already declares for that pair here. */}
                <p className="matchbook-display text-[0.66rem] font-bold tracking-[0.1em] tabular-nums">
                  {line.label}
                </p>
                {/* `basis-0 flex-1` and `MbTeamName` on both sides. As
                    authored, flex shrink is proportional to base size, so
                    at 1440 "Wolverhampton Wanderers Athletic Club B" held
                    181px and "Apex" opposite it was cut to 19px; and the
                    181px it did hold end-truncated to the same string as
                    the "…Club C" row above it (F15). Equal halves, and the
                    last token survives inside each half. */}
                <div className="flex min-w-0 items-center gap-1.5">
                  <Crest team={line.home} size={18} />
                  <MbTeamName
                    name={line.home.name}
                    className="matchbook-display basis-0 flex-1 text-[0.72rem] font-semibold tracking-[0.04em]"
                  />
                  <span className="text-[0.6rem] text-mb-ink-muted">vs</span>
                  <Crest team={line.away} size={18} />
                  <MbTeamName
                    name={line.away.name}
                    className="matchbook-display basis-0 flex-1 text-[0.72rem] font-semibold tracking-[0.04em]"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>

    {/* Recent results */}
    <div className="xl:col-span-4">
      <Panel title="Recent Results">
        {selected.recent.length === 0 ? (
          <PanelEmpty message="No results exist yet — finished matches will land here." />
        ) : (
          <div className="flex flex-col divide-y divide-mb-rule">
            {selected.recent.map((line, i) => (
              <div
                key={i}
                /* Same `justify-self` / `minmax(0,1fr)` correction as the
                   Live Courts row above. */
                className="grid grid-cols-[44px_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 px-3 py-2"
              >
                {/* `display/status`. 0.64rem (10.24px) was between steps
                    and shipped five times on this screen. */}
                <p className="matchbook-display text-[0.66rem] font-bold tracking-[0.1em] tabular-nums text-mb-ink-muted">
                  {line.label}
                </p>
                <TeamMark team={line.home} size={18} />
                <span className="matchbook-display whitespace-nowrap text-[0.85rem] font-bold tabular-nums">
                  {line.homeScore} – {line.awayScore}
                </span>
                <TeamMark team={line.away} size={18} reverse />
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>

    {/* Event details */}
    <div className="xl:col-span-4">
      <Panel title="Event Details">
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
          {/* Navy: this is the masthead's "Manage Event" a second time,
              and the screen's one coral is already spent on the rail. */}
          <MbButtonLink
            href={`/competitions/${selected.competition.id}`}
            variant="navy"
            icon="compete"
            fullWidth
            className="mt-auto"
          >
            Manage Event
          </MbButtonLink>
        </div>
      </Panel>
    </div>
  </div>
);

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
      masthead={{
        title: selected ? (
          selected.competition.name
        ) : (
          <>
            Compete<span className="text-mb-coral">.</span>
          </>
        ),
        shortTitle: selected?.competition.name ?? "Compete",
        status: selected ? (
          <MbBadge
            tone={STATUS_TONE[selected.competition.status]}
            variant="framed"
            size="md"
          >
            {STATUS_LABEL[selected.competition.status]}
          </MbBadge>
        ) : undefined,
        subLine: selected
          ? `${selected.teamCount} Teams • ${selected.matchTotal} Matches${
              selected.courtCount ? ` • ${selected.courtCount} Courts` : ""
            }`
          : "No competitions yet",
        /* Navy in both branches, because the rail already spends the screen's
           one coral fill on this same destination (invariant 15). What changed
           is that the empty branch HAS an action at all: it was `[]`, on the
           screen whose whole job is creating a competition, and the rail that
           was standing in for it is not rendered below `lg`. */
        actions: selected
          ? [
              {
                label: "Manage Event",
                href: `/competitions/${selected.competition.id}`,
                icon: "settings",
                tone: "navy",
              },
            ]
          : [
              {
                label: "Create Your First Competition",
                href: "/competitions/new",
                icon: "plus",
                tone: "navy",
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
