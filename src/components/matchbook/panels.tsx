import Link from "next/link";
import { FORMAT_META, FORMAT_ORDER } from "./formatMeta";
import { MbIcon } from "./MbIcon";
import { MbTableScroll } from "./TableScroll";
import { Crest, FormLetters, Panel, PanelEmpty, TeamMark } from "./Panel";
import { MbStandingsLegend, MbStandingsTable } from "./StandingsTable";
import { MbTeamName } from "./TeamName";
import { readinessColor, readinessInk } from "./teamStats";
import type {
  MbBracket,
  MbFeaturedMatch,
  MbLeader,
  MbLiveCourt,
  MbReadinessRow,
  MbRecentResult,
  MbScheduleItem,
  MbStandingLine,
  MbStatTotal,
  MbTeam,
} from "./types";

/* ---------------------------------------------------------------------------
   THE 44px FLOOR ON A PANEL LINK

   `.mb-panel-link` renders 17.3px tall. `globals.css` gives it a 44px floor,
   but only inside `@media (pointer: coarse)` — so every panel link in the app
   is a 17.3px target for a mouse, and invariant 33 / HF-2 are not scoped to
   pointer type. Measured on the converted routes at 1440: 11 such links on
   `/`, 3 on `/teams`, 2 on `/quick-match`.

   Two shapes, because a header link and a footer link are different objects:

   `MB_PANEL_LINK_HIT` — a `::before` overlay that reaches 44px without
   changing the box. A pseudo-element is hit-tested as its originating element,
   so the tap area grows and the panel head does not: the alternative,
   `min-h-11` on the link, adds ~22px to every panel head on the screen for a
   control that is already legible. `inset-x-0` keeps the expander inside the
   link's own column, so it cannot reach across the head and swallow a click
   meant for the title.

   `MbPanelFooterLink` — the footer CTA is the full width of the panel and is
   the row a thumb actually goes for, so it takes a real 44px box rather than an
   invisible one.
   --------------------------------------------------------------------------- */
export const MB_PANEL_LINK_HIT =
  "relative before:absolute before:inset-x-0 before:-inset-y-[14px] before:content-['']";

/** A panel-head action. Passed through `Panel`'s `meta` slot, not `action`. */
export const MbPanelHeadLink = ({ href, label }: { href: string; label: string }) => (
  <Link href={href} className={`mb-panel-link ${MB_PANEL_LINK_HIT}`}>
    {label}
    <MbIcon id="chevron-right" size={11} />
  </Link>
);

const FooterLink = ({ href, label }: { href: string; label: string }) => (
  <div className="mt-auto border-t border-mb-rule px-4 text-center">
    <Link href={href} className="mb-panel-link min-h-11 w-full justify-center">
      {label}
      <MbIcon id="chevron-right" size={11} />
    </Link>
  </div>
);

/* ---------------------------------------------------------------------------
   THE VOID BAND ABOVE A FOOTER LINK

   `.mb-panel` is a flex column and its grid row stretches it to the tallest
   panel beside it. A panel whose body is a ruled list had NOTHING in it that
   grows, so the stretch landed in one lump: `mt-auto` threw the footer link to
   the bottom edge and left a band of blank paper between the last rule and the
   footer rule. Measured at 1440 before this change:

     /      Recent Results     109.5px void in a 397.5px panel   (28%)
     /      Live Courts         87.8px void in a 315.5px panel   (28%)
     /      Upcoming Schedule   53.3px void in a 315.5px panel   (17%)
     /teams Upcoming Fixtures  166.3px void in a 525px panel     (32%)
     /teams Recent Form        153.1px void in a 525px panel     (29%)

   The panels that did NOT void — Team Leaders, Championship Bracket, Event
   Details — all had a `flex-1` child, so the fix is the same one they already
   use, pushed one level down: the list grows, and the rows share what it gains.
   A ledger's rules divide the page it is printed on, not just the ink on it, so
   five fixtures set at even intervals down the column read as a set list rather
   than as a short list with a hole under it.

   `grow` and not `flex-1`, on purpose. `flex-1` is `flex: 1 1 0%`, and a zero
   basis in an AUTO-height column makes the container's intrinsic height (row
   count x tallest row) — every row would inflate to the tallest one on a panel
   that is not being stretched at all. `grow` leaves the basis at `auto`, so
   with no free space to hand out these classes change nothing, which is what
   keeps them correct whichever way `.mb-panel`'s own height resolves.

   Written as a plain `grow` on each list and each row rather than as a shared
   constant: it is one Tailwind word, and a constant aliasing one word would
   hide which elements carry it.
   --------------------------------------------------------------------------- */

