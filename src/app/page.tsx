"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { MatchbookSidebar } from "@/components/matchbook/Sidebar";
import { MatchbookMobileBar } from "@/components/matchbook/MobileBar";
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

export default function DashboardPage() {
  const { user, isGuest } = useAuth();
  const data = useMatchbookDashboard();

  return (
    <div className="matchbook-surface min-h-screen">
      <div className="flex">
        <MatchbookSidebar />

        <div className="min-w-0 flex-1">
          <MatchbookMobileBar
            active="/"
            cta={
              isGuest
                ? { href: "/login", label: "Sign In" }
                : { href: "/quick-match", label: "Quick Match" }
            }
          />

          <main className="px-4 py-5 sm:px-6 lg:px-8">
            {/* Masthead */}
            <header className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="flex items-center gap-4">
                <h1 className="matchbook-display text-4xl font-bold leading-none tracking-[0.01em] sm:text-5xl">
                  Tournament Overview
                </h1>
                {data.liveCourts.length > 0 && (
                  <div className="flex flex-col items-center border-[2px] border-mb-coral px-2.5 py-1 text-mb-coral">
                    <span className="matchbook-display text-[0.8rem] font-bold leading-tight tracking-[0.1em]">
                      Live
                    </span>
                    <span className="matchbook-display text-[0.8rem] font-bold leading-tight tracking-[0.1em]">
                      Now
                    </span>
                  </div>
                )}
                <div className="hidden sm:block">
                  <p
                    className="matchbook-display text-[0.74rem] font-bold tracking-[0.1em]"
                    suppressHydrationWarning
                  >
                    {data.dateLine}
                  </p>
                  <p className="mb-kicker">
                    {data.matchesCompleted} matches completed
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

            {/* Panel grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
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
                <LeadersPanel
                  leaders={data.leaders}
                  totals={data.allTimeTotals}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
