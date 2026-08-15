"use client";

import Link from "next/link";
import { DeleteConfirmDialog } from "@/components/shared";
import { MatchbookShell } from "@/components/matchbook/AppShell";
import { MbButton } from "@/components/matchbook/Button";
import { MbCopyField } from "@/components/matchbook/CopyField";
import { MbDangerZone } from "@/components/matchbook/DangerZone";
import { MbEmptyState, type MbEmptyStateTone } from "@/components/matchbook/EmptyState";
import { MbFinalStamp } from "@/components/matchbook/FinalStamp";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { MbMatchRow } from "@/components/matchbook/MatchRow";
import { MbPageLoading } from "@/components/matchbook/Loading";
import { Crest, FormLetters, Panel, PanelEmpty, TeamMark } from "@/components/matchbook/Panel";
import { MbScoreboardHero } from "@/components/matchbook/ScoreboardHero";
import {
  MbStandingsLegend,
  MbStandingsTable,
} from "@/components/matchbook/StandingsTable";
import { MbStat } from "@/components/matchbook/Stat";
import {
  MB_SUMMARY_LEDGER_CAP,
  useMatchbookSummary,
  type MbSummaryDay,
  type MbSummaryHighlight,
} from "@/components/matchbook/useMatchbookSummary";

/* ===========================================================================
   THE MATCH REPORT — /summary/[shareCode]

   The back page of a sports almanac, which is what the Matchbook system was
   drawn to be. It is the only screen in the product that is *finished*: the
   scores cannot change, nobody is going to tap anything, and the two things it
   is for are being screenshotted into a group chat and being printed and put
   on a wall.

   Both of those set the layout:

     - The headline is the RESULT, full bleed, at the top. `MbScoreboardHero`
       at `size="hero"` takes the whole 12-column row precisely so the wide
       `1fr auto 1fr` cut clears its 620px container threshold and the box
       score reads as a box score. In a 7-column panel it would fall to the
       stacked phone cut on a 1440px screen, which is the correct behaviour of
       that component and the wrong picture for this page.
     - Nothing is behind a tab. `@media print` in `globals.css` has existed
       since P0 and has never been exercised; a tabbed report prints one tab.
       Every section is mounted, in reading order, and the ledger's capped rows
       are `hidden print:block` so a printed report carries all of them while
       the screen still stops at 25 (brief S22).

   Interaction is deliberately almost absent. `MbMatchRow` is rendered without
   `onSelect`, so it draws as static type rather than as 48 dead buttons — a
   frozen snapshot has nothing to open. The two controls that exist are Share
   and Export, plus Delete for the creator, and Delete lives at the very bottom
   in `MbDangerZone`, never in the masthead beside Share (invariant 35).
   =========================================================================== */

/* ------------------------------------------------------------ failure copy */

interface RouteFailure {
  tone: MbEmptyStateTone;
  title: string;
  body: (code: string) => string;
  retry: boolean;
}

const FAILURE: Record<"notfound" | "error" | "unconfigured", RouteFailure> = {
  notfound: {
    tone: "notfound",
    title: "No such match report",
    body: (code) =>
      `Nothing here answers to the code ${code || "you used"}. Reports are created when a session ends, and the person who ran it can delete one at any time — ask them for a fresh link.`,
    retry: false,
  },
  error: {
    tone: "offline",
    title: "This report could not be reached",
    body: () =>
      "The connection to the report store timed out. The link is almost certainly fine — try again in a moment.",
    retry: true,
  },
  unconfigured: {
    tone: "unconfigured",
    title: "Shared reports are switched off here",
    body: () =>
      "This copy of Tournament Tracker is not set up to publish reports. Nothing is wrong with the link you were sent.",
    retry: false,
  },
};

/* ----------------------------------------------------------------- pieces */

/** One day of the ledger. An empty label means the day above continues. */
const LedgerDay = ({ day }: { day: MbSummaryDay }) => (
  <>
    {day.label && (
      <p className="mb-day-head" suppressHydrationWarning>
        {day.label}
      </p>
    )}
    <div className="flex flex-col divide-y divide-mb-rule">
      {day.entries.map((entry) => (
        <MbMatchRow
          key={entry.id}
          label={entry.label}
          subLabel={entry.time}
          home={entry.home}
          away={entry.away}
          homeScore={entry.homeScore}
          awayScore={entry.awayScore}
          homeWon={entry.homeWon}
          awayWon={entry.awayWon}
          status="completed"
          variant="result"
        />
      ))}
    </div>
  </>
);

