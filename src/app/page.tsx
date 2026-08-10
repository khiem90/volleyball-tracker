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
  MbLedgerPanel,
  MbStepsPanel,
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

   ------------------------------------------------------- the first thirty seconds

   Measured on a new account at 390px, this screen was 2540px tall and held
   eight consecutive panels reading No standings · No match of the day · No live
   matches · No upcoming matches · No bracket · No results · No teams · No team
   leaders — eight `display/stat-sm` headlines of identical size and weight,
   twenty controls, and one filled button asking the reader to RECORD THE RESULT
   of a match that cannot exist.

   `data.isFirstRun` is true while no match exists in any state, which is
   precisely the condition under which all eight of those panels have nothing to
   print. It swaps the composition rather than the copy: the progression the
   reader is actually in, and one ruled index of what the page becomes. Two
   panels, one action, and the action is the only move the data allows.

   Populated behaviour is untouched — every branch below `isFirstRun` renders
   the same eight panels in the same twelve-column spans as before, and
   `primaryAction` resolves to the same "Record Result" the masthead has always
   carried the moment a single match exists.
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
        subLine: data.subLine,
        /* Derived, not declared. The label and the destination both move with
           the data, so the loudest control on the screen is never one the
           reader cannot perform. */
        actions: [{ ...data.primaryAction, tone: "navy" }],
      }}
    >
      {/* ------------------------------------------------------- first run */}
      {data.isFirstRun ? (
        <div className="mb-enter-grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
          <div className="md:col-span-2 xl:col-span-7">
            <MbStepsPanel
              title="Three Steps to Your First Match"
              steps={data.startSteps}
              /* Only ever a DIFFERENT destination — `useMatchbookDashboard`
                 returns `null` until Quick Match is actually performable. */
              footer={
                data.altAction
                  ? { href: data.altAction.href, label: data.altAction.label }
                  : undefined
              }
            />
          </div>
          <div className="md:col-span-2 xl:col-span-5">
            {/* The seven mute panels, collapsed. One panel head, no display
                headlines, no buttons — the promise survives and the shouting
                does not. */}
            <MbLedgerPanel
              title="What Fills This Page"
              rows={MB_OVERVIEW_CONTENTS}
              dense
            />
          </div>
        </div>
      ) : (
        /* `.mb-enter-grid` staggers the eight PANELS — the grid's direct
           children — not the rows inside them (invariant 42). The CSS caps the
           sequence at six steps, so eight panels still resolve in
           --mb-dur-slow + 5 x --mb-stagger = 480ms, and the whole thing is
           removed outright under prefers-reduced-motion. */
        <div className="mb-enter-grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
          <div className="md:col-span-2 xl:col-span-7">
            {/* The panel head names the OBJECT and the table's caption names the
                competition, the same split `/competitions/[id]` uses. The head
                used to carry the competition name over a table built from every
                team and every match in the app (F14). */}
            <StandingsPanel
              title="Standings"
              caption={`${data.league} standings`}
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
      )}
    </MatchbookShell>
  );
}
