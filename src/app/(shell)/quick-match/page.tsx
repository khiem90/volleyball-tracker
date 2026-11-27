"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useQuickMatchData } from "@/hooks/useQuickMatchData";
import { useQuickMatchPage } from "@/hooks/useQuickMatchPage";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import {
  CARD_FOOT_LINK,
  Card,
  CardEmpty,
  CardError,
  Chip,
  FormLetters,
  Icon,
  PageLoadingSpinner,
  ScoreLine,
  TeamMark,
} from "@/components/shared";
import { PageHeader } from "@/components/shell/PageHeader";
import { GUEST_AWAY_TEAM, GUEST_HOME_TEAM } from "@/constants/guestTeams";
import type { AbandonedMatchRow, TeamFormSummary } from "@/lib/quickMatchData";
import { signInHref } from "@/lib/shell";
import type { Team } from "@/lib/teamShapes";
import { LABEL } from "@/components/shared/classes";

/* ------------------------- Small building blocks ------------------------- */

/** A team on one side with the score in the middle, which stays centered whatever the names' lengths. */
const SIDES = "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2";

/** Where a team's mark will sit once a team is picked: the mark's shape in grey, with no letter. */
const EmptyMark = ({ size }: { size: number }) => (
  <span aria-hidden="true" className="team-mark bg-fill" style={{ width: size, height: size }} />
);

const TeamSelect = ({
  label,
  value,
  disabledId,
  teams,
  onChange,
}: {
  label: string;
  value: string;
  disabledId: string;
  teams: { id: string; name: string; color?: string }[];
  onChange: (id: string) => void;
}) => {
  const picked = teams.find((team) => team.id === value);
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <p className={LABEL}>{label}</p>
      {/* The same size with a team picked or not, so the select below does not jump. */}
      {picked ? (
        <TeamMark name={picked.name} color={picked.color} size={56} />
      ) : (
        <EmptyMark size={56} />
      )}
      <div className="relative w-full">
        <select
          className="field-select"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
        >
          <option value="">Select team…</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id} disabled={team.id === disabledId}>
              {team.name}
            </option>
          ))}
        </select>
        <Icon
          id="chevron-down"
          size={14}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft"
        />
      </div>
    </div>
  );
};

/** One of the guest's two fixed teams: its mark over its name. */
const GuestSide = ({ team }: { team: Team }) => (
  <div className="flex flex-col items-center gap-2">
    <TeamMark name={team.name} color={team.color} size={56} />
    <span className="text-body font-bold">{team.name}</span>
  </div>
);

const ScorePreviewSide = ({
  summary,
  placeholder,
}: {
  summary: TeamFormSummary | null;
  placeholder: string;
}) => (
  <div className="flex min-w-0 flex-col items-center gap-1 text-center">
    {summary ? (
      <>
        <TeamMark name={summary.team.name} color={summary.team.color} size={64} />
        {/* The selects cut a long name to one line. Here it takes up to three before it is cut. */}
        <span
          title={summary.team.name}
          className="mt-1 line-clamp-3 max-w-full text-body font-bold leading-tight wrap-break-word"
        >
          {summary.team.name}
        </span>
        <span className={`${LABEL} tabular-nums`}>({summary.record})</span>
      </>
    ) : (
      <>
        <EmptyMark size={64} />
        <span className="mt-1 text-label text-ink-soft">{placeholder}</span>
      </>
    )}
  </div>
);

/** One side of the form comparison: the team's mark and name over its last results. */
const FormSide = ({ summary }: { summary: TeamFormSummary }) => (
  <div className="flex min-w-0 flex-col items-center gap-1.5">
    <TeamMark name={summary.team.name} color={summary.team.color} size={40} />
    <span className="max-w-full truncate text-caption font-semibold">{summary.team.name}</span>
    <FormLetters form={summary.form} />
  </div>
);

const FormStatRow = ({
  left,
  label,
  right,
}: {
  left: string | number;
  label: string;
  right: string | number;
}) => (
  <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-line py-2 tabular-nums last:border-b-0">
    <span className="text-title font-bold">{left}</span>
    <span className={LABEL}>{label}</span>
    <span className="text-right text-title font-bold">{right}</span>
  </div>
);

/** A quick match left mid-way: the score so far, and Resume or Discard. */
const AbandonedMatch = ({
  match,
  onDiscard,
}: {
  match: AbandonedMatchRow;
  onDiscard: () => void;
}) => (
  <li className="flex flex-col gap-3 px-4 py-3">
    <ScoreLine
      home={match.home}
      away={match.away}
      homeScore={match.homeScore}
      awayScore={match.awayScore}
    />
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-caption text-ink-soft">Started {match.started}</p>
      {/* On a phone the buttons take a line of their own and share it. */}
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <button
          type="button"
          onClick={onDiscard}
          className="btn btn-danger-quiet flex-1 sm:flex-none"
        >
          <Icon id="trash" size={14} />
          Discard
        </button>
        {match.resumable && (
          <Link href={`/match/${match.id}`} className="btn btn-ink flex-1 sm:flex-none">
            <Icon id="quick" size={14} />
            Resume
          </Link>
        )}
      </div>
    </div>
  </li>
);