/* `RANK_CELL` is gone with the hand-rolled standings table it existed for.
   `MbStandingsTable` sets the rank column itself, and it reads `rank` /
   `sharesRank` off the row rather than the map index, so a joint 2nd renders
   as "=2" on two rows and the next team as 4th. */

/* ===========================================================================
   THE ZERO STATE

   Measured on a brand-new account at 390px, `/` was 2540px of paper carrying
   EIGHT consecutive panels — No standings · No match of the day · No live
   matches · No upcoming matches · No bracket · No results · No teams · No team
   leaders — every one of them a `display/stat-sm` headline of the same size and
   weight, every one with its own hung rule, and twenty controls between them.
   The one filled button on the screen read "Record Result", on an account with
   zero teams and zero matches.

   That is not an empty state. It is a populated page with the data removed, and
   it is the first thirty seconds every user of this product has.

   Three components below replace it. None of them is an "empty state" in the
   §5.7 sense, because a screen with nothing to report is not eight empty
   objects — it is ONE screen with a different job:

     `MbStepsPanel`   the progression, numbered, with the live step marked by
                      the coral selection rail (coral's declared structural job,
                      invariant 15) and a word, so the mark survives greyscale.
     `MbLedgerPanel`  a ruled index. It is what the seven mute panels collapse
                      into: term + what makes it appear, at `display/row-title`
                      over `body/2xs`, so SEVEN equal display headlines become
                      ZERO and the promise is still on the page.

   Invariant 25 is intact, not waived: it binds "every list, table, bracket and
   panel that CAN be empty", and neither of these can be — the steps are always
   three and the index is always its own rows. The panels that would have been
   empty are not rendered at all, which is the one thing eight `PanelEmpty`
   blocks in a column can never be talked into.

   Invariant 52 is the reason for the shapes: a numbered ledger and a contents
   index are the two most editorial objects a programme has. Neither is a
   centred lone card, and neither would survive being pasted into a CRM.
   =========================================================================== */

export type MbStepState = "done" | "current" | "todo";

export interface MbStartStep {
  /** "01". The leading zero is part of the string — it is set, not computed. */
  n: string;
  title: string;
  /** One sentence, sentence case, full stop. */
  deck: string;
  state: MbStepState;
  /** What finishing the step produced: "8 teams added", the event's name. */
  note?: string;
}

/**
 * The state as a WORD, so the row does not rest on the rail alone.
 * `todo` stays unlabelled: "not started" is what a row says by saying nothing,
 * and three status words in a three-row list is a legend, not a state.
 */
const STEP_WORD: Record<MbStepState, string | null> = {
  done: "Done",
  current: "Next",
  todo: null,
};

/**
 * The numbered progression.
 *
 * It carries no button of its own. On a first-run screen exactly one action is
 * possible, the masthead already prints it at the top of the page in the
 * position a thumb reaches first, and printing it a second time 300px lower —
 * which is what `/competitions` did with its create action, twice, in panel
 * bodies — is how a screen ends up with twenty controls and no primary.
 * `footer` is for a genuinely DIFFERENT path, never a second copy of the first.
 */
