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
  ReadinessPanel,
  RecentResultsPanel,
  SchedulePanel,
  StandingsPanel,
} from "@/components/matchbook/panels";

/* ===========================================================================
   OVERVIEW — the first screen converted onto `MatchbookShell`.

   What left this file: a 70-line hand-rolled masthead, `MatchbookSidebar`,
   `MatchbookMobileBar`, the `<main>` element and its padding, and a bespoke
   account control that was a `<Link href="/login">` — which, for a signed-in
   user, navigated to a page that redirects straight back here. All five now
   come from the shell, so the six screens can no longer disagree about them.

   ------------------------------------------------------ the coral budget

   Invariant 15 allows ONE coral fill per screen plus coral's declared
   structural jobs. On this route the primary action is Quick Match, which is
   also the app-level rail key, so the masthead does NOT repeat it in coral —
   "Record Result" takes navy and the rail keeps the single coral fill. The
   other two corals on screen are both declared jobs: the `<h1>` word (job 3,
   48px, where the 3:1 large-text floor applies and coral's 3.26:1 clears) and
   the schedule spine (job 4).
   =========================================================================== */

export default function DashboardPage() {
  const { isGuest, isLoading } = useAuth();
  const data = useMatchbookDashboard();

  /* The dashboard reads local data and renders for guests too, so this gate is
     short — but it is not absent. Painting a populated overview and then
     swapping it for a guest one is the layout shift HF-3 names. */
  if (isLoading) return <MbPageLoading active="/" />;

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
        subLine: `${data.matchesCompleted} matches completed`,
        actions: [
          {
            label: "Record Result",
            href: "/competitions",
            icon: "plus",
            tone: "navy",
          },
        ],
      }}
    >
      {/* `.mb-enter-grid` staggers the eight PANELS — the grid's direct
          children — not the rows inside them (invariant 42). The CSS caps the
          sequence at six steps, so eight panels still resolve in
          --mb-dur-slow + 5 x --mb-stagger = 480ms, and the whole thing is
          removed outright under prefers-reduced-motion. */}
      <div className="mb-enter-grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
        <div className="md:col-span-2 xl:col-span-7">
          <StandingsPanel
            title={`${data.league} Standings`}
            rows={data.standings}
          />
        </div>
        <div className="md:col-span-2 xl:col-span-5">
          <MatchOfTheDayPanel match={data.featured} />
        </div>
        <div className="xl:col-span-4">
          <LiveCourtsPanel courts={data.liveCourts} />
        </div>
        <div className="xl:col-span-4">
          <SchedulePanel items={data.schedule} />
        </div>
        <div className="md:col-span-2 xl:col-span-4">
          <BracketPanel bracket={data.bracket} />
        </div>
        <div className="xl:col-span-4">
          <RecentResultsPanel results={data.recentResults} />
        </div>
        <div className="xl:col-span-4">
          <ReadinessPanel rows={data.readiness} />
        </div>
        <div className="md:col-span-2 xl:col-span-4">
          <LeadersPanel leaders={data.leaders} totals={data.allTimeTotals} />
        </div>
      </div>
    </MatchbookShell>
  );
}
