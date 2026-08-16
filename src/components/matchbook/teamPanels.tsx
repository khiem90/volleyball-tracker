import Link from "next/link";
import { teamColorCss, teamColorHex, teamColorName } from "@/lib/teamColor";
import { MbIcon } from "./MbIcon";
import { MbButton, MbButtonLink } from "./Button";
import { MbMatchupPair } from "./MatchRow";
import { MbPanelHeadLink, type MbLedgerRow } from "./panels";
import { MbTableScroll } from "./TableScroll";
import { Crest, FormLetters, Panel, PanelEmpty, TeamMark } from "./Panel";
import { MbTeamName } from "./TeamName";
import {
  readinessColor,
  readinessInk,
  type MbReadinessState,
} from "./teamStats";
import type {
  MbFormRow,
  MbReadinessRow,
  MbScheduleItem,
  MbStatTotal,
  MbTeamRow,
} from "./types";

/**
 * A readiness line that can say it has not played.
 *
 * `MbReadinessRow.status` is the three-word verdict union in `types.ts`, which
 * charter H3 reserves to W1, so the fourth state is declared here beside the
 * panel that renders it. `/`'s `ReadinessPanel` keeps the narrow row untouched.
 */
export interface MbTeamReadinessRow extends Omit<MbReadinessRow, "status"> {
  /** Completed, non-bye matches. `0` is what makes the row NEW rather than 0%. */
  played: number;
  status: MbReadinessState;
}

/**
 * The two panels on `/teams` that can have nothing to print once at least one
 * team exists.
 *
 * The other four cannot, and a closed union is how that is stated rather than
 * assumed: the Directory is the screen's principal object and always holds the
 * team just added, Club Snapshot always has three figures, Team Profile always
 * has the selected row, and Team Readiness has a line per team. With zero teams
 * all six are mute, which is not a sparse screen but a different one.
 *
 * Declared beside the panels for the same reason `MbOverviewSection` is: a row
 * in the index and a panel in the grid are the same promise written once each,
 * and the file that owns one owns the other.
 */
export type MbTeamsSection = "fixtures" | "form";

const SNAPSHOT_ICONS: Record<string, string> = {
  Wins: "compete",
  Teams: "teams",
  Matches: "volleyball",
};

/**
 * `--mb-green` measured 4.28:1 as a 10.56px/700 letterform on
 * `--mb-paper-bright` — under the 4.5:1 floor. `--mb-green-ink` is the twin
 * `globals.css` declares for precisely this and measures 5.13:1. The word
 * ACTIVE/INACTIVE is itself the second channel, so nothing is carried by hue
 * alone either way.
 */
const statusInk = (status: MbTeamRow["status"]) =>
  status === "ACTIVE" ? "var(--mb-green-ink)" : "var(--mb-ink-muted)";

/** See `panels.tsx` — the rank column's figures must not reflow (HF-13). */
const RANK_CELL = "matchbook-display text-center font-bold tabular-nums";

/* ---------------------------------------------------------------------------
   THE DIRECTORY'S MOBILE COLUMN SET

   Eight columns do not fit a phone, and this table was not merely scrolling
   inside `MbTableScroll` — it was widening the DOCUMENT. Measured at 390 with
   the fixture, on load, `body.scrollWidth` against a 390 `clientWidth`:

     table 602.4 (as shipped)                        → document 612  ✗
     table 591.4 (the pre-P5 11px square footprint)  → document 601  ✗
     table 562.8 (form run deleted outright)         → document 390  ✓
     table 356   (Entered In + Next Match dropped)   → document 390  ✓

   So the failure predates the form guide — the old squares overflowed by
   +211px — and no width the form column could plausibly take would clear it:
   the run is 11px of a 212px excess. What clears it is the two widest columns
   not being drawn on a phone at all. `Entered In` holds a competition name and
   `Next Match` a date, an opponent and a kick-off line; together they are 246px
   of the 602.

   They are not deleted, they ride the team cell as one `.mb-kicker` line — the
   same route `MbStandingsTable` gives P / PF / PA / PD, down to the class. W,
   L, PF–PA and the form guide all stay at every width, because those are what
   the directory is read FOR.
   --------------------------------------------------------------------------- */
/* ---------------------------------------------------------------------------
   AND THE SAME COLUMNS AT DESKTOP (L3)

   `md:` was the wrong axis. This table lives in a twelve-column grid cell, so
   its scrollport does not track the viewport: measured with an eight-club
   roster, the table is 847px wide at EVERY width, and the box it is given is

     834   784   overflow +63
     1024  740   overflow +107
     1440  667   overflow +180
     1366  624   overflow +223      the WORST case is the second-widest screen

   `MbTableScroll` absorbs that as horizontal scroll, and the last two columns
   before the edge are `Next Match` (249px) and the tail of `Team` — so at 1366
   and 1440 the opponent name was cut by the SCROLLPORT rather than by its own
   box. A scrollport cut carries no ellipsis, lands mid-word, and is invisible:
   5 of 8 rows cut mid-word at 1440, and "Westhill Wanderers" and "Westhill
   Wanderers II" both painted "Westhill Wand" — two teams, one string, with the
   characters that separate them 74px past an edge most readers never move.

   So the two widest columns are revealed at the width where they FIT, and the
   width that decides is the panel's own. 465px is the table without them; each
   threshold is that plus the columns up to it, measured, not estimated:

     Entered In (133)   598
     Next Match (249)   847

   Below each, the value is not lost — it rides the team cell as a kicker line,
   which is the route this file already built for the phone and which needs no
   scroller and no accordion. What changes is that the route is now taken
   whenever the column would not fit, instead of only under 768px.
   --------------------------------------------------------------------------- */
const REVEAL_ENTERED = "hidden @min-[598px]:table-cell";
const REVEAL_NEXT = "hidden @min-[847px]:table-cell";