/**
 * A named result — the biggest win, the closest match. Both live in one panel
 * rather than two: as separate 4-column tiles they stretched to the height of
 * the share panel beside them and each carried ~110px of content in a ~300px
 * box, which is the "lone card in empty space" the rubric fails outright.
 */
const Standout = ({
  highlight,
  emptyMessage,
  kicker,
  first,
}: {
  highlight: MbSummaryHighlight | null;
  emptyMessage: string;
  kicker: string;
  first?: boolean;
}) => (
  <div className={first ? "" : "border-t border-mb-navy"}>
    <p className="mb-day-head">{kicker}</p>
    {!highlight ? (
      <PanelEmpty message={emptyMessage} />
    ) : (
      <>
        <MbMatchRow
          label={highlight.entry.label}
          subLabel={highlight.entry.time}
          home={highlight.entry.home}
          away={highlight.entry.away}
          homeScore={highlight.entry.homeScore}
          awayScore={highlight.entry.awayScore}
          homeWon={highlight.entry.homeWon}
          awayWon={highlight.entry.awayWon}
          status="completed"
          variant="result"
        />
        <p className="border-t border-mb-rule px-4 py-2.5 text-[0.78rem] tabular-nums text-mb-ink-muted">
          {highlight.note}
        </p>
      </>
    )}
  </div>
);

const RecordItem = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="border-b border-mb-rule px-4 py-2.5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
    <dt className="mb-kicker">{label}</dt>
    <dd
      className="matchbook-display mt-1 text-[0.82rem] mb-track-display font-bold tabular-nums"
      suppressHydrationWarning
    >
      {children}
    </dd>
  </div>
);

/* -------------------------------------------------------------------- page */

