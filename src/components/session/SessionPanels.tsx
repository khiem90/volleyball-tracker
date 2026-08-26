"use client";

/* The panels of the public scoreboard. One ordering rule: the live score
   comes first, always — `SessionBoard` is the first thing under the event
   strip at every width. Nothing here draws its own type scale, table or
   score; the matchbook components are used, not forked. */

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

/* A single live match gets the hero step; two or more are equals (nothing in
   the data ranks courts), so they all take the compact step in one column. */
export const SessionBoard = ({
  view,
  canEdit,
  ended,
  onOpenMatch,
}: {
  view: MbSessionView;
  canEdit: boolean;
  /** The event is over: the panel name and scoreboard status must both flip,
   *  or the board contradicts the banner above it. */
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
          {/* `aria-live` on the wrapper, once: each scoreboard is one sr-only
              sentence with its visible half aria-hidden, so a score change
              announces as a sentence, not a stream of digits. The standings
              table is deliberately NOT live. */}
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
            /* Expands in place — a viewer must not lose the score they were
               reading to a route change. */
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

/* A ruled three-up strip. No `meta` on the head — the event strip already
   carries that string two inches above it. */
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
      {/* "Still to play" is PENDING only — adding live matches counts the
          same fixtures twice across two cells. */}
      <div className="px-4 py-3.5">
        <MbStat
          tone="gold"
          icon="clock"
          label={ended ? "Never played" : "Still to play"}
          value={view.counts.upcoming}
        />
      </div>
      <div className="px-4 py-3.5">
        {/* Red = the live semantic, same ink as every live rail and dot. */}
        <MbStat
          tone={ended ? "gold" : "red"}
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
              /* A viewer gets static type, never a dead button. */
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

/* The rotation formats' waiting list — who is up next. */
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
            <span className="matchbook-display w-5 shrink-0 text-center text-[0.78rem] mb-track-display font-bold tabular-nums text-mb-ink-muted">
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
        {/* The legend is not optional here: this reader was handed a link and
            `<abbr title>` is a hover affordance a phone does not have. */}
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

/* A hairline and a sentence, below the fold — never a banner over the score. */
export const SessionFooter = ({
  shareCode,
  actions,
}: {
  shareCode: string;
  /**
   * Secondary actions live here, not in the navy strip: `MbMenu`'s plain
   * trigger is navy-on-transparent and renders invisible on the strip, so the
   * strip keeps one action (Share) and the rest land at the end of the page.
   */
  actions: { label: string; icon: string; onClick: () => void }[];
}) => (
  <footer className="mt-6 flex flex-col gap-3 border-t-[1.5px] border-mb-navy pt-4">
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <MbIcon id="volleyball" size={16} className="shrink-0 text-mb-navy" />
      <p className="min-w-0 text-[0.78rem] text-mb-ink-muted">
        Scored live with{" "}
        {/* `.mb-btn-touch` supplies the 44px floor; `inline-flex items-center`
            keeps the words on the box's centre line. */}
        <Link
          href="/"
          className="mb-panel-link mb-btn-touch inline-flex items-center align-middle"
        >
          Tournament Tracker
        </Link>
      </p>
      <span className="ml-auto flex items-center gap-2">
        <span className="mb-kicker">Code</span>
        <span className="mb-code-chip">{shareCode}</span>
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
