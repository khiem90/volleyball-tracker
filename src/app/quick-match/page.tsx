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
  <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
    {summary ? (
      <>
        <Crest team={summary.team} size={64} />
        {/* 0.95rem/700 is `display/panel-title`'s pair, and every `<Panel>`
            head on this screen declares 0.05em for it. Left undeclared this
            fell through to `.matchbook-display`'s 0.02em, so the pair carried
            two trackings at once (rubric 1.3).

            `MbTeamName`, not a raw span (L1). The span had neither `min-w-0`
            nor any overflow control, so its min-content floor was its longest
            word: the preview reserves 166px for two 60px numerals and a VS
            pip, and at 320 that leaves 40px a side — which the raw span
            answered by pushing the panel, not by eliding. The name now elides
            from the middle inside whatever the stacked cut gives it. */}
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

   THE PRIMARY LIVES IN THE BOTTOM COMMIT BAR (design language §8). This
   screen's whole job is one commit — Start Match — and the masthead put that
   verb at 0.20 of the viewport height at 390x844: the top of the screen, on
   the surface a thumb pays for the bottom of. §8 names the answer ("any
   screen whose main job is a single repeated action puts that action in an
   `MbActionBar`, not in the masthead") and this page now applies it the way
   `/competitions/new` and the scoring console already do: one sticky bar,
   riding `--mb-toast-offset` above the fixed tab bar, standing on the shared
   `MB_VIEWPORT_FILL` column so it sits at the viewport bottom even on an
   account too new to fill the screen. On an account with fewer than two teams
   the SAME slot carries the move that IS possible — Add Your First / Another
   Team, navy, `/teams` — exactly as the masthead variant it replaces did.

   Coral budget: the bar's Start Match is the screen's one coral fill. The
   rail key takes `outline-navy` and points at the team directory — a real
   destination rather than the self-link the rail used to carry — and the
   in-panel "Start Scoring" stays navy, because it is the SAME action as the
   bar's and two coral fills for one verb is what invariant 15 exists to stop.
   =========================================================================== */

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

  /* A quick match needs two sides to name, and a signed-in account with fewer
     than two teams cannot start one however loud the button is. The commit
     bar used to inherit a DISABLED coral "Start Match" from the masthead on
     exactly this account — the loudest control on the screen, unusable, on
     the screen a new user reaches from the rail on every other page. The slot
     instead carries the move that IS possible, in navy, derived from the
     count exactly as `/`'s primary is. */
  const needsTeams = !isGuest && availableTeams.length < 2;

  /* THE ONE COMMIT, in the bar's primary slot (§8). `disabled` rather than
     the wizard's dormant-dress treatment is deliberate continuity: the
     Scoreboard Preview's "Start Scoring" is the same verb in the same state
     and prints "Select both teams to start scoring." beside it — the bar and
     the panel must not disagree about whether the action is takeable. */
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

  /* Arms at TWO, as `/` and `/competitions` do. On a new account both are mute
     at once; on a populated one only Team Form is until both sides are picked,
     and that single `PanelEmpty` is the rubric's anchor rather than a
     compromise with it. Guests never render either panel, so the cut cannot
     fire for them. */
  const collapsed = !isGuest && data.muteSections.length >= 2;
  const kept = (key: MbQuickMatchSection) =>
    !collapsed || !data.muteSections.includes(key);

  /* Setup (7) and Preview (5) close the first row between them, so withholding
     the preview leaves the index closing it instead — 5 columns — and
     withholding both strips with the preview present leaves a flush row, which
     is what `mbClosingSpan` answers with a full row of its own. */
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
        /* `#3`, not `3`. The badge is the ORDINAL of the match being set up and
           it was printing a bare figure over the word MATCH, so a brand-new
           account — nothing played, nothing scheduled — was headed `1 MATCH`.
           A count and a position are different claims and only one of them has
           a plural; the hash says which this is. */
        badge: isGuest
          ? undefined
          : { value: `#${data.nextMatchNumber}`, label: "Match" },
        dateLine: data.dateLine,
        subLine: data.subLine,
        /* No `actions`. The screen's one verb is in the commit bar below — a
           masthead copy would be a second control for the same commit, kept in
           step by hand, which is what the wizard's note 2 exists to stop. */
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
                {/* THE TWO PICKERS STACK (L1).

                    Side by side, the row is two selects, a 48px key and two
                    gaps. At 320 the panel gives it 246px, so each select is
                    99px — 75px of text once `.mb-select-native`'s padding and
                    its chevron are paid — and both painted "SELE…". The two
                    controls that name the two sides of the match could not
                    say either side's name, or the word asking for one.

                    The threshold is the width at which a select can still
                    paint `NAME_FLOOR` characters: 8 characters of Oswald at
                    the 1rem mobile input floor is 66px, plus 24px of padding
                    and ~20px of chevron reserve = 110px a side, plus the 48px
                    key and two 12px gaps = 292. 380 is that with a real
                    roster's headroom, and it keeps 320, 360, 390 and 414 all
                    on the stacked cut where each select gets the full 246.

                    Its own container, not the viewport: this panel is
                    `xl:col-span-7`, so the same 1280px screen that gives it
                    770px gives the Overview's equivalent 322px. */}
                <div className="@container">
                  <div className="flex flex-col items-stretch gap-3 @min-[380px]:flex-row @min-[380px]:items-start @min-[380px]:gap-4">
                    <TeamSelect
                      label="Home Team"
                      value={homeTeamId}
                      disabledId={awayTeamId}
                      teams={availableTeams}
                      onChange={handleHomeTeamSelect}
                    />
                    {/* `mt-9` lines the key up with the two 48px selects beside
                        it, not with the crests above them — so it is scoped to
                        the cut where there IS a beside. Stacked, the key is a
                        centred divider between the two pickers and needs no
                        offset. `aria-label` because `title` alone names a
                        control only for a mouse. */}
                    <button
                      type="button"
                      title="Swap home and away teams"
                      aria-label="Swap home and away teams"
                      onClick={handleSwapTeams}
                      className="mb-btn mb-btn-outline-navy h-12 w-12 shrink-0 flex-col gap-1 self-center p-0 @min-[380px]:mt-9 @min-[380px]:self-start"
                    >
                      <MbIcon id="swap" size={16} />
                      {/* `display/kicker` — 0.62rem/600/0.16em, the step every
                          `.mb-kicker` on this screen already prints. 0.5rem was
                          8px, the smallest type in the app and two steps below
                          the scale's floor; it is not inked muted because this
                          one sits inside a button and must take the button's
                          ink through every state. */}
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

        {/* Scoreboard preview. Withheld below two teams: a scoreboard whose
            sides have no names previews nothing, and its one control — a
            full-width filled "Start Scoring" — cannot be pressed. */}
        {kept("preview") && (
        <div className="xl:col-span-5">
          <Panel title="Scoreboard Preview" icon="live" tone="navy">
            <div className="flex flex-1 flex-col gap-4 p-5">
              <div className="flex items-center gap-3">
                <ScorePreviewSide summary={homeSummary} placeholder="Home team" />
                <div className="flex items-center gap-2.5">
                  <span className="matchbook-display text-6xl mb-track-numeral font-bold tabular-nums">0</span>
                  <span className="mb-score-box mb-track-title px-2">VS</span>
                  <span className="matchbook-display text-6xl mb-track-numeral font-bold tabular-nums">0</span>
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
                        /* One cell for the matchup (L1). The five-track row
                           gave each `1fr` 59px at 320 and painted " VC",
                           " CC", "Nor Pan" and "West Wan" — two to seven
                           characters against `NAME_FLOOR`'s eight, with
                           "Beckton Blues VC" and "Marlow Blues VC"
                           indistinguishable at " VC".

                           `justify-self` had to go with it: a grid item with
                           a `justify-self` other than `stretch` is sized by
                           its MAX-CONTENT, so neither mark was ever eligible
                           to truncate in the first place. `MbMatchupPair`
                           mirrors the away side from its own container width
                           instead, and stacks one team per line below it. */
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
                        {/* `display/stat-sm` — a kicker over a figure is the
                            stat block anatomy, and 1.2rem is the step §2.1
                            names for its value. 1.05rem (16.8px) was between
                            steps. */}
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
                flush. Same object `/` and `/competitions` use, so the three
                screens promise a list in one sentence each rather than in
                three sets of words that can drift apart. */}
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

      {/* THE COMMIT BAR (§8). Same recipe as the wizard's, and each piece is
          load-bearing: `mt-auto` sends the bar to the end of the
          viewport-fill column on a short page; the inline `bottom` rides the
          bar above the fixed tab bar via the offset `MatchbookBottomBar`
          publishes (57px under `lg`, 0 at `lg` and 0 in landscape), and the
          `!` is required because `.mb-action-bar { bottom: 0 }` is unlayered
          and outranks a plain utility. `mb-enter mb-stagger-4` is the "slides
          up on first mount only" the brief asks of a sticky commit bar — it
          sits outside `.mb-enter-grid`, so it arrives once with the route. */}
      <MbActionBar
        className="mb-enter mb-stagger-4 mt-auto bottom-[var(--mb-toast-offset,0px)]!"
        primary={primaryAction}
      />
      </div>
    </MatchbookShell>
  );
}
