"use client";

import { useAuth } from "@/context/AuthContext";
import { MatchbookShell, MB_DEFAULT_CTA } from "@/components/matchbook/AppShell";
import { MbPageLoading } from "@/components/matchbook/Loading";
import { useMatchbookDashboard } from "@/components/matchbook/useMatchbookDashboard";
import {
  BracketPanel,
  LeadersPanel,
  LiveCourtsPanel,
  MatchOfTheDayPanel,
  MB_OVERVIEW_CONTENTS,
  MB_XL_SPAN,
  mbClosingSpan,
  mbContentsFor,
  MbLedgerPanel,
  MbStepsPanel,
  type MbOverviewSection,
  ReadinessPanel,
  RecentResultsPanel,
  SchedulePanel,
  StandingsPanel,
} from "@/components/matchbook/panels";

/* OVERVIEW. The shell owns the masthead, sidebar and nav; this file owns
   composition. Coral budget: the rail's Quick Match is the screen's one coral
   fill, so the masthead action stays navy. Any panel with nothing to print is
   withheld and named in one ledger index instead (from two mute panels
   upward); on a populated fixture `muteSections` is empty and the shipped
   eight-panel composition renders unchanged. */

export default function DashboardPage() {
  const { isGuest, isLoading } = useAuth();
  const data = useMatchbookDashboard();

  /* Short gate, but not absent: painting a populated overview and then
     swapping it for a guest one is a visible layout shift. */
  if (isLoading) return <MbPageLoading active="/" />;

  /* The sparse cut arms at TWO mute panels, never one — a single empty panel
     among populated ones renders its own `PanelEmpty`. */
  const collapsed = data.muteSections.length >= 2;
  const kept = (key: MbOverviewSection) =>
    !collapsed || !data.muteSections.includes(key);

  /* Standings and Match of the Day are a 7+5 pair: withhold the match and
     standings must widen to 8, or its row ends on a one-column sliver. */
  const standingsSpan = kept("featured") ? 7 : 8;
  const keptSpans = [
    kept("standings") && standingsSpan,
    kept("featured") && 5,
    kept("live") && 4,
    kept("schedule") && 4,
    kept("bracket") && 4,
    kept("results") && 4,
    kept("readiness") && 4,
    kept("leaders") && 4,
  ].filter((span): span is number => span !== false);

  return (
    <MatchbookShell
      active="/"
      cta={
        isGuest
          ? { href: "/login", label: "Sign In", icon: "login" }
          : MB_DEFAULT_CTA
      }
      masthead={{
        title: (
          <>
            Tournament <span className="text-mb-coral">Overview</span>
          </>
        ),
        shortTitle: "Overview",
        /* The lockup only appears when there is something live to announce, so
           it is a fact about the tournament rather than permanent furniture. */
        badge: data.liveCourts.length > 0 ? { lines: ["Live", "Now"] } : undefined,
        dateLine: data.dateLine,
        subLine: data.subLine,
        /* Derived, not declared — label and destination move with the data, so
           the loudest control is never one the reader cannot perform. */
        actions: [{ ...data.primaryAction, variant: "navy" }],
      }}
    >
      {/* ------------------------------------------------------- first run */}
      {data.isFirstRun ? (
        <div className="mb-enter-grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
          <div className="md:col-span-2 xl:col-span-7">
            <MbStepsPanel
              title="Three Steps to Your First Match"
              steps={data.startSteps}
              /* `useMatchbookDashboard` returns `null` until Quick Match is
                 actually performable. */
              footer={
                data.altAction
                  ? { href: data.altAction.href, label: data.altAction.label }
                  : undefined
              }
            />
          </div>
          <div className="md:col-span-2 xl:col-span-5">
            {/* The mute panels, collapsed to one ruled index. */}
            <MbLedgerPanel
              title="What Fills This Page"
              rows={MB_OVERVIEW_CONTENTS}
              dense
            />
          </div>
        </div>
      ) : (
        /* `.mb-enter-grid` staggers the grid's direct children only; the CSS
           caps the sequence at six steps and removes it under
           prefers-reduced-motion. */
        <div className="mb-enter-grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
          {kept("standings") && (
            <div className={`md:col-span-2 ${MB_XL_SPAN[standingsSpan]}`}>
              {/* The panel head names the object; the caption names the
                  competition — the same split `/competitions/[id]` uses. */}
              <StandingsPanel
                title="Standings"
                caption={`${data.league} standings`}
                rows={data.standings}
              />
            </div>
          )}
          {kept("featured") && (
            <div className="md:col-span-2 xl:col-span-5">
              <MatchOfTheDayPanel match={data.featured} />
            </div>
          )}
          {kept("live") && (
            <div className="xl:col-span-4">
              <LiveCourtsPanel courts={data.liveCourts} />
            </div>
          )}
          {kept("schedule") && (
            <div className="xl:col-span-4">
              <SchedulePanel items={data.schedule} />
            </div>
          )}
          {kept("bracket") && (
            <div className="md:col-span-2 xl:col-span-4">
              <BracketPanel bracket={data.bracket} />
            </div>
          )}
          {kept("results") && (
            <div className="xl:col-span-4">
              <RecentResultsPanel results={data.recentResults} />
            </div>
          )}
          {kept("readiness") && (
            <div className="xl:col-span-4">
              <ReadinessPanel rows={data.readiness} />
            </div>
          )}
          {kept("leaders") && (
            <div className="md:col-span-2 xl:col-span-4">
              <LeadersPanel leaders={data.leaders} totals={data.allTimeTotals} />
            </div>
          )}
          {/* The withheld panels, as one index that closes the last row
              flush. */}
          {collapsed && (
            <div
              className={`md:col-span-2 ${MB_XL_SPAN[mbClosingSpan(keptSpans)]}`}
            >
              <MbLedgerPanel
                title="Still to Come"
                rows={mbContentsFor(data.muteSections)}
                dense
                wide
              />
            </div>
          )}
        </div>
      )}
    </MatchbookShell>
  );
}
