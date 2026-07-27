"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useSummariesPage } from "@/hooks/useSummariesPage";
import { PageLoadingSpinner, DeleteConfirmDialog } from "@/components/shared";
import { MatchbookSidebar } from "@/components/matchbook/Sidebar";
import { MatchbookMobileBar } from "@/components/matchbook/MobileBar";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { Crest, Panel, PanelEmpty, TeamMark } from "@/components/matchbook/Panel";
import { useMatchbookHistory } from "@/components/matchbook/useMatchbookHistory";

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
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[1.5px] border-mb-navy text-mb-navy">
      <MbIcon id={icon} size={16} />
    </span>
    <div>
      <p className="mb-kicker">{label}</p>
      <p className="matchbook-display text-[1.15rem] font-bold leading-tight tabular-nums">
        {value}
      </p>
    </div>
  </div>
);

export default function HistoryPage() {
  const { isLoading: authLoading, isAuthenticated } = useRequireAuth();
  const { user } = useAuth();
  const [competitionId, setCompetitionId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [query, setQuery] = useState("");
  const data = useMatchbookHistory({ competitionId, teamId, query });
  const shared = useSummariesPage();

  if (authLoading || !isAuthenticated) {
    return <PageLoadingSpinner />;
  }

  const report = data.report;

  return (
    <div className="matchbook-surface min-h-screen">
      <div className="flex">
        <MatchbookSidebar />

        <div className="min-w-0 flex-1">
          <MatchbookMobileBar
            active="/summaries"
            cta={{ href: "/quick-match", label: "Quick Match" }}
          />

          <main className="px-4 py-5 sm:px-6 lg:px-8">
            {/* Masthead */}
            <header className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="flex items-center gap-4">
                <h1 className="matchbook-display whitespace-nowrap text-4xl font-bold leading-none tracking-[0.01em] sm:text-5xl">
                  Match <span className="text-mb-coral">Archive</span>
                </h1>
                <div className="flex flex-col items-center border-[2px] border-mb-coral px-2.5 py-1 text-mb-coral">
                  <span className="matchbook-display text-2xl font-bold leading-none tabular-nums">
                    {data.totalResults}
                  </span>
                  <span className="matchbook-display text-[0.6rem] font-bold tracking-[0.22em]">
                    Results
                  </span>
                </div>
                <div className="hidden sm:block">
                  <p className="matchbook-display text-[0.74rem] font-bold tracking-[0.1em]">
                    All-Time Archive
                  </p>
                  <p className="mb-kicker" suppressHydrationWarning>
                    {data.dateLine}
                  </p>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-3">
                <button
                  type="button"
                  onClick={data.downloadCsv}
                  disabled={data.filteredCount === 0}
                  className="mb-btn mb-btn-navy disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <MbIcon id="export" size={14} />
                  Export CSV
                </button>
                <Link
                  href="/login"
                  className="hidden items-center gap-2.5 md:flex"
                  title={user?.email ?? "Account"}
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
            </header>

            {/* Filter bar */}
            <div className="mb-4 flex flex-wrap items-end gap-3 border-y-[1.5px] border-mb-navy py-3">
              <div className="w-44">
                <p className="mb-kicker mb-1">Competition</p>
                <div className="relative">
                  <select
                    className="mb-select-native"
                    value={competitionId}
                    onChange={(e) => setCompetitionId(e.target.value)}
                    aria-label="Filter by competition"
                  >
                    <option value="">All Competitions</option>
                    {data.filterOptions.competitions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <MbIcon
                    id="chevron-down"
                    size={13}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-mb-ink-muted"
                  />
                </div>
              </div>
              <div className="w-40">
                <p className="mb-kicker mb-1">Team</p>
                <div className="relative">
                  <select
                    className="mb-select-native"
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    aria-label="Filter by team"
                  >
                    <option value="">All Teams</option>
                    {data.filterOptions.teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <MbIcon
                    id="chevron-down"
                    size={13}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-mb-ink-muted"
                  />
                </div>
              </div>
              <div className="min-w-[200px] flex-1">
                <p className="mb-kicker mb-1">Search</p>
                <div className="mb-input py-[0.45rem]">
                  <input
                    type="text"
                    placeholder="Search matches, teams, competitions..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <MbIcon id="search" size={15} className="shrink-0 text-mb-navy" />
                </div>
              </div>
            </div>

            {/* Panel grid */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              {/* Left column */}
              <div className="flex flex-col gap-4 xl:col-span-7">
                <Panel
                  title="Results Ledger"
                  meta={<span className="mb-kicker">{data.filteredCount} Results</span>}
                >
                  {data.days.length === 0 ? (
                    <PanelEmpty
                      message="No results exist yet — finished matches will be recorded here."
                      actionLabel="Play a match"
                      href="/quick-match"
                    />
                  ) : (
                    <div className="flex flex-col">
                      {data.days.map((day) => (
                        <div key={day.label}>
                          <div className="flex items-center justify-between border-b border-mb-rule bg-[rgba(7,50,77,0.05)] px-4 py-1.5">
                            <p className="matchbook-display text-[0.7rem] font-bold tracking-[0.08em]">
                              {day.label}
                            </p>
                            <p className="mb-kicker">
                              {day.entries.length}{" "}
                              {day.entries.length === 1 ? "match" : "matches"}
                            </p>
                          </div>
                          {day.entries.map((entry) => (
                            <button
                              key={entry.id}
                              type="button"
                              onClick={() => data.selectMatch(entry.id)}
                              className="grid w-full cursor-pointer grid-cols-[52px_1fr_auto_1fr_auto] items-center gap-2 border-b border-mb-rule px-4 py-2 text-left transition-colors hover:bg-[rgba(7,50,77,0.04)]"
                              style={
                                entry.id === data.selectedId
                                  ? { boxShadow: "inset 3px 0 0 var(--mb-coral)" }
                                  : undefined
                              }
                            >
                              <span className="text-[0.68rem] text-mb-ink-muted">
                                {entry.time}
                              </span>
                              <TeamMark team={entry.home} size={18} className="justify-self-start" />
                              <span className="matchbook-display whitespace-nowrap text-[0.9rem] font-bold tabular-nums">
                                {entry.homeScore} – {entry.awayScore}
                              </span>
                              <TeamMark team={entry.away} size={18} reverse className="justify-self-end" />
                              <span className="hidden w-24 truncate text-right text-[0.64rem] text-mb-ink-muted lg:block">
                                {entry.competition}
                              </span>
                            </button>
                          ))}
                        </div>
                      ))}
                      {data.filteredCount > 25 && (
                        <p className="px-4 py-2 text-center text-[0.7rem] text-mb-ink-muted">
                          Showing 25 of {data.filteredCount} results — refine filters or
                          export the full CSV.
                        </p>
                      )}
                    </div>
                  )}
                </Panel>

                <Panel title="Match Report">
                  {!report ? (
                    <PanelEmpty message="No match report exists yet — pick a result from the ledger to see its report." />
                  ) : (
                    <div className="flex flex-1 flex-col gap-4 p-5 sm:flex-row sm:items-center">
                      <div className="flex flex-1 items-center justify-center gap-4">
                        <div className="flex flex-col items-center gap-1.5">
                          <Crest team={report.entry.home} size={56} />
                          <span className="matchbook-display text-[0.85rem] font-bold">
                            {report.entry.home.name}
                          </span>
                          <span className="mb-kicker">({report.homeRecord})</span>
                        </div>
                        <div className="text-center">
                          <p className="matchbook-display text-5xl font-bold tabular-nums">
                            {report.entry.homeScore} – {report.entry.awayScore}
                          </p>
                          <p className="mb-kicker mt-1">Final</p>
                        </div>
                        <div className="flex flex-col items-center gap-1.5">
                          <Crest team={report.entry.away} size={56} />
                          <span className="matchbook-display text-[0.85rem] font-bold">
                            {report.entry.away.name}
                          </span>
                          <span className="mb-kicker">({report.awayRecord})</span>
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col gap-2.5 border-t border-mb-rule pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                        <div className="flex items-center gap-2.5">
                          <MbIcon id="calendar" size={15} className="shrink-0 text-mb-navy" />
                          <span className="text-[0.78rem] font-semibold">{report.date}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <MbIcon id="clock" size={15} className="shrink-0 text-mb-navy" />
                          <span className="text-[0.78rem] font-semibold">
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
                        <p className="mb-kicker pt-1">
                          All-time points — {report.entry.home.name}: {report.homePoints} ·{" "}
                          {report.entry.away.name}: {report.awayPoints}
                        </p>
                      </div>
                    </div>
                  )}
                </Panel>
              </div>

              {/* Right column */}
              <div className="flex flex-col gap-4 xl:col-span-5">
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
                          <span className="matchbook-display text-[0.8rem] font-bold text-mb-ink-muted">
                            {i + 1}
                          </span>
                          <span className="flex items-center gap-1">
                            <Crest team={m.a} size={20} />
                            <Crest team={m.b} size={20} />
                          </span>
                          <span className="min-w-0">
                            <span className="matchbook-display block truncate text-[0.78rem] font-bold">
                              {m.a.name} vs {m.b.name}
                            </span>
                            <span className="block text-[0.66rem] text-mb-ink-muted">
                              {m.leader}
                            </span>
                          </span>
                          <span className="matchbook-display text-[0.9rem] font-bold tabular-nums">
                            {m.pct}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel title="Recent Competitions" action="View All" href="/competitions">
                  {data.competitions.length === 0 ? (
                    <PanelEmpty message="No competitions exist yet." />
                  ) : (
                    <div className="flex flex-col divide-y divide-mb-rule">
                      {data.competitions.map((c) => (
                        <Link
                          key={c.id}
                          href={`/competitions/${c.id}`}
                          className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 px-4 py-2 transition-colors hover:bg-[rgba(7,50,77,0.04)]"
                        >
                          <MbIcon id="compete" size={16} className="text-mb-gold" />
                          <span className="min-w-0">
                            <span className="matchbook-display block truncate text-[0.78rem] font-bold">
                              {c.name}
                            </span>
                            <span className="block text-[0.66rem] text-mb-ink-muted">
                              {c.range}
                            </span>
                          </span>
                          <span className="mb-kicker">{c.matches} Matches</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </Panel>

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
                        <div
                          key={s.id}
                          className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2 px-4 py-2"
                        >
                          <MbIcon id="clipboard" size={15} className="text-mb-navy" />
                          <span className="min-w-0">
                            <span className="matchbook-display block truncate text-[0.78rem] font-bold">
                              {s.name}
                            </span>
                            <span className="block text-[0.66rem] text-mb-ink-muted">
                              {shared.formatDate(s.endedAt)}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => shared.handleOpenSummary(s.shareCode)}
                            className="mb-panel-link"
                          >
                            Open
                            <MbIcon id="chevron-right" size={11} />
                          </button>
                          <button
                            type="button"
                            title="Copy share link"
                            onClick={() => shared.handleCopyLink(s)}
                            className="text-mb-ink-muted transition-colors hover:text-mb-navy"
                          >
                            <MbIcon id={shared.copiedId === s.id ? "check" : "share"} size={14} />
                          </button>
                          <button
                            type="button"
                            title="Delete shared report"
                            onClick={() => shared.setDeleteTarget(s)}
                            className="text-mb-ink-muted transition-colors hover:text-mb-red"
                          >
                            <MbIcon id="warning" size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              </div>
            </div>
          </main>
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
    </div>
  );
}
