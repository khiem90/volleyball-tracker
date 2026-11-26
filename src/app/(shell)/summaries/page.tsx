"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import {
  CARD_ROW,
  Card,
  CardEmpty,
  CardError,
  Icon,
  PageLoadingSpinner,
  TeamMark,
} from "@/components/shared";
import { PageHeader } from "@/components/shell/PageHeader";
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

/* The caption over a filter or the search field. */
const FIELD_LABEL = "text-caption font-medium text-ink-soft";

/** The foot of a list that has more rows than it shows. */
const ShowMore = ({ hidden, onClick }: { hidden: number; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`card-link w-full justify-center border-t border-line ${CARD_ROW}`}
  >
    Show more ({hidden} left)
    <Icon id="chevron-down" size={14} />
  </button>
);

/* ------------------------ Tournaments & quick matches ----------------------- */

const TournamentRow = ({ item }: { item: CompletedTournament }) => {
  const { tournament, format, entered, played, winner, completedAt, href } = item;
  return (
    <Link href={href} className={`flex items-center gap-3 ${CARD_ROW}`}>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* A long name wraps, mid-word if it must, so it never pushes the chevron out of the row. */}
        <span className="text-title font-semibold leading-snug wrap-anywhere">
          {tournament.name}
        </span>
        <span className="text-caption text-ink-soft">
          {[
            format,
            plural(entered, "team"),
            plural(played, "match", "matches"),
            dateLabel(completedAt),
          ].join(
            " • ",
          )}
        </span>
        {winner && (
          <span className="mt-1 flex min-w-0 items-center gap-1.5 text-caption font-semibold">
            <TeamMark name={winner.name} color={winner.color} size={18} />
            <span className="min-w-0 wrap-anywhere">Winner: {winner.name}</span>
          </span>
        )}
      </span>
      <Icon id="chevron-right" size={14} className="shrink-0 text-ink-soft" />
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

const CompletedCard = ({ items, error }: { items: HistoryItem[]; error: string | null }) => {
  const [shown, setShown] = useState(ITEMS_PAGE);
  return (
    <Card
      title="Tournaments & quick matches"
      icon="history"
      meta={items.length > 0 ? String(items.length) : undefined}
    >
      {error ? (
        <CardError message={error} />
      ) : items.length === 0 ? (
        <CardEmpty message="Nothing here yet. Completed tournaments and quick matches with a result show here, newest first." />
      ) : (
        <>
          <ul className="divide-y divide-line">
            {items.slice(0, shown).map((item) =>
              item.kind === "tournament" ? (
                <li key={item.tournament.id}>
                  <TournamentRow item={item} />
                </li>
              ) : (
                <li key={item.match.id}>
                  <QuickMatchRow item={item} />
                </li>
              ),
            )}
          </ul>
          {items.length > shown && (
            <ShowMore hidden={items.length - shown} onClick={() => setShown(shown + ITEMS_PAGE)} />
          )}
        </>
      )}
    </Card>
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
    <span className={FIELD_LABEL}>{label}</span>
    <span className="relative">
      <select className="field-select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{all}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      <Icon
        id="chevron-down"
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft"
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

const LedgerCard = ({ rows, error }: { rows: LedgerRow[]; error: string | null }) => {
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
    <Card
      title="Ledger"
      icon="clipboard"
      meta={
        rows.length > 0
          ? filtering
            ? `${filtered.length} of ${rows.length}`
            : plural(rows.length, "result")
          : undefined
      }
    >
      {error ? (
        <CardError message={error} />
      ) : rows.length === 0 ? (
        <CardEmpty
          message="No results yet. Every completed match from your tournaments and quick matches is listed here."
          action={
            <Link href="/quick-match" className="btn btn-fill">
              <Icon id="quick" size={14} />
              Quick match
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 border-b border-line p-4 sm:grid-cols-2">
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
              <span className={FIELD_LABEL}>Search</span>
              <span className="field">
                <input
                  type="search"
                  placeholder="Team, tournament, or month"
                  value={filters.query}
                  onChange={(e) => filter({ query: e.target.value })}
                />
                <Icon id="search" size={16} className="shrink-0 text-ink-soft" />
              </span>
            </label>
            {/* The export is this card's own action, so it is black. History has no next step to draw in green. */}
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button
                type="button"
                onClick={exportCsv}
                disabled={filtered.length === 0}
                className="btn btn-ink flex-1 sm:flex-none"
              >
                <Icon id="export" size={14} />
                Export CSV
              </button>
              {filtering && (
                <button type="button" onClick={clear} className="btn btn-fill flex-1 sm:flex-none">
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <CardEmpty message="No results match these filters." />
          ) : (
            <>
              <ul>
                {days.map((day) => (
                  <li key={day.label}>
                    {/* The day's bar is the ground's grey, so each day reads as its own block of rows. */}
                    <div className="flex items-baseline justify-between gap-3 bg-fill px-4 py-2">
                      <h3 className="min-w-0 text-caption font-semibold">{day.label}</h3>
                      <p className="shrink-0 text-caption text-ink-soft">
                        {plural(day.rows.length, "match", "matches")}
                      </p>
                    </div>
                    <ul className="divide-y divide-line">
                      {day.rows.map((row) => (
                        <li key={row.match.id}>
                          <LedgerRowView row={row} />
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
              {filtered.length > shown && (
                <ShowMore
                  hidden={filtered.length - shown}
                  onClick={() => setShown(shown + LEDGER_PAGE)}
                />
              )}
            </>
          )}
        </>
      )}
    </Card>
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
  const { roster, tournaments, matches, isRosterLoading, isTournamentsLoading, tournamentsError } =
    useApp();

  const items = useMemo(
    () => historyItems(tournaments, matches, roster),
    [tournaments, matches, roster],
  );
  const rows = useMemo(
    () => ledgerRows(tournaments, matches, roster),
    [tournaments, matches, roster],
  );

  if (authLoading || !isAuthenticated || isRosterLoading || isTournamentsLoading) {
    return <PageLoadingSpinner />;
  }

  const tournamentCount = items.filter((item) => item.kind === "tournament").length;
  const quickMatchCount = items.length - tournamentCount;

  return (
    <>
      <PageHeader
        title="History"
        line={[
          plural(tournamentCount, "tournament"),
          plural(quickMatchCount, "quick match", "quick matches"),
          plural(rows.length, "result"),
        ].join(" • ")}
      />

      {/* Start-aligned so each card is as tall as its rows, not its column. */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-5">
          <CompletedCard items={items} error={tournamentsError} />
        </div>
        <div className="min-w-0 lg:col-span-7">
          <LedgerCard rows={rows} error={tournamentsError} />
        </div>
      </div>
    </>
  );
}
