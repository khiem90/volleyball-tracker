"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { PageLoadingSpinner, DeleteConfirmDialog } from "@/components/shared";
import { MatchbookSidebar } from "@/components/matchbook/Sidebar";
import { MatchbookMobileBar } from "@/components/matchbook/MobileBar";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { Crest, Panel, PanelEmpty, TeamMark } from "@/components/matchbook/Panel";
import {
  useMatchbookCompete,
  type MbBracketCell,
  type MbCompeteSelected,
} from "@/components/matchbook/useMatchbookCompete";

const STATUS_STYLES = {
  in_progress: { label: "Live", color: "var(--mb-red)" },
  draft: { label: "Draft", color: "var(--mb-gold)" },
  completed: { label: "Final", color: "var(--mb-green)" },
} as const;

const BracketBox = ({ cell }: { cell: MbBracketCell }) => {
  const side = (
    team: MbBracketCell["home"],
    score: number,
    won: boolean,
    last = false
  ) => (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 ${last ? "" : "border-b border-mb-rule"}`}
    >
      {team ? (
        <>
          <Crest team={team} size={16} />
          <span
            className={`matchbook-display flex-1 truncate text-[0.7rem] ${won ? "font-bold" : "font-semibold text-mb-ink-muted"}`}
          >
            {team.name}
          </span>
        </>
      ) : (
        <span className="matchbook-display flex-1 text-[0.7rem] text-mb-ink-muted">
          TBD
        </span>
      )}
      {!cell.pending && (
        <span
          className={`matchbook-display text-[0.75rem] tabular-nums ${won ? "font-bold text-mb-coral" : "font-semibold"}`}
        >
          {score}
        </span>
      )}
    </div>
  );

  return (
    <div className="w-[148px] shrink-0 border-[1.5px] border-mb-navy bg-mb-paper-bright">
      {side(cell.home, cell.homeScore, cell.homeWon)}
      {side(cell.away, cell.awayScore, cell.awayWon, !cell.live)}
      {cell.live && (
        <div className="flex items-center justify-end gap-1 border-t border-mb-rule px-2 py-0.5">
          <span className="mb-live-dot" />
          <span className="matchbook-display text-[0.56rem] font-bold text-mb-red">
            Live
          </span>
        </div>
      )}
    </div>
  );
};

const StatusStat = ({
  icon,
  value,
  label,
  sub,
}: {
  icon: string;
  value: string;
  label: string;
  sub?: string;
}) => (
  <div className="flex items-center gap-3">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-mb-navy text-mb-navy">
      <MbIcon id={icon} size={18} />
    </span>
    <div>
      <p className="mb-kicker">{label}</p>
      <p className="matchbook-display text-[1.2rem] font-bold leading-tight tabular-nums">
        {value}
        {sub && (
          <span className="ml-2 text-[0.7rem] font-semibold text-mb-ink-muted">
            {sub}
          </span>
        )}
      </p>
    </div>
  </div>
);

const MainPanel = ({ selected }: { selected: MbCompeteSelected }) => {
  if (selected.isElimination) {
    return (
      <Panel
        title="Championship Bracket"
        action="View Full Bracket"
        href={`/competitions/${selected.competition.id}`}
      >
        {selected.bracket.length === 0 ? (
          <PanelEmpty message="No bracket exists yet — start the competition to generate it." />
        ) : (
          <div className="flex flex-1 items-stretch gap-5 overflow-x-auto p-4">
            {selected.bracket.map((round) => (
              <div key={round.label} className="flex flex-col gap-3">
                <p className="mb-kicker">{round.label}</p>
                <div className="flex flex-1 flex-col justify-around gap-3">
                  {round.cells.map((cell, i) => (
                    <BracketBox key={i} cell={cell} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    );
  }

  return (
    <Panel
      title="Standings"
      action="View Full Standings"
      href={`/competitions/${selected.competition.id}`}
    >
      {selected.standings.length === 0 ? (
        <PanelEmpty message="No standings exist yet — play matches to build the table." />
      ) : (
        <div className="overflow-x-auto">
          <table className="mb-table mb-table-compact w-full border-collapse">
            <thead>
              <tr>
                <th className="w-8 pl-3! text-center">#</th>
                <th>Team</th>
                <th className="text-center">W</th>
                <th className="text-center">L</th>
                <th className="text-center">Pct</th>
                <th className="text-center">PF</th>
                <th className="text-center">PA</th>
                <th className="pr-3! text-center">PD</th>
              </tr>
            </thead>
            <tbody>
              {selected.standings.map((line, i) => (
                <tr key={line.team.name + i}>
                  <td
                    className="matchbook-display pl-3! text-center font-bold"
                    style={
                      i === 0
                        ? { boxShadow: "inset 3px 0 0 var(--mb-teal)" }
                        : undefined
                    }
                  >
                    {i + 1}
                  </td>
                  <td>
                    <TeamMark team={line.team} size={20} />
                  </td>
                  <td className="text-center tabular-nums">{line.won}</td>
                  <td className="text-center tabular-nums">{line.lost}</td>
                  <td className="text-center tabular-nums">{line.pct}</td>
                  <td className="text-center tabular-nums">{line.pointsFor}</td>
                  <td className="text-center tabular-nums">{line.pointsAgainst}</td>
                  <td className="matchbook-display pr-3! text-center font-bold tabular-nums">
                    {line.diff}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
};

export default function CompetitionsPage() {
  const { isLoading, isAuthenticated } = useRequireAuth();
  const { user } = useAuth();
  const data = useMatchbookCompete();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (isLoading || !isAuthenticated) {
    return <PageLoadingSpinner />;
  }

  const selected = data.selected;
  const status = selected ? STATUS_STYLES[selected.competition.status] : null;
  const deleteTarget = data.rows.find((r) => r.id === deleteId);

  return (
    <div className="matchbook-surface min-h-screen">
      <div className="flex">
        <MatchbookSidebar />

        <div className="min-w-0 flex-1">
          <MatchbookMobileBar
            active="/competitions"
            cta={{ href: "/competitions/new", label: "New" }}
          />

          <main className="px-4 py-5 sm:px-6 lg:px-8">
            {/* Masthead */}
            <header className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="flex min-w-0 items-center gap-4">
                <h1 className="matchbook-display min-w-0 truncate text-4xl font-bold leading-none tracking-[0.01em] sm:text-5xl">
                  {selected ? (
                    selected.competition.name
                  ) : (
                    <>
                      Compete<span className="text-mb-coral">.</span>
                    </>
                  )}
                </h1>
                {status && (
                  <div
                    className="matchbook-display border-[2px] px-2.5 py-1.5 text-[0.9rem] font-bold tracking-[0.14em]"
                    style={{ borderColor: status.color, color: status.color }}
                  >
                    {status.label}
                  </div>
                )}
                {selected && (
                  <p className="matchbook-display hidden whitespace-nowrap text-[0.78rem] font-bold tracking-[0.12em] sm:block">
                    {selected.teamCount} Teams • {selected.matchTotal} Matches
                    {selected.courtCount ? ` • ${selected.courtCount} Courts` : ""}
                  </p>
                )}
              </div>

              <div className="ml-auto flex items-center gap-3">
                {selected && (
                  <Link
                    href={`/competitions/${selected.competition.id}`}
                    className="mb-btn mb-btn-navy"
                  >
                    <MbIcon id="settings" size={14} />
                    Manage Event
                  </Link>
                )}
                <Link href="/competitions/new" className="mb-btn mb-btn-coral">
                  <MbIcon id="plus" size={14} />
                  New Competition
                </Link>
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

            {/* Panel grid */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              {/* All events */}
              <div className="xl:col-span-7">
                <Panel
                  title="All Events"
                  meta={<span className="mb-kicker">{data.rows.length} Total</span>}
                >
                  {data.rows.length === 0 ? (
                    <PanelEmpty
                      message="No competitions exist yet — create a tournament, round robin, or league to get started."
                      actionLabel="New competition"
                      href="/competitions/new"
                    />
                  ) : (
                    <div className="flex flex-col divide-y divide-mb-rule">
                      {data.rows.map((row) => {
                        const rowStatus = STATUS_STYLES[row.status];
                        const isSelected = row.id === data.selectedId;
                        return (
                          <div
                            key={row.id}
                            className="grid cursor-pointer grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[rgba(7,50,77,0.04)]"
                            style={
                              isSelected
                                ? { boxShadow: "inset 3px 0 0 var(--mb-coral)" }
                                : undefined
                            }
                            onClick={() => data.setSelectedId(row.id)}
                          >
                            <div className="min-w-0">
                              <p className="matchbook-display truncate text-[0.9rem] font-bold">
                                {row.name}
                              </p>
                              <p className="text-[0.7rem] text-mb-ink-muted">
                                {row.typeLabel} • {row.teamCount} teams •{" "}
                                {row.completed}/{row.total} matches
                              </p>
                            </div>
                            <span
                              className="matchbook-display text-[0.66rem] font-bold tracking-[0.1em]"
                              style={{ color: rowStatus.color }}
                            >
                              {rowStatus.label}
                            </span>
                            <Link
                              href={`/competitions/${row.id}`}
                              className="mb-panel-link"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Open
                              <MbIcon id="chevron-right" size={11} />
                            </Link>
                            <button
                              type="button"
                              title="Delete competition"
                              className="text-mb-ink-muted transition-colors hover:text-mb-red"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(row.id);
                              }}
                            >
                              <MbIcon id="warning" size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Panel>
              </div>

              {/* Tournament status */}
              <div className="xl:col-span-5">
                <Panel title="Tournament Status" tone="navy" icon="compete">
                  {!selected ? (
                    <PanelEmpty message="No competition exists yet — its status will appear here." />
                  ) : (
                    <div className="grid flex-1 grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                      <StatusStat
                        icon="check"
                        label="Matches Completed"
                        value={`${selected.matchesCompleted} / ${selected.matchTotal}`}
                        sub={
                          selected.matchTotal > 0
                            ? `${selected.completionPct}%`
                            : undefined
                        }
                      />
                      <StatusStat
                        icon="teams"
                        label="Teams Entered"
                        value={String(selected.teamCount)}
                      />
                      <StatusStat
                        icon="clipboard"
                        label="Format"
                        value={selected.typeLabel}
                      />
                      {selected.winner ? (
                        <div className="flex items-center gap-3">
                          <Crest team={selected.winner} size={36} />
                          <div>
                            <p className="mb-kicker">Champion</p>
                            <p className="matchbook-display text-[1.2rem] font-bold leading-tight">
                              {selected.winner.name}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <StatusStat
                          icon="live"
                          label="Live Now"
                          value={String(selected.liveCourts.length)}
                        />
                      )}
                    </div>
                  )}
                </Panel>
              </div>

              {/* Bracket / standings */}
              <div className="xl:col-span-7">
                {selected ? (
                  <MainPanel selected={selected} />
                ) : (
                  <Panel title="Championship Bracket">
                    <PanelEmpty
                      message="No bracket exists yet — create a competition to see it here."
                      actionLabel="New competition"
                      href="/competitions/new"
                    />
                  </Panel>
                )}
              </div>

              {/* Live courts */}
              <div className="xl:col-span-5">
                <Panel
                  title="Live Courts"
                  action={selected ? "View All" : undefined}
                  href={
                    selected ? `/competitions/${selected.competition.id}` : undefined
                  }
                >
                  {!selected || selected.liveCourts.length === 0 ? (
                    <PanelEmpty message="No live matches exist yet — matches in progress will appear here." />
                  ) : (
                    <div className="flex flex-col divide-y divide-mb-rule">
                      {selected.liveCourts.map((line, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-[52px_1fr_auto_1fr_auto] items-center gap-2 px-3 py-2.5"
                        >
                          <p className="matchbook-display border-r border-mb-rule pr-2 text-[0.7rem] font-bold">
                            {line.court}
                          </p>
                          <TeamMark team={line.home} className="justify-self-start" />
                          <span className="matchbook-display whitespace-nowrap text-[0.95rem] font-bold tabular-nums text-mb-coral">
                            {line.homeScore} – {line.awayScore}
                          </span>
                          <TeamMark team={line.away} reverse className="justify-self-end" />
                          <span className="flex items-center gap-1">
                            <span className="mb-live-dot" />
                            <span className="matchbook-display text-[0.62rem] font-bold text-mb-red">
                              Live
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              </div>

              {/* Upcoming schedule */}
              <div className="xl:col-span-4">
                <Panel title="Upcoming Schedule">
                  {!selected || selected.schedule.length === 0 ? (
                    <PanelEmpty message="No upcoming matches exist yet." />
                  ) : (
                    <div className="ml-3 flex flex-col divide-y divide-mb-rule border-l-2 border-mb-coral">
                      {selected.schedule.map((line, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-[58px_1fr] items-center gap-2 py-2 pl-3 pr-3"
                        >
                          <p className="matchbook-display text-[0.66rem] font-bold text-mb-coral">
                            {line.label}
                          </p>
                          <div className="flex min-w-0 items-center gap-1.5">
                            <Crest team={line.home} size={18} />
                            <span className="matchbook-display truncate text-[0.72rem] font-semibold">
                              {line.home.name}
                            </span>
                            <span className="text-[0.6rem] text-mb-ink-muted">vs</span>
                            <Crest team={line.away} size={18} />
                            <span className="matchbook-display truncate text-[0.72rem] font-semibold">
                              {line.away.name}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              </div>

              {/* Recent results */}
              <div className="xl:col-span-4">
                <Panel title="Recent Results">
                  {!selected || selected.recent.length === 0 ? (
                    <PanelEmpty message="No results exist yet — finished matches will land here." />
                  ) : (
                    <div className="flex flex-col divide-y divide-mb-rule">
                      {selected.recent.map((line, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-[44px_1fr_auto_1fr] items-center gap-1.5 px-3 py-2"
                        >
                          <p className="matchbook-display text-[0.64rem] font-bold text-mb-ink-muted">
                            {line.label}
                          </p>
                          <TeamMark team={line.home} size={18} className="justify-self-start" />
                          <span className="matchbook-display whitespace-nowrap text-[0.85rem] font-bold tabular-nums">
                            {line.homeScore} – {line.awayScore}
                          </span>
                          <TeamMark team={line.away} size={18} reverse className="justify-self-end" />
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              </div>

              {/* Event details */}
              <div className="xl:col-span-4">
                <Panel title="Event Details">
                  {!selected ? (
                    <PanelEmpty message="No competition exists yet — its details will appear here." />
                  ) : (
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div className="flex items-center gap-3">
                        <MbIcon id="calendar" size={18} className="shrink-0 text-mb-navy" />
                        <div>
                          <p className="mb-kicker">Created</p>
                          <p className="text-[0.82rem] font-semibold">
                            {selected.createdDate}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <MbIcon id="bracket" size={18} className="shrink-0 text-mb-navy" />
                        <div>
                          <p className="mb-kicker">Format</p>
                          <p className="text-[0.82rem] font-semibold">
                            {selected.teamCount} teams • {selected.typeLabel}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <MbIcon id="volleyball" size={18} className="shrink-0 text-mb-navy" />
                        <div>
                          <p className="mb-kicker">Match Format</p>
                          <p className="text-[0.82rem] font-semibold">
                            {selected.seriesLabel}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/competitions/${selected.competition.id}`}
                        className="mb-btn mb-btn-coral mt-auto w-full"
                      >
                        <MbIcon id="compete" size={14} />
                        Manage Event
                      </Link>
                    </div>
                  )}
                </Panel>
              </div>
            </div>
          </main>
        </div>
      </div>

      <DeleteConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Competition?"
        description={`This will permanently delete "${deleteTarget?.name ?? ""}" and all of its matches.`}
        onConfirm={() => {
          if (deleteId) data.deleteCompetition(deleteId);
          setDeleteId(null);
        }}
      />
    </div>
  );
}
