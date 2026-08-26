import Link from "next/link";
import { FORMAT_META, FORMAT_ORDER } from "./formatMeta";
import { MbMatchupPair } from "./MatchRow";
import { MbIcon } from "./MbIcon";
import { MbTableScroll } from "./TableScroll";
import { Crest, FormLetters, Panel, PanelEmpty, TeamMark } from "./Panel";
import { MbStandingsLegend, MbStandingsTable } from "./StandingsTable";
import { MbTeamName } from "./TeamName";
import { readinessColor, readinessInk } from "./teamStats";
import { TEAM_CREATE_LABEL } from "@/components/dialogs/team-form/labels";
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

/* The 44px floor on a panel link, in two shapes. `MB_PANEL_LINK_HIT` is a
   `::before` overlay that reaches 44px without changing the box (a
   pseudo-element is hit-tested as its originating element); `inset-x-0` keeps
   the expander inside the link's own column so it cannot swallow a click meant
   for the title. The footer link is full-width and the row a thumb goes for,
   so it takes a real 44px box instead. */
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

/* The void band above a footer link: `.mb-panel` is a flex column stretched to
   the tallest panel beside it, so a body with nothing that grows leaves a lump
   of blank paper above the footer. The lists and rows below carry `grow` so
   the rows share the stretch and the rules divide the whole column. `grow` and
   not `flex-1` on purpose: `flex-1`'s zero basis in an AUTO-height column
   inflates every row to the tallest one on a panel that is not being stretched
   at all; `grow` leaves the basis at `auto`, so with no free space these
   classes change nothing. */

