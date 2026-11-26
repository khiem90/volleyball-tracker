"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useTournamentsPage } from "@/hooks/useTournamentsPage";
import {
  Card,
  CardEmpty,
  Chip,
  DeleteConfirmDialog,
  Icon,
  PageLoadingSpinner,
  ScoreLine,
  TeamMark,
  TeamName,
} from "@/components/shared";
import { PageHeader } from "@/components/shell/PageHeader";
import { deleteTournamentDescription } from "@/lib/console";
import type { Team } from "@/lib/teamShapes";
import { TOURNAMENT_STATUS } from "@/lib/tournamentStatus";
import type { BracketCell, SelectedTournament } from "@/lib/tournamentsPage";
import { cn } from "@/lib/utils";

/** One side of a bracket match. The winner is bold, and the side it beat is dimmed. */
const BracketSide = ({
  team,
  score,
  won,
  lost,
  showScore,
}: {
  team: Team | null;
  score: number;
  won: boolean;
  lost: boolean;
  showScore: boolean;
}) => {
  const tone = won ? "font-bold text-ink" : lost ? "font-medium text-ink-soft" : "font-medium text-ink";
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5">
      {team ? (
        <>
          <TeamMark name={team.name} color={team.color} size={18} />
          <span className={cn("min-w-0 flex-1 truncate text-caption", tone)}>{team.name}</span>
        </>
      ) : (
        <span className="flex-1 text-caption text-ink-soft">TBD</span>
      )}
      {showScore && <span className={cn("text-caption tabular-nums", tone)}>{score}</span>}
    </div>
  );
};

/** One match of the small bracket: a grey tile with a side on each line. */
const BracketBox = ({ cell }: { cell: BracketCell }) => (
  <div className="w-40 shrink-0 divide-y divide-surface overflow-hidden rounded-tile bg-fill">
    <BracketSide
      team={cell.home}
      score={cell.homeScore}
      won={cell.homeWon}
      lost={cell.awayWon}
      showScore={!cell.pending}
    />
    <BracketSide
      team={cell.away}
      score={cell.awayScore}
      won={cell.awayWon}
      lost={cell.homeWon}
      showScore={!cell.pending}
    />
    {cell.live && (
      <div className="flex items-center justify-end gap-1.5 px-2.5 py-1 text-caption font-semibold text-action">
        <span className="live-dot" aria-hidden="true" />
        Live
      </div>
    )}
  </div>
);

/** A glyph on a grey tile, a label, and the value under it. */
const Fact = ({
  icon,
  label,
  value,
  sub,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
}) => (
  <div className="flex items-center gap-3">
    <span className="flex size-10 shrink-0 items-center justify-center rounded-tile bg-fill">
      <Icon id={icon} size={18} />
    </span>
    <div className="min-w-0">
      <p className="text-caption font-medium text-ink-soft">{label}</p>
      <p className="text-title font-bold leading-tight tabular-nums">
        {value}
        {sub && <span className="ml-2 text-caption font-medium text-ink-soft">{sub}</span>}
      </p>
    </div>
  </div>
);

/** A match in a card's list: a line saying where or when, and the score line under it. */
const MatchLineRow = ({
  label,
  live = false,
  children,
}: {
  label: string;
  live?: boolean;
  children: ReactNode;
}) => (
  <li className="flex flex-col gap-1.5 px-3.5 pb-3 pt-2.5">
    <p className="flex items-center justify-center gap-2 text-caption text-ink-soft">
      {label}
      {live && (
        <span className="flex items-center gap-1.5 font-semibold text-action">
          <span className="live-dot" aria-hidden="true" />
          Live
        </span>
      )}
    </p>
    {children}
  </li>
);

