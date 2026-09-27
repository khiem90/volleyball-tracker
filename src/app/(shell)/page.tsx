"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { PageLoadingSpinner } from "@/components/shared";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { Panel, PanelEmpty } from "@/components/matchbook/Panel";
import { LiveTag, MatchRow } from "@/components/console/MatchRow";
import { teamLookup } from "@/components/console/teamRefs";
import { courtsWord } from "@/lib/console";
import { formatLabel, isRotationFormat } from "@/lib/formats";
import {
  liveTournaments,
  recentResults,
  type LiveTournament,
  type RecentResult,
} from "@/lib/home";
import { signInHref } from "@/lib/shell";

const ROW = "min-h-11 px-4 py-3 transition-colors hover:bg-[rgba(7,50,77,0.04)]";

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** "7:42 PM" for a result today, "Sep 27" for one before. */
const whenLabel = (ts: number | undefined) => {
  if (!ts) return "";
  const date = new Date(ts);
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/** Why a panel has nothing to show: the account's tournaments and matches did not load. */
const LoadError = ({ message }: { message: string }) => (
  <p
    role="alert"
    className="m-4 border-[1.5px] border-mb-red px-3 py-2 text-[0.8rem] font-medium text-mb-red"
  >
    {message}
  </p>
);

/* ---------------------------- Live tournaments ---------------------------- */

const LiveRow = ({ row }: { row: LiveTournament }) => {
  const { tournament, teams, played, total, inPlay } = row;
  const { courts } = tournament.settings;
  const facts = isRotationFormat(tournament.format)
    ? [`${courts} ${courtsWord(tournament, courts)}`, `${played} played`]
    : [`${played} of ${total} played`];

  return (
    <Link
      href={`/competitions/${tournament.id}`}
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 ${ROW}`}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <p className="matchbook-display text-[0.95rem] font-bold leading-tight [overflow-wrap:anywhere]">
          {tournament.name}
        </p>
        <p className="text-[0.72rem] text-mb-ink-muted">
          {[formatLabel(tournament.format), plural(teams, "team"), ...facts].join(" • ")}
        </p>
        {inPlay > 0 && <LiveTag label={`${inPlay} being scored`} />}
      </div>
      <span className="mb-btn mb-btn-navy min-h-11 px-3 text-[0.72rem]">
        Resume
        <MbIcon id="chevron-right" size={11} />
      </span>
    </Link>
  );
};

const LivePanel = ({
  rows,
  drafts,
  error,
}: {
  rows: LiveTournament[];
  drafts: number;
  error: string | null;
}) => (
  <Panel
    title="Live tournaments"
    icon="live"
    meta={rows.length > 0 ? <span className="mb-kicker">{rows.length} live</span> : undefined}
  >
    {error ? (
      <LoadError message={error} />
    ) : rows.length > 0 ? (
      <div className="flex flex-col divide-y divide-mb-rule">
        {rows.map((row) => (
          <LiveRow key={row.tournament.id} row={row} />
        ))}
      </div>
    ) : drafts > 0 ? (
      <PanelEmpty
        message={`Nothing is live. ${plural(drafts, "draft")} ${drafts === 1 ? "is" : "are"} ready to start.`}
        action={
          <Link href="/competitions" className="mb-btn mb-btn-outline-navy min-h-11">
            <MbIcon id="compete" size={14} />
            Open tournaments
          </Link>
        }
      />
    ) : (
      <PanelEmpty
        message="Nothing is live. Create a tournament and start it to see it here."
        action={
          <Link href="/competitions/new" className="mb-btn mb-btn-outline-navy min-h-11">
            <MbIcon id="plus" size={14} />
            New tournament
          </Link>
        }
      />
    )}
  </Panel>
);

/** In place of the live tournaments for a guest, who has none. */
const GuestPanel = () => (
  <Panel title="Your tournaments" icon="compete">
    <PanelEmpty
      message="Sign in to keep a roster, run tournaments, and see your results here. As a guest you can score a quick match, which is not saved."
      action={
        <Link href={signInHref("/")} className="mb-btn mb-btn-navy min-h-11">
          <MbIcon id="login" size={14} />
          Sign in
        </Link>
      }
    />
  </Panel>
);

/* ----------------------------- Recent results ----------------------------- */

const ResultRow = ({ result }: { result: RecentResult }) => (
  <MatchRow
    match={result.match}
    team={teamLookup([result.home, result.away])}
    label={`${result.tournament?.name ?? "Quick match"} • ${whenLabel(result.match.completedAt)}`}
    href={result.href}
  />
);

const ResultsPanel = ({ results, error }: { results: RecentResult[]; error: string | null }) => (
  <Panel title="Recent results">
    {error ? (
      <LoadError message={error} />
    ) : results.length > 0 ? (
      <div className="flex flex-col divide-y divide-mb-rule">
        {results.map((result) => (
          <ResultRow key={result.match.id} result={result} />
        ))}
      </div>
    ) : (
      <PanelEmpty message="No results yet. Completed matches from your tournaments and quick matches show here." />
    )}
    <Link
      href="/summaries"
      className={`mb-panel-link justify-center border-t border-mb-rule ${ROW}`}
    >
      Every result in History
      <MbIcon id="chevron-right" size={11} />
    </Link>
  </Panel>
);

/* ---------------------------------- Tools --------------------------------- */

const ToolsPanel = () => (
  <Panel title="Tools" icon="tools">
    <Link href="/tools" className={`flex items-center gap-3 ${ROW}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-mb-navy text-mb-navy">
        <MbIcon id="court" size={18} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="matchbook-display text-[0.9rem] font-bold">Volleyball rotations</span>
        <span className="text-[0.72rem] text-mb-ink-muted">
          Design rotations and keep your formations.
        </span>
      </span>
      <MbIcon id="chevron-right" size={11} className="shrink-0 text-mb-ink-muted" />
    </Link>
  </Panel>
);

/* ---------------------------------- Page ---------------------------------- */

/**
 * Home: what is live and the next tap. Each live tournament resumes in its
 * console, quick match is one tap, the latest results open where they were
 * played, and the tools are a row away. Every row is a real tournament or
 * match; nothing here is projected.
 */
export default function HomePage() {
  const { isGuest, isLoading } = useAuth();
  const { state, isRosterLoading, isTournamentsLoading, tournamentsError } = useApp();

  const live = useMemo(
    () => liveTournaments(state.tournaments, state.matches),
    [state.tournaments, state.matches],
  );
  const results = useMemo(
    () => recentResults(state.tournaments, state.matches, state.teams),
    [state.tournaments, state.matches, state.teams],
  );
  const drafts = state.tournaments.filter((t) => t.status === "draft").length;

  if (isLoading || (!isGuest && (isRosterLoading || isTournamentsLoading))) {
    return <PageLoadingSpinner />;
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      {/* Masthead */}
      <header className="mb-5 flex flex-wrap items-end gap-x-6 gap-y-4">
        <div className="flex flex-col gap-2">
          <h1 className="matchbook-display text-4xl font-bold leading-none tracking-[0.01em] sm:text-5xl">
            Home
          </h1>
          <p className="matchbook-display text-[0.74rem] font-bold tracking-[0.1em]">{today}</p>
        </div>
        {/* A guest has nothing to pick, so the match starts at once. */}
        <Link
          href={isGuest ? "/match/guest" : "/quick-match"}
          className="mb-btn mb-btn-coral min-h-12 w-full text-[0.9rem] sm:ml-auto sm:w-auto"
        >
          <MbIcon id="quick" size={16} />
          Quick match
        </Link>
      </header>

      {/* Start-aligned so each panel is as tall as its rows, not its column. */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {isGuest ? (
            <GuestPanel />
          ) : (
            <LivePanel rows={live} drafts={drafts} error={tournamentsError} />
          )}
        </div>
        <div className="flex flex-col gap-4 lg:col-span-5">
          {!isGuest && <ResultsPanel results={results} error={tournamentsError} />}
          <ToolsPanel />
        </div>
      </div>
    </>
  );
}