/** The kicker line's mirror of each: shown exactly when its column is not. */
const DIGEST_ENTERED = "@min-[598px]:hidden";
const DIGEST_NEXT = "@min-[847px]:hidden";

/**
 * One hidden column as one line. Reads "Summer League +4" or "Jul 31 vs Tide",
 * and is `null` — so nothing is rendered at all, rather than an empty kicker —
 * when the team has no competition or no fixture.
 *
 * Two calls rather than one joined string, because the two columns no longer
 * disappear together: at 1366 `Entered In` is drawn and `Next Match` is not.
 */
const enteredDigest = (row: MbTeamRow): string | null =>
  row.competitions.length === 0
    ? null
    : row.competitions[0] +
      (row.competitions.length > 1 ? ` +${row.competitions.length - 1}` : "");

const nextDigest = (row: MbTeamRow): string | null =>
  row.nextMatch
    ? `${row.nextMatch.date} ${row.nextMatch.isHome ? "vs" : "@"} ${row.nextMatch.opponent.name}`
    : null;

/* ---------------------------------------------------------------------------
   THE NAME COLUMN'S CEILING (G18)

   `MbTeamName` can only move the ellipsis into the middle of a name if
   something first decides the name has to be elided. In a `table-layout: auto`
   table nothing does: the Team column takes its max-content width, the table
   grows to whatever the longest name needs, and `MbTableScroll` absorbs the
   excess as horizontal scroll. So the elision never fires and the READER never
   sees the part that separates one team from another.

   Measured at 320 with `fixture-long.json`, before this cap:

     directory  table 559px in a 286px scrollport, Team column 312.81px
                name box 264.81, head box 253 of 253 content — NOT truncated
                painted at rest: "Wolverhampton Wanderers Athletic Club"
                                 "Wolverhampton Wanderers Athletic Club"
     readiness  table 524.44px in 286px, Team column 292.08px, raw {name}
                with no `MbTeamName` at all

   Two different teams, byte-identical on screen, with the "B"/"C" that tells
   them apart parked off the right edge of a scroller most readers never move.
   That is the same information failure `TeamName.tsx` was written for, arriving
   through the one door it cannot close by itself.

   The ceiling is `min(13rem, 50vw)` rather than a flat rem so the constraint
   tracks the thing that actually binds — the VIEWPORT, not the table. At 320
   it yields 160px, which leaves the whole column inside the 286px scrollport
   (24px rank + 160 = 184) and paints "Wolverhamp… B"; at >=416 it settles at
   208px and stops one pathological name dragging the table 50px wider for
   every other row.

   IT GOES ON THE CONTENT, NEVER ON THE `<td>`. Written as `<td className=
   {NAME_COL}>` it is not a ceiling at all: Blink feeds a cell's `max-width`
   into auto table layout as the column's PREFERRED width, so the column
   inflates UP to the cap even when the longest name in it is "Peak". Measured
   at 390 with the shipped fixture, cap on the cell:

     Team column 195px (= 50vw) for a 30px name, table 432.95px,
     document.scrollWidth 443 vs clientWidth 390  → +53px

   and that +53 is not confined to the panel, because under mobile emulation a
   horizontal overflow widens the LAYOUT VIEWPORT, which the `inset-x-0` fixed
   bottom nav then stretches to — the nav measured 443px wide with body at 390.
   One `max-width` in a table cell moved the app's whole navigation off-screen.

   On a block inside the cell the same value behaves as intended, because an
   element's max-content CONTRIBUTION is clamped by its own max-width: "Peak"
   contributes 30px, "Wolverhampton Wanderers Athletic Club B" contributes 195.
   After the move, same viewport and fixture: Team column 90.36px, table
   289.95px, document 390 vs 390.
   --------------------------------------------------------------------------- */
const NAME_COL = "max-w-[min(13rem,50vw)]";

/* ----------------------------- Team directory ----------------------------- */