/** The bracket of an elimination tournament, or the standings of any other. */
const MainCard = ({ selected }: { selected: SelectedTournament }) => {
  if (selected.isElimination) {
    return (
      <Card
        title="Championship Bracket"
        action="View Full Bracket"
        href={`/competitions/${selected.tournament.id}`}
      >
        {selected.bracket.length === 0 ? (
          <CardEmpty message="No bracket exists yet — start the competition to generate it." />
        ) : (
          <div className="flex flex-1 items-stretch gap-4 overflow-x-auto p-4">
            {selected.bracket.map((round) => (
              <div key={round.label} className="flex flex-col gap-2">
                <p className="text-caption font-medium text-ink-soft">{round.label}</p>
                <div className="flex flex-1 flex-col justify-around gap-3">
                  {round.cells.map((cell, i) => (
                    <BracketBox key={i} cell={cell} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card
      title="Standings"
      action="View Full Standings"
      href={`/competitions/${selected.tournament.id}`}
    >
      {selected.standings.length === 0 ? (
        <CardEmpty message="No standings exist yet — play matches to build the table." />
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table data-table-compact w-full border-collapse">
            <thead>
              <tr>
                <th className="w-8 pl-4 text-center">#</th>
                <th>Team</th>
                <th className="text-center">W</th>
                <th className="text-center">L</th>
                <th className="text-center">Pct</th>
                <th className="text-center">PF</th>
                <th className="text-center">PA</th>
                <th className="pr-4 text-center">PD</th>
              </tr>
            </thead>
            <tbody>
              {selected.standings.map((line, i) => (
                <tr key={line.team.name + i}>
                  {/* The leader's place is in green. */}
                  <td className={cn("pl-4 text-center font-bold", i === 0 && "text-action")}>
                    {i + 1}
                  </td>
                  <td>
                    <TeamName team={line.team} size={20} />
                  </td>
                  <td className="text-center">{line.won}</td>
                  <td className="text-center">{line.lost}</td>
                  <td className="text-center">{line.pct}</td>
                  <td className="text-center">{line.pointsFor}</td>
                  <td className="text-center">{line.pointsAgainst}</td>
                  <td className="pr-4 text-center font-bold">{line.diff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

/**
 * The Tournaments tab: the live and draft tournaments as a list, and beside
 * it the one that is selected, with its status, its bracket or standings,
 * its courts, what is next, the latest results, and its details. A row
 * selects, Open goes to the console, and the bin asks before it deletes.
 */
export default function TournamentsPage() {
  const { isLoading, isAuthenticated } = useRequireAuth();
  const data = useTournamentsPage();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (isLoading || !isAuthenticated) {
    return <PageLoadingSpinner />;
  }

  const selected = data.selected;
  const status = selected ? TOURNAMENT_STATUS[selected.tournament.status] : null;
  const deleteTarget = data.rows.find((r) => r.id === deleteId);
  const liveCount = data.rows.filter((r) => r.status === "live").length;
  const consoleHref = selected ? `/competitions/${selected.tournament.id}` : undefined;

  return (
    <>
      <PageHeader
        title={selected ? selected.tournament.name : "Compete."}
        status={
          status && (
            <Chip tone={status.tone} live={status.live}>
              {status.label}
            </Chip>
          )
        }
        line={
          selected &&
          `${selected.teamCount} Teams • ${selected.matchTotal} Matches${
            selected.courtCount ? ` • ${selected.courtCount} Courts` : ""
          }`
        }
        action={
          // Side by side on a phone, as before. The green button gives up
          // side padding there so the pair fits a 360px screen.
          <div className="flex flex-wrap gap-2">
            {consoleHref && (
              <Link href={consoleHref} className="btn btn-ink flex-1 sm:flex-none">
                <Icon id="settings" size={16} />
                Manage Event
              </Link>
            )}
            <Link
              href="/competitions/new"
              className="btn btn-action flex-1 px-3 sm:flex-none sm:px-6"
            >
              <Icon id="plus" size={18} />
              New Tournament
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* The list */}
        <div className="xl:col-span-7">
          <Card
            title="Live & Draft"
            meta={`${liveCount} Live • ${data.rows.length - liveCount} Draft`}
          >
            {data.rows.length === 0 ? (
              <CardEmpty
                message="No competitions exist yet — create a tournament, round robin, or league to get started."
                actionLabel="New tournament"
                href="/competitions/new"
              />
            ) : (
              <ul className="divide-y divide-line">
                {data.rows.map((row) => {
                  const rowStatus = TOURNAMENT_STATUS[row.status];
                  const isSelected = row.id === data.selectedId;
                  return (
                    <li
                      key={row.id}
                      className={cn(
                        "flex items-center gap-1 border-l-[3px] pl-[13px] pr-2 transition-colors hover:bg-ink/4",
                        isSelected ? "border-action bg-ink/4" : "border-transparent",
                      )}
                    >
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => data.setSelectedId(row.id)}
                        className="flex min-h-14 min-w-0 flex-1 cursor-pointer flex-col items-start justify-center gap-0.5 py-2 text-left focus-visible:-outline-offset-2"
                      >
                        <span className="flex max-w-full items-center gap-2">
                          <span className="truncate text-title font-semibold">{row.name}</span>
                          <Chip tone={rowStatus.tone} live={rowStatus.live}>
                            {rowStatus.label}
                          </Chip>
                        </span>
                        <span className="text-caption text-ink-soft">
                          {row.typeLabel} • {row.teamCount} teams • {row.completed}/{row.total}{" "}
                          matches
                        </span>
                      </button>
                      <Link href={`/competitions/${row.id}`} className="card-link shrink-0 px-2">
                        Open
                        <Icon id="chevron-right" size={12} />
                      </Link>
                      <button
                        type="button"
                        title="Delete competition"
                        aria-label="Delete competition"
                        className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-danger-tint hover:text-danger focus-visible:-outline-offset-2"
                        onClick={() => setDeleteId(row.id)}
                      >
                        <Icon id="trash" size={18} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* Tournament status */}
        <div className="xl:col-span-5">
          <Card title="Tournament Status" icon="compete">
            {!selected ? (
              <CardEmpty message="No competition exists yet — its status will appear here." />
            ) : (
              <div className="grid flex-1 grid-cols-1 content-center gap-4 p-4 sm:grid-cols-2">
                <Fact
                  icon="check"
                  label="Matches Completed"
                  value={`${selected.matchesCompleted} / ${selected.matchTotal}`}
                  sub={selected.matchTotal > 0 ? `${selected.completionPct}%` : undefined}
                />
                <Fact icon="teams" label="Teams Entered" value={String(selected.teamCount)} />
                <Fact icon="clipboard" label="Format" value={selected.typeLabel} />
                {selected.winner ? (
                  <div className="flex items-center gap-3">
                    <TeamMark name={selected.winner.name} color={selected.winner.color} size={40} />
                    <div className="min-w-0">
                      <p className="text-caption font-medium text-ink-soft">Champion</p>
                      <p className="truncate text-title font-bold leading-tight">
                        {selected.winner.name}
                      </p>
                    </div>
                  </div>
                ) : (
                  <Fact icon="live" label="Live Now" value={String(selected.liveCourts.length)} />
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Bracket or standings */}
        <div className="xl:col-span-7">
          {selected ? (
            <MainCard selected={selected} />
          ) : (
            <Card title="Championship Bracket">
              <CardEmpty
                message="No bracket exists yet — create a competition to see it here."
                actionLabel="New tournament"
                href="/competitions/new"
              />
            </Card>
          )}
        </div>

        {/* Live courts */}
        <div className="xl:col-span-5">
          <Card title="Live Courts" action={selected ? "View All" : undefined} href={consoleHref}>
            {!selected || selected.liveCourts.length === 0 ? (
              <CardEmpty message="No live matches exist yet — matches in progress will appear here." />
            ) : (
              <ul className="divide-y divide-line">
                {selected.liveCourts.map((line, i) => (
                  <MatchLineRow key={i} label={line.court} live>
                    <ScoreLine
                      home={line.home}
                      away={line.away}
                      homeScore={line.homeScore}
                      awayScore={line.awayScore}
                    />
                  </MatchLineRow>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Upcoming schedule */}
        <div className="xl:col-span-4">
          <Card title="Upcoming Schedule">
            {!selected || selected.schedule.length === 0 ? (
              <CardEmpty message="No upcoming matches exist yet." />
            ) : (
              <ul className="divide-y divide-line">
                {selected.schedule.map((line, i) => (
                  <MatchLineRow key={i} label={line.label}>
                    <ScoreLine home={line.home} away={line.away} />
                  </MatchLineRow>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Recent results */}
        <div className="xl:col-span-4">
          <Card title="Recent Results">
            {!selected || selected.recent.length === 0 ? (
              <CardEmpty message="No results exist yet — finished matches will land here." />
            ) : (
              <ul className="divide-y divide-line">
                {selected.recent.map((line, i) => (
                  <MatchLineRow key={i} label={line.label}>
                    <ScoreLine
                      home={line.home}
                      away={line.away}
                      homeScore={line.homeScore}
                      awayScore={line.awayScore}
                      winner={line.winner}
                    />
                  </MatchLineRow>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Event details */}
        <div className="xl:col-span-4">
          <Card title="Event Details">
            {!selected ? (
              <CardEmpty message="No competition exists yet — its details will appear here." />
            ) : (
              <div className="flex flex-1 flex-col gap-4 p-4">
                <Fact icon="calendar" label="Created" value={selected.createdDate} />
                <Fact
                  icon="bracket"
                  label="Format"
                  value={`${selected.teamCount} teams • ${selected.typeLabel}`}
                />
                <Fact icon="volleyball" label="Match Format" value={selected.seriesLabel} />
                <Link
                  href={`/competitions/${selected.tournament.id}`}
                  className="btn btn-ink mt-auto w-full"
                >
                  <Icon id="compete" size={16} />
                  Manage Event
                </Link>
              </div>
            )}
          </Card>
        </div>
      </div>

      <DeleteConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Competition?"
        description={deleteTournamentDescription(deleteTarget?.name ?? "")}
        onConfirm={() => {
          if (deleteId) data.deleteTournament(deleteId);
          setDeleteId(null);
        }}
      />
    </>
  );
}
