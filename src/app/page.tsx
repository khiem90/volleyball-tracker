"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { MatchbookSidebar } from "@/components/matchbook/Sidebar";
import { MbIcon } from "@/components/matchbook/MbIcon";
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

const MOBILE_NAV = [
  { href: "/", label: "Overview" },
  { href: "/teams", label: "Teams" },
  { href: "/quick-match", label: "Quick" },
  { href: "/competitions", label: "Compete" },
  { href: "/summaries", label: "History" },
  { href: "/tools/volleyball-rotations", label: "Tools" },
];

export default function DashboardPage() {
  const { user, isGuest } = useAuth();
  const data = useMatchbookDashboard();
  const year = data.season.split(" ")[0];

  return (
    <div className="matchbook-surface min-h-screen">
      <div className="flex">
        <MatchbookSidebar />

        <div className="min-w-0 flex-1">
          {/* Mobile brand bar + nav */}
          <div className="lg:hidden border-b border-mb-rule">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <Link href="/" className="flex items-center gap-2.5">
                <Image
                  src="/assets/matchbook/brand/crest.svg"
                  alt="Tournament Tracker crest"
                  width={34}
                  height={40}
                  priority
                />
                <span className="matchbook-display text-[0.95rem] font-bold leading-none">
                  <span className="text-mb-navy">Tournament </span>
                  <span className="text-mb-coral">Tracker</span>
                </span>
              </Link>
              <Link
                href={isGuest ? "/login" : "/quick-match"}
                className="mb-btn mb-btn-coral px-3 py-1.5 text-[0.7rem]"
              >
                {isGuest ? "Sign In" : "Quick Match"}
              </Link>
            </div>
            <nav className="flex gap-1 overflow-x-auto px-2 pb-1 scrollbar-thin">
              {MOBILE_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="matchbook-display shrink-0 px-3 py-1.5 text-[0.74rem] font-semibold tracking-[0.08em] text-mb-navy first:text-mb-coral"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <main className="px-4 py-5 sm:px-6 lg:px-8">
            {/* Masthead */}
            <header className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="flex items-center gap-4">
                <h1
                  className="matchbook-display text-4xl font-bold leading-none tracking-[0.01em] sm:text-5xl"
                  suppressHydrationWarning
                >
                  The <span className="text-mb-coral">{year}</span> Season
                </h1>
                <div className="flex flex-col items-center border-[2px] border-mb-coral px-2.5 py-1 text-mb-coral">
                  <span className="matchbook-display text-[0.6rem] font-bold tracking-[0.28em]">
                    Week
                  </span>
                  <span
                    className="matchbook-display text-2xl font-bold leading-none tabular-nums"
                    suppressHydrationWarning
                  >
                    {data.week}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <p
                    className="matchbook-display text-[0.74rem] font-bold tracking-[0.1em]"
                    suppressHydrationWarning
                  >
                    {data.dateLine}
                  </p>
                  <p className="mb-kicker">
                    {data.isDemo
                      ? "Example season preview"
                      : `${data.matchesCompleted} matches completed`}
                  </p>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-3">
                <Link href="/competitions" className="mb-btn mb-btn-navy">
                  <MbIcon id="plus" size={14} />
                  Record Result
                </Link>
                <Link href="/quick-match" className="mb-btn mb-btn-coral">
                  <MbIcon id="quick" size={14} />
                  Quick Match
                </Link>
                <Link
                  href="/login"
                  className="hidden items-center gap-2.5 md:flex"
                  title={isGuest ? "Sign in" : user?.email ?? "Account"}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-mb-navy bg-mb-paper-bright">
                    <Image
                      src="/assets/matchbook/brand/crest.svg"
                      alt=""
                      width={24}
                      height={28}
                    />
                  </span>
                  <span className="matchbook-display text-[0.72rem] font-bold leading-tight tracking-[0.08em]">
                    {isGuest ? (
                      <>
                        Sign In
                        <br />
                        <span className="text-mb-ink-muted">Account</span>
                      </>
                    ) : (
                      <>
                        My
                        <br />
                        Account
                      </>
                    )}
                  </span>
                  <MbIcon id="chevron-down" size={13} className="text-mb-ink-muted" />
                </Link>
              </div>
            </header>

            {/* Example-data notice for accounts with no data yet */}
            {data.isDemo && (
              <div className="mb-demo-banner mb-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border-[1.5px] border-mb-gold text-mb-gold">
                  <MbIcon id="volleyball" size={26} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="matchbook-display text-[0.9rem] font-bold tracking-[0.06em]">
                    <span className="text-mb-gold">Exhibition Preview</span> — this is
                    example data
                  </p>
                  <p className="text-[0.8rem] text-mb-ink-muted">
                    Every panel below is filled with sample teams and scores to show
                    what your dashboard will look like.{" "}
                    {isGuest
                      ? "Sign in to start tracking your own teams and matches."
                      : "Create a team and record a match to see your own numbers here."}
                  </p>
                </div>
                <Link
                  href={isGuest ? "/login" : "/teams"}
                  className="mb-btn mb-btn-navy shrink-0"
                >
                  {isGuest ? "Sign In to Get Started" : "Create Your First Team"}
                </Link>
              </div>
            )}

            {/* Panel grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
              <div className="md:col-span-2 xl:col-span-7">
                <StandingsPanel
                  title={`${data.league} Standings`}
                  rows={data.standings}
                  sample={data.isDemo}
                />
              </div>
              <div className="md:col-span-2 xl:col-span-5">
                <MatchOfTheDayPanel match={data.featured} sample={data.isDemo} />
              </div>
              <div className="xl:col-span-4">
                <LiveCourtsPanel courts={data.liveCourts} sample={data.isDemo} />
              </div>
              <div className="xl:col-span-4">
                <SchedulePanel items={data.schedule} sample={data.isDemo} />
              </div>
              <div className="md:col-span-2 xl:col-span-4">
                <BracketPanel bracket={data.bracket} sample={data.isDemo} />
              </div>
              <div className="xl:col-span-4">
                <RecentResultsPanel results={data.recentResults} sample={data.isDemo} />
              </div>
              <div className="xl:col-span-4">
                <ReadinessPanel rows={data.readiness} sample={data.isDemo} />
              </div>
              <div className="md:col-span-2 xl:col-span-4">
                <LeadersPanel
                  leaders={data.leaders}
                  totals={data.seasonTotals}
                  sample={data.isDemo}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
