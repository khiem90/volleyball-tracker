"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useQuickMatchPage } from "@/hooks/useQuickMatchPage";
import { MatchbookShell } from "@/components/matchbook/AppShell";
import { MbPageLoading } from "@/components/matchbook/Loading";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { MbButton, MbButtonLink } from "@/components/matchbook/Button";
import { MbSelect } from "@/components/matchbook/form";
import { MbNotice } from "@/components/matchbook/Notice";
import { Crest, FormLetters, Panel, PanelEmpty, TeamMark } from "@/components/matchbook/Panel";
import { MbPanelHeadLink } from "@/components/matchbook/panels";
import {
  useMatchbookQuickMatch,
  type MbTeamFormSummary,
} from "@/components/matchbook/useMatchbookQuickMatch";
import { crestForTeam } from "@/components/matchbook/types";
import { TEAM_CREATE_LABEL } from "@/components/dialogs/team-form/labels";

/* ------------------------- Small building blocks ------------------------- */

/**
 * `MbSelect`, not a bare `.mb-select-native`. The hand-rolled control measured
 * 42.4px tall at 390px — under the 44px floor invariant 33 sets — and carried
 * its own absolutely-positioned chevron, which is the third copy of a chevron
 * the kit component already draws. `MbSelect size="md"` is 48px and pins its
 * own `min-height`, so the field cannot drift under the floor again.
 */
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
        src={
          value
            ? crestForTeam(value, teams.find((t) => t.id === value)?.name ?? "")
            : "/assets/matchbook/brand/crest.svg"
        }
        alt=""
        width={56}
        height={65}
        className={value ? "" : "opacity-25 grayscale"}
      />
      <MbSelect
        className="w-full"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Select team…"
        options={teams.map((team) => ({
          value: team.id,
          label: team.name,
          disabled: team.id === disabledId,
        }))}
      />
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
        {/* 0.95rem/700 is `display/panel-title`'s pair, and every `<Panel>`
            head on this screen declares 0.05em for it. Left undeclared this
            fell through to `.matchbook-display`'s 0.02em, so the pair carried
            two trackings at once (rubric 1.3). */}
        <span className="matchbook-display text-[0.95rem] font-bold tracking-[0.05em]">
          {summary.team.name}
        </span>
        <span className="mb-kicker tabular-nums">({summary.record})</span>
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

/**
 * The result mark on a finished quick match. It used to be a 10px coloured
 * disc with a `title` — information carried by hue alone (HF-10) whose only
 * other channel was a tooltip no touch device can open (HF-12).
 *
 * Now it is the badge system's own win/loss vocabulary: a FILLED square for a
 * home win, a HOLLOW one for an away win, so the state survives a greyscale
 * capture, plus a real sentence for a screen reader. Same 11px footprint.
 */
const ResultMark = ({ homeWon }: { homeWon: boolean }) => (
  <span className="justify-self-end">
    <span className="sr-only">{homeWon ? "Home team won" : "Away team won"}</span>
    <span
      aria-hidden="true"
      className="mb-form-square"
      style={
        homeWon
          ? { background: "var(--mb-green)" }
          : { border: "1px solid var(--mb-red)" }
      }
    />
  </span>
);

/* --------------------------------- Page ---------------------------------- */

/* ===========================================================================
   QUICK MATCH

   Coral budget: the screen's primary is "Start Match", which is an `onClick`
   and so can only live in the masthead. The rail key therefore takes
   `outline-navy` and points at the team directory — a real destination rather
   than the self-link the rail used to carry — and the in-panel "Start Scoring"
   drops to navy, because it is the SAME action as the masthead's and two coral
   fills for one verb is what invariant 15 exists to stop.
   =========================================================================== */