/* --------------------------------- Page ---------------------------------- */

export default function QuickMatchPage() {
  const router = useRouter();
  const { isGuest, isLoading } = useAuth();
  const data = useQuickMatchData();
  const {
    availableTeams,
    awayTeamId,
    canStart,
    discardingId,
    error,
    handleAwayTeamSelect,
    handleConfirmDiscard,
    handleHomeTeamSelect,
    handleQuickCreateTeam,
    handleRandomSelect,
    handleStartMatch,
    handleSwapTeams,
    homeTeamId,
    isRosterLoading,
    setDiscardingId,
  } = useQuickMatchPage();

  if (isLoading || (!isGuest && isRosterLoading)) {
    return <PageLoadingSpinner />;
  }

  const guestHome = { name: "Team A", color: GUEST_HOME_TEAM.color };
  const guestAway = { name: "Team B", color: GUEST_AWAY_TEAM.color };

  const homeSummary = isGuest
    ? { team: guestHome, form: [], record: "0–0", won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0 }
    : data.summaryFor(homeTeamId || null);
  const awaySummary = isGuest
    ? { team: guestAway, form: [], record: "0–0", won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0 }
    : data.summaryFor(awayTeamId || null);

  const discarding = data.abandonedQuickMatches.find((m) => m.id === discardingId);

  const startScoring = isGuest ? () => router.push("/match/guest") : handleStartMatch;
  const startEnabled = isGuest || canStart;

  return (
    <>
      <PageHeader
        title="Quick Match"
        status={
          isGuest ? undefined : <Chip className="tabular-nums">Match {data.nextMatchNumber}</Chip>
        }
        line={
          <>
            <span suppressHydrationWarning>{data.dateLine}</span> • {data.matchesCompleted} matches
            completed
          </>
        }
        action={
          /* The page's one green button. The preview card's own start button is the black pill. */
          <button
            type="button"
            onClick={startScoring}
            disabled={!startEnabled}
            className="btn btn-action"
          >
            <Icon id="quick" size={18} />
            Start Match
          </button>
        }
      />

      {/* Card grid */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Quick matches left mid-way */}
        {!isGuest && data.abandonedQuickMatches.length > 0 && (
          <div className="min-w-0 xl:col-span-12">
            <Card
              title="Left Mid-Way"
              meta={
                data.abandonedQuickMatches.length === 1
                  ? "1 match"
                  : `${data.abandonedQuickMatches.length} matches`
              }
            >
              <ul className="divide-y divide-line">
                {data.abandonedQuickMatches.map((m) => (
                  <AbandonedMatch key={m.id} match={m} onDiscard={() => setDiscardingId(m.id)} />
                ))}
              </ul>
            </Card>
          </div>
        )}

        {/* Match setup */}
        <div className="min-w-0 xl:col-span-7">
          <Card title="Match Setup">
            {isGuest ? (
              <div className="flex flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-center gap-5">
                  <GuestSide team={guestHome} />
                  <span className="chip text-ink-soft">VS</span>
                  <GuestSide team={guestAway} />
                </div>
                <p className="text-center text-label text-ink-soft">
                  You&apos;re playing as a guest with two default teams. Sign in to
                  pick your own teams and keep the match in your history.
                </p>
                <Link href={signInHref("/quick-match")} className="btn btn-ink mx-auto">
                  <Icon id="login" size={14} />
                  Sign In to Use Your Teams
                </Link>
              </div>
            ) : availableTeams.length < 2 ? (
              <CardEmpty
                message={
                  availableTeams.length === 0
                    ? "No teams exist yet — a quick match needs two teams."
                    : "Only one team exists — a quick match needs two."
                }
                action={
                  <button type="button" onClick={handleQuickCreateTeam} className="btn btn-fill">
                    <Icon id="plus" size={14} />
                    Create a team
                  </button>
                }
              />
            ) : (
              <div className="flex flex-1 flex-col gap-4 p-4">
                {/* End-aligned, so the swap button sits level with the two selects. */}
                <div className="flex items-end gap-2 sm:gap-5">
                  <TeamSelect
                    label="Home Team"
                    value={homeTeamId}
                    disabledId={awayTeamId}
                    teams={availableTeams}
                    onChange={handleHomeTeamSelect}
                  />
                  {/* A circle on a phone, where the selects need the width. The word shows from sm up. */}
                  <button
                    type="button"
                    onClick={handleSwapTeams}
                    title="Swap home and away"
                    className="btn btn-fill min-w-11 shrink-0 px-2.5 sm:px-4"
                  >
                    <Icon id="swap" size={16} />
                    <span className="sr-only sm:not-sr-only">Swap</span>
                  </button>
                  <TeamSelect
                    label="Away Team"
                    value={awayTeamId}
                    disabledId={homeTeamId}
                    teams={availableTeams}
                    onChange={handleAwayTeamSelect}
                  />
                </div>

                {error && <CardError message={error} className="text-center" />}

                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                  <p className="text-caption text-ink-soft">
                    Scores are tracked point by point once the match starts.
                  </p>
                  <button type="button" onClick={handleRandomSelect} className="btn btn-fill">
                    <Icon id="swap" size={14} />
                    Random Teams
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Scoreboard preview */}
        <div className="min-w-0 xl:col-span-5">
          <Card title="Scoreboard Preview" icon="live">
            <div className="flex flex-1 flex-col gap-4 p-4">
              {/* The sides hang from the top and the score is as tall as a mark, so the
                  two marks and the score stay level when one name wraps further. */}
              <div className={`${SIDES} items-start`}>
                <ScorePreviewSide summary={homeSummary} placeholder="Home team" />
                <div className="flex h-16 items-center gap-2 text-score font-extrabold leading-none tabular-nums">
                  <span>0</span>
                  <span className="chip text-ink-soft">VS</span>
                  <span>0</span>
                </div>
                <ScorePreviewSide summary={awaySummary} placeholder="Away team" />
              </div>
              <button
                type="button"
                onClick={startScoring}
                disabled={!startEnabled}
                className="btn btn-ink mt-auto w-full"
              >
                <Icon id="quick" size={16} />
                Start Scoring
              </button>
              {!startEnabled && !isGuest && (
                <p className="text-center text-caption text-ink-soft">
                  Select both teams to start scoring.
                </p>
              )}
            </div>
          </Card>
        </div>

        {!isGuest && (
          <>
            {/* Recent quick matches */}
            <div className="min-w-0 xl:col-span-7">
              <Card title="Recent Quick Matches" action="View All" href="/summaries">
                {data.recentQuickMatches.length === 0 ? (
                  <CardEmpty message="No quick matches exist yet — your finished quick matches will be listed here." />
                ) : (
                  <ul className="divide-y divide-line">
                    {data.recentQuickMatches.map((m) => (
                      <li key={m.id} className="flex flex-col gap-1.5 px-4 pt-2.5 pb-3">
                        <p className="text-center text-caption text-ink-soft">{m.date}</p>
                        <ScoreLine
                          home={m.home}
                          away={m.away}
                          homeScore={m.homeScore}
                          awayScore={m.awayScore}
                          winner={m.winner}
                        />
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href="/summaries"
                  className={CARD_FOOT_LINK}
                >
                  View Full Match History
                  <Icon id="chevron-right" size={14} />
                </Link>
              </Card>
            </div>

            {/* Team form comparison */}
            <div className="min-w-0 xl:col-span-5">
              <Card title="Team Form" meta="Last 5 Matches">
                {!homeSummary || !awaySummary ? (
                  <CardEmpty message="No comparison exists yet — select both teams to compare their form." />
                ) : (
                  <div className="flex flex-1 flex-col p-4">
                    <div className={`${SIDES} items-center border-b border-line pb-3`}>
                      <FormSide summary={homeSummary} />
                      <div className="text-center">
                        <p className={LABEL}>Record</p>
                        <p className="text-title font-bold tabular-nums">
                          {homeSummary.record} · {awaySummary.record}
                        </p>
                      </div>
                      <FormSide summary={awaySummary} />
                    </div>
                    <div className="pt-1">
                      <FormStatRow
                        left={homeSummary.won}
                        label="Wins"
                        right={awaySummary.won}
                      />
                      <FormStatRow
                        left={homeSummary.lost}
                        label="Losses"
                        right={awaySummary.lost}
                      />
                      <FormStatRow
                        left={homeSummary.pointsFor}
                        label="Points For"
                        right={awaySummary.pointsFor}
                      />
                      <FormStatRow
                        left={homeSummary.pointsAgainst}
                        label="Points Against"
                        right={awaySummary.pointsAgainst}
                      />
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={discarding !== undefined}
        onOpenChange={(open) => {
          if (!open) setDiscardingId(null);
        }}
        title="Discard this match?"
        description={
          discarding
            ? `${discarding.home.name} ${discarding.homeScore}–${discarding.awayScore} ${discarding.away.name}. The score so far is lost, and the match will not count toward either team's record.`
            : ""
        }
        confirmLabel="Discard"
        busyLabel="Discarding..."
        isBusy={false}
        onConfirm={handleConfirmDiscard}
        icon="trash"
      />
    </>
  );
}