export const TeamDirectoryPanel = ({
  rows,
  totalTeams,
  selectedId,
  onSelect,
  search,
  onSearchChange,
}: {
  rows: MbTeamRow[];
  totalTeams: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
}) => (
  <Panel
    title="Team Directory"
    meta={
      totalTeams > 0 ? (
        /* The `<input>` measured 144 x 18.7 at 390px — the shell's 0.25rem
           padding was the whole of its height and the target was the wrapper,
           not the field. `py-0!` hands the interior to the input and
           `self-stretch` makes it take all of it, which is the same fix
           `MbTextInput` applies to `.mb-input`; `min-h-11` on the shell sets
           the 44px floor. Written here rather than in `.mb-search` because the
           class is W1's. `text-base!` below `md` is the iOS zoom floor: Safari
           zooms the viewport on focus for anything under 16px, which is a
           layout shift the reader did not ask for.

           No rung is spelled here any more. This call site used to carry
           `min-h-12`, on the reasoning that `.mb-search` is a FRAME which
           spends `--mb-rule-edge` twice and so needed a 48px shell to leave the
           `<input>` a 44px interior. Both halves of that are now false, and the
           class was INERT besides: `.mb-search` is unlayered, Tailwind's
           utilities live in `@layer utilities`, and an unlayered declaration
           beats every layered one — so `min-height: 44px` from the class won
           and `min-h-12` never rendered. Measured at 390 and at 1440 with it
           still written here: label 44, input 44.

           It is also no longer needed, because G21 stopped charging the
           interior for the frame (see THE FRAMED FIELD'S OWN HEIGHT in
           `globals.css`): the stretched `<input>` now resolves to the shell's
           border-box height rather than `rung − 2px`, which is what took this
           field off the 46px non-rung. The rung lives in the class. */
        <label className="mb-search py-0!">
          <MbIcon id="search" size={13} className="shrink-0 text-mb-ink-muted" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Filter teams"
            aria-label="Filter teams by name"
            className="self-stretch text-base! md:text-[0.78rem]!"
          />
        </label>
      ) : undefined
    }
  >
    {totalTeams === 0 ? (
      <PanelEmpty message="No teams exist yet — add your first team to start the directory." />
    ) : rows.length === 0 ? (
      <PanelEmpty message={`No teams match “${search}”.`} />
    ) : (
      /* The container for `REVEAL_ENTERED` / `REVEAL_NEXT`. It wraps the
         SCROLLER rather than sitting on it: an `@container` query styles a
         container's descendants and never the container itself, and the box
         worth measuring is the width the panel gives the table, not the
         `scrollWidth` the table then asks for. */
      <div className="@container flex flex-1 flex-col">
      <MbTableScroll>
        <table className="mb-table w-full border-collapse">
          <thead>
            <tr>
              {/* EVERY ALIGNMENT HERE CARRIES A `!`, AND HAS TO (D4).

                  `.mb-table th { text-align: left }` is an unlayered rule at
                  0,1,1; a Tailwind `text-center`/`text-right` utility is 0,1,0
                  inside `@layer utilities`. It loses twice over — on layer and
                  on specificity — so every one of these headers was painting
                  LEFT while the column beneath it painted centre or right.
                  Measured at 390 with the shipped fixture, before:

                    #       head ink 25.0–31.8   value ink 30.2–35.8
                    L       head ink 191.3–197.2 value ink 191.3–199.4
                    PF–PA   head ink 215.4–248.9 value ink 215.4–271.0
                    Status  head ink 287.0–325.4 value ink 334.0–365.0

                  The last is the one the walker caught: 47px between the start
                  of the word and the start of the figure it labels, inside a
                  94px column — the header is not over its own column. Same
                  trap as `.mb-search` and `MB_FIELD_LABEL`, both already
                  documented in this file and in `form.tsx`. */}
              <th className="w-8 text-center!">#</th>
              <th>Team</th>
              <th className={REVEAL_ENTERED}>Entered In</th>
              <th className="text-center!">W</th>
              <th className="text-center!">L</th>
              {/* Was "Pts" over `${pointsFor}–${pointsAgainst}`. On `/` the
                  same header means the ranking total, so one word meant two
                  quantities across two screens. See the note in
                  `panels.tsx`.

                  `whitespace-nowrap` because an en dash is a BREAK OPPORTUNITY:
                  at 390px this header wrapped to "PF–" over "PA", which is not
                  a two-line header — it is two half-tokens, and the second one
                  reads as a column of its own. The `<td>` under it has carried
                  `whitespace-nowrap` all along, so the column's width is set by
                  the widest `123–98` beneath and this adds none. */}
              <th className="text-center! whitespace-nowrap">PF–PA</th>
              <th className={REVEAL_NEXT}>Next Match</th>
              {/* TWO VALUES, TWO NAMES.

                  This cell holds the status word and, 22px under it, the last
                  five results — one column, one header, and a team that has not
                  played showing a bare "—" that nothing on the screen accounts
                  for. A reader cannot tell whether the dash is a missing status,
                  a missing figure, or a rendering fault.

                  Splitting the column is what it looks like it wants and is
                  wrong at 390: the run reserves 78px (`slots={5}`) and a second
                  cell's padding is 16px more, which takes the table from 356 to
                  ~416 in a 390 viewport — the overflow this file spent its
                  breakpoint budget removing. So the HEADER splits instead. Each
                  line names the value directly beneath it, the column keeps its
                  94px, and the dash becomes what it always meant: no results in
                  the last five. `FormLetters` already says the same thing to a
                  screen reader ("No matches played yet"). */}
              <th className="text-right!">
                <span className="block">Status</span>
                <span className="block">Last 5</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const selected = row.id === selectedId;
              return (
                /* `onClick` on the `<tr>` is a MOUSE CONVENIENCE, not the
                   control. It used to be the only way to select a team, which
                   is HF-15 — a control unreachable by tab — and it is why the
                   real control is now the `<button>` in the Team cell: the
                   table keeps its table semantics (a `role="button"` row would
                   have cost every screen-reader user the column headers) and
                   the keyboard gets a named, focusable, 44px target that does
                   the same thing. `aria-current` still marks the chosen row. */
                <tr
                  key={row.id}
                  onClick={() => onSelect(row.id)}
                  className="mb-row-hover cursor-pointer"
                  aria-current={selected}
                >
                  {/* `.mb-rail`, not a hand-written `inset 3px 0 0` (G24).

                      Coral's job 2 — THE SELECTION RAIL — is declared in
                      `globals.css` against a named class that already spells
                      the 3px accent tier (`--mb-rule-accent`) and already takes
                      a per-row colour through `--mb-rail-color`. This cell
                      re-typed the whole shadow instead, which put the accent
                      width and the coral literal in a JSX style object where no
                      radius/rule census can see them, and made the leading-team
                      teal a second hand-written shadow rather than the hook the
                      class provides. Painted result is unchanged: `.mb-rail`
                      resolves to the same `inset 3px 0 0` in the same two
                      colours. Seven more sites still carry the inline spelling
                      — listed in the return; none of them is this agent's. */}
                  <td
                    className={`${RANK_CELL} ${selected || i === 0 ? "mb-rail" : ""}`}
                    style={
                      i === 0 && !selected
                        ? ({ "--mb-rail-color": "var(--mb-teal)" } as React.CSSProperties)
                        : undefined
                    }
                  >
                    {i + 1}
                  </td>
                  <td>
                    {/* The ceiling rides this wrapper, not the `<td>` — see
                        THE NAME COLUMN'S CEILING above for the 443px document
                        that the `<td>` spelling produced. */}
                    <span className={`block ${NAME_COL}`}>
                      <button
                        type="button"
                        onClick={() => onSelect(row.id)}
                        aria-pressed={selected}
                        /* `min-w-0` is what carries the cap INTO the mark: a
                           flex item's floor is its min-content width until you
                           say otherwise, so without it the button would simply
                           overflow the capped wrapper and nothing would
                           elide. */
                        className="mb-btn-touch flex w-full min-w-0 items-center rounded-[3px] text-left"
                      >
                        <TeamMark team={row.team} />
                      </button>
                      {/* The route to the two columns the breakpoints take
                          away. They ride the team cell rather than needing a
                          scroller or an accordion, which is the same answer
                          `MbStandingsTable` gives for P / PF / PA / PD. Outside
                          the `<button>` on purpose: the control's accessible
                          name stays the team, not the team plus its next
                          fixture.

                          It WRAPS, and must keep wrapping. `truncate` was tried
                          here and is a trap: `white-space: nowrap` raises this
                          cell's MIN-content width from one word to the whole
                          digest, and a table column can never be narrower than
                          its min-content. Measured at 390 with the shipped
                          fixture — table 356 → 448.95, Team column 109.64 →
                          211, document 390 → 443. A ceiling on the max-content
                          side cannot undo a floor raised on the min-content
                          side.

                          Two lines, not one joined string: the columns they
                          stand in for no longer vanish together, so each has to
                          be able to appear without the other (see the note on
                          `REVEAL_ENTERED`). */}
                      {enteredDigest(row) && (
                        <span
                          className={`mb-kicker mt-0.5 block tabular-nums ${DIGEST_ENTERED}`}
                        >
                          {enteredDigest(row)}
                        </span>
                      )}
                      {nextDigest(row) && (
                        <span
                          className={`mb-kicker mt-0.5 block tabular-nums ${DIGEST_NEXT}`}
                        >
                          {nextDigest(row)}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className={`text-[0.78rem] text-mb-ink-muted ${REVEAL_ENTERED}`}>
                    {row.competitions.length === 0 ? (
                      <span className="text-mb-ink-muted/70">No competition</span>
                    ) : (
                      <span className="whitespace-nowrap tabular-nums">
                        {row.competitions[0]}
                        {row.competitions.length > 1 && ` +${row.competitions.length - 1}`}
                      </span>
                    )}
                  </td>
                  <td className="text-center tabular-nums">{row.won}</td>
                  <td className="text-center tabular-nums">{row.lost}</td>
                  <td className="text-center tabular-nums whitespace-nowrap">
                    {row.played === 0 ? "—" : `${row.pointsFor}–${row.pointsAgainst}`}
                  </td>
                  {/* THE OTHER NAME IN THIS TABLE (R3).

                      The Team column has had `MbTeamName` and `NAME_COL` since
                      G18. This column holds a team name too — the opponent —
                      and it had neither, which is the same information failure
                      one column to the right. It was a raw `<span>` inside a
                      `whitespace-nowrap` cell, so it never truncated at all; it
                      just ran off the end of `MbTableScroll`'s window and the
                      reader saw whatever fitted. Measured at 1440 with the
                      long-name fixture, before:

                        opponent span 306px wide, painted AT REST:
                          "Wolverhampton Wanderers Athletic Club B" → "Wolverhampto"
                          "Wolverhampton Wanderers Athletic Club C" → "Wolverhampto"

                      Two different teams, one string, on the screen the reader
                      is using to tell teams apart — with the "B"/"C" 130px past
                      the right edge of a scroller most readers never move. The
                      Team column's own note calls that out; this column was the
                      door it did not close.

                      The row is a flex line so the name can be a block without
                      dropping to its own line: date and "vs" are `shrink-0`
                      because they are two words and a date, and the name is the
                      part that gives. The ceiling is narrower than `NAME_COL`
                      (11rem vs 13rem) because this is the secondary reference
                      in the row — the Team cell is the identity, this is who
                      they are playing — and because it is the widest column in
                      a table that is already the widest object on the screen.
                      `28vw` tracks the viewport for the same reason `NAME_COL`
                      uses `50vw`. */}
                  <td className={REVEAL_NEXT}>
                    {row.nextMatch ? (
                      <>
                        <span className="flex items-baseline gap-1 whitespace-nowrap">
                          <span className="matchbook-display mb-track-display shrink-0 font-bold">
                            {row.nextMatch.date}
                          </span>
                          <span className="shrink-0 text-mb-ink-muted">
                            {row.nextMatch.isHome ? "vs" : "@"}
                          </span>
                          <MbTeamName
                            name={row.nextMatch.opponent.name}
                            className="matchbook-display mb-track-nav max-w-[min(11rem,28vw)] font-semibold"
                          />
                        </span>
                        <span className="block whitespace-nowrap text-[0.66rem] text-mb-ink-muted">
                          {row.nextMatch.time} • {row.nextMatch.competition}
                        </span>
                      </>
                    ) : (
                      <span className="whitespace-nowrap text-mb-ink-muted">
                        Not scheduled
                      </span>
                    )}
                  </td>
                  <td className="text-right">
                    <span
                      className="matchbook-display text-[0.66rem] mb-track-status font-bold whitespace-nowrap"
                      style={{ color: statusInk(row.status) }}
                    >
                      {row.status}
                    </span>
                    {/* `warnTint` used to overwrite EVERY cell of this run
                        with one gold (or red at nil wins) as soon as the team
                        was at or under a 50% win rate — so the two rows whose
                        form is most worth reading, APEX and FLARE in the
                        fixture, showed five identical gold blocks and no
                        per-match result at all. A form guide is the sequence;
                        a mood ring over the sequence is not a summary of it,
                        it is a deletion of it. The signal it was reaching for
                        is already on the same row twice — the W and L columns
                        four cells to the left — and now reads straight off the
                        run itself, since a losing side sets as a light strip
                        of outlined cells and a winning one as a dark strip. */}
                    <span className="mt-1 block">
                      <FormLetters form={row.form} slots={5} />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </MbTableScroll>
      </div>
    )}
  </Panel>
);

/* ------------------------------ Club snapshot ----------------------------- */

export const ClubSnapshotPanel = ({ stats }: { stats: MbStatTotal[] }) => (
  <Panel title="Club Snapshot" icon="chart" tone="navy">
    <div className="grid flex-1 grid-cols-3 divide-x divide-mb-rule px-2 py-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col items-center justify-center gap-1 px-2 text-center"
        >
          <MbIcon
            id={SNAPSHOT_ICONS[stat.label] ?? "chart"}
            size={30}
            className="text-mb-navy"
          />
          <span className="matchbook-display text-4xl mb-track-masthead font-bold leading-none tabular-nums">
            {stat.value}
          </span>
          <span className="mb-kicker">{stat.label}</span>
        </div>
      ))}
    </div>
  </Panel>
);

