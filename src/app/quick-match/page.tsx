"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useQuickMatchPage } from "@/hooks/useQuickMatchPage";
import { PageLoadingSpinner } from "@/components/shared";
import { MatchbookSidebar } from "@/components/matchbook/Sidebar";
import { MatchbookMobileBar } from "@/components/matchbook/MobileBar";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { Crest, FormLetters, Panel, PanelEmpty, TeamMark } from "@/components/matchbook/Panel";
import {
  useMatchbookQuickMatch,
  type MbTeamFormSummary,
} from "@/components/matchbook/useMatchbookQuickMatch";
import { crestForTeam } from "@/components/matchbook/types";

/* ------------------------- Small building blocks ------------------------- */

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
  teams: { id: string; name: string }[];
  onChange: (id: string) => void;
}) => (
  <div className="min-w-0 flex-1">
    <p className="mb-kicker mb-1 text-center">{label}</p>
    <div className="flex flex-col items-center gap-2">
      <Image
        src={value ? crestForTeam(value, teams.find((t) => t.id === value)?.name ?? "") : "/assets/matchbook/brand/crest.svg"}
        alt=""
        width={56}
        height={65}
        className={value ? "" : "opacity-25 grayscale"}
      />
      <div className="relative w-full">
        <select
          className="mb-select-native"
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
        <MbIcon
          id="chevron-down"
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-mb-ink-muted"
        />
      </div>
    </div>
  </div>
);

const ScorePreviewSide = ({
  summary,
  placeholder,
}: {
  summary: MbTeamFormSummary | null;
  placeholder: string;
}) => (
  <div className="flex flex-1 flex-col items-center gap-1.5">
    {summary ? (
      <>
        <Crest team={summary.team} size={64} />
        <span className="matchbook-display text-[0.95rem] font-bold">
          {summary.team.name}
        </span>
        <span className="mb-kicker">({summary.record})</span>
      </>
    ) : (
      <>
        <Image
          src="/assets/matchbook/brand/crest.svg"
          alt=""
          width={64}
          height={74}
          className="opacity-25 grayscale"
        />
        <span className="text-[0.8rem] text-mb-ink-muted">{placeholder}</span>
      </>
    )}
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
  <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-mb-rule py-1.5 text-[0.9rem] tabular-nums last:border-b-0">
    <span className="matchbook-display font-bold">{left}</span>
    <span className="mb-kicker">{label}</span>
    <span className="matchbook-display text-right font-bold">{right}</span>
  </div>
);

/* --------------------------------- Page ---------------------------------- */