/* ===========================================================================
   THE ZERO STATE — a screen with nothing to report is not eight empty panels,
   it is ONE screen with a different job:

     `MbStepsPanel`   the numbered progression, with the live step marked by
                      the coral selection rail and a word (survives greyscale).
     `MbLedgerPanel`  a ruled index — what the mute panels collapse into:
                      term + what makes it appear. The panels that would have
                      been empty are not rendered at all.
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
 * The numbered progression. It carries no button of its own: the masthead
 * already prints the one possible action, and `footer` is for a genuinely
 * DIFFERENT path, never a second copy of the first.
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
            /* The same 3px coral inset `EventRow` uses for the selected event. */
            style={current ? { boxShadow: "inset 3px 0 0 var(--mb-coral)" } : undefined}
          >
            <span
              className={`matchbook-display text-2xl mb-track-display font-bold leading-none tabular-nums ${
                current ? "" : "text-mb-ink-muted"
              }`}
            >
              {step.n}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p
                  className={`matchbook-display text-[0.95rem] mb-track-title ${
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
                <p className="matchbook-display mt-1.5 text-[0.66rem] mb-track-status font-bold tabular-nums">
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
   * A 3px contained rail. Decorative — the default is the neutral hairline.
   * Pass a token only when the rail restates a meaning already fixed to that
   * token; a categorical key built from semantic tokens is the collision that
   * got the format accents deleted (see `formatMeta.ts`).
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
  wide = false,
}: {
  title: string;
  rows: MbLedgerRow[];
  meta?: React.ReactNode;
  dense?: boolean;
  /**
   * `wide` caps the term column so the gloss stays beside the word it glosses
   * however wide the panel is — an even split across a whole page puts them
   * 780px apart. A prop AND a breakpoint: the prop says which panel is the
   * wide one, and `xl:` is where the twelve-column grid actually exists;
   * below it the even split is right.
   */
  wide?: boolean;
}) => (
  <Panel title={title} meta={meta}>
    <dl className="flex grow flex-col divide-y divide-mb-rule">
      {rows.map((row) =>
        dense ? (
          <div
            key={row.term}
            className={`grid grow grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] items-baseline gap-x-3 px-4 py-2.5 ${
              wide ? "xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]" : ""
            }`}
          >
            <dt className="matchbook-display text-[0.78rem] mb-track-display font-bold">{row.term}</dt>
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
              <dt className="matchbook-display text-[0.78rem] mb-track-display font-bold">{row.term}</dt>
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

/* ===========================================================================
   THE SPARSE STATE — the same collapse the zero state uses, applied per
   panel: a panel with nothing to say is not rendered, and the index below
   names what will fill it. `isFirstRun` cannot be widened to cover this: the
   instant a match is live the screen has something real to report, and the
   steps panel would hide the score. The collapse arms at TWO mute panels —
   one mute panel among populated ones is what an ordinary empty state is for.
   =========================================================================== */

/**
 * The objects the Overview prints, in the order it prints them.
 * `/competitions` names three of the same eight, so it draws its index from
 * this table rather than restating it — two screens promising the same thing
 * in two sentences is exactly the drift this table prevents.
 */
export type MbOverviewSection =
  | "standings"
  | "featured"
  | "live"
  | "schedule"
  | "bracket"
  | "results"
  | "readiness"
  | "leaders";

const OVERVIEW_INDEX: {
  key: MbOverviewSection;
  term: string;
  gloss: string;
}[] = [
  { key: "standings", term: "Standings", gloss: "Ranked from the first result on." },
  { key: "featured", term: "Match of the Day", gloss: "The latest match you finished." },
  { key: "live", term: "Live Courts", gloss: "Scores while a match is in progress." },
  { key: "schedule", term: "Upcoming Schedule", gloss: "Fixtures the format writes for you." },
  { key: "bracket", term: "Championship Bracket", gloss: "Once four teams are ranked." },
  { key: "results", term: "Recent Results", gloss: "Every finished match, newest first." },
  { key: "readiness", term: "Team Readiness", gloss: "Form and readiness, team by team." },
  { key: "leaders", term: "Team Leaders", gloss: "Wins, points and the longest streak." },
];

/**
 * What the Overview becomes, in the order the populated screen prints it.
 * Lives beside the panels it describes so the two cannot drift.
 */
export const MB_OVERVIEW_CONTENTS: MbLedgerRow[] = OVERVIEW_INDEX.map(
  ({ term, gloss }) => ({ term, gloss })
);

/**
 * The index for a SPARSE screen: the same rows, cut down to the panels that
 * were actually withheld, in the same order. Reading it back tells the reader
 * exactly what the page is still waiting for and nothing else.
 */
export const mbContentsFor = (
  sections: readonly MbOverviewSection[]
): MbLedgerRow[] =>
  OVERVIEW_INDEX.filter((row) => sections.includes(row.key)).map(
    ({ term, gloss }) => ({ term, gloss })
  );

/**
 * The span that closes the last row of a 12-column auto-flow grid, so the
 * index sits flush when panels are withheld. Walks the kept spans the way
 * `grid-auto-flow: row` does and returns what is left of the final row; under
 * four columns (or when the row is already flush) the index takes a full row
 * of its own.
 */
export const mbClosingSpan = (spans: readonly number[]): number => {
  let used = 0;
  for (const span of spans) used = used + span > 12 ? span : used + span;
  const rest = 12 - used;
  return rest >= 4 ? rest : 12;
};

/**
 * `xl:col-span-N` as a literal, because Tailwind scans source text and a
 * template string would compile to nothing.
 */
export const MB_XL_SPAN: Record<number, string> = {
  4: "xl:col-span-4",
  5: "xl:col-span-5",
  6: "xl:col-span-6",
  7: "xl:col-span-7",
  8: "xl:col-span-8",
  9: "xl:col-span-9",
  10: "xl:col-span-10",
  11: "xl:col-span-11",
  12: "xl:col-span-12",
};

/**
 * The five formats, in the wizard's own presentation order — DERIVED from
 * `FORMAT_META`, never retyped. No colour column: per-format rails spent
 * semantic tokens as a categorical key, so rows take the neutral rail and
 * identity is the glyph and the word. This is the choice the reader is about
 * to make, which is why it takes the ledger's full cut rather than the dense
 * one.
 */
export const MB_COMPETITION_FORMATS: MbLedgerRow[] = FORMAT_ORDER.map((type) => ({
  term: FORMAT_META[type].label,
  gloss: FORMAT_META[type].blurb,
  icon: FORMAT_META[type].icon,
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
    {/* The empty cut already carries an "Add teams" button to `/teams`; the
        footer belongs to the populated cut only, where the panel is a preview
        and the link is how you see the rest. */}
    {total > 0 && <FooterLink href="/teams" label="Open the Team Directory" />}
  </Panel>
);

/* ------------------------------- Standings ------------------------------- */

/**
 * The overview's league table: `MbStandingsTable`, the same component, column
 * order and `rankTeams()` ordering every other standings surface renders,
 * with the legend that names every abbreviation on screen.
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
        actionLabel={TEAM_CREATE_LABEL}
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
      <h2 className="matchbook-display text-[0.95rem] mb-track-title font-bold">
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
          <p className="matchbook-display text-[0.72rem] mb-track-link font-semibold">
            {match.division}
          </p>
          {/* Navy, not coral: coral fails the 4.5:1 text floor at this size,
              and a kick-off time is data, not a call to action. */}
          <p className="matchbook-display text-[0.8rem] mb-track-button font-bold tabular-nums">
            {match.time}
          </p>
        </div>
        {/* `minmax(0,1fr)`, never `1fr`: a bare `1fr` is `minmax(auto,1fr)` and
            `auto` as a track MINIMUM is min-content, so each name column's
            floor becomes the longest word in a club name — wide enough to
            stretch the document and push the fixed bottom nav off screen.

            Below 400px of container the row stacks to home / figures / away:
            `anywhere` breaks a word rather than a layout, and with 198px of
            fixed centre a 320px line leaves 34px per name — two characters a
            line. 400 = 2 x 100 + 198, where 100px holds the longest
            unbreakable roster token at this step. The figures keep their own
            line: they are the one object here that is not an identity, and
            splitting them across two rows makes the reader assemble the score
            from two places. The container is the row's own wrapper, not the
            panel — an `@container` query styles a container's DESCENDANTS,
            so the grid whose tracks change cannot also be the box measured. */}
        <div className="@container px-5 py-4">
          <div className="grid grid-cols-[minmax(0,1fr)] items-center justify-items-center gap-3 @min-[400px]:grid-cols-[minmax(0,1fr)_auto_auto_auto_minmax(0,1fr)]">
            <TeamMark
              team={match.home}
              size={58}
              orientation="vertical"
              wrap
              className="w-full @min-[400px]:w-auto"
            />
            {/* One row of figures below the cut, three grid items above it:
                `contents` stops the wrapper generating a box, so its children
                become grid items of the row itself. */}
            <span className="flex items-center gap-3 @min-[400px]:contents">
              <span className="matchbook-display text-5xl mb-track-masthead font-bold tabular-nums">
                {match.homeScore}
              </span>
              {/* `.mb-score-box` sets `font-size` UNLAYERED, so a text-size
                  utility here is inert; `mb-track-title` is that step's rung,
                  shared with the other VS pips. */}
              <span className="mb-score-box mb-track-title px-2">VS</span>
              <span className="matchbook-display text-5xl mb-track-masthead font-bold tabular-nums">
                {match.awayScore}
              </span>
            </span>
            <TeamMark
              team={match.away}
              size={58}
              orientation="vertical"
              wrap
              className="w-full @min-[400px]:w-auto"
            />
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
          <span className="flex items-center gap-1.5 text-[0.72rem] font-semibold">
            <MbIcon id="location" size={13} className="text-mb-navy" />
            <span className="matchbook-display mb-track-link">{match.venue}</span>
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
            /* `minmax(0,1fr)` because a bare `1fr`'s auto floor would let the
               pair push the row wide. `min-h-28` is the dashboard's shared
               112px schedule-row pitch: Live Courts and Upcoming Schedule sit
               side by side, and one pitch keeps row N's rule on the same y in
               both. The same pitch is on `UpcomingFixturesPanel`. */
            className="grid min-h-28 grow grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-3"
          >
            <div className="border-r border-mb-rule pr-2">
              <p className="matchbook-display text-[0.72rem] mb-track-link font-bold leading-tight">
                {court.court}
              </p>
              <p className="text-[0.66rem] text-mb-ink-muted">{court.time}</p>
            </div>
            {/* A four-of-twelve panel cannot hold two identities and a
                scoreline on one line, so `MbMatchupPair` gives each team its
                own line below 376px of container. `setLabel` sits under the
                pair — it is row meta, not part of the measure — and the
                pair's own two-figure reserve keeps a live 9 -> 10 from
                re-cutting anything. */}
            <div className="flex min-w-0 flex-col gap-1">
              <MbMatchupPair
                home={court.home}
                away={court.away}
                homeScore={court.homeScore}
                awayScore={court.awayScore}
                decided={false}
              />
              <span className="mb-kicker truncate">{court.setLabel}</span>
            </div>
            <span className="flex items-center gap-1">
              <span className="mb-live-dot" />
              <span className="matchbook-display text-[0.62rem] mb-track-nav font-bold text-mb-red">
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
      /* The spine is a navy edge, not coral: a timeline's left axis is
         structure, not selection, and coral's job list closed at three. */
      <div className="ml-3 flex grow flex-col divide-y divide-mb-rule border-l-[1.5px] border-mb-navy">
        {items.map((item, i) => (
          <div
            key={i}
            /* `min-h-28`: the shared schedule-row pitch — see Live Courts. */
            className="grid min-h-28 grow grid-cols-[42px_50px_minmax(0,1fr)] items-center gap-1 py-2 pl-2.5 pr-2.5"
          >
            <div>
              <p className="matchbook-display text-[0.66rem] mb-track-status font-bold leading-tight">
                {item.day}
              </p>
              {/* `mt-1.5`: at `leading-tight` Oswald's ink overruns its line
                  box, so without the margin the day's ink grazes the date's. */}
              <p className="matchbook-display mt-1.5 text-[0.66rem] mb-track-status font-bold leading-tight tabular-nums">
                {item.date}
              </p>
            </div>
            <p className="text-[0.72rem] font-semibold tabular-nums">{item.time}</p>
            <div className="flex min-w-0 flex-col gap-1">
              {/* No split of one line fits two club names in a 4-col panel —
                  one line is the problem — so `MbMatchupPair` reflows to one
                  line per team from its own container width. */}
              <MbMatchupPair home={item.home} away={item.away} note="vs" size="sm" />
              {/* The venue is a caption line under the pair, not a column in
                  the name line: there it costs the names nothing at any
                  width, and it matches Live Courts' set-label grammar. */}
              <span className="flex min-w-0 items-center gap-1 text-[0.66rem] text-mb-ink-muted">
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
      /* Stacked when the panel is narrow, the printed draw when it is not —
         and the panel's OWN width decides, not the viewport: this panel is
         narrower at 1280 (col-span-4) than at 768 (one column), so a media
         query would stack the wide case and spread the narrow one. The
         padding sits on the CONTAINER and the cut on its child: a container
         query styles descendants, never the container itself, so 320 is the
         content line the draw actually gets. */
      <div className="@container flex flex-1 flex-col px-4 py-4">
      <div className="flex flex-1 flex-col gap-4 @min-[320px]:flex-row @min-[320px]:items-center @min-[320px]:gap-0">
        <div className="flex flex-col gap-4 flex-1 min-w-0">
          <p className="mb-kicker -mb-2">Semifinals</p>
          {bracket.semifinals.map((pair, i) => (
            <div key={i} className="flex items-stretch">
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                {pair.map((seed) => (
                  <div key={seed.seed} className="mb-seed-box">
                    <span className="matchbook-display w-4 text-center text-[0.72rem] mb-track-link font-bold tabular-nums text-mb-ink-muted">
                      {seed.seed}
                    </span>
                    <Crest team={seed.team} size={20} />
                    <MbTeamName
                      name={seed.team.name}
                      className="matchbook-display min-w-0 flex-1 text-[0.78rem] mb-track-display font-semibold"
                    />
                  </div>
                ))}
              </div>
              {/* Edge tier, 1px — Blink floors a used border-width to whole
                  CSS pixels, so a fractional value here would lie. */}
              <div className="w-3 shrink-0 self-stretch my-3 border-y border-r border-mb-navy" />
            </div>
          ))}
        </div>
        {/* The elbow into the final only means anything beside the draw. */}
        <div className="hidden w-4 shrink-0 border-t border-mb-navy @min-[320px]:block" />
        <div className="flex w-full shrink-0 flex-col items-center gap-1.5 @min-[320px]:w-[118px]">
          <p className="mb-kicker self-start">Final</p>
          <div className="flex w-full items-center gap-2 border border-mb-navy bg-mb-paper-bright px-2.5 py-2">
            <MbIcon id="compete" size={20} className="text-mb-navy" />
            <span className="matchbook-display text-[0.78rem] mb-track-display font-semibold leading-tight text-mb-ink-muted">
              TBD
              <br />
              TBD
            </span>
          </div>
          <p className="text-center text-[0.66rem] leading-snug text-mb-ink-muted">
            {bracket.finalNote}
            <br />
            {bracket.finalVenue}
          </p>
        </div>
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
            /* `min-h-[92px]`: two units of the 46px lattice this band shares
               with Team Readiness beside it, so every rule in this ledger
               falls on a rule of the readiness table. */
            className="grid min-h-[92px] grow grid-cols-[44px_minmax(0,1fr)] items-center gap-2 py-2.5 pl-3 pr-3 xl:grid-cols-[44px_minmax(0,1fr)_64px]"
            style={{ boxShadow: `inset 3px 0 0 ${r.accent}` }}
          >
            <p className="matchbook-display text-[0.66rem] mb-track-status font-bold leading-tight text-mb-ink-muted">
              {r.date}
            </p>
            {/* `MbMatchupPair` reflows to one line per team below 376px of
                container — every width this `xl:col-span-4` panel has. */}
            <MbMatchupPair
              home={r.home}
              away={r.away}
              homeScore={r.homeScore}
              awayScore={r.awayScore}
              homeWon={r.homeScore > r.awayScore}
              awayWon={r.awayScore > r.homeScore}
            />
            <span className="hidden truncate text-right text-[0.66rem] text-mb-ink-muted xl:block">
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
        actionLabel={TEAM_CREATE_LABEL}
        href="/teams"
      />
    ) : (
      <MbTableScroll>
        {/* The 46px lattice: one unit per row here, two per Recent Results row
            beside it (92px), so the two panels' rules coincide. A `<tr>`
            height is a CSS minimum, so a future taller cell degrades the
            lattice rather than clipping. */}
        <table className="mb-table mb-table-compact w-full border-collapse">
          <thead>
            <tr className="h-[46px]">
              <th className="pl-3!">Team</th>
              <th>Ready %</th>
              <th>Form (Last 5)</th>
              <th className="pr-3! text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.team.name} className="h-[46px]">
                <td className="pl-3!">
                  <TeamMark team={row.team} size={20} />
                </td>
                <td>
                  <span className="flex items-center gap-1.5">
                    <span className="w-7 text-[0.72rem] font-semibold tabular-nums">
                      {row.percent}%
                    </span>
                    {/* `rounded-[2px]`, matching `.mb-meter`. */}
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
                {/* The bar keeps the bright tone; the word takes the ink twin
                    that clears 4.5:1 (`readinessInk`). */}
                <td
                  className="matchbook-display pr-3! text-right mb-track-display font-bold"
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
            <span className="matchbook-display mt-1 text-[0.8rem] mb-track-button font-bold">
              {leader.team.name}
            </span>
            <span className="mb-kicker">{leader.stat}</span>
            {/* `mt-1.5`: Oswald's ink at text-4xl overruns its line box, so
                without it the numeral's ascent grazes the kicker above. */}
            <span className="matchbook-display mt-1.5 text-4xl mb-track-masthead font-bold tabular-nums">
              {leader.value}
            </span>
          </div>
        ))}
      </div>
    )}
    {totals.length > 0 && (
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-mb-navy px-4 py-2">
        <span className="matchbook-display text-[0.66rem] mb-track-status font-bold">
          All-Time Totals
        </span>
        {totals.map((total) => (
          <span key={total.label} className="flex items-baseline gap-1.5">
            <span className="mb-kicker">{total.label}</span>
            <span className="matchbook-display text-[0.8rem] mb-track-button font-bold tabular-nums">
              {total.value}
            </span>
          </span>
        ))}
      </div>
    )}
  </Panel>
);
