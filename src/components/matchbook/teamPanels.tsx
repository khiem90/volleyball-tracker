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
 * A readiness line that can say it has not played. `MbReadinessRow.status` is
 * the shared three-word union in `types.ts`; the fourth state is declared here
 * beside the panel that renders it.
 */
export interface MbTeamReadinessRow extends Omit<MbReadinessRow, "status"> {
  /** Completed, non-bye matches. `0` is what makes the row NEW rather than 0%. */
  played: number;
  status: MbReadinessState;
}

/**
 * The two panels on `/teams` that can have nothing to print once at least one
 * team exists — the other four always have content, and the closed union
 * states that rather than assuming it. With zero teams all six are mute,
 * which is not a sparse screen but a different one.
 */
export type MbTeamsSection = "fixtures" | "form";

const SNAPSHOT_ICONS: Record<string, string> = {
  Wins: "compete",
  Teams: "teams",
  Matches: "volleyball",
};

/**
 * `--mb-green-ink`, not `--mb-green`: raw green fails 4.5:1 at this size on
 * paper-bright. The word ACTIVE/INACTIVE is itself the second channel.
 */
const statusInk = (status: MbTeamRow["status"]) =>
  status === "ACTIVE" ? "var(--mb-green-ink)" : "var(--mb-ink-muted)";

/** See `panels.tsx` — the rank column's figures must not reflow. */
const RANK_CELL = "matchbook-display text-center font-bold tabular-nums";

/* ---------------------------------------------------------------------------
   THE DIRECTORY'S WIDE COLUMNS — `Entered In` and `Next Match` are revealed
   at the width where they FIT, and the width that decides is the PANEL's own
   (`@container`), never the viewport: the table lives in a grid cell, so a
   narrow scrollport exists on wide screens too, and a scrollport cut carries
   no ellipsis and lands mid-word. Thresholds: 465px table without them, plus
   each column — Entered In (133) → 598, Next Match (249) → 847. Below each
   the value rides the team cell as a `.mb-kicker` line instead of being lost.
   W, L, PF–PA and the form guide stay at every width — they are what the
   directory is read FOR.
   --------------------------------------------------------------------------- */
const REVEAL_ENTERED = "hidden @min-[598px]:table-cell";
const REVEAL_NEXT = "hidden @min-[847px]:table-cell";

/** The kicker line's mirror of each: shown exactly when its column is not. */
const DIGEST_ENTERED = "@min-[598px]:hidden";
const DIGEST_NEXT = "@min-[847px]:hidden";