export default function QuickMatchPage() {
  const router = useRouter();
  const { isGuest, isLoading } = useAuth();
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
    return <MbPageLoading active="/quick-match" />;
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
    <MatchbookShell
      active="/quick-match"
      cta={{
        href: isGuest ? "/login?redirect=/quick-match" : "/teams",
        label: isGuest ? "Sign In" : "Team Directory",
        icon: isGuest ? "login" : "teams",
        tone: "outline-navy",
      }}
      masthead={{
        title: (
          <>
            Quick <span className="text-mb-coral">Match</span>
          </>
        ),
        shortTitle: "Quick Match",
        badge: isGuest
          ? undefined
          : { value: data.nextMatchNumber, label: "Match" },
        dateLine: data.dateLine,
        subLine: `${data.matchesCompleted} matches completed`,
        actions: [
          {
            label: "Start Match",
            icon: "quick",
            tone: "coral",
            onClick: startScoring,
            disabled: !startEnabled,
          },
        ],
      }}
    >
      <div className="mb-enter-grid grid grid-cols-1 gap-4 xl:grid-cols-12">
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
                  <span className="mb-score-box px-2 tracking-[0.05em]">VS</span>
                  <div className="flex flex-col items-center gap-2">
                    <Crest team={guestAway} size={56} />
                    <span className="matchbook-display text-[0.9rem] font-bold">Team B</span>
                  </div>
                </div>
                <p className="text-center text-[0.85rem] text-mb-ink-muted">
                  You&apos;re playing as a guest with two default teams. Sign in to
                  pick your own teams and keep the match in your history.
                </p>
                <MbButtonLink
                  href="/login?redirect=/quick-match"
                  variant="navy"
                  icon="login"
                  className="mx-auto"
                >
                  Sign In to Use Your Teams
                </MbButtonLink>
              </div>
            ) : availableTeams.length < 2 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
                <p className="text-[0.85rem] text-mb-ink-muted">
                  {availableTeams.length === 0
                    ? "No teams exist yet — a quick match needs two teams."
                    : "Only one team exists — a quick match needs two."}
                </p>
                <MbButton variant="outline" icon="plus" onClick={handleQuickCreateTeam}>
                  {TEAM_CREATE_LABEL}
                </MbButton>
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
                  {/* `mt-9` lines the key up with the two 48px selects beside
                      it, not with the crests above them. `aria-label` because
                      `title` alone names a control only for a mouse. */}
                  <button
                    type="button"
                    title="Swap home and away teams"
                    aria-label="Swap home and away teams"
                    onClick={handleSwapTeams}
                    className="mb-btn mb-btn-outline-navy mt-9 h-12 w-12 shrink-0 flex-col gap-0.5 p-0"
                  >
                    <MbIcon id="swap" size={16} />
                    {/* `display/kicker` — 0.62rem/600/0.16em, the step every
                        `.mb-kicker` on this screen already prints. 0.5rem was
                        8px, the smallest type in the app and two steps below
                        the scale's floor; it is not inked muted because this
                        one sits inside a button and must take the button's
                        ink through every state. */}
                    <span className="matchbook-display text-[0.62rem] font-semibold tracking-[0.16em]">
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

                {/* `MbNotice`, not a hand-rolled red-framed <p>. The kit's
                    notice carries a glyph as well as a hue, which a bare red
                    frame did not (invariant 13). */}
                {error && <MbNotice tone="danger">{error}</MbNotice>}

                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-mb-rule pt-3">
                  <p className="text-[0.72rem] text-mb-ink-muted">
                    Scores are tracked point by point once the match starts.
                  </p>
                  <MbButton
                    variant="outline-navy"
                    size="sm"
                    icon="swap"
                    onClick={handleRandomSelect}
                  >
                    Random Teams
                  </MbButton>
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
                  <span className="mb-score-box px-2 tracking-[0.05em]">VS</span>
                  <span className="matchbook-display text-6xl font-bold tabular-nums">0</span>
                </div>
                <ScorePreviewSide summary={awaySummary} placeholder="Away team" />
              </div>
              <MbButton
                variant="navy"
                size="lg"
                icon="quick"
                fullWidth
                disabled={!startEnabled}
                onClick={startScoring}
                className="mt-auto"
              >
                Start Scoring
              </MbButton>
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
              <Panel
                title="Recent Quick Matches"
                meta={<MbPanelHeadLink href="/summaries" label="View All" />}
              >
                {data.recentQuickMatches.length === 0 ? (
                  <PanelEmpty message="No quick matches exist yet — your finished quick matches will be listed here." />
                ) : (
                  <div className="flex flex-col divide-y divide-mb-rule">
                    {data.recentQuickMatches.map((m, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[44px_1fr_auto_1fr_14px] items-center gap-2 px-3 py-2.5"
                      >
                        <p className="matchbook-display text-[0.66rem] font-bold leading-tight tabular-nums text-mb-ink-muted">
                          {m.date}
                        </p>
                        <TeamMark team={m.home} className="justify-self-start" />
                        <span className="matchbook-display whitespace-nowrap text-[0.95rem] font-bold tracking-[0.05em] tabular-nums">
                          {m.homeScore} – {m.awayScore}
                        </span>
                        <TeamMark team={m.away} reverse className="justify-self-end" />
                        <ResultMark homeWon={m.homeWon} />
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-auto border-t border-mb-rule px-4 text-center">
                  <Link href="/summaries" className="mb-panel-link min-h-11 w-full justify-center">
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
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-mb-navy pb-3">
                      <div className="flex flex-col items-center gap-1">
                        <Crest team={homeSummary.team} size={40} />
                        <FormLetters form={homeSummary.form} />
                      </div>
                      <div className="text-center">
                        <p className="mb-kicker">Record</p>
                        {/* `display/stat-sm` — a kicker over a figure is the
                            stat block anatomy, and 1.2rem is the step §2.1
                            names for its value. 1.05rem (16.8px) was between
                            steps. */}
                        <p className="matchbook-display text-[1.2rem] font-bold leading-tight tabular-nums">
                          {homeSummary.record} · {awaySummary.record}
                        </p>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <Crest team={awaySummary.team} size={40} />
                        <FormLetters form={awaySummary.form} />
                      </div>
                    </div>
                    <div className="pt-2">
                      <FormStatRow left={homeSummary.won} label="Wins" right={awaySummary.won} />
                      <FormStatRow left={homeSummary.lost} label="Losses" right={awaySummary.lost} />
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
    </MatchbookShell>
  );
}