/* ----------------------------- Team readiness ----------------------------- */

/* ---------------------------------------------------------------------------
   THE ROW THAT HAS NOT PLAYED

   Thirty seconds into a new account, having created exactly one team, this
   panel's whole content was `RIVERSIDE ROCKETS  0%  ▬  NEEDS ATTN` — a coral
   verdict, in the app's first piece of feedback on the user's first action.

   `readinessStatus(percent, played)` supplies the honest word; the two marks
   beside it have to agree with it or the row still reads as a failing one:

     percent   `—`, not `0%`. A percent nobody has measured is not zero, and
               the em dash is the same "no figure" mark the directory table and
               the profile stats already print for an unplayed team.
     meter     the track at zero, in `--mb-rule`. A coral bar of width 0 still
               paints its 1px edge on some DPRs, and a red edge is exactly the
               signal this row must not send.
   --------------------------------------------------------------------------- */
export const TeamReadinessPanel = ({
  rows,
}: {
  rows: MbTeamReadinessRow[];
}) => (
  <Panel title="Team Readiness" icon="chart" tone="navy">
    {rows.length === 0 ? (
      <PanelEmpty message="No readiness data exists yet — add teams and play matches." />
    ) : (
      <MbTableScroll>
        <table className="mb-table mb-table-compact w-full border-collapse">
          <thead>
            <tr>
              <th className="pl-3!">Team</th>
              <th>Ready %</th>
              {/* `text-right!` for the same reason as the directory's headers:
                  the unlayered `.mb-table th` rule outranks the utility, so
                  this header was painting left over a right-aligned verdict. */}
              <th className="pr-3! text-right!">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.team.name}>
                {/* Was a bare `{row.team.name}` — the one name in the system
                    with no truncation rule of any kind on it, which is how two
                    teams sharing a 36-character prefix reached the same painted
                    string here. `MbTeamName` pins the last token; `NAME_COL`
                    is what makes it fire (see the note above). */}
                <td className="pl-3!">
                  <MbTeamName
                    name={row.team.name}
                    className={`matchbook-display text-[0.8rem] mb-track-button font-semibold ${NAME_COL}`}
                  />
                </td>
                <td>
                  <span className="flex items-center gap-2">
                    <span className="w-8 text-[0.78rem] font-semibold tabular-nums">
                      {row.played === 0 ? "—" : `${row.percent}%`}
                    </span>
                    {/* `.mb-meter`, not a hand-drawn twin of it (G22).

                        This bar was the system's second spelling of the meter:
                        the same track, the same fill, the same 2px radius, but
                        written out here with the fill sized by an inline
                        `width: N%`. `width` is a layout property, which is the
                        one thing charter invariant 40 rules out for a fill that
                        can change — and it made the readiness bar the only
                        meter in the app that would not have inherited the
                        `scaleX` conversion.

                        Geometry is preserved exactly: `.mb-meter` is unlayered
                        so its `height: 4px` / `width: 100%` beat a plain
                        utility, hence the two `!`. Painted result at 62% is
                        pixel-identical to what it replaces — 7px tall, 96px
                        wide, `--mb-tint-3` track, `readinessColor()` fill. The
                        twin at `panels.tsx:923` (`w-12`) still carries the old
                        recipe and is not this agent's file; the conversion
                        there is this same four-line shape. */}
                    <span
                      className="mb-meter h-[7px]! w-24! shrink-0"
                      style={
                        {
                          "--mb-meter-fill":
                            row.played === 0 ? 0 : row.percent / 100,
                          "--mb-meter-color": readinessColor(
                            row.percent,
                            row.played
                          ),
                        } as React.CSSProperties
                      }
                    >
                      <span />
                    </span>
                  </span>
                </td>
                {/* Bar takes the mark colour, word takes the ink twin. */}
                <td
                  className="matchbook-display pr-3! text-right mb-track-display font-bold"
                  style={{ color: readinessInk(row.percent, row.played) }}
                >
                  {row.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </MbTableScroll>
    )}
  </Panel>
);