/**
 * One hidden column as one line — "Summer League +4", "Jul 31 vs Tide" —
 * `null` (nothing rendered) when there is no competition or fixture. Two
 * calls, not one joined string: the two columns disappear independently.
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
   THE NAME COLUMN'S CEILING. In a `table-layout: auto` table nothing forces
   elision — the column takes its max-content width and the scroller absorbs
   the excess, so `MbTeamName`'s middle ellipsis never fires and the part that
   separates two teams sits off-screen. `min(13rem, 50vw)` tracks the thing
   that binds (the viewport, not the table).

   IT GOES ON THE CONTENT, NEVER ON THE `<td>`: Blink feeds a cell's
   `max-width` into auto table layout as the column's PREFERRED width, so on
   the cell it INFLATES the column up to the cap — and the resulting overflow
   widens the mobile layout viewport, dragging the fixed bottom nav with it.
   On a block inside the cell the same value clamps the max-content
   contribution, which is the intended ceiling.
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
        /* `py-0!` hands the interior to the input and `self-stretch` makes it
           take all of it, so the field — not the wrapper — is the target; the
           44px floor lives in `.mb-search` itself. `text-base!` below `md` is
           the iOS zoom floor: Safari zooms the viewport on focus for anything
           under 16px. */
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
              {/* Every alignment here carries a `!`, and has to:
                  `.mb-table th { text-align: left }` is unlayered at 0,1,1 and
                  beats a layered `text-center`/`text-right` utility (0,1,0)
                  twice over — without the `!` each header paints left over a
                  centred or right-aligned column. */}
              <th className="w-8 text-center!">#</th>
              <th>Team</th>
              <th className={REVEAL_ENTERED}>Entered In</th>
              <th className="text-center!">W</th>
              <th className="text-center!">L</th>
              {/* "PF–PA", not "Pts": on `/` that header means the ranking
                  total, and one word must not mean two quantities.
                  `whitespace-nowrap` because an en dash is a break
                  opportunity — without it the header wraps to "PF–" / "PA". */}
              <th className="text-center! whitespace-nowrap">PF–PA</th>
              <th className={REVEAL_NEXT}>Next Match</th>
              {/* The cell holds two values (status word, form run), so the
                  HEADER splits into two lines naming each — a second column
                  would overflow a 390px viewport. */}
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
                /* `onClick` on the `<tr>` is a mouse convenience; the real
                   control is the `<button>` in the Team cell — the table keeps
                   its table semantics and the keyboard gets a named 44px
                   target. `aria-current` marks the chosen row. */
                <tr
                  key={row.id}
                  onClick={() => onSelect(row.id)}
                  className="mb-row-hover cursor-pointer"
                  aria-current={selected}
                >
                  {/* `.mb-rail`, not a hand-written inset shadow: the class
                      spells the accent tier and takes the per-row colour via
                      `--mb-rail-color`. */}
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
                        THE NAME COLUMN'S CEILING above. */}
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
                      {/* The hidden columns' digest lines. Outside the
                          `<button>` on purpose: the control's accessible name
                          stays the team alone. They WRAP, and must — `truncate`
                          raises the cell's MIN-content width to the whole
                          digest, and a table column can never be narrower than
                          its min-content; a ceiling on the max-content side
                          cannot undo that floor. Two lines, because the two
                          columns vanish independently. */}
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
                  {/* The opponent is a team name too, so it takes `MbTeamName`
                      and its own ceiling. The row is a flex line so the name
                      can be a block without dropping to its own line: date and
                      "vs" are `shrink-0`, the name gives. The ceiling is
                      narrower than `NAME_COL` (secondary reference in the
                      row); `28vw` tracks the viewport for the same reason
                      `NAME_COL` uses `50vw`. */}
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
                    {/* The run stays per-match: an aggregate tint over the
                        sequence deletes the sequence, and W/L four cells to
                        the left already summarise it. */}
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
          {/* `mt-2`: at `leading-none` the numeral's ink overruns its own box,
              so 12px of separation keeps clear paper above the label. */}
          <span className="mb-kicker mt-2">{stat.label}</span>
        </div>
      ))}
    </div>
  </Panel>
);

/* ----------------------------- Team readiness ----------------------------- */

/* ---------------------------------------------------------------------------
   THE ROW THAT HAS NOT PLAYED must not read as a failing one.
   `readinessStatus(percent, played)` supplies the honest word; the marks
   agree with it:
     percent  `—`, not `0%` — a percent nobody has measured is not zero.
     meter    the track at zero — a coral bar of width 0 still paints its 1px
              edge on some DPRs, and a red edge is the one signal to avoid.
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
                {/* `MbTeamName` pins the last token; `NAME_COL` is what makes
                    it fire (see the ceiling note above). */}
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
                    {/* `.mb-meter`, not a hand-drawn twin: the fill is
                        `scaleX`, never an animated `width`. The class is
                        unlayered, so its height/width beat plain utilities —
                        hence the two `!`. */}
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
  <div className="flex flex-col items-center justify-center gap-1 border border-mb-rule px-2 py-2 text-center">
    <span className="mb-kicker">{label}</span>
    {/* `mt-1.5`: at `leading-none` the numeral's ink overruns its box, so the
        extra separation keeps it clear of the label's descenders. */}
    <span className="matchbook-display mt-1.5 text-2xl mb-track-display font-bold leading-none tabular-nums">
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
                  {/* 2px, the `.mb-swatch` radius — NOT `rounded-full`: this
                      chip is the readout of the square `MbSwatchPicker` chips,
                      and one object is drawn one way. */}
                  <span
                    className="h-4 w-4 shrink-0 rounded-[2px] border border-mb-navy"
                    style={{ background: teamColorCss(row.color) }}
                  />
                  {/* The NAME of the ink, not the stored value — a raw
                      `color-mix(...)` would print here uppercased.
                      `teamColorName()` matches the picker's own readout; a
                      hand-mixed colour has no name and keeps its hex. */}
                  <span className="text-[0.72rem] font-semibold">
                    {teamColorName(row.color)}
                  </span>
                  {/* Plain muted text, not `.mb-code-chip`: the chip's 26px
                      box would grow the densest row on the panel. */}
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
              <p className="text-[0.78rem] font-semibold">
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
            {/* Edge tier — Blink floors a used border-width to whole CSS px. */}
            <div className="col-span-2 flex flex-col items-center justify-center gap-1 border border-mb-navy px-2 py-2">
              <span className="mb-kicker">Overall Record</span>
              {/* `mt-1.5` for the same reason as `ProfileStat`: the numeral's
                  ink overruns its box at `leading-none`. */}
              <span className="matchbook-display mt-1.5 text-3xl mb-track-display font-bold leading-none tabular-nums">
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
              <p className="text-[0.85rem] text-mb-ink-muted">Not scheduled</p>
            )}
          </div>
          <div>
            <p className="mb-kicker">Recent Form</p>
            {row.form.length === 0 ? (
              <p className="text-[0.85rem] text-mb-ink-muted">No matches played yet</p>
            ) : (
              /* No `slots`: this is not a column, so nothing has to be
                 reserved — the run is as wide as the matches played. */
              <FormLetters form={row.form} />
            )}
          </div>
        </div>

        {/* One coral fill per screen — the rail already spends it on the same
            action, so Quick Match is an outline here. Delete takes its own
            line under a rule (the `MbDangerZone` separation), never abutting
            the highest-frequency control. */}
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