export default function QuickMatchPage() {
  const router = useRouter();
  const { isGuest, isLoading, user } = useAuth();
  const data = useMatchbookQuickMatch();
  const {
    availableTeams,
    awayTeamId,
    canStart,
    error,
    handleAwayTeamSelect,
    handleHomeTeamSelect,
    handleQuickCreateTeam,
    handleRandomSelect,
    handleStartMatch,
    handleSwapTeams,
    homeTeamId,
  } = useQuickMatchPage();

  if (isLoading) {
    return <PageLoadingSpinner />;
  }

  const guestHome = { name: "Team A", crest: crestForTeam("guest-team-a", "Team A") };
  const guestAway = { name: "Team B", crest: crestForTeam("guest-team-b", "Team B") };

  const homeSummary = isGuest
    ? { team: guestHome, form: [], record: "0–0", won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0 }
    : data.summaryFor(homeTeamId || null);
  const awaySummary = isGuest
    ? { team: guestAway, form: [], record: "0–0", won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0 }
    : data.summaryFor(awayTeamId || null);

  const startScoring = isGuest ? () => router.push("/match/guest") : handleStartMatch;
  const startEnabled = isGuest || canStart;

  return (
    <div className="matchbook-surface min-h-screen">
      <div className="flex">
        <MatchbookSidebar />

        <div className="min-w-0 flex-1">
          <MatchbookMobileBar
            active="/quick-match"
            cta={isGuest ? { href: "/login", label: "Sign In" } : { href: "/teams", label: "Teams" }}
          />

          <main className="px-4 py-5 sm:px-6 lg:px-8">
            {/* Masthead */}
            <header className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="flex items-center gap-4">
                <h1 className="matchbook-display whitespace-nowrap text-4xl font-bold leading-none tracking-[0.01em] sm:text-5xl">
                  Quick <span className="text-mb-coral">Match</span>
                </h1>
                {!isGuest && (
                  <div className="flex flex-col items-center border-[2px] border-mb-coral px-2.5 py-1 text-mb-coral">
                    <span className="matchbook-display text-[0.6rem] font-bold tracking-[0.28em]">
                      Match
                    </span>
                    <span className="matchbook-display text-2xl font-bold leading-none tabular-nums">
                      {data.nextMatchNumber}
                    </span>
                  </div>
                )}
                <div className="hidden sm:block">
                  <p
                    className="matchbook-display text-[0.74rem] font-bold tracking-[0.1em]"
                    suppressHydrationWarning
                  >
                    {data.dateLine}
                  </p>
                  <p className="mb-kicker">{data.matchesCompleted} matches completed</p>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-3">
                <button
                  type="button"
                  onClick={startScoring}
                  disabled={!startEnabled}
                  className="mb-btn mb-btn-coral disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <MbIcon id="quick" size={14} />
                  Start Match
                </button>
                <Link
                  href="/login"
                  className="hidden items-center gap-2.5 md:flex"
                  title={isGuest ? "Sign in" : user?.email ?? "Account"}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-mb-navy bg-mb-paper-bright">
                    <Image src="/assets/matchbook/brand/crest.svg" alt="" width={24} height={28} />
                  </span>
                  <span className="matchbook-display text-[0.72rem] font-bold leading-tight tracking-[0.08em]">
                    {isGuest ? (
                      <>
                        Sign In
                        <br />
                        <span className="text-mb-ink-muted">Account</span>
                      </>
                    ) : (
                      <>
                        My
                        <br />
                        Account
                      </>
                    )}
                  </span>
                  <MbIcon id="chevron-down" size={13} className="text-mb-ink-muted" />
                </Link>
              </div>
            </header>

            {/* Panel grid */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              {/* Match setup */}
              <div className="xl:col-span-7">
                <Panel title="Match Setup">
                  {isGuest ? (
                    <div className="flex flex-1 flex-col gap-4 p-5">
                      <div className="flex items-center justify-center gap-5">
                        <div className="flex flex-col items-center gap-2">
                          <Crest team={guestHome} size={56} />
                          <span className="matchbook-display text-[0.9rem] font-bold">Team A</span>
                        </div>
                        <span className="mb-score-box px-2 text-[0.7rem] tracking-[0.1em]">VS</span>
                        <div className="flex flex-col items-center gap-2">
                          <Crest team={guestAway} size={56} />
                          <span className="matchbook-display text-[0.9rem] font-bold">Team B</span>
                        </div>
                      </div>
                      <p className="text-center text-[0.85rem] text-mb-ink-muted">
                        You&apos;re playing as a guest with two default teams. Sign in to
                        pick your own teams and keep the match in your history.
                      </p>
                      <Link href="/login?redirect=/quick-match" className="mb-btn mb-btn-navy mx-auto">
                        <MbIcon id="login" size={14} />
                        Sign In to Use Your Teams
                      </Link>
                    </div>
                  ) : availableTeams.length < 2 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
                      <p className="text-[0.85rem] text-mb-ink-muted">
                        {availableTeams.length === 0
                          ? "No teams exist yet — a quick match needs two teams."
                          : "Only one team exists — a quick match needs two."}
                      </p>
                      <button
                        type="button"
                        onClick={handleQuickCreateTeam}
                        className="mb-btn mb-btn-outline text-[0.72rem] px-3 py-1.5"
                      >
                        <MbIcon id="plus" size={12} />
                        Create a team
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col gap-4 p-5">
                      <div className="flex items-start gap-3 sm:gap-5">
                        <TeamSelect
                          label="Home Team"
                          value={homeTeamId}
                          disabledId={awayTeamId}
                          teams={availableTeams}
                          onChange={handleHomeTeamSelect}
                        />
                        <button
                          type="button"
                          onClick={handleSwapTeams}
                          title="Swap home and away"
                          className="mt-9 flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-0.5 border-[1.5px] border-mb-navy bg-mb-paper-bright text-mb-navy transition-colors hover:bg-[rgba(7,50,77,0.06)]"
                        >
                          <MbIcon id="swap" size={16} />
                          <span className="matchbook-display text-[0.5rem] font-bold tracking-[0.12em]">
                            Swap
                          </span>
                        </button>
                        <TeamSelect
                          label="Away Team"
                          value={awayTeamId}
                          disabledId={homeTeamId}
                          teams={availableTeams}
                          onChange={handleAwayTeamSelect}
                        />
                      </div>

                      {error && (
                        <p className="border-[1.5px] border-mb-red px-3 py-2 text-center text-[0.8rem] font-medium text-mb-red">
                          {error}
                        </p>
                      )}

                      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-mb-rule pt-3">
                        <p className="text-[0.72rem] text-mb-ink-muted">
                          Scores are tracked point by point once the match starts.
                        </p>
                        <button
                          type="button"
                          onClick={handleRandomSelect}
                          className="mb-btn mb-btn-outline-navy px-3 py-1.5 text-[0.72rem]"
                        >
                          <MbIcon id="swap" size={12} />
                          Random Teams
                        </button>
                      </div>
                    </div>
                  )}
                </Panel>
              </div>

              {/* Scoreboard preview */}
              <div className="xl:col-span-5">
                <Panel title="Scoreboard Preview" icon="live" tone="navy">
                  <div className="flex flex-1 flex-col gap-4 p-5">
                    <div className="flex items-center gap-3">
                      <ScorePreviewSide summary={homeSummary} placeholder="Home team" />
                      <div className="flex items-center gap-2.5">
                        <span className="matchbook-display text-6xl font-bold tabular-nums">0</span>
                        <span className="mb-score-box px-2 text-[0.7rem] tracking-[0.1em]">VS</span>
                        <span className="matchbook-display text-6xl font-bold tabular-nums">0</span>
                      </div>
                      <ScorePreviewSide summary={awaySummary} placeholder="Away team" />
                    </div>
                    <button
                      type="button"
                      onClick={startScoring}
                      disabled={!startEnabled}
                      className="mb-btn mb-btn-coral mt-auto w-full py-3 text-[0.9rem] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <MbIcon id="quick" size={16} />
                      Start Scoring
                    </button>
                    {!startEnabled && !isGuest && (
                      <p className="text-center text-[0.72rem] text-mb-ink-muted">
                        Select both teams to start scoring.
                      </p>
                    )}
                  </div>
                </Panel>
              </div>

              {!isGuest && (
                <>
                  {/* Recent quick matches */}
                  <div className="xl:col-span-7">
                    <Panel title="Recent Quick Matches" action="View All" href="/summaries">
                      {data.recentQuickMatches.length === 0 ? (
                        <PanelEmpty message="No quick matches exist yet — your finished quick matches will be listed here." />
                      ) : (
                        <div className="flex flex-col divide-y divide-mb-rule">
                          {data.recentQuickMatches.map((m, i) => (
                            <div
                              key={i}
                              className="grid grid-cols-[44px_1fr_auto_1fr_14px] items-center gap-2 px-3 py-2.5"
                            >
                              <p className="matchbook-display text-[0.66rem] font-bold leading-tight text-mb-ink-muted">
                                {m.date}
                              </p>
                              <TeamMark team={m.home} className="justify-self-start" />
                              <span className="matchbook-display whitespace-nowrap text-[0.95rem] font-bold tabular-nums">
                                {m.homeScore} – {m.awayScore}
                              </span>
                              <TeamMark team={m.away} reverse className="justify-self-end" />
                              <span
                                className="h-2.5 w-2.5 justify-self-end rounded-full"
                                style={{
                                  background: m.homeWon
                                    ? "var(--mb-green)"
                                    : "var(--mb-red)",
                                }}
                                title={m.homeWon ? "Home team won" : "Away team won"}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-auto border-t border-mb-rule px-4 py-2 text-center">
                        <Link href="/summaries" className="mb-panel-link justify-center">
                          View Full Match History
                          <MbIcon id="chevron-right" size={11} />
                        </Link>
                      </div>
                    </Panel>
                  </div>

                  {/* Team form comparison */}
                  <div className="xl:col-span-5">
                    <Panel
                      title="Team Form"
                      meta={<span className="mb-kicker">Last 5 Matches</span>}
                    >
                      {!homeSummary || !awaySummary ? (
                        <PanelEmpty message="No comparison exists yet — select both teams to compare their form." />
                      ) : (
                        <div className="flex flex-1 flex-col p-4">
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b-[1.5px] border-mb-navy pb-3">
                            <div className="flex flex-col items-center gap-1">
                              <Crest team={homeSummary.team} size={40} />
                              <FormLetters form={homeSummary.form} />
                            </div>
                            <div className="text-center">
                              <p className="mb-kicker">Record</p>
                              <p className="matchbook-display text-[1.05rem] font-bold tabular-nums">
                                {homeSummary.record} · {awaySummary.record}
                              </p>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <Crest team={awaySummary.team} size={40} />
                              <FormLetters form={awaySummary.form} />
                            </div>
                          </div>
                          <div className="pt-2">
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
                    </Panel>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
