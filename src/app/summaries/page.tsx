"use client";

import { useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useSummariesPage } from "@/hooks/useSummariesPage";
import { DeleteConfirmDialog } from "@/components/shared";
import { MatchbookShell, MB_DEFAULT_CTA } from "@/components/matchbook/AppShell";
import { MbPageLoading } from "@/components/matchbook/Loading";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { MbMenu } from "@/components/matchbook/Menu";
import { MbSelect, MbTextInput } from "@/components/matchbook/form";
import { MbMatchupPair } from "@/components/matchbook/MatchRow";
import { Crest, Panel, PanelEmpty, TeamMark } from "@/components/matchbook/Panel";
import { MbLedgerPanel, MbPanelHeadLink } from "@/components/matchbook/panels";
import {
  mbArchiveContentsFor,
  useMatchbookHistory,
  type MbArchiveSection,
} from "@/components/matchbook/useMatchbookHistory";

/* ===========================================================================
   MATCH ARCHIVE

   The worst touch score of the six: 35 of 42 interactive nodes under 44px at
   390x844. Seven were the deleted mobile bar; the rest were this screen's own
   — two 42.4px filter selects, a 21.6px search input, and twenty-five 38.6px
   ledger rows. The selects and the field are now `MbSelect` / `MbTextInput`,
   which pin `min-height` to the control ladder rather than deriving a height
   from padding, and the ledger row's padding is set from the floor rather than
   from a guess.

   --------------------------------------------------- the archive with nothing in it

   Measured on a brand-new account at 390px this route was 1600px carrying SIX
   display headlines — the worst screen in the build. Three things made it, and
   only one of them was the headlines:

     251px  a filter bar filtering a set of zero: two selects reading "All
            Competitions" / "All Teams" over empty option lists, and a search
            field over nothing to search.
      48px  a masthead whose ONLY action was "Export CSV", `disabled`, because
            there is nothing to export. The screen offered no move at all.
     963px  six panels, each an empty state, each with its own display headline
            and its own hung rule.

   All three answer to the same reading: an archive is a record of things that
   happened, and on this account nothing has. So it says that ONCE, on the
   ledger — the object the whole screen is named for — and the other five
   collapse into one ruled index that names what puts something in each of
   them. The filter bar is not rendered, because a control that cannot change
   what is on screen is furniture; and the masthead action becomes the one move
   that fills an archive.

   The collapse is `panels.tsx`'s, not a new one, and it arms at TWO exactly as
   `/` and `/competitions` do — one mute panel among five populated ones is what
   `PanelEmpty` is for. The ledger is exempt for the same reason `/competitions`
   exempts its main panel: it is the principal object, its empty state names the
   one thing to do next, and it is where a filter miss has to be reported.

   `mbClosingSpan` is not used here and does not apply: this screen is not a
   twelve-column auto-flow of panels but two COLUMN STACKS (7 + 5), so a
   withheld panel shortens its column rather than stranding the next one beside
   a hole. The index takes the right column's own 5, which is the same 7+5 the
   first-run Overview sets.

   Populated behaviour is untouched, measured not asserted: on the full fixture
   `muteSections` is empty and `shared` is still loading, so `collapsed` is
   false, the filter bar renders, "Export CSV" is the masthead action, and all
   six panels sit in the two columns they always did.
   =========================================================================== */

const SummaryStat = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) => (
  <div className="flex items-center gap-3">
    {/* `.mb-icon-disc` is the system's named 999px, and the only round this
        screen is allowed. `rounded-full` compiled to `calc(infinity * 1px)` —
        3.35544e+07px in the D2 census, a second spelling of the same shape. */}
    <span className="mb-icon-disc h-9 w-9">
      <MbIcon id={icon} size={16} />
    </span>
    <div>
      <p className="mb-kicker">{label}</p>
      {/* 1.2rem, not 1.15rem: `display/stat-sm` is the named step and §2.1
          points it at `SummaryStat` values by name. 1.15rem was a 0.05rem drift
          off it, and it shipped four times on this screen. */}
      <p className="matchbook-display text-[1.2rem] mb-track-display font-bold leading-tight tabular-nums">
        {value}
      </p>
    </div>
  </div>
);

