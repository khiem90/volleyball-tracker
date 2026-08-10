"use client";

/* ===========================================================================
   THE PANELS OF THE PUBLIC SCOREBOARD (public-share brief §3.2, §3.3)

   The one ordering rule this screen has, and the reason it was rewritten:
   **the live score comes first, always.** The shipped page put a competition
   card, three counters and a fourteen-row standings table above it, so on a
   phone the score — the only thing anybody opens this link for — started at
   y ≈ 1,050. Here `SessionBoard` is the first thing under the event strip at
   every width, and everything else is below it.

   Nothing in this file draws its own type scale, its own table or its own
   score. `MbScoreboardHero`, `MbStandingsTable`, `MbMatchRow`, `BracketRail`
   and `MbCourtCard` are W4/W5's components and are used, not forked — which is
   also how this screen inherits three fixes for free: the clamped series game
   ("Game 4 of 3" cannot render), the `1fr auto 1fr` scoreline that a 20-
   character name can no longer collide with, and a bracket that does not draw
   its Semi-Finals column on top of its Quarter-Finals column at 390px.
   =========================================================================== */

import Link from "next/link";
import { useState } from "react";
import { MbButton } from "@/components/matchbook/Button";
import { BracketRail } from "@/components/matchbook/BracketRail";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { MbMatchRow } from "@/components/matchbook/MatchRow";
import { Panel, PanelEmpty, TeamMark } from "@/components/matchbook/Panel";
import { MbScoreboardHero } from "@/components/matchbook/ScoreboardHero";
import {
  MbStandingsLegend,
  MbStandingsTable,
} from "@/components/matchbook/StandingsTable";
import { MbStat } from "@/components/matchbook/Stat";
import {
  LEDGER_CAP,
  type MbSessionLine,
  type MbSessionQueueEntry,
  type MbSessionView,
} from "@/components/matchbook/useMatchbookSession";

/* ------------------------------------------------------------------- board */

/**
 * WHY ONE HERO AND THE REST COMPACT IS NOT THE RULE HERE.
 *
 * A single live match is the object of the page and gets the hero step
 * (`console`, 60px figures). Two or more are *equals* — nothing in the data
 * says which court matters more — so promoting whichever happened to sort
 * first would be an editorial claim the app cannot support. They all take the
 * compact step and sit in one column, which is also what keeps three live
 * courts inside one phone screen.
 */
