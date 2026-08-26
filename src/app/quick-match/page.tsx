"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useQuickMatchPage } from "@/hooks/useQuickMatchPage";
import { MatchbookShell } from "@/components/matchbook/AppShell";
import { MbPageLoading } from "@/components/matchbook/Loading";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { MbActionBar, type MbAction } from "@/components/matchbook/ActionBar";
import { MbButton, MbButtonLink } from "@/components/matchbook/Button";
import {
  MB_VIEWPORT_FILL,
  useMbViewportFill,
} from "@/components/matchbook/useViewportFill";
import { MbSelect } from "@/components/matchbook/form";
import { MbMatchupPair } from "@/components/matchbook/MatchRow";
import { MbNotice } from "@/components/matchbook/Notice";
import { Crest, FormLetters, Panel, PanelEmpty } from "@/components/matchbook/Panel";
import {
  MB_XL_SPAN,
  mbClosingSpan,
  MbLedgerPanel,
  MbPanelHeadLink,
} from "@/components/matchbook/panels";
import {
  mbQuickMatchContentsFor,
  useMatchbookQuickMatch,
  type MbQuickMatchSection,
  type MbTeamFormSummary,
} from "@/components/matchbook/useMatchbookQuickMatch";
import { MbTeamName } from "@/components/matchbook/TeamName";
import { crestForTeam } from "@/components/matchbook/types";
import { TEAM_CREATE_LABEL } from "@/components/dialogs/team-form/labels";

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
  <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
    {summary ? (
      <>
        <Crest team={summary.team} size={64} />
        {/* `MbTeamName`, not a raw span — a raw span's min-content floor is
            its longest word, and it pushes the panel instead of eliding. */}
        <MbTeamName
          name={summary.team.name}
          className="matchbook-display max-w-full text-[0.95rem] mb-track-title font-bold"
        />
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
        <span className="text-[0.85rem] text-mb-ink-muted">{placeholder}</span>
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
    <span className="matchbook-display mb-track-display font-bold">{left}</span>
    <span className="mb-kicker">{label}</span>
    <span className="matchbook-display mb-track-display text-right font-bold">{right}</span>
  </div>
);

/* Result mark: a FILLED square for a home win, a HOLLOW one for an away win —
   the state survives greyscale — plus a real sentence for a screen reader. */
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

/* QUICK MATCH. The screen's one commit (Start Match) lives in the sticky
   bottom bar, standing on the shared viewport-fill column; on an account with
   fewer than two teams the same slot carries the move that IS possible. The
   bar's Start is the screen's one coral fill, and the verb exists ONCE — the
   preview panel carries no control. */

export default function QuickMatchPage() {
  const router = useRouter();
  const { isGuest, isLoading } = useAuth();
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
  const data = useMatchbookQuickMatch({ homeTeamId, awayTeamId });
  /* Called before the loading gate: a hook after an early return is a hook
     that mounts conditionally. */
  const columnRef = useMbViewportFill();

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

  /* Under two teams the bar carries the move that IS possible, never a
     disabled coral Start. */
  const needsTeams = !isGuest && availableTeams.length < 2;

  const primaryAction: MbAction = needsTeams
    ? {
        label:
          availableTeams.length === 0 ? "Add Your First Team" : "Add Another Team",
        icon: "teams",
        variant: "navy",
        href: "/teams",
      }
    : {
        label: "Start Match",
        icon: "quick",
        variant: "coral",
        onClick: startScoring,
        disabled: !startEnabled,
      };

  /* Arms at two, as `/` and `/competitions` do; guests never render either
     panel, so the cut cannot fire for them. */
  const collapsed = !isGuest && data.muteSections.length >= 2;
  const kept = (key: MbQuickMatchSection) =>
    !collapsed || !data.muteSections.includes(key);

  /* Withholding the preview leaves the index closing the first row instead —
     `mbClosingSpan` answers a flush row with a full row of its own. */
  const keptSpans = [
    7,
    kept("preview") && 5,
    kept("recent") && 7,
    kept("form") && 5,
  ].filter((span): span is number => span !== false);

  return (
    <MatchbookShell
      active="/quick-match"
      cta={{
        href: isGuest ? "/login?redirect=/quick-match" : "/teams",
        label: isGuest ? "Sign In" : "Team Directory",
        icon: isGuest ? "login" : "teams",
        variant: "outline-navy",
      }}
      masthead={{
        title: (
          <>
            Quick <span className="text-mb-coral">Match</span>
          </>
        ),
        shortTitle: "Quick Match",
        /* `#3`, not `3` — the badge is an ordinal, not a count, and the hash
           says which. */
        badge: isGuest
          ? undefined
          : { value: `#${data.nextMatchNumber}`, label: "Match" },
        dateLine: data.dateLine,
        subLine: data.subLine,
        /* No `actions` — the screen's one verb is in the commit bar below. */
      }}
    >
      <div ref={columnRef} className={`flex flex-col gap-4 ${MB_VIEWPORT_FILL}`}>
      <div className="mb-enter-grid grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Match setup */}
        <div className="xl:col-span-7">
          <Panel title="Match Setup">
            {isGuest ? (
              <div className="flex flex-1 flex-col gap-4 p-5">
                <div className="flex items-center justify-center gap-5">
                  <div className="flex flex-col items-center gap-2">
                    <Crest team={guestHome} size={56} />
                    <span className="matchbook-display text-[0.9rem] mb-track-display font-bold">Team A</span>
                  </div>
                  <span className="mb-score-box mb-track-title px-2">VS</span>
                  <div className="flex flex-col items-center gap-2">
                    <Crest team={guestAway} size={56} />
                    <span className="matchbook-display text-[0.9rem] mb-track-display font-bold">Team B</span>
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
                {/* The pickers stack below a 380px container width — the
                    point where a select can still paint eight characters
                    beside the swap key. A container query, not the viewport:
                    the panel's own width decides. */}
                <div className="@container">
                  <div className="flex flex-col items-stretch gap-3 @min-[380px]:flex-row @min-[380px]:items-start @min-[380px]:gap-4">
                    <TeamSelect
                      label="Home Team"
                      value={homeTeamId}
                      disabledId={awayTeamId}
                      teams={availableTeams}
                      onChange={handleHomeTeamSelect}
                    />
                    {/* `mt-9` lines the key up with the selects, scoped to the
                        side-by-side cut. `aria-label` because `title` alone
                        names a control only for a mouse. */}
                    <button
                      type="button"
                      title="Swap home and away teams"
                      aria-label="Swap home and away teams"
                      onClick={handleSwapTeams}
                      className="mb-btn mb-btn-outline-navy h-12 w-12 shrink-0 flex-col gap-1 self-center p-0 @min-[380px]:mt-9 @min-[380px]:self-start"
                    >
                      <MbIcon id="swap" size={16} />
                      {/* Kicker step, but not ink-muted: it sits inside a
                          button and must take the button's ink through every
                          state. */}
                      <span className="matchbook-display text-[0.62rem] mb-track-kicker font-semibold">
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
                </div>

                {/* `MbNotice`, not a hand-rolled red frame — the kit's notice
                    carries a glyph as well as a hue. */}
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

        {/* Scoreboard preview — withheld below two teams (no names, nothing to
            preview) and deliberately control-free: the bar's Start Match is
            the screen's one verb. While that commit is dormant, one sentence
            here says what arms it. */}
        {kept("preview") && (
        <div className="xl:col-span-5">
          <Panel title="Scoreboard Preview" icon="live" tone="navy">
            <div className="flex flex-1 flex-col gap-4 p-5">
              <div className="flex flex-1 items-center gap-3">
                <ScorePreviewSide summary={homeSummary} placeholder="Home team" />
                <div className="flex items-center gap-2.5">
                  <span className="matchbook-display text-6xl mb-track-numeral font-bold tabular-nums">0</span>
                  <span className="mb-score-box mb-track-title px-2">VS</span>
                  <span className="matchbook-display text-6xl mb-track-numeral font-bold tabular-nums">0</span>
                </div>
                <ScorePreviewSide summary={awaySummary} placeholder="Away team" />
              </div>
              {!startEnabled && !isGuest && (
                <p className="mt-auto text-center text-[0.72rem] text-mb-ink-muted">
                  Select both teams to start the match.
                </p>
              )}
            </div>
          </Panel>
        </div>
        )}

        {!isGuest && (
          <>
            {/* Recent quick matches */}
            {kept("recent") && (
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
                        /* One cell for the matchup. A grid item with any
                           `justify-self` other than `stretch` is sized by its
                           max-content and can never truncate — `MbMatchupPair`
                           mirrors the away side from its own container width
                           instead. */
                        className="grid grid-cols-[44px_minmax(0,1fr)_14px] items-center gap-2 px-3 py-2.5"
                      >
                        <p className="matchbook-display text-[0.66rem] mb-track-status font-bold leading-tight tabular-nums text-mb-ink-muted">
                          {m.date}
                        </p>
                        <MbMatchupPair
                          home={m.home}
                          away={m.away}
                          homeScore={m.homeScore}
                          awayScore={m.awayScore}
                          homeWon={m.homeWon}
                          awayWon={!m.homeWon}
                          decided={m.homeScore !== m.awayScore}
                        />
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
            )}

            {/* Team form comparison */}
            {kept("form") && (
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
                        {/* Kicker over a figure — the stat block anatomy. */}
                        <p className="matchbook-display text-[1.2rem] mb-track-display font-bold leading-tight tabular-nums">
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
            )}

            {/* The withheld strips, as one index that closes the last row
                flush — the same object `/` and `/competitions` use. */}
            {collapsed && (
              <div className={MB_XL_SPAN[mbClosingSpan(keptSpans)]}>
                <MbLedgerPanel
                  title="Still to Come"
                  rows={mbQuickMatchContentsFor(data.muteSections)}
                  dense
                  wide
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* The commit bar — each piece is load-bearing: `mt-auto` sends it to
          the end of the viewport-fill column; `bottom` rides it above the
          fixed tab bar via the offset `MatchbookBottomBar` publishes, and the
          `!` is required because `.mb-action-bar { bottom: 0 }` is unlayered
          and outranks a plain utility. It sits outside `.mb-enter-grid`, so
          it slides up once with the route. */}
      <MbActionBar
        className="mb-enter mb-stagger-4 mt-auto bottom-[var(--mb-toast-offset,0px)]!"
        primary={primaryAction}
      />
      </div>
    </MatchbookShell>
  );
}
