"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useSummariesPage } from "@/hooks/useSummariesPage";
import { DeleteConfirmDialog } from "@/components/shared";
import { MatchbookShell, MB_DEFAULT_CTA } from "@/components/matchbook/AppShell";
import {
  MB_ROUTE_SKELETON,
  MbBootPanelBones,
  MbBootSniff,
  MbLedgerBones,
  MbPageLoading,
} from "@/components/matchbook/Loading";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { MbMenu } from "@/components/matchbook/Menu";
import { MbSelect, MbTextInput } from "@/components/matchbook/form";
import { MbMatchupPair } from "@/components/matchbook/MatchRow";
import { Crest, Panel, PanelEmpty, PanelStale, TeamMark } from "@/components/matchbook/Panel";
import { useLiveConnection } from "@/hooks/useLiveConnection";
import { MbLedgerPanel, MbPanelHeadLink } from "@/components/matchbook/panels";
import {
  mbArchiveContentsFor,
  useMatchbookHistory,
  type MbArchiveSection,
} from "@/components/matchbook/useMatchbookHistory";

/* MATCH ARCHIVE. On an account with nothing recorded, the emptiness is said
   ONCE on the ledger; the other panels collapse into one ruled index, the
   filter bar is withheld (a control that cannot change the screen is
   furniture), and the masthead action becomes the one move that fills an
   archive. The collapse arms at two mute panels; the ledger is exempt. On a
   full fixture `muteSections` is empty and everything renders as always. */

/* Prefetch on viewport entry: the Shared Reports rows navigate through a
   menu `onSelect`, which no `<Link>` ever prefetches. `saveData` opts out. */
const useMbVisiblePrefetch = () => {
  const router = useRouter();
  const io = useRef<IntersectionObserver | null>(null);
  const fetched = useRef<Set<string>>(new Set());

  useEffect(() => () => io.current?.disconnect(), []);

  return useCallback(
    (href: string) => (node: HTMLElement | null) => {
      if (!node || fetched.current.has(href)) return;
      if (typeof IntersectionObserver === "undefined") return;
      const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
      if (nav.connection?.saveData) return;
      io.current ??= new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          const dest = target.dataset.mbPrefetch;
          if (dest && !fetched.current.has(dest)) {
            fetched.current.add(dest);
            router.prefetch(dest);
          }
          io.current?.unobserve(target);
        }
      });
      node.dataset.mbPrefetch = href;
      io.current.observe(node);
    },
    [router]
  );
};

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
    <span className="mb-icon-disc h-9 w-9">
      <MbIcon id={icon} size={16} />
    </span>
    <div>
      <p className="mb-kicker">{label}</p>
      <p className="matchbook-display text-[1.2rem] mb-track-display font-bold leading-tight tabular-nums">
        {value}
      </p>
    </div>
  </div>
);

/* The Shared Reports rows, extracted so the fresh and the stale branches
   render ONE list rather than two copies that can drift. */