export default function SummaryPage() {
  const data = useMatchbookSummary();

  if (data.status === "loading") {
    return <MbPageLoading variant="public" panels={4} />;
  }

  if (data.status !== "ready") {
    const failure = FAILURE[data.status];
    return (
      <MatchbookShell variant="public">
        <MbEmptyState
          tone={failure.tone}
          title={failure.title}
          body={failure.body(data.shareCode)}
          actions={[
            ...(failure.retry
              ? [{ label: "Try again", onClick: data.retry, tone: "coral" as const }]
              : []),
            { label: "Go to Tournament Tracker", href: "/" },
          ]}
        />
      </MatchbookShell>
    );
  }

  const { champion, decider, levelAtTop } = data;
  const hasRest = data.ledgerRest.length > 0;
  const shownRows = Math.min(data.totalResults, MB_SUMMARY_LEDGER_CAP);

  return (
    <MatchbookShell
      variant="public"
      masthead={{
        /* The title is the event's own name, so it carries no two-tone split:
           an invented coral word inside somebody else's league name is an
           emphasis nobody asked for. Coral's one appearance on this screen is
           the Share key; the masthead badge frame is its declared structural
           job. Same rule the shared-formation viewer settled on. */
        title: data.name,
        shortTitle: data.name,
        badge: { lines: ["Match", "Report"] },
        status: <MbFinalStamp label="Full time" />,
        dateLine: `Ended ${data.endedLine}`,
        subLine: data.metaLine,
        actions: [
          {
            label: "Share report",
            icon: "share",
            tone: "coral",
            onClick: data.share,
          },
        ],
      }}
    >
      <div className="mb-enter-grid grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* ---------------------------------------------------- full time */}
        <div className="xl:col-span-12">
          <Panel title="Full Time" tone="navy" icon="crown">
            {!data.playedAny ? (
              <PanelEmpty message="No matches were played — this session ended before a result was recorded." />
            ) : (
              <div className="flex flex-col">
                {champion ? (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-5 sm:px-5">
                    <Crest team={champion.team} size={64} />
                    <div className="min-w-0 flex-1">
                      <p className="mb-kicker flex items-center gap-1.5">
                        <MbIcon id="crown" size={13} className="shrink-0" />
                        Champion
                      </p>
                      <p className="matchbook-display mt-1.5 break-words text-[1.875rem] mb-track-display font-bold leading-none">
                        {champion.team.name}
                      </p>
                      {champion.accent && (
                        <span
                          aria-hidden="true"
                          className="mt-2 block h-[3px] w-16"
                          style={{ background: champion.accent }}
                        />
                      )}
                      <p className="mt-2.5 text-[0.8rem] tabular-nums text-mb-ink-muted">
                        {champion.basis}
                      </p>
                      <p className="matchbook-display mt-1 text-[0.82rem] mb-track-display font-bold tabular-nums">
                        {champion.record}
                      </p>
                    </div>
                    <span className="flex shrink-0 flex-col items-start gap-1.5">
                      <span className="mb-kicker">Form</span>
                      <FormLetters form={champion.form} />
                    </span>
                  </div>
                ) : (
                  /* Brief S19: the block is never dropped in silence. Who was
                     level, and on what, is the report's actual finding. */
                  <div className="px-4 py-5 sm:px-5">
                    <p className="mb-kicker">No outright winner</p>
                    <p className="matchbook-display mt-1.5 text-[1.2rem] mb-track-display font-bold leading-tight tabular-nums">
                      {levelAtTop?.teams.length ?? 0} teams finished level on{" "}
                      {levelAtTop?.points ?? 0} points
                    </p>
                    <span className="mt-2 block h-px w-16 bg-mb-navy" />
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                      {levelAtTop?.teams.map((team) => (
                        <TeamMark key={team.name} team={team} size="md" />
                      ))}
                    </div>
                  </div>
                )}

                {decider && (
                  <div className="border-t border-mb-navy px-4 py-4 sm:px-5">
                    <p className="mb-kicker mb-2.5">{decider.kicker}</p>
                    <MbScoreboardHero
                      home={decider.entry.home}
                      away={decider.entry.away}
                      homeScore={decider.entry.homeScore}
                      awayScore={decider.entry.awayScore}
                      status="final"
                      size="hero"
                    />
                  </div>
                )}
              </div>
            )}
          </Panel>
        </div>

        {/* -------------------------------------------------- final table */}
        <div className="xl:col-span-7">
          <Panel
            title="Final Table"
            icon="chart"
            meta={
              <span className="mb-kicker tabular-nums">
                {data.entered.length} Entered
              </span>
            }
          >
            {!data.playedAny ? (
              /* Brief S18: a 0-0 table ranked 1st to 4th asserts an order that
                 nothing produced. The entrants are listed unranked instead. */
              <div className="flex flex-col">
                <p className="mb-day-head">Entered, unranked — no matches played</p>
                <div className="flex flex-col divide-y divide-mb-rule">
                  {data.entered.map((row) => (
                    <div key={row.id} className="px-4 py-2.5">
                      <TeamMark team={row.team} size="md" accent={row.accent} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <MbStandingsTable
                  rows={data.standings}
                  caption={`${data.name} — final standings, ${data.formatLabel}`}
                  highlightTeamId={champion?.teamId}
                />
                <MbStandingsLegend />
              </>
            )}
          </Panel>
        </div>

        {/* ----------------------------------------------- by the numbers */}
        <div className="xl:col-span-5">
          <Panel title="By The Numbers" icon="clipboard">
            {/* A ruled COLUMN, not a 2x3 grid of floating tiles. The panel
                stretches to the final table beside it — 8 entrants is 500px —
                and a 2-column grid left a third of the box blank whether the
                rows were packed or spread. Six ruled rows fill a tall box the
                way a printed record does, and each row gets the panel's full
                width for its label. */}
            <div className="flex flex-1 flex-col divide-y divide-mb-rule">
              {data.stats.map((stat) => (
                <div key={stat.label} className="px-4 py-3">
                  <MbStat
                    icon={stat.icon}
                    label={stat.label}
                    value={stat.value}
                    sub={stat.sub}
                  />
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* ------------------------------------------------- match ledger */}
        <div className="xl:col-span-12">
          <Panel
            title="Match Ledger"
            icon="history"
            meta={
              <span className="mb-kicker tabular-nums">
                {hasRest && !data.showAll
                  ? `${shownRows} of ${data.totalResults} results`
                  : `${data.totalResults} ${
                      data.totalResults === 1 ? "result" : "results"
                    }`}
              </span>
            }
          >
            {data.totalResults === 0 ? (
              <PanelEmpty message="No results exist yet — completed matches are recorded here as they finish." />
            ) : (
              <>
                {data.ledger.map((day, i) => (
                  <LedgerDay key={`${day.label}-${i}`} day={day} />
                ))}

                {/* The capped rows stay in the document and are revealed by
                    print, so `Cmd+P` produces the whole ledger without the
                    reader having to remember to expand it first. */}
                {hasRest && (
                  <div className={data.showAll ? undefined : "hidden print:block"}>
                    {data.ledgerRest.map((day, i) => (
                      <LedgerDay key={`rest-${day.label}-${i}`} day={day} />
                    ))}
                  </div>
                )}

                <div className="mb-print-hide flex flex-wrap items-center gap-3 border-t border-mb-navy px-4 py-3">
                  {hasRest && (
                    <MbButton
                      variant="outline-navy"
                      icon={data.showAll ? "collapse" : "expand"}
                      onClick={() => data.setShowAll(!data.showAll)}
                    >
                      {data.showAll
                        ? `Show first ${MB_SUMMARY_LEDGER_CAP}`
                        : `Show all ${data.totalResults}`}
                    </MbButton>
                  )}
                  <MbButton
                    variant="outline-navy"
                    icon="export"
                    onClick={data.downloadCsv}
                  >
                    Export CSV
                  </MbButton>
                </div>
              </>
            )}
          </Panel>
        </div>

        {/* ----------------------------------------------------- standouts */}
        <div className="xl:col-span-7">
          <Panel title="Standouts" icon="star">
            {/* One state, not two, when nothing was played at all. Four display
                headlines all reading "NO … EXISTS YET" appeared on the empty
                report before this — the equal-weight-state-headline problem
                register D-14 raises against `/competitions`, reproduced here. */}
            {!data.playedAny ? (
              <PanelEmpty message="No standouts exist yet — the biggest win and the closest match are named once matches have been played." />
            ) : (
              <>
                <Standout
                  first
                  kicker="Biggest win"
                  highlight={data.biggestWin}
                  emptyMessage="No biggest win exists yet — it is named once a match has been decided."
                />
                <Standout
                  kicker="Closest match"
                  highlight={data.closestMatch}
                  emptyMessage="No closest match exists yet — it is named once two matches have been played."
                />
              </>
            )}
          </Panel>
        </div>

        {/* --------------------------------------------------------- share */}
        <div className="mb-print-hide xl:col-span-5">
          <Panel title="Share &amp; Print" icon="share">
            <div className="flex flex-1 flex-col gap-3 p-4">
              <p className="text-[0.8rem] leading-[1.5] text-mb-ink-muted">
                Anyone with this link can read the report. It grants no access
                to the session it came from and carries no admin token — the
                scoring controls stayed behind.
              </p>
              {/* Always on screen, not behind a failure. It is the manual leg
                  of the copy chain (charter D-8) and it is also the answer to
                  "read me the link" out loud. */}
              <MbCopyField
                label="Public report link"
                value={data.shareUrl}
                help="Paste it into a chat, or print the page for the wall."
              />
              {/* The one control in the app that reaches `@media print`. The
                  stylesheet drops the chrome, the actions and the 25-row cap,
                  so the sheet that comes out is the whole record in one
                  column. */}
              <MbButton
                variant="navy"
                icon="print"
                fullWidth
                className="mt-auto"
                onClick={() => window.print()}
              >
                Print report
              </MbButton>
            </div>
          </Panel>
        </div>

        {/* -------------------------------------------------------- record */}
        <div className="xl:col-span-12">
          <Panel title="The Record" icon="calendar">
            <dl className="grid grid-cols-1 sm:grid-cols-4">
              <RecordItem label="Started">{data.startedLine}</RecordItem>
              <RecordItem label="Ended">{data.endedLine}</RecordItem>
              <RecordItem label="Format">{data.formatLabel}</RecordItem>
              <RecordItem label="Report code">
                <span className="mb-code-chip">{data.shareCode}</span>
              </RecordItem>
            </dl>
          </Panel>
        </div>
      </div>

      {/* Creator only, last on the page, and never beside Share. */}
      {data.isCreator && (
        <div className="mb-print-hide mt-4">
          <MbDangerZone
            title="Delete this report"
            description="The link stops working for everyone who has it, and the record cannot be rebuilt."
            action={{
              label: "Delete report",
              onClick: () => data.setShowDeleteDialog(true),
              loading: data.isDeleting,
            }}
          />
        </div>
      )}

      {/* The colophon. The one place this page advertises what made it, and
          the only line that survives onto paper — the public brand lockup at
          the top of `variant="public"` carries `.mb-print-hide`. */}
      <footer className="mb-safe-bottom mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t-[1.5px] border-mb-navy pt-3">
        <Link
          href="/"
          className="mb-btn-touch matchbook-display flex items-center gap-2 text-[0.72rem] mb-track-link font-bold text-mb-navy"
        >
          <MbIcon id="volleyball" size={16} className="shrink-0" />
          Scored live with Tournament Tracker
        </Link>
        <p className="mb-kicker tabular-nums" suppressHydrationWarning>
          {data.startedLine} — {data.endedLine} · Code {data.shareCode}
        </p>
      </footer>

      <DeleteConfirmDialog
        open={data.showDeleteDialog}
        onOpenChange={data.setShowDeleteDialog}
        title="Delete This Report?"
        description={`"${data.name}" and its public link are removed for everyone. The matches themselves are not affected.`}
        onConfirm={data.handleDelete}
        isDeleting={data.isDeleting}
      />
    </MatchbookShell>
  );
}