export const SessionBoard = ({
  view,
  canEdit,
  ended,
  onOpenMatch,
}: {
  view: MbSessionView;
  canEdit: boolean;
  /**
   * The event is over. The panel changes its NAME and the scoreboards change
   * their STATUS — an ended board that still says "On court now" over a coral
   * `Live` pill contradicts the banner two inches above it, which is the exact
   * kind of disagreement a stranger reads as "this site is broken".
   */
  ended: boolean;
  onOpenMatch: (matchId: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const { shown, rest } = view.courts;
  const solo = view.live.length === 1;
  const courts = expanded ? view.live : shown;
  const next = view.nextUp[0];

  return (
    <Panel
      title={ended ? "Last on court" : "On court now"}
      tone="navy"
      icon={ended ? "check" : "live"}
    >
      {courts.length === 0 ? (
        <PanelEmpty
          message={
            ended
              ? "No match was in play when the event closed — the full ledger is below."
              : next && next.home && next.away
                ? `Nothing is being played right now — ${next.home.name} v ${next.away.name} is the next fixture.`
                : view.counts.final > 0
                  ? "Nothing is being played right now — every match in this event has finished."
                  : "Nothing is being played yet — this page updates by itself, so you can leave it open."
          }
        />
      ) : (
        <div className="flex flex-col gap-3 p-3">
          {/* `aria-live="polite"` on the wrapper, once. Each scoreboard carries
              a single `sr-only` sentence ("Live. Apex 15, Peak 10. Game 3 of
              3.") and its visible half is `aria-hidden`, so a score change is
              announced as one sentence rather than as a stream of digits — and
              the standings table below is deliberately NOT live, or every
              point would re-read fourteen rows (brief DoD 34). */}
          <div aria-live="polite" aria-atomic="false" className="flex flex-col gap-3">
            {courts.map((court) => (
              <MbScoreboardHero
                key={court.id}
                home={court.home}
                away={court.away}
                homeScore={court.homeScore}
                awayScore={court.awayScore}
                homeAccent={court.homeAccent}
                awayAccent={court.awayAccent}
                series={court.series}
                status={ended ? "final" : "live"}
                size={solo ? "hero" : "compact"}
                onSelect={canEdit ? () => onOpenMatch(court.id) : undefined}
              />
            ))}
          </div>

          {rest.length > 0 && (
            /* Expands IN PLACE. A public viewer who taps "3 more courts"
               must not lose the score they were reading to a route change. */
            <MbButton
              variant="outline-navy"
              size="md"
              fullWidth
              icon={expanded ? "collapse" : "expand"}
              onClick={() => setExpanded((open) => !open)}
            >
              {expanded
                ? "Show fewer courts"
                : `${rest.length} more ${rest.length === 1 ? "court" : "courts"}`}
            </MbButton>
          )}

          {canEdit && (
            <p className="mb-kicker px-1">
              Tap a scoreboard to change its score
            </p>
          )}
        </div>
      )}
    </Panel>
  );
};

/* ------------------------------------------------------------------ counts */

/**
 * A ruled three-up strip, not three cards and not a stacked column.
 *
 * The shipped page spent its first 150px of vertical on three `<Card>`s
 * carrying one number each, which at 390px is 450px of chrome above the score.
 * One panel, one row, hairline-separated cells: it costs ~96px at every width
 * and it reads left-to-right as a sentence — what is left, what is happening,
 * what is done.
 *
 * No `meta` on the head, deliberately: the first cut printed `view.metaLine`
 * there — "Round Robin · 8 teams" — which is the string the event strip is
 * already carrying two inches above it.
 */
export const SessionCounts = ({
  view,
  ended,
}: {
  view: MbSessionView;
  /** Past tense once the event is closed: nothing is "on court" any more. */
  ended: boolean;
}) => (
  <Panel title={ended ? "How it finished" : "Where it stands"} icon="chart">
    <div className="grid grid-cols-1 divide-y divide-mb-rule sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {/* `Still to play` is PENDING ONLY. The shipped counter added the live
          matches into it as well, so 3 pending + 2 live printed
          "Upcoming 5 / Live 2" — the same two matches, counted twice, on the
          first number a stranger reads (brief §2.4.3). */}
      <div className="px-4 py-3.5">
        <MbStat
          tone="gold"
          icon="clock"
          label={ended ? "Never played" : "Still to play"}
          value={view.counts.upcoming}
        />
      </div>
      <div className="px-4 py-3.5">
        <MbStat
          tone={ended ? "gold" : "coral"}
          icon={ended ? "warning" : "live"}
          label={ended ? "Left unfinished" : "On court"}
          value={view.counts.live}
        />
      </div>
      <div className="px-4 py-3.5">
        <MbStat tone="green" icon="check" label="Finished" value={view.counts.final} />
      </div>
    </div>
  </Panel>
);

/* ----------------------------------------------------------------- ledgers */

export const SessionLedger = ({
  title,
  icon,
  lines,
  variant,
  canEdit,
  onOpenMatch,
  emptyMessage,
}: {
  title: string;
  icon: string;
  lines: MbSessionLine[];
  variant: "schedule" | "result";
  canEdit: boolean;
  onOpenMatch: (matchId: string) => void;
  emptyMessage: string;
}) => {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? lines : lines.slice(0, LEDGER_CAP);
  const hidden = lines.length - visible.length;

  return (
    <Panel
      title={title}
      icon={icon}
      meta={
        lines.length > 0 ? (
          <span className="mb-kicker tabular-nums">
            {showAll || lines.length <= LEDGER_CAP
              ? `${lines.length}`
              : `${visible.length} of ${lines.length}`}
          </span>
        ) : undefined
      }
    >
      {lines.length === 0 ? (
        <PanelEmpty message={emptyMessage} />
      ) : (
        <div className="flex flex-col divide-y divide-mb-rule">
          {visible.map((line) => (
            <MbMatchRow
              key={line.id}
              label={line.label}
              home={line.home}
              away={line.away}
              homeScore={variant === "result" ? line.homeScore : undefined}
              awayScore={variant === "result" ? line.awayScore : undefined}
              homeWon={line.homeWon}
              awayWon={line.awayWon}
              status={line.status}
              variant={variant}
              /* A viewer gets static type, never a dead button (invariant 36
                 / brief DoD "canEdit === false renders a <div>"). */
              onSelect={canEdit ? () => onOpenMatch(line.id) : undefined}
            />
          ))}
          {hidden > 0 && (
            <div className="p-2">
              <MbButton
                variant="outline-navy"
                size="md"
                fullWidth
                icon="expand"
                onClick={() => setShowAll(true)}
              >
                Show all {lines.length}
              </MbButton>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
};

/* ------------------------------------------------------------------- queue */

/**
 * The rotation formats' waiting list. `win2outState.queue` and
 * `twoMatchRotationState.queue` are plain team-id arrays that the shipped
 * viewer never rendered at all — so a spectator watching a Win 2 & Out night
 * had no way to know who was up next, which is the single most asked question
 * at one of those events.
 */
export const SessionQueue = ({
  entries,
  venueWord,
}: {
  entries: MbSessionQueueEntry[];
  venueWord: string;
}) => (
  <Panel
    title="Waiting to play"
    icon="queue"
    meta={<span className="mb-kicker tabular-nums">{entries.length}</span>}
  >
    {entries.length === 0 ? (
      <PanelEmpty
        message={`Nobody is waiting — every team is on a ${venueWord.toLowerCase()}.`}
      />
    ) : (
      <ol className="flex flex-col divide-y divide-mb-rule">
        {entries.map((entry, index) => (
          <li key={entry.teamId} className="flex items-center gap-3 px-4 py-2.5">
            <span className="matchbook-display w-5 shrink-0 text-center text-[0.78rem] font-bold tabular-nums text-mb-ink-muted">
              {index + 1}
            </span>
            <TeamMark team={entry.team} size="sm" className="min-w-0 flex-1" />
            {entry.sub && (
              <span className="mb-kicker shrink-0 tabular-nums">{entry.sub}</span>
            )}
          </li>
        ))}
      </ol>
    )}
  </Panel>
);

/* ----------------------------------------------------------- format bodies */

export const SessionStandings = ({
  view,
  caption,
}: {
  view: MbSessionView;
  /** The event's own name — the table's caption is not "Standings" twice. */
  caption: string;
}) => (
  <Panel
    title="Standings"
    icon="chart"
    meta={
      <span className="mb-kicker tabular-nums">
        After {view.counts.final} {view.counts.final === 1 ? "match" : "matches"}
      </span>
    }
  >
    {!view.standings || view.standings.length === 0 ? (
      <PanelEmpty message="No table yet — it appears as soon as the first match is scored." />
    ) : (
      <>
        <MbStandingsTable rows={view.standings} caption={caption} />
        {/* The legend is not optional on THIS screen. Everywhere else in the
            app the reader built the competition and knows what PF and PD are;
            here they were handed a link. `<abbr title>` alone is a hover
            affordance, which on the phone this page is read on does not
            exist. */}
        <MbStandingsLegend />
      </>
    )}
  </Panel>
);

export const SessionBracket = ({
  view,
  canEdit,
  onOpenMatch,
}: {
  view: MbSessionView;
  canEdit: boolean;
  onOpenMatch: (matchId: string) => void;
}) => (
  <Panel title="Bracket" icon="bracket">
    <BracketRail
      sections={view.bracket?.sections ?? []}
      variant={view.format === "double_elimination" ? "double" : "single"}
      onSelect={canEdit ? onOpenMatch : undefined}
      emptyMessage="No bracket yet — it is drawn when the organiser starts the event."
    />
  </Panel>
);

/* ------------------------------------------------------------------ footer */

/**
 * The one advertisement on the app's only public surface, and the only place
 * a stranger is told what they are looking at. It is a hairline and a
 * sentence, below the fold, never a banner over the score.
 */
export const SessionFooter = ({
  shareCode,
  actions,
}: {
  shareCode: string;
  /**
   * The page's secondary actions.
   *
   * They are here rather than behind an overflow menu in the navy strip, and
   * that is a decision about who this page is for. `MbMenu`'s icon trigger is
   * `tone="plain"` — navy ink on a transparent ground — so on the navy strip it
   * renders invisible, which is the trap `MbEventBar` documents for every
   * `.mb-btn` it hosts. Rather than override a kit component's ink from a call
   * site, the strip keeps ONE action (Share, the only one a stranger wants) and
   * the other two move to the end of the page, which is where "stop watching"
   * and "I can score this" belong on a page most readers will only scroll.
   */
  actions: { label: string; icon: string; onClick: () => void }[];
}) => (
  <footer className="mt-6 flex flex-col gap-3 border-t-[1.5px] border-mb-navy pt-4">
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <MbIcon id="volleyball" size={16} className="shrink-0 text-mb-navy" />
      <p className="min-w-0 text-[0.78rem] text-mb-ink-muted">
        Scored live with{" "}
        {/* `.mb-btn-touch` supplies the 44px floor, exactly as `AppShell` does
            for `.mb-skip-link`: measured at 115.5x17.3 without it, which is
            invariant 33's hard fail on the only outbound link this page has.
            The class is unlayered, so it beats nothing and loses to nothing;
            `inline-flex items-center` keeps the words on the box's centre line
            rather than parked at its top. */}
        <Link
          href="/"
          className="mb-panel-link mb-btn-touch inline-flex items-center align-middle"
        >
          Tournament Tracker
        </Link>
      </p>
      <span className="ml-auto flex items-center gap-2">
        <span className="mb-kicker">Code</span>
        <span className="mb-code-chip text-[0.72rem]">{shareCode}</span>
      </span>
    </div>
    {actions.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <MbButton
            key={action.label}
            variant="outline-navy"
            size="sm"
            icon={action.icon}
            onClick={action.onClick}
          >
            {action.label}
          </MbButton>
        ))}
      </div>
    )}
  </footer>
);