/* One link per panel, worded as `SchedulePanel` on `/` words the same
   destination — two differently-worded links to one place read as two lists. */
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
      /* Navy edge spine, matching `SchedulePanel` on `/`: a timeline's left
         axis is structure, and structure is ruled in ink, not coral. `grow`
         on the list and every row — see the void-band note in `panels.tsx`. */
      <div className="ml-3 flex grow flex-col divide-y divide-mb-rule border-l-[1.5px] border-mb-navy">
        {items.map((item, i) => (
          /* `minmax(0,1fr)`, not `1fr`: a bare `1fr` is `minmax(auto,1fr)` and
             `auto` as a track minimum is min-content, so the track could never
             shrink below its content and the overflow widened the layout
             viewport. `minmax(0,1fr)` is what lets `min-w-0` and the name
             elision fire at all. */
          <div
            key={i}
            /* `min-h-28` matches `SchedulePanel`'s row pitch — one object,
               one row height across routes. */
            className="grid min-h-28 grow grid-cols-[42px_56px_minmax(0,1fr)] items-center gap-2 py-2 pl-3 pr-3"
          >
            <div>
              <p className="matchbook-display text-[0.66rem] mb-track-status font-bold leading-tight">
                {item.day}
              </p>
              <p className="matchbook-display mt-1.5 text-[0.66rem] mb-track-status font-bold leading-tight tabular-nums">
                {item.date}
              </p>
            </div>
            <p className="text-[0.72rem] font-semibold tabular-nums">{item.time}</p>
            <div className="flex min-w-0 flex-col gap-1">
              {/* `MbMatchupPair` (the same object `SchedulePanel` uses): two
                  names, two crests and a "vs" on one line starve both names in
                  a narrow track, so each team gets its own line below 336px of
                  its OWN container. The venue drops under the name line. */}
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
          /* Three claims on one line — identity, form run, record — and the
             identity is the only one that can give. 250 = 22 crest + 8 + 96
             name + 8 + 78 form + 8 + 40 record; below it the measures drop to
             a second line and the name takes the whole width. The binding case
             is the twelve-column desktop grid, not the phone. */
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
   THE ZERO STATE — two conditions, two answers:

     no team at all      all six panels are mute, so none renders. Two ledgers
                         take their place — what a team's page becomes, and
                         the three routes to a first team.
     one team, nothing   only the two match-fed panels are mute; they are
     played              withheld and named in one closing index.

   Deliberately NOT a steps panel: `/`'s first run already numbers the steps
   whose step 01 lands the reader here, and a second numbered progression one
   tap later would be the same object twice.
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
    /* Both modes are named: the numbered block is still the right answer for
       a draw with no roster yet. */
    term: "Quick Add",
    gloss: "Paste a whole roster of names, or generate a numbered block.",
  },
  {
    term: "In the Wizard",
    gloss: "Creating a competition can add its teams as you go.",
  },
];
