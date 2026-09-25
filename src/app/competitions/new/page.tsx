"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { PageLoadingSpinner } from "@/components/shared";
import { MatchbookSidebar } from "@/components/matchbook/Sidebar";
import { MatchbookMobileBar } from "@/components/matchbook/MobileBar";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { Panel } from "@/components/matchbook/Panel";
import { AdvancedSettings } from "@/components/creation/AdvancedSettings";
import { FormatPicker } from "@/components/creation/FormatPicker";
import { TeamChecklist } from "@/components/creation/TeamChecklist";
import { useCreation } from "@/components/creation/useCreation";

/**
 * Creating a tournament on one page: format, name, the roster as a
 * checklist with inline add, advanced settings behind a disclosure, and
 * "Save as draft" beside "Create and start". Both open the console.
 */
export default function NewTournamentPage() {
  const { isLoading, isAuthenticated } = useRequireAuth();
  const { user, isGuest } = useAuth();
  const page = useCreation();

  if (isLoading || !isAuthenticated || page.isRosterLoading) {
    return <PageLoadingSpinner />;
  }

  const { setup, problems } = page;
  const summary = [problems.format, problems.name, problems.teams].filter(Boolean).join(" ");
  const alert = page.error ?? (summary || null);

  return (
    <div className="matchbook-surface min-h-screen">
      <div className="flex">
        <MatchbookSidebar />
        <div className="min-w-0 flex-1">
          <MatchbookMobileBar
            active="/competitions"
            cta={{ href: "/competitions", label: "Tournaments" }}
          />
          <main className="px-4 py-5 sm:px-6 lg:px-8">
            <header className="mb-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <Link href="/competitions" className="mb-panel-link min-h-11">
                  <MbIcon id="chevron-right" size={11} className="rotate-180" />
                  Tournaments
                </Link>
                <Link
                  href="/login"
                  className="hidden items-center gap-2.5 md:flex"
                  title={isGuest ? "Sign in" : (user?.email ?? "Account")}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-mb-navy bg-mb-paper-bright">
                    <Image src="/assets/matchbook/brand/crest.svg" alt="" width={24} height={28} />
                  </span>
                  <span className="matchbook-display text-[0.72rem] font-bold leading-tight tracking-[0.08em]">
                    My
                    <br />
                    Account
                  </span>
                  <MbIcon id="chevron-down" size={13} className="text-mb-ink-muted" />
                </Link>
              </div>
              <h1 className="matchbook-display text-3xl font-bold leading-none tracking-[0.01em] sm:text-5xl">
                New <span className="text-mb-coral">Tournament</span>
              </h1>
              <p className="text-[0.85rem] text-mb-ink-muted">
                Pick a format, name it, tick the teams, then start it now or keep it as a draft.
              </p>
            </header>

            <div className="flex max-w-3xl flex-col gap-4">
              <Panel title="Format">
                <FormatPicker
                  value={setup.format}
                  onChange={(format) => page.change({ format })}
                  problem={problems.format}
                />
              </Panel>

              <Panel title="Name">
                <div className="flex flex-col gap-1.5 p-3">
                  <label htmlFor="tournament-name" className="mb-kicker">
                    What to call it
                  </label>
                  <span className="mb-input py-[0.45rem]">
                    <input
                      id="tournament-name"
                      type="text"
                      value={setup.name}
                      onChange={(event) => page.change({ name: event.target.value })}
                      placeholder="Tuesday night"
                      maxLength={80}
                      autoComplete="off"
                      enterKeyHint="done"
                      aria-invalid={problems.name ? true : undefined}
                      aria-describedby={problems.name ? "name-problem" : undefined}
                    />
                  </span>
                  {problems.name && (
                    <p id="name-problem" role="alert" className="text-[0.78rem] font-medium text-mb-red">
                      {problems.name}
                    </p>
                  )}
                </div>
              </Panel>

              <TeamChecklist
                roster={page.roster}
                ticked={page.ticked}
                tickedCount={page.enteredCount}
                onToggle={page.toggleTeam}
                onSetAll={page.setAllTeams}
                onAdd={page.addTeamsFromText}
                revealId={page.revealId}
                problem={problems.teams}
              />

              <AdvancedSettings
                setup={setup}
                open={page.advancedOpen}
                onToggle={() => page.setAdvancedOpen((open) => !open)}
                onChange={page.change}
              />

              <div className="flex flex-col gap-3">
                {alert && (
                  <p
                    role="alert"
                    className="border-[1.5px] border-mb-red px-3 py-2 text-[0.8rem] font-medium text-mb-red"
                  >
                    {alert}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => page.create("draft")}
                    disabled={page.busy !== null}
                    className="mb-btn mb-btn-outline-navy min-h-11 min-w-0 flex-1 px-2!"
                  >
                    <MbIcon id="save" size={14} />
                    {page.busy === "draft" ? "Saving..." : "Save as draft"}
                  </button>
                  <button
                    type="button"
                    onClick={() => page.create("start")}
                    disabled={page.busy !== null}
                    className="mb-btn mb-btn-coral min-h-11 min-w-0 flex-1 px-2!"
                  >
                    <MbIcon id="live" size={14} />
                    {page.busy === "start" ? "Starting..." : "Create and start"}
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