const SharedReportRows = ({
  shared,
}: {
  shared: ReturnType<typeof useSummariesPage>;
}) => {
  const prefetchOnSight = useMbVisiblePrefetch();
  return (
  <div className="flex flex-col divide-y divide-mb-rule">
    {shared.summaries.map((s) => (
      <div
        key={s.id}
        ref={prefetchOnSight(`/summary/${s.shareCode}`)}
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
  );
};

export default function HistoryPage() {
  const { isLoading: authLoading, isAuthenticated } = useRequireAuth();
  const [competitionId, setCompetitionId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [query, setQuery] = useState("");
  const data = useMatchbookHistory({ competitionId, teamId, query });
  const shared = useSummariesPage();
  const prefetchOnSight = useMbVisiblePrefetch();

  /* List-to-detail via the View Transitions API. All view-transition-names
     are TRANSIENT: applied at click, moved to the hero in the update
     callback, removed on settle — a name on two elements at once voids the
     transition. Gates: same row is a no-op; reduced motion and no-API take
     the plain `selectMatch`. `vtGen` guards the async cleanup: a superseded
     settle must be a no-op, and the newer flight strips the older flight's
     residue before applying its own names. `vtRow` remembers the row a
     flight named, because a skipped flight's update callback can still be
     pending when the next tap lands. */
  const heroScoreRef = useRef<HTMLParagraphElement | null>(null);
  const heroFinalRef = useRef<HTMLParagraphElement | null>(null);
  const reportPanelRef = useRef<HTMLDivElement | null>(null);
  const vtRow = useRef<HTMLElement | null>(null);
  const vtGen = useRef(0);

  const openReport = (entryId: string, row: HTMLElement) => {
    if (entryId === data.selectedId) return;
    if (
      typeof document.startViewTransition !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      data.selectMatch(entryId);
      return;
    }
    const gen = ++vtGen.current;
    const strip = () => {
      vtRow.current?.style.removeProperty("view-transition-name");
      reportPanelRef.current?.style.removeProperty("view-transition-name");
      heroScoreRef.current?.style.removeProperty("view-transition-name");
      heroFinalRef.current?.style.removeProperty("view-transition-name");
    };
    strip(); // the superseded flight's residue, before any new name goes on
    const score = row.querySelector<HTMLElement>("[data-vt-score]");
    const panel = reportPanelRef.current;
    vtRow.current = score;
    score?.style.setProperty("view-transition-name", "mb-vt-score");
    panel?.style.setProperty("view-transition-name", "mb-vt-report");
    const settle = () => {
      if (vtGen.current !== gen) return;
      strip();
    };
    const vt = document.startViewTransition(() => {
      /* The name leaves the row in the same update that names the hero, so
         `mb-vt-score` is never on two elements at once — a duplicate name
         voids the whole transition. */
      score?.style.removeProperty("view-transition-name");
      flushSync(() => data.selectMatch(entryId));
      /* A skipped flight still runs its callback — possibly AFTER the tap
         that superseded it has already named the next row. Its selection
         lands (the taps apply in order, so the last tap wins), but a
         superseded callback must not name the hero: that is the second road
         to the same duplicate-name abort the strip above closes. */
      if (vtGen.current !== gen) return;
      heroScoreRef.current?.style.setProperty("view-transition-name", "mb-vt-score");
      heroFinalRef.current?.style.setProperty("view-transition-name", "mb-vt-accent");
    });
    /* A second tap makes the UA skip this flight; the skip surfaces as a
       `ready` rejection — expected traffic, not a fault, and unhandled it
       reaches the console as a page error. */
    vt.ready.catch(() => {});
    vt.finished.then(settle, settle);
  };

  /* Shared Reports is the one panel that crosses a network, so it is the one
     that can fail while the rest load — its failure must never render as the
     empty state. `useLiveConnection` (the share routes' own hook) classifies
     staleness; `tick: false` so no interval re-renders the archive. */
  const sharedFeed = useLiveConnection({
    subscribed: !shared.isLoading,
    version: shared.fetchedAt ?? undefined,
    faulted: shared.faulted,
    tick: false,
  });
  const sharedDegraded = !shared.isLoading && shared.faulted;
  const sharedOffline = sharedFeed.status === "offline";

  if (authLoading || !isAuthenticated) {
    return <MbPageLoading active="/summaries" />;
  }

  const report = data.report;

  /* Shared counts as mute only once its load has settled (withholding it
     mid-load shifts the layout), and a FAULTED load never counts as mute —
     that would report an outage as an empty account. */
  const muteSections: MbArchiveSection[] =
    !shared.isLoading && !shared.faulted && shared.summaries.length === 0
      ? [...data.muteSections, "shared"]
      : data.muteSections;

  const collapsed = muteSections.length >= 2;
  const kept = (key: MbArchiveSection) =>
    !collapsed || !muteSections.includes(key);

  /* Nothing has ever been recorded, so nothing can be filtered and nothing can
     be exported. Both tests read the WHOLE archive, never the filtered count:
     a filter that matches nothing must keep its own controls on screen. */
  const hasArchive = data.totalResults > 0;

  /* The boot gate: until the localStorage blob lands every count is a zero
     that means "unknown". While `hydrating` this page renders BOTH
     first-paint variants and `MbBootSniff`'s parse-time script hides the
     wrong one before first layout (`.mb-boot-full-only` /
     `.mb-boot-empty-only`); the reservations read from the route's skeleton
     table rather than restating it. */
  const hydrating = data.hydrating;
  const [skelLedgerCol, skelSideCol] = MB_ROUTE_SKELETON["/summaries"].full.cells;
  const bootBones = {
    report: skelLedgerCol.panels[1],
    summary: skelSideCol.panels[0],
    matchups: skelSideCol.panels[1],
    competitions: skelSideCol.panels[2],
  };

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
        /* The one action, always performable; navy in both branches — the
           rail already spends the screen's one coral fill. */
        actions: hasArchive
          ? [
              {
                label: "Export CSV",
                icon: "export",
                variant: "navy",
                onClick: data.downloadCsv,
                disabled: data.filteredCount === 0,
              },
            ]
          : [
              {
                label: "Play Your First Match",
                href: "/quick-match",
                icon: "quick",
                variant: "navy",
              },
            ],
      }}
    >
      {/* The boot sniff must stay ABOVE every `.mb-boot-*-only` element: the
          script runs when the parser reaches it, so everything below lays out
          with the account already known. */}
      {hydrating && <MbBootSniff />}

      {/* Filter bar — withheld outright when the archive is empty (it would
          filter a set of zero). While `hydrating` it renders boot-gated: a
          populated account must have it in the FIRST paint, a brand-new one
          must never see it. */}
      {(hasArchive || hydrating) && (
      <div
        className={`mb-4 flex flex-wrap items-end gap-3 border-y border-mb-navy py-3${
          hydrating ? " mb-boot-full-only" : ""
        }`}
      >
        {/* `basis-full` below `sm` — a filter's current value must stay
            readable, so it takes the line rather than the ellipsis. */}
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
              /* Two different nothings: with an archive, an empty ledger means
                 the FILTER matched nothing (offer the clear control); with no
                 archive there is no action — the masthead already carries it. */
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
              ) : hydrating ? (
                /* Pre-boot, both first paints at once — the injected rule
                   shows exactly one. */
                <>
                  <MbLedgerBones />
                  <div className="mb-boot-empty-only">
                    <PanelEmpty message="No results exist yet — every match you finish is filed here, newest first." />
                  </div>
                </>
              ) : (
                <PanelEmpty message="No results exist yet — every match you finish is filed here, newest first." />
              )
            ) : (
              <div className="flex flex-col">
                {data.days.map((day) => (
                  <div key={day.label}>
                    <div className="flex items-center justify-between border-b border-mb-rule bg-[var(--mb-band)] px-4 py-1.5">
                      <p className="matchbook-display text-[0.74rem] mb-track-status font-bold tabular-nums">
                        {day.label}
                      </p>
                      <p className="mb-kicker tabular-nums">
                        {day.entries.length}{" "}
                        {day.entries.length === 1 ? "match" : "matches"}
                      </p>
                    </div>
                    {day.entries.map((entry) => (
                      /* `mb-btn-touch` supplies the 44px floor; `sm:py-1.5`
                         keeps the one-line row's content under 44 so the
                         floor governs, border included. */
                      <button
                        key={entry.id}
                        type="button"
                        onClick={(e) => openReport(entry.id, e.currentTarget)}
                        aria-pressed={entry.id === data.selectedId}
                        /* The matchup is ONE `minmax(0,1fr)` cell — a grid
                           item with a non-stretch `justify-self` is sized by
                           its max-content and paints through the score. */
                        className="mb-btn-touch mb-row-hover grid w-full cursor-pointer grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-2 border-b border-mb-rule px-4 py-2 text-left sm:py-1.5"
                        style={
                          entry.id === data.selectedId
                            ? { boxShadow: "inset 3px 0 0 var(--mb-coral)" }
                            : undefined
                        }
                      >
                        <span className="text-[0.66rem] tabular-nums text-mb-ink-muted">
                          {entry.time}
                        </span>
                        {/* The flight's departure gate: `openReport` names this
                            wrapper at click and un-names it in the same update
                            that names the report hero. */}
                        <span data-vt-score className="block min-w-0">
                        <MbMatchupPair
                          home={entry.home}
                          away={entry.away}
                          homeScore={entry.homeScore}
                          awayScore={entry.awayScore}
                          homeWon={entry.homeWon}
                          awayWon={!entry.homeWon}
                          /* `homeWon` is binary, so a drawn match would mute
                             the home side — `decided` is off when level. */
                          decided={entry.homeScore !== entry.awayScore}
                          size="md"
                        />
                        </span>
                        {/* `truncate` stays — a long enough event name must
                            cut rather than reflow the ledger. */}
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

          {/* Pre-boot: a reservation at the measured height for the populated
              account, nothing for the new one. */}
          {hydrating ? (
            <MbBootPanelBones {...bootBones.report} />
          ) : kept("report") && (
          /* A plain wrapper the transition can name transiently — `Panel`
             forwards no ref. */
          <div ref={reportPanelRef}>
          <Panel title="Match Report">
            {!report ? (
              <PanelEmpty message="No match report exists yet — pick a result from the ledger to see its report." />
            ) : (
              <div className="flex flex-1 flex-col gap-4 p-5 sm:flex-row sm:items-center">
                {/* `wrap` (never ellipsis) — this panel is about the identity
                    of two teams. The 380px container query is sized so both
                    names can hold their longest unbreakable token beside the
                    48px score; below it the pair stacks. A container query,
                    not `sm:`, because the panel's own width decides. */}
                <div className="@container flex min-w-0 flex-1 flex-col justify-center">
                  <div className="grid grid-cols-[minmax(0,1fr)] items-center justify-items-center gap-3 @min-[380px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] @min-[380px]:gap-4">
                    <div className="flex w-full min-w-0 flex-col items-center gap-1.5">
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
                      {/* Tracking declared, not inherited — one size/weight
                          pair must carry one tracking. */}
                      <p
                        ref={heroScoreRef}
                        className="matchbook-display whitespace-nowrap text-5xl mb-track-masthead font-bold tabular-nums"
                      >
                        {report.entry.homeScore} – {report.entry.awayScore}
                      </p>
                      <p ref={heroFinalRef} className="mb-kicker mt-1">
                        Final
                      </p>
                    </div>
                    <div className="flex w-full min-w-0 flex-col items-center gap-1.5">
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
                </div>
                {/* `min-w-0`: without it this column's automatic minimum is
                    its longest word and it steals the scoreline's width. */}
                <div className="flex min-w-0 flex-1 flex-col gap-2.5 border-t border-mb-rule pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
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
          </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4 xl:col-span-5">
          {hydrating ? (
            <MbBootPanelBones {...bootBones.summary} />
          ) : kept("summary") && (
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

          {hydrating ? (
            <MbBootPanelBones {...bootBones.matchups} />
          ) : kept("matchups") && (
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

          {hydrating ? (
            <MbBootPanelBones {...bootBones.competitions} />
          ) : kept("competitions") && (
          <Panel
            title="Recent Competitions"
            meta={<MbPanelHeadLink href="/competitions" label="View All" />}
          >
            {data.competitions.length === 0 ? (
              <PanelEmpty message="No competitions exist yet — events you create are listed here, newest first." />
            ) : (
              <div className="flex flex-col divide-y divide-mb-rule">
                {data.competitions.map((c) => (
                  /* minHeight inline: `.mb-btn-touch`'s floor is unlayered, so
                     a `min-h-12` utility would never apply. */
                  <Link
                    key={c.id}
                    /* `<Link>` prefetches only to the nearest loading boundary
                       for a dynamic route; the explicit prefetch-on-sight
                       warms the full payload. */
                    ref={prefetchOnSight(`/competitions/${c.id}`)}
                    href={`/competitions/${c.id}`}
                    className="mb-btn-touch mb-row-hover grid grid-cols-[auto_1fr_auto] items-center gap-2.5 px-4 py-1.5"
                    style={{ minHeight: 48 }}
                  >
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

          {/* The withheld panels as one ruled index. It must sit ABOVE Shared
              Reports: Shared settles late (Firestore), and with the index
              below it that settle yanked the index upward — above it, the
              settle only changes nodes below an element whose start never
              moves. */}
          {collapsed && (
            /* Pre-boot the index is the EMPTY account's first paint only. */
            <div className={hydrating ? "mb-boot-empty-only" : "contents"}>
              <MbLedgerPanel
                title={hasArchive ? "Still to Come" : "What Fills This Archive"}
                rows={mbArchiveContentsFor(muteSections)}
                dense
              />
            </div>
          )}

          {kept("shared") && (
          <Panel title="Shared Reports">
            {shared.isLoading ? (
              <p className="p-4 text-center text-[0.85rem] text-mb-ink-muted">
                Loading shared reports…
              </p>
            ) : sharedDegraded && shared.summaries.length === 0 ? (
              /* Fetch failed, nothing cached — never the plain empty state,
                 which would report an outage as an empty account. */
              <PanelEmpty
                tone="stale"
                icon={sharedOffline ? "wifi-off" : undefined}
                message="Shared reports could not be loaded right now — the rest of the archive is unaffected."
                actionLabel="Retry"
                onAction={shared.retry}
              />
            ) : shared.summaries.length === 0 ? (
              <PanelEmpty message="No shared reports exist yet — end a session with sharing to save one." />
            ) : sharedDegraded ? (
              /* Refresh failed but a previous load is cached: stale rows stay
                 openable — a report's route re-fetches independently. */
              <PanelStale
                asOf={shared.fetchedAt}
                offline={sharedOffline}
                onRetry={shared.retry}
              >
                <SharedReportRows shared={shared} />
              </PanelStale>
            ) : (
              <SharedReportRows shared={shared} />
            )}
          </Panel>
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
