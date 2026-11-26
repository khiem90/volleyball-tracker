"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useHomeLists } from "@/context/useHomeLists";
import {
  CARD_ROW,
  Card,
  CardEmpty,
  CardError,
  Chip,
  DateTile,
  Icon,
  PageLoadingSpinner,
} from "@/components/shared";
import { PageHeader } from "@/components/shell/PageHeader";
import { MatchRow } from "@/components/console/MatchRow";
import { teamLookup } from "@/components/console/teamRefs";
import { courtsWord } from "@/lib/console";
import { formatLabel, isRotationFormat } from "@/lib/formats";
import { playedIn } from "@/lib/history";
import {
  liveTournaments,
  recentResults,
  type LiveTournament,
  type RecentResult,
} from "@/lib/home";
import { deviceZone, timeLabel } from "@/lib/rsvp";
import { listWording, type HomeListRow } from "@/lib/rsvpList";
import { signInHref } from "@/lib/shell";
import { plural } from "@/lib/utils";
import type { RsvpList } from "@/types/game";

/** "7:42 PM" for a result today, "Sep 27" for one before. */
const whenLabel = (ts: number | undefined) => {
  if (!ts) return "";
  const date = new Date(ts);
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/* A row that opens something: its words on the left and one thing on the right. */
const ROW = `flex items-center gap-3 ${CARD_ROW}`;
const ROW_TEXT = "flex min-w-0 flex-1 flex-col gap-0.5";
/* A long name wraps, mid-word if it must, so it never pushes the right side out of the row. */
const ROW_NAME = "text-title font-semibold leading-snug wrap-anywhere";
const ROW_FACTS = "text-caption text-ink-soft";
/* The green line under a row's facts: what is being scored, a notice not yet read. */
const ROW_FLAG = "mt-0.5 flex items-center gap-1.5 text-caption font-semibold text-action";

/* ---------------------------- Live tournaments ---------------------------- */

const LiveRow = ({ row }: { row: LiveTournament }) => {
  const { tournament, teams, played, total, inPlay } = row;
  const { courts } = tournament.settings;
  const facts = isRotationFormat(tournament.format)
    ? [`${courts} ${courtsWord(tournament, courts)}`, `${played} played`]
    : [`${played} of ${total} played`];

  return (
    <Link href={`/competitions/${tournament.id}`} className={ROW}>
      <span className={ROW_TEXT}>
        <span className={ROW_NAME}>{tournament.name}</span>
        <span className={ROW_FACTS}>
          {[formatLabel(tournament.format), plural(teams, "team"), ...facts].join(" • ")}
        </span>
        {inPlay > 0 && (
          <span className={ROW_FLAG}>
            <span className="live-dot" aria-hidden="true" />
            {inPlay} being scored
          </span>
        )}
      </span>
      {/* The whole row is the link, so the pill is drawn and is not a control of its own. */}
      <span className="btn btn-ink shrink-0">Resume</span>
    </Link>
  );
};

const LiveCard = ({
  rows,
  drafts,
  error,
}: {
  rows: LiveTournament[];
  drafts: number;
  error: string | null;
}) => (
  <Card
    title="Live tournaments"
    icon="live"
    meta={rows.length > 0 ? `${rows.length} live` : undefined}
  >
    {error ? (
      <CardError message={error} />
    ) : rows.length > 0 ? (
      <ul className="divide-y divide-line">
        {rows.map((row) => (
          <li key={row.tournament.id}>
            <LiveRow row={row} />
          </li>
        ))}
      </ul>
    ) : drafts > 0 ? (
      <CardEmpty
        message={`Nothing is live. ${plural(drafts, "draft")} ${drafts === 1 ? "is" : "are"} ready to start.`}
        action={
          <Link href="/competitions" className="btn btn-fill">
            <Icon id="compete" size={14} />
            Open tournaments
          </Link>
        }
      />
    ) : (
      <CardEmpty
        message="Nothing is live. Create a tournament and start it to see it here."
        action={
          <Link href="/competitions/new" className="btn btn-fill">
            <Icon id="plus" size={14} />
            New tournament
          </Link>
        }
      />
    )}
  </Card>
);

/** In place of the live tournaments for a guest, who has none. */
const GuestCard = () => (
  <Card title="Your tournaments" icon="compete">
    <CardEmpty
      message="Sign in to keep a roster, run tournaments, and see your results here. As a guest you can score a quick match, which is not saved."
      action={
        <Link href={signInHref("/")} className="btn btn-ink">
          <Icon id="login" size={14} />
          Sign in
        </Link>
      }
    />
  </Card>
);

/* ---------------------------------- RSVPs --------------------------------- */

type Standing = HomeListRow["standing"];

/** What an RSVP row reads off a list. */
type Scheduled = Pick<RsvpList, "name" | "scheduledAt" | "scheduledZone" | "takes">;

/** In the date tile's place on a list with no scheduled time, so every row's name starts at the same edge. */
const NoDateTile = () => (
  <span className="grid size-11 shrink-0 place-items-center rounded-tile bg-fill text-ink-soft">
    <Icon id="calendar" size={18} />
  </span>
);

/** One RSVP of the account's: what it is to, when, and where the account stands. */
const RsvpRow = ({
  to,
  standing,
  unread,
  href,
  zone,
}: {
  to: Scheduled;
  standing: Standing;
  unread: boolean;
  href: string;
  zone: string;
}) => {
  const when =
    to.scheduledAt === undefined ? null : timeLabel(to.scheduledAt, to.scheduledZone, zone).viewer;

  return (
    <Link href={href} className={ROW}>
      {to.scheduledAt === undefined ? (
        <NoDateTile />
      ) : (
        <DateTile at={to.scheduledAt} zone={zone} />
      )}
      <span className={ROW_TEXT}>
        <span className={ROW_NAME}>{to.name}</span>
        {when && <span className={ROW_FACTS}>{when}</span>}
        {unread && (
          <span className={ROW_FLAG}>
            <Icon id="bell" size={12} />
            New notice
          </span>
        )}
      </span>
      {/* The account being in or waiting, or on a by-team list its team. */}
      <Chip tone={standing.kind === "confirmed" ? "action" : "fill"}>
        {listWording(to.takes).homeStanding(standing)}
      </Chip>
    </Link>
  );
};

/**
 * The lists the account is on, soonest first, each opening the list's
 * page. Home leaves the card out when there are none.
 */
const RsvpsCard = ({ lists }: { lists: HomeListRow[] }) => {
  const [zone] = useState(deviceZone);

  return (
    <Card title="Your RSVPs" icon="calendar" meta={plural(lists.length, "list")}>
      <ul className="divide-y divide-line">
        {lists.map(({ list, standing, unread, href }) => (
          <li key={list.id}>
            <RsvpRow to={list} standing={standing} unread={unread} href={href} zone={zone} />
          </li>
        ))}
      </ul>
    </Card>
  );
};

/* ----------------------------- Recent results ----------------------------- */

const ResultRow = ({ result }: { result: RecentResult }) => (
  <MatchRow
    match={result.match}
    team={teamLookup([result.home, result.away])}
    label={`${playedIn(result)} • ${whenLabel(result.match.completedAt)}`}
    href={result.href}
  />
);

const ResultsCard = ({ results, error }: { results: RecentResult[]; error: string | null }) => (
  <Card title="Recent results" icon="history">
    {error ? (
      <CardError message={error} />
    ) : results.length > 0 ? (
      <ul className="divide-y divide-line">
        {results.map((result) => (
          <li key={result.match.id}>
            <ResultRow result={result} />
          </li>
        ))}
      </ul>
    ) : (
      <CardEmpty message="No results yet. Completed matches from your tournaments and quick matches show here." />
    )}
    <Link
      href="/summaries"
      className={`card-link justify-center border-t border-line text-body font-bold text-action ${CARD_ROW}`}
    >
      Every result in History
      <Icon id="chevron-right" size={14} />
    </Link>
  </Card>
);

/* ---------------------------------- Tools --------------------------------- */

const ToolsCard = () => (
  <Card title="Tools" icon="tools">
    <Link href="/tools" className={ROW}>
      <span className={ROW_TEXT}>
        <span className={ROW_NAME}>Volleyball rotations</span>
        <span className={ROW_FACTS}>Design rotations and keep your formations.</span>
      </span>
      <Icon id="chevron-right" size={14} className="shrink-0 text-ink-soft" />
    </Link>
  </Card>
);

/* ---------------------------------- Page ---------------------------------- */

/**
 * Home: what is live and the next tap. Each live tournament resumes in its
 * console, quick match is one tap, the latest results open where they were
 * played, and the tools are a row away. Every row is a real tournament or
 * match; nothing here is projected.
 */
export default function HomePage() {
  const { user, isGuest, isLoading } = useAuth();
  const { roster, tournaments, matches, isRosterLoading, isTournamentsLoading, tournamentsError } =
    useApp();
  // Only a real account has RSVPs; a guest and a scorer link's silent
  // identity have no user, so they read nothing and see no card.
  const listRows = useHomeLists(user?.uid ?? null);

  const live = useMemo(
    () => liveTournaments(tournaments, matches),
    [tournaments, matches],
  );
  const results = useMemo(
    () => recentResults(tournaments, matches, roster),
    [tournaments, matches, roster],
  );
  const drafts = tournaments.filter((t) => t.status === "draft").length;

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
      <PageHeader
        title="Home"
        line={today}
        action={
          /* A guest has nothing to pick, so the match starts at once. */
          <Link href={isGuest ? "/match/guest" : "/quick-match"} className="btn btn-action">
            <Icon id="quick" size={18} />
            Quick match
          </Link>
        }
      />

      {/* Start-aligned so each card is as tall as its rows, not its column. */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        {/* The RSVPs sit under the live tournaments, which on a phone,
            where the columns stack, is also above the recent results. */}
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-7">
          {isGuest ? (
            <GuestCard />
          ) : (
            <LiveCard rows={live} drafts={drafts} error={tournamentsError} />
          )}
          {!isGuest && listRows.length > 0 && <RsvpsCard lists={listRows} />}
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-5">
          {!isGuest && <ResultsCard results={results} error={tournamentsError} />}
          <ToolsCard />
        </div>
      </div>
    </>
  );
}
