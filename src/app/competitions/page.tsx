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

   ------------------------------------------------- and the state just after

   That fixed the screen with NO competition on it. The screen with a competition
   and nothing played had the same disease and reached it sooner, because a
   competition exists here before a match does. Measured at 390px, on the
   competition the wizard has just written:

     created, no schedule   1802px   three empty headlines
     schedule generated     1740px   two
     first match live       1744px   two
     first result           1733px   two

   So `EventConsole` withholds a strip that has nothing to print and names it in
   one index instead, from two upward — the same object, the same rows and the
   same sentences the Overview uses, so the two screens cannot promise "Live
   Courts" in two different sets of words.

   The main panel is deliberately exempt. It is the screen's principal object
   and its empty state names the one thing to do next; capping the screen at
   that single headline is the rubric's anchor, not a compromise with it.

   Populated behaviour is untouched, measured not asserted: on the full fixture
   `muteSections` is empty, so every panel renders as it did in the same
   twelve-column spans, and each keeps its own empty state for the states a real
   competition can still reach. What is gone is seven of them, or three of them,
   being empty at once, for one reason, with no way out of it.
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

/**
 * What the event's own control is CALLED, per state.
 *
 * It was "Manage Event" in all three states and in both places it renders, and
 * the reader's verdict on it was "the primary CTA is the vague MANAGE EVENT …
 * I could not tell how to start my tournament from this screen". A draft, a
 * live event and a finished one need three different things from the organiser
 * — write the fixtures, score them, read them — and a button that names none of
 * them is a button that has to be tried to be understood.
 *
 * One table, ONE call site. It used to have two — the masthead and the Event
 * Details foot — which is how the screen ended up printing the same words, the
 * same glyph and the same destination twice in one viewport; see the note on
 * that panel below.
 */
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