export default function HistoryPage() {
  const { isLoading: authLoading, isAuthenticated } = useRequireAuth();
  const [competitionId, setCompetitionId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [query, setQuery] = useState("");
  const data = useMatchbookHistory({ competitionId, teamId, query });
  const shared = useSummariesPage();

  if (authLoading || !isAuthenticated) {
    return <MbPageLoading active="/summaries" />;
  }

  const report = data.report;

  /* Shared reports come from Firestore, so the hook that owns the local archive
     cannot decide this one. It counts as mute only once that load has actually
     settled — withholding it while it is still loading would pull a panel out
     from under the reader, which is the layout shift HF-3 names. */
  const muteSections: MbArchiveSection[] =
    !shared.isLoading && shared.summaries.length === 0
      ? [...data.muteSections, "shared"]
      : data.muteSections;

  const collapsed = muteSections.length >= 2;
  const kept = (key: MbArchiveSection) =>
    !collapsed || !muteSections.includes(key);

  /* Nothing has ever been recorded, so nothing can be filtered and nothing can
     be exported. Both tests read the WHOLE archive, never the filtered count:
     a filter that matches nothing must keep its own controls on screen. */
  const hasArchive = data.totalResults > 0;

  return (
    <MatchbookShell
      active="/summaries"
      cta={MB_DEFAULT_CTA}
      masthead={{
        title: (
          <>
            Match <span className="text-mb-coral">Archive</span>
          </>
        ),
        shortTitle: "History",
        badge: { value: data.totalResults, label: "Results" },
        dateLine: "All-Time Archive",
        subLine: data.dateLine,
        /* The one action, and it is always performable. "Export CSV" on an
           archive of nothing is a `disabled` button in the position a thumb
           reaches first, on a screen that offered no other move; the move that
           actually fills an archive is playing a match. Navy in both branches
           — the rail already spends the screen's one coral fill (invariant
           15), and `MB_DEFAULT_CTA` is Quick Match, so the empty branch's
           masthead action and the rail key agree rather than compete. */
        actions: hasArchive
          ? [
              {
                label: "Export CSV",
                icon: "export",
                tone: "navy",
                onClick: data.downloadCsv,
                disabled: data.filteredCount === 0,
              },
            ]
          : [
              {
                label: "Play Your First Match",
                href: "/quick-match",
                icon: "quick",
                tone: "navy",
              },
            ],
      }}
    >
      {/* Filter bar. `items-end` on a row whose controls are now 48px keeps the
          three labels on one baseline; below `sm` each takes a full line rather
          than shrinking a select to the width of its chevron.

          Withheld outright when the archive is empty. Measured at 390 it is
          251px — three labelled 48px controls, stacked — and every one of them
          filters a set of zero over an empty option list: the Competition
          select had only "All Competitions" in it, the Team select only "All
          Teams", and the search field nothing to search. A control that cannot
          change what is on screen is furniture, and this was the single
          largest object on the empty screen after the panels themselves. */}
      {hasArchive && (
      <div className="mb-4 flex flex-wrap items-end gap-3 border-y border-mb-navy py-3">
        {/* `basis-full` below `sm`. Sharing the 358px content line with the
            Team select left this control 173px wide and its own value clipped
            to "ALL COMPETITIO…" — and a real selection clips harder ("FRIDAY
            NIGHT WI…"), so the reader could not read the filter they had set.
            A filter's current value is not redundant context, so it takes the
            line rather than the ellipsis. */}
        <div className="basis-full sm:basis-auto min-w-[11rem] flex-1 sm:max-w-[14rem]">
          <p className="mb-kicker mb-1">Competition</p>
          <MbSelect
            aria-label="Filter by competition"
            value={competitionId}
            onChange={(e) => setCompetitionId(e.target.value)}
            placeholder="All Competitions"
            options={data.filterOptions.competitions.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
          />
        </div>
        <div className="min-w-[10rem] flex-1 sm:max-w-[12rem]">
          <p className="mb-kicker mb-1">Team</p>
          <MbSelect
            aria-label="Filter by team"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            placeholder="All Teams"
            options={data.filterOptions.teams.map((t) => ({
              value: t.id,
              label: t.name,
            }))}
          />
        </div>
        <div className="min-w-[200px] flex-[2]">
          <p className="mb-kicker mb-1">Search</p>
          <MbTextInput
            type="search"
            aria-label="Search matches, teams and competitions"
            placeholder="Search matches, teams, competitions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            trailing={
              <MbIcon id="search" size={15} className="shrink-0 text-mb-navy" />
            }
          />
        </div>
      </div>
      )}

      <div className="mb-enter-grid grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Left column */}
        <div className="flex flex-col gap-4 xl:col-span-7">
          <Panel
            title="Results Ledger"
            meta={
              <span className="mb-kicker tabular-nums">{data.filteredCount} Results</span>
            }
          >
            {data.days.length === 0 ? (
              /* Two different nothings, and they were one message before.
                 With an archive on the books an empty ledger means the FILTER
                 matched nothing, and "finished matches will be recorded here"
                 is then untrue and unactionable — the move is to clear the
                 filter, so the block says that and offers the control that
                 does it.

                 With no archive at all it carries no action: the masthead
                 already prints "Play Your First Match" at the top of the page
                 in the position a thumb reaches first, and `MbStepsPanel`'s
                 own note names printing it a second time 300px lower as how a
                 screen ends up with twenty controls and no primary. */
              hasArchive ? (
                <PanelEmpty
                  tone="notfound"
                  message="No results match these filters — clear them to see the whole archive."
                  actionLabel="Clear filters"
                  onAction={() => {
                    setCompetitionId("");
                    setTeamId("");
                    setQuery("");
                  }}
                />
              ) : (
                <PanelEmpty message="No results exist yet — every match you finish is filed here, newest first." />
              )
            ) : (
              <div className="flex flex-col">
                {data.days.map((day) => (
                  <div key={day.label}>
                    <div className="flex items-center justify-between border-b border-mb-rule bg-[var(--mb-band)] px-4 py-1.5">
                      {/* `display/meta` — 0.74rem/700/0.1em, the step the
                          masthead dateline already prints on this screen. The
                          day band is the same object one level down, so it
                          joins that step instead of opening an 11.2px one. */}
                      <p className="matchbook-display text-[0.74rem] mb-track-status font-bold tabular-nums">
                        {day.label}
                      </p>
                      <p className="mb-kicker tabular-nums">
                        {day.entries.length}{" "}
                        {day.entries.length === 1 ? "match" : "matches"}
                      </p>
                    </div>
                    {day.entries.map((entry) => (
                      /* `mb-btn-touch` supplies the 44px floor the 0.5rem
                         padding could not: the row measured 38.6px, and there
                         are twenty-five of them on a phone. */
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => data.selectMatch(entry.id)}
                        aria-pressed={entry.id === data.selectedId}
                        /* `minmax(0,1fr)` for the matchup, and the matchup is
                           ONE cell now rather than three.

                           It was `[52px_1fr_auto_1fr_auto]` with
                           `justify-self-start` / `-end` on the two marks, and a
                           grid item with a `justify-self` other than `stretch`
                           is sized by its MAX-CONTENT — so with a real club
                           roster neither name ever truncated and both painted
                           straight through the score. Measured at 390 on the
                           first row: "Rovers" at x 176.7→223.7 over "25" at
                           197.3→212.6, 15.3px of overlap, six overlapping
                           pairs in that row alone; 128 across the ledger at
                           390, 262 at 320, worst 64.6px, nothing clipping any
                           of it. `MbMatchupPair` carries the note. */
                        className="mb-btn-touch mb-row-hover grid w-full cursor-pointer grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-2 border-b border-mb-rule px-4 py-2 text-left"
                        style={
                          entry.id === data.selectedId
                            ? { boxShadow: "inset 3px 0 0 var(--mb-coral)" }
                            : undefined
                        }
                      >
                        {/* `body/3xs`. 0.68rem was between steps and rendered
                            twenty-five times on this one screen. */}
                        <span className="text-[0.66rem] tabular-nums text-mb-ink-muted">
                          {entry.time}
                        </span>
                        {/* `md`: the ledger row's names are `display/team-mark`
                            (0.82rem), the step this row has always set. The
                            pair keeps the mirrored `Home 25 – 20 Away` line
                            wherever it has 376px — which is every width from
                            768 up, and 1440 gives it 407 — and drops to one
                            line per team below that, where the same line was
                            painting the score through both names. */}
                        <MbMatchupPair
                          home={entry.home}
                          away={entry.away}
                          homeScore={entry.homeScore}
                          awayScore={entry.awayScore}
                          homeWon={entry.homeWon}
                          awayWon={!entry.homeWon}
                          /* The model's `homeWon` is binary and its `winner`
                             is `homeWon ? home : away`, so a drawn match would
                             mute the home side as the loser. `decided` is off
                             when the figures are level: nothing is emphasised
                             rather than the wrong thing being emphasised. */
                          decided={entry.homeScore !== entry.awayScore}
                          size="md"
                        />
                        {/* `w-24` was under-provisioned at desktop: the D4
                            truncation census measured 16px lost on "Friday
                            Night Win 2 & Out" at 1440, in a column that had a
                            whole empty track beside it. `xl:w-40` clears it.
                            `truncate` stays — invariant 37 — because a long
                            enough event name must still cut rather than reflow
                            the ledger. */}
                        <span className="hidden w-24 truncate text-right text-[0.66rem] text-mb-ink-muted lg:block xl:w-40">
                          {entry.competition}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
                {data.filteredCount > 25 && (
                  <p className="px-4 py-2 text-center text-[0.72rem] tabular-nums text-mb-ink-muted">
                    Showing 25 of {data.filteredCount} results — refine filters or
                    export the full CSV.
                  </p>
                )}
              </div>
            )}
          </Panel>

          {kept("report") && (
          <Panel title="Match Report">
            {!report ? (
              <PanelEmpty message="No match report exists yet — pick a result from the ledger to see its report." />
            ) : (
              <div className="flex flex-1 flex-col gap-4 p-5 sm:flex-row sm:items-center">
                {/* `TeamMark`, not a raw crest over a raw span. The span had no
                    wrap control and no `min-w-0`, so its min-content floor was
                    the longest word in the name and the block overflowed the
                    page: measured at 320 on the fixture roster, the home block
                    laid out from x −0.8 and the away block to 320.8, taking
                    `documentElement.scrollWidth` to 321 against a 320 client
                    width — invariant 31, and with `html { overflow-x: hidden }`
                    it is the bottom nav pushed off a viewport that cannot
                    scroll to reach it. `wrap` is the right answer HERE rather
                    than an ellipsis: this panel is about the identity of two
                    teams, so a second line beats losing characters (the same
                    call `MbScoreboardHero` makes). It also puts the name on
                    `display/team-mark`, 0.82rem, which is the named step the
                    0.85rem was a drift off. */}
                <div className="flex min-w-0 flex-1 items-center justify-center gap-4">
                  <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                    <TeamMark
                      team={report.entry.home}
                      size={56}
                      orientation="vertical"
                      wrap
                      className="w-full"
                    />
                    <span className="mb-kicker tabular-nums">({report.homeRecord})</span>
                  </div>
                  <div className="shrink-0 text-center">
                    {/* The tracking is declared, not inherited. `text-5xl`
                        (48px) at 700 is also the masthead's `sm:` size, and the
                        masthead declares 0.01em; this numeral was falling
                        through to `.matchbook-display`'s 0.02em, so one
                        size/weight pair carried two trackings (0.48px and
                        0.96px) on this screen — rubric 1.3's exact failure. */}
                    <p className="matchbook-display whitespace-nowrap text-5xl mb-track-masthead font-bold tabular-nums">
                      {report.entry.homeScore} – {report.entry.awayScore}
                    </p>
                    <p className="mb-kicker mt-1">Final</p>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                    <TeamMark
                      team={report.entry.away}
                      size={56}
                      orientation="vertical"
                      wrap
                      className="w-full"
                    />
                    <span className="mb-kicker tabular-nums">({report.awayRecord})</span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2.5 border-t border-mb-rule pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                  <div className="flex items-center gap-2.5">
                    <MbIcon id="calendar" size={15} className="shrink-0 text-mb-navy" />
                    <span className="text-[0.78rem] font-semibold tabular-nums">
                      {report.date}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <MbIcon id="clock" size={15} className="shrink-0 text-mb-navy" />
                    <span className="text-[0.78rem] font-semibold tabular-nums">
                      {report.entry.time}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <MbIcon id="compete" size={15} className="shrink-0 text-mb-navy" />
                    <span className="text-[0.78rem] font-semibold">
                      {report.entry.competition}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <MbIcon id="check" size={15} className="shrink-0 text-mb-green" />
                    <span className="text-[0.78rem] font-semibold">
                      Winner: {report.entry.winner.name}
                    </span>
                  </div>
                  <p className="mb-kicker pt-1 tabular-nums">
                    All-time points — {report.entry.home.name}: {report.homePoints} ·{" "}
                    {report.entry.away.name}: {report.awayPoints}
                  </p>
                </div>
              </div>
            )}
          </Panel>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4 xl:col-span-5">
          {kept("summary") && (
          <Panel title="Archive Summary" tone="navy" icon="chart">
            {data.summary.matches === 0 ? (
              <PanelEmpty message="No archive exists yet — stats appear once matches are recorded." />
            ) : (
              <div className="grid grid-cols-2 gap-4 p-5">
                <SummaryStat
                  icon="calendar"
                  label="Matches Played"
                  value={String(data.summary.matches)}
                />
                <SummaryStat
                  icon="volleyball"
                  label="Total Points"
                  value={data.summary.points.toLocaleString("en-US")}
                />
                <SummaryStat icon="teams" label="Teams" value={String(data.summary.teams)} />
                <SummaryStat
                  icon="chart"
                  label="Avg Points / Match"
                  value={data.summary.avgPoints}
                />
              </div>
            )}
          </Panel>
          )}

          {kept("matchups") && (
          <Panel
            title="Top Matchups"
            meta={<span className="mb-kicker">By Games Played</span>}
          >
            {data.matchups.length === 0 ? (
              <PanelEmpty message="No matchups exist yet — rivalries build as teams replay each other." />
            ) : (
              <div className="flex flex-col divide-y divide-mb-rule">
                {data.matchups.map((m, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[18px_auto_1fr_auto] items-center gap-2 px-4 py-2"
                  >
                    {/* 0.06em declared. At 390 the mobile top strip prints its
                        short title at 0.8rem/700/0.06em, so this rank numeral
                        left on `.matchbook-display`'s 0.02em put two trackings
                        on one size/weight pair — a collision that only exists
                        below `lg`, which is why it survived a desktop read. */}
                    <span className="matchbook-display text-[0.8rem] mb-track-button font-bold tabular-nums text-mb-ink-muted">
                      {i + 1}
                    </span>
                    <span className="flex items-center gap-1">
                      <Crest team={m.a} size={20} />
                      <Crest team={m.b} size={20} />
                    </span>
                    <span className="min-w-0">
                      <span className="matchbook-display block truncate text-[0.78rem] mb-track-display font-bold">
                        {m.a.name} vs {m.b.name}
                      </span>
                      <span className="block text-[0.66rem] tabular-nums text-mb-ink-muted">
                        {m.leader}
                      </span>
                    </span>
                    <span className="matchbook-display text-[0.9rem] mb-track-display font-bold tabular-nums">
                      {m.pct}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
          )}

          {kept("competitions") && (
          <Panel
            title="Recent Competitions"
            meta={<MbPanelHeadLink href="/competitions" label="View All" />}
          >
            {data.competitions.length === 0 ? (
              /* §5.7's copy rule is `No <things> exist yet — <what makes them
                 appear>.` and this was the one shipped message on the screen
                 with no second clause at all: a headline, a hung rule, and
                 nothing under it. It now says what fills it, in the same words
                 the contents index uses for the same row. */
              <PanelEmpty message="No competitions exist yet — events you create are listed here, newest first." />
            ) : (
              <div className="flex flex-col divide-y divide-mb-rule">
                {data.competitions.map((c) => (
                  <Link
                    key={c.id}
                    href={`/competitions/${c.id}`}
                    className="mb-btn-touch mb-row-hover grid grid-cols-[auto_1fr_auto] items-center gap-2.5 px-4 py-2"
                  >
                    {/* `--mb-gold` as a MARK measured 2.15:1 on paper-bright,
                        under the 3:1 floor a UI graphic needs. Navy. */}
                    <MbIcon id="compete" size={16} className="text-mb-navy" />
                    <span className="min-w-0">
                      <span className="matchbook-display block truncate text-[0.78rem] mb-track-display font-bold">
                        {c.name}
                      </span>
                      <span className="block text-[0.66rem] tabular-nums text-mb-ink-muted">
                        {c.range}
                      </span>
                    </span>
                    <span className="mb-kicker tabular-nums">{c.matches} Matches</span>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
          )}

          {kept("shared") && (
          <Panel title="Shared Reports">
            {shared.isLoading ? (
              <p className="p-4 text-center text-[0.8rem] text-mb-ink-muted">
                Loading shared reports…
              </p>
            ) : shared.summaries.length === 0 ? (
              <PanelEmpty message="No shared reports exist yet — end a session with sharing to save one." />
            ) : (
              <div className="flex flex-col divide-y divide-mb-rule">
                {shared.summaries.map((s) => (
                  /* Three 14px icon keys in a row — one of them destructive and
                     8px from the other two — collapse into one 48px menu. That
                     is HF-2 and HF-14 answered by the same control, and it is
                     the same row grammar as the compete console's event list. */
                  <div
                    key={s.id}
                    className="mb-row-hover grid grid-cols-[auto_1fr_auto] items-center gap-2.5 px-4 py-2"
                  >
                    <MbIcon id="clipboard" size={15} className="text-mb-navy" />
                    <span className="min-w-0">
                      <span className="matchbook-display block truncate text-[0.78rem] mb-track-display font-bold">
                        {s.name}
                      </span>
                      <span className="block text-[0.66rem] tabular-nums text-mb-ink-muted">
                        {shared.formatDate(s.endedAt)}
                      </span>
                    </span>
                    <MbMenu
                      label={`Actions for ${s.name}`}
                      items={[
                        {
                          label: "Open report",
                          icon: "chevron-right",
                          onSelect: () => shared.handleOpenSummary(s.shareCode),
                        },
                        {
                          label:
                            shared.copiedId === s.id ? "Link copied" : "Copy share link",
                          icon: shared.copiedId === s.id ? "check" : "share",
                          onSelect: () => shared.handleCopyLink(s),
                        },
                        {
                          label: "Delete shared report",
                          icon: "warning",
                          tone: "danger",
                          onSelect: () => shared.setDeleteTarget(s),
                        },
                      ]}
                    />
                  </div>
                ))}
              </div>
            )}
          </Panel>
          )}

          {/* The withheld panels, as one ruled index — the same object `/` and
              `/competitions` print, cut to what is actually missing, so five
              equal display headlines become zero and every promise survives.

              Two titles for two states, exactly as `/` distinguishes them: an
              archive that has never held anything is being told what fills it,
              while an archive that is merely incomplete is being told what is
              still outstanding. `wide` is not passed — the index sits in the
              right column's own 5 of 12, where the even term/gloss split is
              the measured-good one. */}
          {collapsed && (
            <MbLedgerPanel
              title={hasArchive ? "Still to Come" : "What Fills This Archive"}
              rows={mbArchiveContentsFor(muteSections)}
              dense
            />
          )}
        </div>
      </div>

      <DeleteConfirmDialog
        open={!!shared.deleteTarget}
        onOpenChange={(open) => !open && shared.setDeleteTarget(null)}
        title="Delete Shared Report?"
        description={`This will permanently delete "${shared.deleteTarget?.name ?? ""}" and its share link.`}
        onConfirm={shared.handleDelete}
        isDeleting={shared.isDeleting}
      />
    </MatchbookShell>
  );
}