export const MbStepsPanel = ({
  title,
  steps,
  footer,
}: {
  title: string;
  steps: MbStartStep[];
  /** A second, different destination. Not a repeat of the masthead action. */
  footer?: { href: string; label: string };
}) => (
  <Panel title={title} tone="navy" icon="clipboard">
    <ol className="flex grow flex-col divide-y divide-mb-rule">
      {steps.map((step) => {
        const current = step.state === "current";
        const word = STEP_WORD[step.state];
        return (
          <li
            key={step.n}
            aria-current={current ? "step" : undefined}
            className="grid grow grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-3 px-4 py-4"
            /* The same 3px coral inset `EventRow` uses for the selected event —
               one selection mark, one orientation, one width. */
            style={current ? { boxShadow: "inset 3px 0 0 var(--mb-coral)" } : undefined}
          >
            <span
              className={`matchbook-display text-2xl font-bold leading-none tabular-nums ${
                current ? "" : "text-mb-ink-muted"
              }`}
            >
              {step.n}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p
                  className={`matchbook-display text-[0.95rem] tracking-[0.05em] ${
                    current ? "font-bold" : "font-semibold text-mb-ink-muted"
                  }`}
                >
                  {step.title}
                </p>
                {word && (
                  <span className="mb-kicker flex shrink-0 items-center gap-1">
                    {step.state === "done" && <MbIcon id="check" size={12} />}
                    {word}
                  </span>
                )}
              </div>
              <p className="mt-1 max-w-[48ch] text-[0.85rem] leading-[1.5] text-mb-ink-muted">
                {step.deck}
              </p>
              {step.note && (
                <p className="matchbook-display mt-1.5 text-[0.66rem] font-bold tracking-[0.1em] tabular-nums">
                  {step.note}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
    {footer && <FooterLink href={footer.href} label={footer.label} />}
  </Panel>
);

export interface MbLedgerRow {
  /** The thing. `display/row-title`. */
  term: string;
  /** What it is, or what makes it appear. `body/2xs`, ink-muted. */
  gloss: string;
  /** Sprite id, drawn once beside the term. Ignored when `dense`. */
  icon?: string;
  /**
   * A 3px contained rail — `FORMAT_META`'s own accent and nothing else, so no
   * new colour mapping is invented (invariant 16, design language §1.2).
   * Decorative: every row is already told apart by its word and its glyph.
   */
  accent?: string;
}

/**
 * A ruled index of terms.
 *
 * `dense` is the contents cut — term left, condition right, two columns, no
 * glyph — which is what the seven mute Overview panels become. The default cut
 * gives each row a rail, a glyph and a full sentence, for a list the reader is
 * choosing FROM rather than being promised.
 */
export const MbLedgerPanel = ({
  title,
  rows,
  meta,
  dense = false,
}: {
  title: string;
  rows: MbLedgerRow[];
  meta?: React.ReactNode;
  dense?: boolean;
}) => (
  <Panel title={title} meta={meta}>
    <dl className="flex grow flex-col divide-y divide-mb-rule">
      {rows.map((row) =>
        dense ? (
          <div
            key={row.term}
            className="grid grow grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] items-baseline gap-x-3 px-4 py-2.5"
          >
            <dt className="matchbook-display text-[0.78rem] font-bold">{row.term}</dt>
            <dd className="text-[0.72rem] leading-[1.4] text-mb-ink-muted">{row.gloss}</dd>
          </div>
        ) : (
          <div
            key={row.term}
            className="grid grow grid-cols-[3px_1.5rem_minmax(0,1fr)] items-start gap-x-2.5 px-4 py-3"
          >
            <span
              aria-hidden="true"
              className="block h-full w-[3px] self-stretch"
              style={{ background: row.accent ?? "var(--mb-rule)" }}
            />
            {row.icon ? (
              <MbIcon id={row.icon} size={18} className="mt-0.5 shrink-0 text-mb-navy" />
            ) : (
              <span />
            )}
            <div className="min-w-0">
              <dt className="matchbook-display text-[0.78rem] font-bold">{row.term}</dt>
              <dd className="mt-0.5 text-[0.72rem] leading-[1.45] text-mb-ink-muted">
                {row.gloss}
              </dd>
            </div>
          </div>
        )
      )}
    </dl>
  </Panel>
);

/**
 * What the Overview becomes, in the order the populated screen prints it.
 *
 * It lives beside the panels it describes so the two cannot drift: a row here
 * and a `PanelEmpty` message in the same file are the same promise written
 * once each, and the file that owns one owns the other.
 */
export const MB_OVERVIEW_CONTENTS: MbLedgerRow[] = [
  { term: "Standings", gloss: "Ranked from the first result on." },
  { term: "Match of the Day", gloss: "The latest match you finished." },
  { term: "Live Courts", gloss: "Scores while a match is in progress." },
  { term: "Upcoming Schedule", gloss: "Fixtures the format writes for you." },
  { term: "Championship Bracket", gloss: "Once four teams are ranked." },
  { term: "Recent Results", gloss: "Every finished match, newest first." },
  { term: "Team Readiness", gloss: "Form and readiness, team by team." },
  { term: "Team Leaders", gloss: "Wins, points and the longest streak." },
];

/**
 * The five formats, in the wizard's own presentation order.
 *
 * This is what `/competitions` prints in place of seven mute panels. It is
 * DERIVED from `FORMAT_META` rather than retyped: that module is the single
 * source of truth charter H14 forbids a fourth copy of, and it already carries
 * the label, the one-sentence blurb, the sprite id and the contained accent —
 * which is also why no new colour mapping is invented here (invariant 16).
 *
 * Unlike `MB_OVERVIEW_CONTENTS` this is not a promise about what will appear.
 * It is the choice the reader is about to make, which is why it takes the
 * ledger's full cut — rail, glyph, sentence — rather than the dense one.
 */
export const MB_COMPETITION_FORMATS: MbLedgerRow[] = FORMAT_ORDER.map((type) => ({
  term: FORMAT_META[type].label,
  gloss: FORMAT_META[type].blurb,
  icon: FORMAT_META[type].icon,
  accent: FORMAT_META[type].accent,
}));

/**
 * The teams already on the books — the one fact that decides whether a
 * competition can be created at all, printed on the screen that creates one.
 * Real data rather than a promise, which is why this panel is not another
 * ledger row.
 */
export const TeamsReadyPanel = ({
  teams,
  total,
}: {
  /** Already capped by the hook; `total` is the honest count. */
  teams: MbTeam[];
  total: number;
}) => (
  <Panel
    title="Teams Ready"
    meta={<span className="mb-kicker tabular-nums">{total} Total</span>}
  >
    {total === 0 ? (
      <PanelEmpty
        message="No teams exist yet — add them here, or create them inside the wizard as you go."
        actionLabel="Add teams"
        href="/teams"
      />
    ) : (
      <div className="flex grow flex-col divide-y divide-mb-rule">
        {teams.map((team) => (
          <div key={team.name} className="flex grow items-center px-4 py-2">
            <TeamMark team={team} size="sm" />
          </div>
        ))}
        {total > teams.length && (
          <p className="mb-kicker px-4 py-2 tabular-nums">
            +{total - teams.length} more
          </p>
        )}
      </div>
    )}
    {/* The empty cut already carries an "Add teams" button to `/teams`, so the
        footer would be the SAME destination a second time, 40px below it —
        which is the shape of the defect this screen is being cleared of. The
        footer belongs to the populated cut, where the panel is a preview of a
        list and the link is how you see the rest of it. */}
    {total > 0 && <FooterLink href="/teams" label="Open the Team Directory" />}
  </Panel>
);

/* ------------------------------- Standings ------------------------------- */

/**
 * The overview's league table.
 *
 * It used to be a hand-rolled `<table>` with its own column set — P, W, L, a
 * combined `PF–PA` cell, Pts, Form, no PD, no legend, and a rank read off the
 * map index so joint positions could not be shown. That was the FOURTH
 * standings vocabulary in the app and the ranking behind it was a third
 * measure again (F14). It is `MbStandingsTable` now: the same component,
 * the same canonical column order and the same `rankTeams()` ordering that
 * `/competitions/[id]`, `/session/[code]` and `/summary/[code]` render, with
 * the legend that names every abbreviation on screen.
 */
export const StandingsPanel = ({
  title,
  caption,
  rows,
}: {
  title: string;
  /** Which competition's table this is. Read out before the table. */
  caption: string;
  rows: MbStandingLine[];
}) => (
  <Panel title={title} meta={<MbPanelHeadLink href="/competitions" label="View Full Table" />}>
    {rows.length === 0 ? (
      <PanelEmpty
        message="No standings exist yet — create teams and play matches to build the table."
        actionLabel="Create a team"
        href="/teams"
      />
    ) : (
      <>
        <MbStandingsTable rows={rows} caption={caption} />
        <MbStandingsLegend />
      </>
    )}
  </Panel>
);

/* ---------------------------- Match of the day ---------------------------- */

export const MatchOfTheDayPanel = ({ match }: { match: MbFeaturedMatch | null }) => (
  <section className="mb-panel">
    <header className="flex items-center gap-2 bg-mb-navy px-4 py-2.5 text-mb-paper-bright">
      <MbIcon id="star" size={16} className="text-mb-gold" />
      <h2 className="matchbook-display text-[0.95rem] font-bold tracking-[0.05em]">
        Match of the Day
      </h2>
    </header>
    {!match ? (
      <PanelEmpty
        message="No match of the day exists yet — your latest completed match will be featured here."
        actionLabel="Start a match"
        href="/quick-match"
      />
    ) : (
      <div className="flex flex-col flex-1">
        <div className="flex items-center justify-between px-4 pt-3">
          <p className="matchbook-display text-[0.72rem] font-semibold tracking-[0.08em]">
            {match.division}
          </p>
          {/* Navy, not coral. 12.8px/700 coral on `--mb-paper-bright` measured
              3.55:1 against a 4.5:1 floor, and a kick-off time is data, not a
              call to action — coral's job list has no entry for it. */}
          <p className="matchbook-display text-[0.8rem] font-bold tabular-nums">
            {match.time}
          </p>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-3 px-5 py-4">
          <div className="flex flex-col items-center gap-1.5">
            <Crest team={match.home} size={58} />
            <span className="matchbook-display text-[0.8rem] font-bold">
              {match.home.name}
            </span>
          </div>
          <span className="matchbook-display text-5xl font-bold tabular-nums">
            {match.homeScore}
          </span>
          <span className="mb-score-box text-[0.7rem] tracking-[0.1em] px-2">VS</span>
          <span className="matchbook-display text-5xl font-bold tabular-nums">
            {match.awayScore}
          </span>
          <div className="flex flex-col items-center gap-1.5">
            <Crest team={match.away} size={58} />
            <span className="matchbook-display text-[0.8rem] font-bold">
              {match.away.name}
            </span>
          </div>
        </div>
        {match.sets.length > 0 && (
          <div className="mx-4 border-t border-mb-rule">
            {match.sets.map((set, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-mb-rule py-1 text-[0.85rem] tabular-nums last:border-b-0"
              >
                <span className={set.home > set.away ? "font-bold" : "text-mb-ink-muted"}>
                  {set.home}
                </span>
                <span className="mb-kicker">Set {i + 1}</span>
                <span
                  className={`text-right ${set.away > set.home ? "font-bold" : "text-mb-ink-muted"}`}
                >
                  {set.away}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between border-t border-mb-navy px-4 py-2">
          <span className="flex items-center gap-1.5 text-[0.72rem] font-medium">
            <MbIcon id="location" size={13} className="text-mb-navy" />
            <span className="matchbook-display tracking-[0.06em]">{match.venue}</span>
          </span>
          {match.attendance && (
            <span className="mb-kicker">Attendance: {match.attendance}</span>
          )}
        </div>
      </div>
    )}
  </section>
);

/* ------------------------------- Live courts ------------------------------ */

export const LiveCourtsPanel = ({ courts }: { courts: MbLiveCourt[] }) => (
  <Panel title="Live Courts" meta={<MbPanelHeadLink href="/competitions" label="View All Courts" />}>
    {courts.length === 0 ? (
      <PanelEmpty
        message="No live matches exist yet — matches in progress will appear here."
        actionLabel="Start a quick match"
        href="/quick-match"
      />
    ) : (
      <div className="flex grow flex-col divide-y divide-mb-rule">
        {courts.map((court, i) => (
          <div
            key={i}
            /* `minmax(0,1fr)` on the two NAME tracks and a bound on everything
               that competes with them. A bare `1fr` is `minmax(auto,1fr)`, so
               the auto tracks took their max-content first and the names got
               what was left: measured at 1440, "Peak" (29px of glyphs) was
               handed a 27px box and rendered "PE…" — a four-letter team name
               truncated to two. The competition label under the score was the
               thief: "THIRTEEN TEAM CUP" set the centre track to 95px, wider
               than the scoreline it captions. */
            className="grid grow grid-cols-[56px_minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-3"
          >
            <div className="border-r border-mb-rule pr-2">
              <p className="matchbook-display text-[0.72rem] font-bold leading-tight">
                {court.court}
              </p>
              <p className="text-[0.68rem] text-mb-ink-muted">{court.time}</p>
            </div>
            {/* NO `justify-self`. A grid item with `justify-self` other than
                `stretch` is sized by its MAX-CONTENT, so the name never
                truncated — it ran straight through the scoreline beside it.
                Reproduced at 1440 with the fixture's two 39-character
                Wolverhampton sides: both names painted over the 104 – 99 and
                over each other. `MbMatchRow` carries this exact note and this
                exact fix; these two panels never got it. Stretched to the
                track, `min-w-0` inside `TeamMark` does its job and the away
                mark's `reverse` is what puts it against the right edge. */}
            <TeamMark team={court.home} />
            <div className="flex flex-col items-center gap-0.5">
              {/* `.mb-score-box` sets the display face and a 26px min-width but
                  no figure set, so a live score stepping 9 -> 10 re-cut its own
                  box. These are the highest-frequency numerals on the screen;
                  HF-13 names them first. */}
              <span className="flex items-center gap-1.5">
                <span className="mb-score-box tabular-nums">{court.homeScore}</span>
                <span className="text-mb-ink-muted text-xs">–</span>
                <span className="mb-score-box tabular-nums">{court.awayScore}</span>
              </span>
              {/* Capped at the scoreline it sits under, so a long competition
                  name cannot widen the centre track at the names' expense. */}
              <span className="mb-kicker max-w-[76px] truncate">{court.setLabel}</span>
            </div>
            <TeamMark team={court.away} reverse />
            <span className="flex items-center gap-1">
              <span className="mb-live-dot" />
              <span className="matchbook-display text-[0.62rem] font-bold text-mb-red">
                Live
              </span>
            </span>
          </div>
        ))}
      </div>
    )}
    <FooterLink href="/competitions" label="View All Live Courts" />
  </Panel>
);

/* -------------------------------- Schedule -------------------------------- */

export const SchedulePanel = ({ items }: { items: MbScheduleItem[] }) => (
  <Panel title="Upcoming Schedule" meta={<MbPanelHeadLink href="/competitions" label="View Full Schedule" />}>
    {items.length === 0 ? (
      <PanelEmpty
        message="No upcoming matches exist yet — start a competition to fill the schedule."
        actionLabel="New competition"
        href="/competitions/new"
      />
    ) : (
      <div className="ml-3 flex grow flex-col divide-y divide-mb-rule border-l-2 border-mb-coral">
        {items.map((item, i) => (
          <div
            key={i}
            className="grid grow grid-cols-[42px_50px_1fr] items-center gap-1 py-2 pl-2.5 pr-2.5"
          >
            {/* The coral on this list is the 2px SPINE (coral job 4), which is
                a mark. The date beside it was a second coral doing the same job
                as a letterform: 10.24px/700 at 3.55:1 on `--mb-paper-bright`.
                Navy, and the spine keeps the accent. */}
            <div>
              <p className="matchbook-display text-[0.64rem] font-bold leading-tight">
                {item.day}
              </p>
              <p className="matchbook-display text-[0.64rem] font-bold leading-tight tabular-nums">
                {item.date}
              </p>
            </div>
            <p className="text-[0.72rem] font-semibold tabular-nums">{item.time}</p>
            <div className="flex items-center justify-between gap-1.5 min-w-0">
              {/* `basis-0 flex-1` on BOTH names, and `MbTeamName` on each.
                  Two separate failures met in this cell and each one alone
                  loses a team's identity:

                  1. shrink is proportional to BASE size, so a long name kept
                     its share and a short one paid for it — measured at 1440,
                     "Wolverhampton Wanderers Athletic Club B" held 58px while
                     "Apex" beside it was squeezed to 6px, which paints as no
                     name at all. An equal `basis-0` split gives each side the
                     same half whatever the two names measure.
                  2. within that half, end-truncation made the two Wolverhampton
                     sides the same string (F15). `MbTeamName` keeps the last
                     token, so "…B" and "…C" still separate them. */}
              <span className="flex min-w-0 flex-1 items-center gap-1">
                <Crest team={item.home} size={18} />
                <MbTeamName
                  name={item.home.name}
                  className="matchbook-display basis-0 flex-1 text-[0.72rem] font-semibold"
                />
                <span className="px-0.5 text-[0.6rem] text-mb-ink-muted">vs</span>
                <Crest team={item.away} size={18} />
                <MbTeamName
                  name={item.away.name}
                  className="matchbook-display basis-0 flex-1 text-[0.72rem] font-semibold"
                />
              </span>
              {/* 104 -> 72. `xl` is where this panel is narrowest on the
                  dashboard, so the widest cap was applied at the width with
                  the least to give. */}
              <span className="hidden xl:flex max-w-[72px] shrink-0 items-center gap-1 text-[0.62rem] text-mb-ink-muted">
                <MbIcon id="location" size={10} className="shrink-0" />
                <span className="truncate">{item.venue}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
    <FooterLink href="/competitions" label="View Full Schedule" />
  </Panel>
);

/* --------------------------------- Bracket -------------------------------- */

export const BracketPanel = ({ bracket }: { bracket: MbBracket | null }) => (
  <Panel title="Championship Bracket" meta={<MbPanelHeadLink href="/competitions" label="View Full Bracket" />}>
    {!bracket ? (
      <PanelEmpty
        message="No bracket exists yet — it appears once four or more teams are ranked."
        actionLabel="Create a bracket"
        href="/competitions/new"
      />
    ) : (
      <div className="flex items-center gap-0 px-4 py-4 flex-1">
        <div className="flex flex-col gap-4 flex-1 min-w-0">
          <p className="mb-kicker -mb-2">Semifinals</p>
          {bracket.semifinals.map((pair, i) => (
            <div key={i} className="flex items-stretch">
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                {pair.map((seed) => (
                  <div key={seed.seed} className="mb-seed-box">
                    <span className="matchbook-display w-4 text-center text-[0.72rem] font-bold tabular-nums text-mb-ink-muted">
                      {seed.seed}
                    </span>
                    <Crest team={seed.team} size={20} />
                    <MbTeamName
                      name={seed.team.name}
                      className="matchbook-display min-w-0 flex-1 text-[0.76rem] font-semibold"
                    />
                  </div>
                ))}
              </div>
              {/* Edge tier, 1px. The `[1.5px]` these four rules used to carry
                  never rendered — Blink floors a used border-width to whole CSS
                  pixels, so it painted 1px at DPR 1, 2 and 3 while claiming a
                  tier the system does not have. Same pixels, honest source. */}
              <div className="w-3 shrink-0 self-stretch my-3 border-y border-r border-mb-navy" />
            </div>
          ))}
        </div>
        <div className="w-4 shrink-0 border-t border-mb-navy" />
        <div className="flex w-[118px] shrink-0 flex-col items-center gap-1.5">
          <p className="mb-kicker self-start">Final</p>
          <div className="flex w-full items-center gap-2 border border-mb-navy bg-mb-paper-bright px-2.5 py-2">
            <MbIcon id="compete" size={20} className="text-mb-navy" />
            <span className="matchbook-display text-[0.76rem] font-semibold leading-tight text-mb-ink-muted">
              TBD
              <br />
              TBD
            </span>
          </div>
          <p className="text-center text-[0.62rem] leading-snug text-mb-ink-muted">
            {bracket.finalNote}
            <br />
            {bracket.finalVenue}
          </p>
        </div>
      </div>
    )}
    <FooterLink href="/competitions" label="View Full Bracket" />
  </Panel>
);

/* ----------------------------- Recent results ----------------------------- */

export const RecentResultsPanel = ({ results }: { results: MbRecentResult[] }) => (
  <Panel title="Recent Results" meta={<MbPanelHeadLink href="/summaries" label="View All Results" />}>
    {results.length === 0 ? (
      <PanelEmpty
        message="No results exist yet — finished matches will land here."
        actionLabel="Play a match"
        href="/quick-match"
      />
    ) : (
      <div className="flex grow flex-col divide-y divide-mb-rule">
        {results.map((r, i) => (
          <div
            key={i}
            /* Same `minmax(0,1fr)` on the name tracks, and the competition
               column trimmed 88 -> 64: it is revealed at `xl`, which on this
               dashboard is where the panel is NARROWEST (three across), so it
               was taking a quarter of the row from the two names it captions. */
            className="grid grow grid-cols-[44px_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 py-2.5 pl-3 pr-3 xl:grid-cols-[44px_minmax(0,1fr)_auto_minmax(0,1fr)_64px]"
            style={{ boxShadow: `inset 3px 0 0 ${r.accent}` }}
          >
            <p className="matchbook-display text-[0.66rem] font-bold leading-tight text-mb-ink-muted">
              {r.date}
            </p>
            {/* Same `justify-self` defect as Live Courts above: max-content
                sizing meant the two 39-character names in this fixture printed
                over the scoreline between them. */}
            <TeamMark team={r.home} />
            <span className="matchbook-display whitespace-nowrap text-[0.95rem] font-bold tabular-nums">
              {r.homeScore} – {r.awayScore}
            </span>
            <TeamMark team={r.away} reverse />
            <span className="hidden truncate text-right text-[0.64rem] text-mb-ink-muted xl:block">
              {r.venue}
            </span>
          </div>
        ))}
      </div>
    )}
    <FooterLink href="/summaries" label="View Full Match History" />
  </Panel>
);

/* ----------------------------- Team readiness ----------------------------- */

export const ReadinessPanel = ({ rows }: { rows: MbReadinessRow[] }) => (
  <Panel title="Team Readiness" meta={<MbPanelHeadLink href="/teams" label="View All Teams" />}>
    {rows.length === 0 ? (
      <PanelEmpty
        message="No teams exist yet — add teams to track their form and readiness."
        actionLabel="Create a team"
        href="/teams"
      />
    ) : (
      <MbTableScroll>
        <table className="mb-table mb-table-compact w-full border-collapse">
          <thead>
            <tr>
              <th className="pl-3!">Team</th>
              <th>Ready %</th>
              <th>Form (Last 5)</th>
              <th className="pr-3! text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.team.name}>
                <td className="pl-3!">
                  <TeamMark team={row.team} size={20} />
                </td>
                <td>
                  <span className="flex items-center gap-1.5">
                    <span className="w-7 text-[0.74rem] font-semibold tabular-nums">
                      {row.percent}%
                    </span>
                    {/* `rounded-[2px]`, not `rounded-sm`: while the legacy
                        `:root` lived, `--radius-sm` was `calc(0.75rem - 4px)`
                        and this 7px bar rendered an 8px radius — off the
                        4/3/2/999 vocabulary (invariant 24) and inherited from
                        the pre-Matchbook system rather than chosen. 2px is
                        what `.mb-meter` itself uses. */}
                    <span className="h-[7px] w-12 overflow-hidden rounded-[2px] bg-[var(--mb-tint-3)]">
                      <span
                        className="block h-full"
                        style={{
                          width: `${row.percent}%`,
                          background: readinessColor(row.percent),
                        }}
                      />
                    </span>
                  </span>
                </td>
                <td>
                  <FormLetters form={row.form} />
                </td>
                {/* Ink, not mark: see `readinessInk`. The bar above keeps the
                    bright tone; the word takes the twin that clears 4.5:1. */}
                <td
                  className="matchbook-display pr-3! text-right text-[0.64rem] font-bold"
                  style={{ color: readinessInk(row.percent) }}
                >
                  {row.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </MbTableScroll>
    )}
    <FooterLink href="/teams" label="View Team Directory" />
  </Panel>
);

/* ------------------------------ Team leaders ------------------------------ */

export const LeadersPanel = ({
  leaders,
  totals,
}: {
  leaders: MbLeader[];
  totals: MbStatTotal[];
}) => (
  <Panel title="Team Leaders">
    {leaders.length === 0 ? (
      <PanelEmpty
        message="No team leaders exist yet — leaders are crowned once matches are recorded."
        actionLabel="Play a match"
        href="/quick-match"
      />
    ) : (
      <div className="grid flex-1 grid-cols-3 divide-x divide-mb-rule px-2 py-4">
        {leaders.map((leader) => (
          <div key={leader.stat} className="flex flex-col items-center gap-1 px-2 text-center">
            <Crest team={leader.team} size={54} />
            <span className="matchbook-display mt-1 text-[0.8rem] font-bold">
              {leader.team.name}
            </span>
            <span className="mb-kicker">{leader.stat}</span>
            <span className="matchbook-display text-4xl font-bold tabular-nums">
              {leader.value}
            </span>
          </div>
        ))}
      </div>
    )}
    {totals.length > 0 && (
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-mb-navy px-4 py-2">
        <span className="matchbook-display text-[0.68rem] font-bold tracking-[0.08em]">
          All-Time Totals
        </span>
        {totals.map((total) => (
          <span key={total.label} className="flex items-baseline gap-1.5">
            <span className="mb-kicker">{total.label}</span>
            <span className="matchbook-display text-[0.8rem] font-bold tabular-nums">
              {total.value}
            </span>
          </span>
        ))}
      </div>
    )}
  </Panel>
);
