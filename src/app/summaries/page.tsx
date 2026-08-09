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
import { Crest, Panel, PanelEmpty, TeamMark } from "@/components/matchbook/Panel";
import { MbPanelHeadLink } from "@/components/matchbook/panels";
import { useMatchbookHistory } from "@/components/matchbook/useMatchbookHistory";

/* ===========================================================================
   MATCH ARCHIVE

   The worst touch score of the six: 35 of 42 interactive nodes under 44px at
   390x844. Seven were the deleted mobile bar; the rest were this screen's own
   — two 42.4px filter selects, a 21.6px search input, and twenty-five 38.6px
   ledger rows. The selects and the field are now `MbSelect` / `MbTextInput`,
   which pin `min-height` to the control ladder rather than deriving a height
   from padding, and the ledger row's padding is set from the floor rather than
   from a guess.
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
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-mb-navy text-mb-navy">
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
  const [competitionId, setCompetitionId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [query, setQuery] = useState("");
  const data = useMatchbookHistory({ competitionId, teamId, query });
  const shared = useSummariesPage();

  if (authLoading || !isAuthenticated) {
    return <MbPageLoading active="/summaries" />;
  }

  const report = data.report;

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
        actions: [
          {
            label: "Export CSV",
            icon: "export",
            tone: "navy",
            onClick: data.downloadCsv,
            disabled: data.filteredCount === 0,
          },
        ],
      }}
    >
      {/* Filter bar. `items-end` on a row whose controls are now 48px keeps the
          three labels on one baseline; below `sm` each takes a full line rather
          than shrinking a select to the width of its chevron. */}
      <div className="mb-4 flex flex-wrap items-end gap-3 border-y border-mb-navy py-3">
        <div className="min-w-[11rem] flex-1 sm:max-w-[14rem]">
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
              <PanelEmpty
                message="No results exist yet — finished matches will be recorded here."
                actionLabel="Play a match"
                href="/quick-match"
              />
            ) : (
              <div className="flex flex-col">
                {data.days.map((day) => (
                  <div key={day.label}>
                    <div className="flex items-center justify-between border-b border-mb-rule bg-[var(--mb-band)] px-4 py-1.5">
                      <p className="matchbook-display text-[0.7rem] font-bold tracking-[0.08em] tabular-nums">
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
                        className="mb-btn-touch mb-row-hover grid w-full cursor-pointer grid-cols-[52px_1fr_auto_1fr_auto] items-center gap-2 border-b border-mb-rule px-4 py-2 text-left"
                        style={
                          entry.id === data.selectedId
                            ? { boxShadow: "inset 3px 0 0 var(--mb-coral)" }
                            : undefined
                        }
                      >
                        <span className="text-[0.68rem] tabular-nums text-mb-ink-muted">
                          {entry.time}
                        </span>
                        <TeamMark team={entry.home} size={18} className="justify-self-start" />
                        <span className="matchbook-display whitespace-nowrap text-[0.9rem] font-bold tabular-nums">
                          {entry.homeScore} – {entry.awayScore}
                        </span>
                        <TeamMark
                          team={entry.away}
                          size={18}
                          reverse
                          className="justify-self-end"
                        />
                        <span className="hidden w-24 truncate text-right text-[0.64rem] text-mb-ink-muted lg:block">
                          {entry.competition}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
                {data.filteredCount > 25 && (
                  <p className="px-4 py-2 text-center text-[0.7rem] tabular-nums text-mb-ink-muted">
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
                    <span className="mb-kicker tabular-nums">({report.homeRecord})</span>
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
                    <span className="matchbook-display text-[0.8rem] font-bold tabular-nums text-mb-ink-muted">
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
                      <span className="block text-[0.66rem] tabular-nums text-mb-ink-muted">
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

          <Panel
            title="Recent Competitions"
            meta={<MbPanelHeadLink href="/competitions" label="View All" />}
          >
            {data.competitions.length === 0 ? (
              <PanelEmpty message="No competitions exist yet." />
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
                      <span className="matchbook-display block truncate text-[0.78rem] font-bold">
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
                      <span className="matchbook-display block truncate text-[0.78rem] font-bold">
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
