"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { PageLoadingSpinner } from "@/components/shared";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { PANEL_ROW, Panel, PanelEmpty, PanelError } from "@/components/matchbook/Panel";
import { MatchRow } from "@/components/console/MatchRow";
import { teamLookup } from "@/components/console/teamRefs";
import {
  filterLedger,
  historyItems,
  ledgerCsv,
  ledgerDays,
  ledgerFileName,
  ledgerFilterOptions,
  ledgerRows,
  playedIn,
  type FilterOption,
  type CompletedQuickMatch,
  type CompletedTournament,
  type HistoryItem,
  type LedgerFilters,
  type LedgerRow,
} from "@/lib/history";
import { csvFile, saveFile } from "@/lib/saveFile";
import { plural } from "@/lib/utils";

/** How many rows a list shows before Show more, and how many more each tap adds. */
const ITEMS_PAGE = 10;
const LEDGER_PAGE = 25;

const NO_FILTERS: LedgerFilters = { tournamentId: "", teamId: "", query: "" };

/** "Sep 27, 2026": History reaches back past this year. */
const dateLabel = (ts: number) =>
  new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** "7:42 PM": the ledger's day heading already gives the date. */
const timeLabel = (ts: number | undefined) =>
  ts ? new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";

const ShowMore = ({ hidden, onClick }: { hidden: number; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`mb-panel-link w-full justify-center border-t border-mb-rule ${PANEL_ROW}`}
  >
    Show more ({hidden} left)
    <MbIcon id="chevron-down" size={11} />
  </button>
);

/* ------------------------ Tournaments & quick matches ----------------------- */