/* ------------------------------- Team profile ----------------------------- */

const ProfileStat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col items-center justify-center gap-0.5 border border-mb-rule px-2 py-2 text-center">
    <span className="mb-kicker">{label}</span>
    <span className="matchbook-display text-2xl mb-track-display font-bold leading-none tabular-nums">
      {value}
    </span>
  </div>
);

export const TeamProfilePanel = ({
  row,
  onEdit,
  onDelete,
}: {
  row: MbTeamRow | null;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <Panel title={row ? `Team Profile: ${row.team.name}` : "Team Profile"}>
    {!row ? (
      <PanelEmpty message="No team selected yet — add a team, then pick a row in the directory to see its profile." />
    ) : (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex flex-wrap items-start gap-4">
          {/* Identity */}
          <div className="flex min-w-[150px] flex-1 flex-col gap-2">
            <div className="flex items-center gap-3">
              <Crest team={row.team} size={62} />
              <span className="matchbook-display text-2xl mb-track-display font-bold leading-tight">
                {row.team.name}
              </span>
            </div>
            {row.color && (
              <div>
                <p className="mb-kicker">Colour</p>
                <span className="flex items-center gap-2">
                  {/* 2px, the `.mb-swatch` radius — NOT `rounded-full`.

                      Two reasons, and the second is the stronger one.

                      1. `rounded-full` is Tailwind v4's static
                         `calc(infinity * 1px)`, which computes to
                         33554400px. That is the SECOND spelling of the pill
                         the system already names once as
                         `--mb-radius-round: 999px` / `.mb-round`, and a radius
                         census cannot tell the two apart by eye — this was the
                         last `rounded-full` node left on /teams.
                      2. This chip is the READOUT of the colour the user picked
                         with `MbSwatchPicker`, whose chips are `.mb-swatch` —
                         24px squares at radius 2px. A round readout of a square
                         picker is one object drawn two ways.

                      Design language §3.3 lists "a colour swatch" among the
                      999px exemptions AND lists `.mb-swatch` at 2px in the same
                      section; the shipped class is the tie-breaker under the
                      doc's own "the page wins" rule. Flagged in the return. */}
                  <span
                    className="h-4 w-4 shrink-0 rounded-[2px] border border-mb-navy"
                    style={{ background: teamColorCss(row.color) }}
                  />
                  {/* The NAME of the ink, not the stored value.
                      `{row.color}` rendered here directly, and `.mb-code-chip`
                      had nothing to do with it — this span's own `uppercase`
                      is what put

                        COLOR-MIX(IN OKLAB, VAR(--MB-PLUM) 65%, VAR(--MB-PAPER-BRIGHT))

                      across two lines of a 390px phone under the word COLOUR.
                      `teamColorName()` is the same answer `MbSwatchPicker`
                      gives one sheet away ("SELECTED Lilac"), so the screen a
                      colour is chosen on and the screen it is read back on now
                      agree. `tabular-nums` went with the value it was aligning:
                      a colour name is a word.

                      A hand-mixed colour has no name, so it keeps its hex — in
                      the `.mb-code-chip` the picker uses for exactly that, a
                      reference value a person typed and can read back. */}
                  {/* The step the raw value already had. A name is easier to
                      read than a hex at any size, so this is not the place to
                      spend height: the row is the same 0.72rem/medium it was,
                      and the populated panel measures the same to the pixel. */}
                  <span className="text-[0.72rem] font-medium">
                    {teamColorName(row.color)}
                  </span>
                  {/* Plain muted text, not the `.mb-code-chip` the picker's own
                      readout uses for the same hex. The chip is a 26px box
                      against a 19px line, and this identity column is the
                      densest stack on the panel: measured at 390px it took the
                      Colour row from 32.1px to 45.3px and the whole panel with
                      it. The dialog can afford the chip on its own hint line;
                      here the row stays one line at every width. */}
                  {teamColorHex(row.color) && (
                    <span className="text-[0.72rem] tabular-nums text-mb-ink-muted">
                      {teamColorHex(row.color)}
                    </span>
                  )}
                </span>
              </div>
            )}
            <div>
              <p className="mb-kicker">Entered In</p>
              <p className="text-[0.8rem] font-medium">
                {row.competitions.length === 0 ? (
                  <span className="text-mb-ink-muted">No competition yet</span>
                ) : (
                  row.competitions.join(", ")
                )}
              </p>
            </div>
          </div>

          {/* Record */}
          <div className="grid min-w-[210px] flex-1 grid-cols-2 gap-2">
            {/* Edge tier. `[1.5px]` was never rendering — Blink floors a used
                border-width to whole CSS px at every DPR — so this is the same
                pixel with the tier it actually paints. */}
            <div className="col-span-2 flex flex-col items-center justify-center gap-0.5 border border-mb-navy px-2 py-2">
              <span className="mb-kicker">Overall Record</span>
              <span className="matchbook-display text-3xl mb-track-display font-bold leading-none tabular-nums">
                {row.won} - {row.lost}
              </span>
            </div>
            <ProfileStat label="Matches" value={String(row.played)} />
            <ProfileStat
              label="Win Rate"
              value={row.played === 0 ? "—" : `${Math.round((row.won / row.played) * 100)}%`}
            />
            <ProfileStat
              label="Points For"
              value={row.played === 0 ? "—" : String(row.pointsFor)}
            />
            <ProfileStat
              label="Points Against"
              value={row.played === 0 ? "—" : String(row.pointsAgainst)}
            />
          </div>
        </div>

        {/* Next match + form */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-t border-mb-rule pt-3">
          <div>
            <p className="mb-kicker">Next Match</p>
            {row.nextMatch ? (
              <>
                <p className="matchbook-display text-[0.85rem] mb-track-display font-bold">
                  {row.nextMatch.date} {row.nextMatch.isHome ? "vs" : "@"}{" "}
                  {row.nextMatch.opponent.name}
                </p>
                <p className="text-[0.72rem] text-mb-ink-muted">
                  {row.nextMatch.time} • {row.nextMatch.competition}
                </p>
              </>
            ) : (
              <p className="text-[0.8rem] text-mb-ink-muted">Not scheduled</p>
            )}
          </div>
          <div>
            <p className="mb-kicker">Recent Form</p>
            {row.form.length === 0 ? (
              <p className="text-[0.8rem] text-mb-ink-muted">No matches played yet</p>
            ) : (
              /* No `slots`: this is not a column, so nothing has to be
                 reserved — the run is as wide as the matches played. */
              <FormLetters form={row.form} />
            )}
          </div>
        </div>

        {/* Two changes here, both rule-driven.

            1. "Quick Match" was `mb-btn-coral`. On `/teams` the rail already
               spends the screen's one coral fill on the same action, so this
               was invariant 15's failure mode twice over: two coral fills, and
               both of them the *same* destination.
            2. Delete sat flush against Quick Match — a destructive control
               abutting the highest-frequency one, which HF-14 names. It now
               takes its own line under a rule, which is the same separation the
               kit's `MbDangerZone` uses and reads as a deliberate boundary
               rather than a third button in a row of three. */}
        <div className="mt-auto flex flex-col gap-3 border-t border-mb-rule pt-3">
          <div className="flex flex-wrap gap-2">
            <MbButton variant="navy" icon="settings" onClick={onEdit} className="flex-1">
              Edit Team
            </MbButton>
            <MbButtonLink href="/quick-match" variant="outline-navy" icon="quick" className="flex-1">
              Quick Match
            </MbButtonLink>
          </div>
          <div className="flex justify-end border-t border-mb-rule pt-3">
            <MbButton variant="outline" icon="warning" onClick={onDelete}>
              Delete Team
            </MbButton>
          </div>
        </div>
      </div>
    )}
  </Panel>
);

/* ---------------------------- Upcoming fixtures --------------------------- */

/* ---------------------------------------------------------------------------
   ONE PANEL, ONE LINK

   This panel carried TWO links to `/competitions`, worded differently: "View
   Full Schedule" in the head and "View Full Fixture List" in the foot. A reader
   comparing them has to assume they lead somewhere different, because that is
   the only reason two labels would exist — and one panel promising two lists it
   does not have is worse than the extra tap it was meant to save.

   The head link survives, with the words `SchedulePanel` on `/` already uses
   for the same object and the same destination, so the two screens name it
   once between them. The footer goes; the list keeps `grow`, which is what was
   filling the panel's stretched height, not the footer rule.
   --------------------------------------------------------------------------- */
export const UpcomingFixturesPanel = ({ items }: { items: MbScheduleItem[] }) => (
  <Panel
    title="Upcoming Fixtures"
    meta={<MbPanelHeadLink href="/competitions" label="View Full Schedule" />}
  >
    {items.length === 0 ? (
      <PanelEmpty
        message="No fixtures exist yet — start a competition to schedule matches."
        actionLabel="New competition"
        href="/competitions/new"
      />
    ) : (
      /* Coral moves from the DATE to the SPINE, which is the swap in both
         directions: the date was a 10.24px/700 letterform at 3.55:1 (HF-6),
         and the 2px left rule is coral job 4 — "the schedule spine" — where a
         mark's 3:1 floor applies and 3.26:1 clears. `SchedulePanel` on `/`
         already drew this list that way; this one did not, so the same object
         had two vocabularies across two routes. */
      /* `grow` on the list and on every row — see the void-band note in
         `panels.tsx`. This panel was the worst of the five: 166.3px of blank
         paper in a 525px box at 1440, because the Team Profile beside it sets
         the row height and five fixtures do not reach it. */
      <div className="ml-3 flex grow flex-col divide-y divide-mb-rule border-l-2 border-mb-coral">
        {items.map((item, i) => (
          /* `minmax(0,1fr)`, not `1fr` (R2). A bare `1fr` is `minmax(auto,1fr)`
             and `auto` as a track MINIMUM is min-content — so this track could
             never go narrower than the two names, four crests and the "vs"
             inside it, whatever the viewport said. At 320 with a club-name
             roster that floor measured 291px in a 272px track and the excess
             left the panel, left `main`, and widened the layout viewport, which
             is what pushes the fixed bottom nav off-screen.

             `minmax(0,1fr)` lets the track take its share and no more, which is
             what makes the `min-w-0` below and `MbTeamName`'s elision able to
             fire at all. The two fixed columns are already definite, so nothing
             else in this row changes at any width. */
          <div
            key={i}
            className="grid grow grid-cols-[42px_56px_minmax(0,1fr)] items-center gap-2 py-2 pl-3 pr-3"
          >
            <div>
              <p className="matchbook-display text-[0.66rem] mb-track-status font-bold leading-tight">
                {item.day}
              </p>
              <p className="matchbook-display text-[0.66rem] mb-track-status font-bold leading-tight tabular-nums">
                {item.date}
              </p>
            </div>
            <p className="text-[0.72rem] font-semibold tabular-nums">{item.time}</p>
            <div className="flex min-w-0 flex-col gap-0.5">
              {/* `basis-0 flex-1` on both names was the previous fix and it
                  only made the failure FAIR. Two names, two crests and a "vs"
                  in one line is 148px of track at 320 and 62px at 1366, so
                  each name held 45px and 62px and painted, on an eight-club
                  roster:

                    320   "W", " CC", " VC"            1–2 characters
                    1366  "Marlo VC", "Great  CC"      7

                  Under `NAME_FLOOR`'s eight either way, and at 320 the row is
                  a crest, a suffix and another crest. `MbMatchupPair` is the
                  shipped answer and `SchedulePanel` on `/` — this panel's twin
                  — already uses it, so the swap also stops one object reading
                  two ways across two routes. It gives each team its own line
                  below 336px of its OWN container and keeps the single line
                  above it, and it carries the "vs" as the centre note.

                  The venue drops out of the name line and under it, which is
                  the grammar Live Courts' set label and the Overview schedule's
                  venue line already use. */}
              <MbMatchupPair home={item.home} away={item.away} note="vs" size="sm" />
              <span className="block truncate text-[0.66rem] text-mb-ink-muted">
                {item.venue}
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </Panel>
);

/* ------------------------------- Recent form ------------------------------ */

export const RecentFormPanel = ({ rows }: { rows: MbFormRow[] }) => (
  <Panel
    title="Recent Form"
    meta={<span className="mb-kicker">Last 5 Matches</span>}
  >
    {rows.length === 0 ? (
      <PanelEmpty
        message="No form exists yet — completed matches build each team's form."
        actionLabel="Play a match"
        href="/quick-match"
      />
    ) : (
      <div className="flex grow flex-col divide-y divide-mb-rule">
        {rows.map((row) => (
          /* Three claims on one line — an identity, a five-letter form run and
             a W–L record — and the identity is the only one that can give. At
             1366 this panel is `xl:col-span-5` beside a 7, so the row is 233px
             and the mark held 95 of it: "Marlow Blues VC" painted "Marlow",
             "Beckton Blues VC" painted "Beckton", six and seven characters
             against `NAME_FLOOR`'s eight, and the two Blues clubs separated by
             one letter.

             250 = 22 crest + 8 + 96 name + 8 + 78 form run + 8 + 40 record,
             where 96 is `MB_MATCHUP_CUT`'s own `sm` name track. Below it the
             measures drop to a second line and the name takes the whole width;
             above it nothing moves. At 320 the row is 262px and stays on one
             line — the phone was never the failure here, the twelve-column
             desktop was. */
          <div key={row.team.name} className="@container grow px-3 py-2.5">
            <div className="flex flex-col gap-1.5 @min-[250px]:flex-row @min-[250px]:items-center @min-[250px]:justify-between @min-[250px]:gap-2">
              <TeamMark team={row.team} size={22} className="min-w-0 @min-[250px]:flex-1" />
              <span className="flex items-center justify-between gap-2 @min-[250px]:contents">
                <FormLetters form={row.form} />
                <span className="matchbook-display w-10 text-right text-[0.78rem] mb-track-display font-bold tabular-nums">
                  {row.record}
                </span>
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
    <div className="mt-auto border-t border-mb-rule px-4 text-center">
      <Link href="/summaries" className="mb-panel-link min-h-11 w-full justify-center">
        View Full Match History
        <MbIcon id="chevron-right" size={11} />
      </Link>
    </div>
  </Panel>
);

/* ===========================================================================
   THE ZERO STATE

   Measured on a brand-new account at 390px, `/teams` was 1543px of paper
   carrying FIVE `display/stat-sm` headlines — NO TEAMS EXIST YET · NO READINESS
   DATA EXISTS YET · NO TEAM SELECTED YET · NO FIXTURES EXIST YET · NO FORM
   EXISTS YET — over a Club Snapshot reading 0 WINS / 0 TEAMS / 0 MATCHES.

   This is not an incidental screen. It is the destination of the one coral
   control on the fixed Overview ("Add Your First Team"), so it is the SECOND
   screen every new user sees: the previous round's cure and the disease it
   cured were one tap apart.

   The machinery is the one `/` and `/competitions` already prove, applied to
   this screen's two conditions rather than restated:

     no team at all      the six panels are all mute, so none of them renders.
                         Two ledgers take their place — what a team's page
                         becomes, and the three routes to a first team.
     one team, nothing   only the two match-fed panels are mute. They are
     played              withheld and named in one index that closes the row,
                         exactly as the Overview withholds its own.

   The first-run pair is deliberately NOT a steps panel. `/`'s first run is
   already three numbered steps, and its step 01 is the button that lands the
   reader here — arriving at a second numbered progression one tap later would
   be the same object twice, which is the drift this round exists to end. What
   the reader needs here is not the sequence again; it is what a team is worth
   and how to make one.
   =========================================================================== */

/**
 * What `/teams` becomes, in the order the populated screen prints it.
 *
 * The terms are the panel TITLES, verbatim, so a row and the panel head it
 * promises cannot drift into two names for one object. "Team Readiness" is the
 * one object `/` also indexes, and it is glossed here in the Overview's own
 * words for the same reason.
 */
const TEAMS_INDEX: {
  key: MbTeamsSection | "directory" | "snapshot" | "readiness" | "profile";
  term: string;
  gloss: string;
  icon: string;
}[] = [
  {
    key: "directory",
    term: "Team Directory",
    gloss: "Every team, with its record, its next fixture and its last five results.",
    icon: "teams",
  },
  {
    key: "snapshot",
    term: "Club Snapshot",
    gloss: "Wins, teams and matches across the whole club.",
    icon: "chart",
  },
  {
    key: "readiness",
    term: "Team Readiness",
    gloss: "Form and readiness, team by team.",
    icon: "streak",
  },
  {
    key: "profile",
    term: "Team Profile",
    gloss: "One team in full: colour, record, win rate and points.",
    icon: "shield",
  },
  {
    key: "fixtures",
    term: "Upcoming Fixtures",
    gloss: "Fixtures the format writes for you, once a competition is running.",
    icon: "calendar",
  },
  {
    key: "form",
    term: "Recent Form",
    gloss: "The last five results for each team, newest on the right.",
    icon: "history",
  },
];

/** The full index, for the screen that has nothing at all. */
export const MB_TEAMS_CONTENTS: MbLedgerRow[] = TEAMS_INDEX.map(
  ({ term, gloss, icon }) => ({ term, gloss, icon })
);

/**
 * The index for a SPARSE screen: the same rows, cut to the panels that were
 * actually withheld, in the same order, and taking the dense cut because it is
 * a footnote to a working screen rather than the screen itself.
 */
export const mbTeamsContentsFor = (
  sections: readonly MbTeamsSection[]
): MbLedgerRow[] =>
  TEAMS_INDEX.filter((row) =>
    (sections as readonly string[]).includes(row.key)
  ).map(({ term, gloss }) => ({ term, gloss }));

/**
 * The three routes to a first team.
 *
 * An index of PATHS, not a row of buttons. Two of the three are already the
 * masthead's own actions and the masthead prints them at the top of the page
 * where a thumb reaches first; printing them again 300px lower is how a screen
 * ends up with twenty controls and no primary (`MbStepsPanel`, `panels.tsx`).
 * The third is the one a first-time reader cannot discover from this screen at
 * all, which is the whole reason the panel is worth its column.
 */
export const MB_TEAM_ADD_ROUTES: MbLedgerRow[] = [
  {
    term: "New Team",
    gloss: "One at a time: a name and a colour. The crest is drawn from the name.",
  },
  {
    /* The promise this row makes is now one the sheet keeps: it takes a pasted
       list. It was written against a dialog that could only count ("Team 2,
       Team 3, Team 4"), which sent an organiser holding eleven real names to
       New Team eleven times — see D1 in `QuickAddTeams.tsx`. Both modes are
       named here because the numbered block is still the right answer for a
       draw with no roster yet. */
    term: "Quick Add",
    gloss: "Paste a whole roster of names, or generate a numbered block.",
  },
  {
    term: "In the Wizard",
    gloss: "Creating a competition can add its teams as you go.",
  },
];