/* ---------------------------------------------------------------------------
   A DRAFT IS NOT A COMPETITION WITH ZEROS IN IT

   Measured on the state a first-time reader actually reaches — one round robin,
   four teams, created and not started — this screen printed:

     TOURNAMENT STATUS   MATCHES COMPLETED 0 / 0 · TEAMS ENTERED 4 ·
                         FORMAT Round Robin · LIVE NOW 0
     STANDINGS           four rows, every one of them
                         `=1 · P0 · W0 · L0 · PF0 · PA0 · PD0 · Pts0`,
                         "No matches played yet" in every Form cell

   Fourteen printed zeros at 390px, thirty at 1440. A completion meter for a
   thing with nothing to complete, and a league table ranking four teams that
   have never played — a table whose whole claim is that the order means
   something. An earlier round of this programme already wrote down the rule ("a
   0-0-0 table is worse than no table at all") and this screen still broke it.

   These two panels are the draft's own composition. Between them they say the
   three true things about a draft — it has not started, here is what starting
   will build, here is who is entered — and nothing else on the screen repeats
   them: the format and the scoring live in Event Details, the roster count
   lives in this panel's own head.
   --------------------------------------------------------------------------- */

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
      /* The rung is `lg` (56), stated inline because `.mb-btn-touch`'s 44px
         floor is unlayered and a Tailwind `min-h-14` would never apply. The
         name line plus a one-line meta sums to 54.88, so without a rung the
         row sat 0.88px under `lg` on every event — a height on no ladder,
         four times per screen. 56 governs now; a meta line that wraps at 320
         still grows the row, which is a content row above the floor (§3.3). */
      style={{ minHeight: 56 }}
    >
      <span className="matchbook-display truncate text-[0.9rem] mb-track-display font-bold">
        {row.name}
      </span>
      {/* `body/2xs`, and it WRAPS. `truncate` cost this line 12px at 390 —
          "Double Elimination • 8 teams • 0/0 matches" lost the word "matches"
          on the width where it is the only description of the event. A meta
          line is prose, not a label, so it takes a second line rather than an
          ellipsis; the row's height already floats on `mb-btn-touch`. */}
      {/* A draft has no fixtures, so it has no ratio: "0/0 matches" is two
          zeros standing in for the one fact that is true about it. Same rule
          the panels below now follow — a number that only exists because the
          shape expects one is not a number. */}
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
}) => {
  /* Arms at two, exactly as the Overview does and for the same reason: one
     mute strip beside four populated panels is what a `PanelEmpty` is for.
     On the full fixture `muteSections` is empty, so every span below resolves
     to the composition that shipped. */
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
                /* THE MATCHUP IS ONE CELL (L1). It was five tracks —
                   `[52px_minmax(0,1fr)_auto_minmax(0,1fr)_auto]` — with a
                   `TeamMark` in each of the two `1fr`s, and at 320 that
                   arithmetic leaves each identity 14.9px: measured on an
                   eight-club roster this row painted

                     [crest] AT  15 – 13  \II [crest]  ● LIVE

                   i.e. "Kingsway Athletic" as AT and "Westhill Wanderers II"
                   as \II, on the panel whose entire job is saying who is
                   playing. Three tracks now, and `MbMatchupPair` gives each
                   team its own line from its OWN container width — the same
                   component and the same cut the Overview's Live Courts panel
                   already uses, so the two screens that name the same object
                   stop disagreeing about how to draw it.

                   `decided={false}`: nothing is settled while the match is
                   live, so neither side is muted as the loser. */
                className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5"
              >
                <p className="matchbook-display border-r border-mb-rule pr-2 text-[0.72rem] mb-track-link font-bold tabular-nums">
                  {line.court}
                </p>
                {/* Navy figures, not coral. A live score in coral measured
                    3.55:1 at 15.2px/700 — and it is the one number on the row
                    a reader must not have to work for. `MbMatchupPair` inks
                    them navy at every emphasis. */}
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
          /* Navy edge spine — the schedule spine came OFF coral's job list
             when the census closed at three jobs; a timeline axis is
             structure, not selection. Same §3.3 solid-navy edge as
             `SchedulePanel` on `/`, so the object keeps one vocabulary
             across routes. (The round label beside it was once a second
             coral as a LETTERFORM — "Round 4" at 10.56px/700, 3.55:1 — it
             stays navy.) */
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
                /* Same one-cell matchup as the Live Courts row above, for the
                   same measurement: at 320 the two `1fr` tracks were 78px
                   each and painted "Bec VC", "Mar VC", "Gre CC" and
                   " Spikers" — five clubs reduced to their suffix, four of
                   them below the floor. */
                className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-1.5 px-3 py-2"
              >
                {/* `display/status`. 0.64rem (10.24px) was between steps
                    and shipped five times on this screen. */}
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
      {/* -------------------------------------------------------------------
          ONE PRIMARY, ONE CONTROL — the list screen's own copy of F2

          This panel's foot carried a filled navy `MbButtonLink` reading
          `EVENT_ACTION[status].label` — the SAME words, the same glyph, the
          same destination and the same tone as the masthead action built from
          the same table 700px above it. On the state a first-time reader
          reaches (one draft, one event) both were in the first viewport at
          once: measured at 1440x900, "SET UP & START" at y=61 and "SET UP &
          START" at y=776. That is the defect the detail screen was cured of —
          "two identical START COMPETITION buttons about 350px apart … one
          primary action deserves one control" — reproduced on the list.

          The masthead keeps it: it is the shell's action slot, it is on screen
          at every width without a scroll, and it is what answers "how do I
          start my tournament from this screen". What the panel gets instead is
          the affordance its four neighbours already use — a head link, quiet,
          named for the destination rather than for the commit, so the two can
          no longer read as two copies of one button.
          ------------------------------------------------------------------- */}
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

    {/* The withheld strips, as one index that closes the last row flush. Same
        object and same rows the Overview uses, so the two screens promise Live
        Courts, Upcoming Schedule and Recent Results in one sentence each rather
        than in two sets of words that can drift apart. */}
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
      /* -------------------------------------------------------------------
         THE MASTHEAD NAMES THE ROUTE, NOT THE SELECTION

         It used to take its `<h1>`, its status badge and its sub-line from
         whichever event happened to be selected, so a reader who had created
         exactly one competition arrived at a list screen whose masthead read
         "THURSDAY LEAGUE / DRAFT" — the same lockup the competition's OWN
         screen carries one tap away. Their words: "the list page adopts my
         competition's name as its masthead". Two routes, one title, and the
         only difference between them 400px down the page.

         `AppShell` had already paid for this once from the other direction: its
         focus effect notes that `shortTitle` "on `/competitions` is the SELECTED
         EVENT'S NAME and therefore changes once, after the data resolves, with
         no navigation at all", which used to land the route at scrollY 57 with
         its own `<h1>` behind the mobile strip. A literal removes the cause
         rather than the symptom.

         So: the title is the console's, in both branches; the sub-line is the
         account's own ledger ("6 events • 2 live • 1 draft • 3 final") rather
         than the selection's numbers, which the panels below already print; and
         the status badge is gone, because a `DRAFT` chip beside the word
         "Compete." describes something the reader cannot see from there.
         ------------------------------------------------------------------- */
      masthead={{
        title: (
          <>
            Compete<span className="text-mb-coral">.</span>
          </>
        ),
        shortTitle: "Compete",
        subLine: selected ? data.inventory : "No competitions yet",
        /* Navy in both branches, because the rail already spends the screen's
           one coral fill on `New Competition` (invariant 15). The populated
           branch names what the destination is FOR in this state — see
           `EVENT_ACTION` — instead of the one word "Manage" that covered
           writing a schedule, scoring a live event and reading a finished one. */
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