const TournamentRow = ({ item }: { item: CompletedTournament }) => {
  const { tournament, format, entered, played, winner, completedAt, href } = item;
  return (
    <Link href={href} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 ${PANEL_ROW}`}>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="matchbook-display text-[0.95rem] font-bold leading-tight [overflow-wrap:anywhere]">
          {tournament.name}
        </p>
        <p className="text-[0.72rem] text-mb-ink-muted">
          {[
            format,
            plural(entered, "team"),
            plural(played, "match", "matches"),
            dateLabel(completedAt),
          ].join(
            " • ",
          )}
        </p>
        {winner && (
          <p className="flex min-w-0 items-center gap-1.5 text-[0.72rem] font-semibold">
            <MbIcon id="star" size={12} className="shrink-0 text-mb-gold" />
            <span className="min-w-0 [overflow-wrap:anywhere]">Winner: {winner.name}</span>
          </p>
        )}
      </div>
      <MbIcon id="chevron-right" size={11} className="shrink-0 text-mb-ink-muted" />
    </Link>
  );
};

const QuickMatchRow = ({ item }: { item: CompletedQuickMatch }) => (
  <MatchRow
    match={item.match}
    team={teamLookup([item.home, item.away])}
    label={`Quick match • ${dateLabel(item.completedAt)}`}
    href={item.href}
  />
);

const CompletedPanel = ({ items, error }: { items: HistoryItem[]; error: string | null }) => {
  const [shown, setShown] = useState(ITEMS_PAGE);
  return (
    <Panel
      title="Tournaments & quick matches"
      icon="history"
      meta={items.length > 0 ? <span className="mb-kicker">{items.length}</span> : undefined}
    >
      {error ? (
        <PanelError message={error} />
      ) : items.length === 0 ? (
        <PanelEmpty message="Nothing here yet. Completed tournaments and quick matches with a result show here, newest first." />
      ) : (
        <>
          <div className="flex flex-col divide-y divide-mb-rule">
            {items.slice(0, shown).map((item) =>
              item.kind === "tournament" ? (
                <TournamentRow key={item.tournament.id} item={item} />
              ) : (
                <QuickMatchRow key={item.match.id} item={item} />
              ),
            )}
          </div>
          {items.length > shown && (
            <ShowMore hidden={items.length - shown} onClick={() => setShown(shown + ITEMS_PAGE)} />
          )}
        </>
      )}
    </Panel>
  );
};

/* --------------------------------- Ledger --------------------------------- */

const FilterSelect = ({
  label,
  all,
  options,
  value,
  onChange,
}: {
  label: string;
  all: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}) => (
  <label className="flex min-w-0 flex-col gap-1">
    <span className="mb-kicker">{label}</span>
    <span className="relative">
      <select
        className="mb-select-native min-h-11"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{all}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      <MbIcon
        id="chevron-down"
        size={13}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-mb-ink-muted"
      />
    </span>
  </label>
);

const LedgerRowView = ({ row }: { row: LedgerRow }) => (
  <MatchRow
    match={row.match}
    team={teamLookup([row.home, row.away])}
    label={`${playedIn(row)} • ${timeLabel(row.match.completedAt)}`}
    href={row.href}
  />
);

const LedgerPanel = ({ rows, error }: { rows: LedgerRow[]; error: string | null }) => {
  const [filters, setFilters] = useState<LedgerFilters>(NO_FILTERS);
  const [shown, setShown] = useState(LEDGER_PAGE);
  const options = useMemo(() => ledgerFilterOptions(rows), [rows]);
  const filtered = useMemo(() => filterLedger(rows, filters), [rows, filters]);
  const days = useMemo(() => ledgerDays(filtered.slice(0, shown)), [filtered, shown]);
  const filtering = filters.tournamentId !== "" || filters.teamId !== "" || filters.query !== "";

  // A new filter starts the list from the top again.
  const filter = (changes: Partial<LedgerFilters>) => {
    setFilters({ ...filters, ...changes });
    setShown(LEDGER_PAGE);
  };
  const clear = () => {
    setFilters(NO_FILTERS);
    setShown(LEDGER_PAGE);
  };

  // Straight from the tap: the share sheet an iPhone home screen app uses needs one.
  const exportCsv = () => {
    saveFile(csvFile(ledgerFileName(Date.now()), ledgerCsv(filtered))).catch((cause) =>
      console.error("Failed to save the ledger", cause),
    );
  };

  return (
    <Panel
      title="Ledger"
      icon="clipboard"
      meta={
        rows.length > 0 ? (
          <span className="mb-kicker">
            {filtering ? `${filtered.length} of ${rows.length}` : plural(rows.length, "result")}
          </span>
        ) : undefined
      }
    >
      {error ? (
        <PanelError message={error} />
      ) : rows.length === 0 ? (
        <PanelEmpty
          message="No results yet. Every completed match from your tournaments and quick matches is listed here."
          action={
            <Link href="/quick-match" className="mb-btn mb-btn-outline-navy">
              <MbIcon id="quick" size={14} />
              Quick match
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 border-b border-mb-rule p-4 sm:grid-cols-2">
            <FilterSelect
              label="Tournament"
              all="All tournaments"
              options={options.tournaments}
              value={filters.tournamentId}
              onChange={(tournamentId) => filter({ tournamentId })}
            />
            <FilterSelect
              label="Team"
              all="All teams"
              options={options.teams}
              value={filters.teamId}
              onChange={(teamId) => filter({ teamId })}
            />
            <label className="flex min-w-0 flex-col gap-1 sm:col-span-2">
              <span className="mb-kicker">Search</span>
              <span className="mb-input">
                <input
                  type="search"
                  placeholder="Team, tournament, or month"
                  value={filters.query}
                  onChange={(e) => filter({ query: e.target.value })}
                />
                <MbIcon id="search" size={15} className="shrink-0 text-mb-navy" />
              </span>
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button
                type="button"
                onClick={exportCsv}
                disabled={filtered.length === 0}
                className="mb-btn mb-btn-navy flex-1 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
              >
                <MbIcon id="export" size={14} />
                Export CSV
              </button>
              {filtering && (
                <button
                  type="button"
                  onClick={clear}
                  className="mb-btn mb-btn-outline-navy flex-1 sm:flex-none"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <PanelEmpty message="No results match these filters." />
          ) : (
            <div className="flex flex-col">
              {days.map((day) => (
                <div key={day.label}>
                  <div className="flex items-center justify-between gap-2 border-b border-mb-rule bg-[rgba(7,50,77,0.05)] px-4 py-1.5">
                    <p className="matchbook-display text-[0.7rem] font-bold tracking-[0.08em]">
                      {day.label}
                    </p>
                    <p className="mb-kicker">{plural(day.rows.length, "match", "matches")}</p>
                  </div>
                  <div className="flex flex-col divide-y divide-mb-rule border-b border-mb-rule">
                    {day.rows.map((row) => (
                      <LedgerRowView key={row.match.id} row={row} />
                    ))}
                  </div>
                </div>
              ))}
              {filtered.length > shown && (
                <ShowMore
                  hidden={filtered.length - shown}
                  onClick={() => setShown(shown + LEDGER_PAGE)}
                />
              )}
            </div>
          )}
        </>
      )}
    </Panel>
  );
};

/* ---------------------------------- Page ---------------------------------- */

/**
 * History: the account's completed tournaments and past quick matches, and
 * the ledger of every result, all from the one account-wide match query.
 * A completed tournament opens its console read-only; a quick match opens
 * its own page. The ledger filters by tournament, team, and search, and
 * exports what the filters show as CSV.
 */
export default function HistoryPage() {
  const { isLoading: authLoading, isAuthenticated } = useRequireAuth();
  const { state, isRosterLoading, isTournamentsLoading, tournamentsError } = useApp();

  const items = useMemo(
    () => historyItems(state.tournaments, state.matches, state.teams),
    [state.tournaments, state.matches, state.teams],
  );
  const rows = useMemo(
    () => ledgerRows(state.tournaments, state.matches, state.teams),
    [state.tournaments, state.matches, state.teams],
  );

  if (authLoading || !isAuthenticated || isRosterLoading || isTournamentsLoading) {
    return <PageLoadingSpinner />;
  }

  const tournaments = items.filter((item) => item.kind === "tournament").length;
  const quickMatches = items.length - tournaments;

  return (
    <>
      {/* Masthead */}
      <header className="mb-5 flex flex-col gap-2">
        <h1 className="matchbook-display text-4xl font-bold leading-none tracking-[0.01em] sm:text-5xl">
          History
        </h1>
        <p className="matchbook-display text-[0.74rem] font-bold tracking-[0.1em]">
          {[
            plural(tournaments, "tournament"),
            plural(quickMatches, "quick match", "quick matches"),
            plural(rows.length, "result"),
          ].join(" • ")}
        </p>
      </header>

      {/* Start-aligned so each panel is as tall as its rows, not its column. */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <CompletedPanel items={items} error={tournamentsError} />
        </div>
        <div className="lg:col-span-7">
          <LedgerPanel rows={rows} error={tournamentsError} />
        </div>
      </div>
    </>
  );
}
