"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MatchbookShell } from "@/components/matchbook/AppShell";
import { MbActionBar, type MbAction } from "@/components/matchbook/ActionBar";
import { MbBadge } from "@/components/matchbook/Badge";
import { MbButton } from "@/components/matchbook/Button";
import { MbLiveStatus, type MbLiveStatusValue } from "@/components/matchbook/LiveStatus";
import {
  MB_SHORT,
  MbScoreSide,
  MbSetStrip,
  type MbSetCell,
} from "@/components/matchbook/ScoreSide";
import type { MbTeam } from "@/components/matchbook/types";
import { RotateDeviceDialog } from "./RotateDeviceDialog";
import { useCourtView } from "@/hooks/useCourtView";

/* ===========================================================================
   THE SCORER'S CARD

   One console, two routes. `/match/[id]` and `/match/guest` shipped as two
   near-identical 240-line files that had already drifted — the guest copy
   hard-coded `canEdit={true}` in three places and carried its own verbatim copy
   of the orientation effect. Everything visible now lives here; the routes
   supply data and callbacks and nothing else (invariant 23).

   ------------------------------------------------------------------- layout

   A printed scorer's card, top to bottom, in EVERY orientation:

     navy strip     `MbEventBar`, drawn by `MatchbookShell variant="focus"`.
                    The way back, and the fixture's name.
     fixture line   paper, hairline-ruled: the live/final mark, the competition,
                    THE STAGE, the set strip, and the way into Court View. It is
                    in normal flow at every size — see "the landscape strip".
     two columns    `MbScoreSide` either side of an 8px gutter with a navy
                    hairline down its centre. The gutter is a real grid track,
                    so it is one device in both axes, and its width is hard-fail
                    2's separation floor between two adjacent tap targets.
     hint line      one short sentence, full width, wrapping. It is NOT the
                    action bar's `status` slot: that slot is a single truncating
                    line, and the only explanation the screen has for a disabled
                    primary was losing 60px of itself at 320 ("Scores are level —
                    a winner is needed before this can…").
     action rail    `MbActionBar`. THE PRIMARY ACTION IS HERE, never in the
                    header. The console this replaces put End Match in the top
                    strip as a 36px unlabelled red disc 8px from an equally
                    unlabelled grey Undo disc — the single worst ergonomic
                    defect on the screen, and the reason the rail exists.

   ------------------------------------------------------------------ the fit

   The console never scrolls, in either orientation. See `FRAME_H` below for
   how the frame is sized and for the one residual on iOS.

   ------------------------------------------------------ the landscape strip

   `@media (max-height: 520px)` is the landscape contract, and the previous cut
   answered it by lifting the fixture line OUT of the flow to `absolute right-2
   top-2` so the columns could keep its height. That put an interactive control
   INSIDE another interactive control's box: measured at 844x390, the Court View
   key overlapped the away column's tap target by **106.5 x 44px**, and
   `document.elementFromPoint` at its centre returned the key — so the top-right
   corner of the away column silently opened Court View instead of awarding a
   point. Hard fail 2, and invisible to `audit.mjs`, which is only ever run at
   three portrait presets.

   The strip is in flow now, at every size, and the column track is what gives
   up the 46px. Nothing overlaps `.mb-console-column`, in either mode, at any
   size. The height that buys it back comes out of the columns' own internals:
   `MbScoreSide` moves its `±` keys inline beside the numeral and drops its foot
   under the same query (see `MB_SHORT`), so nothing there depends on vertical
   slack that a 390px-tall viewport does not have.
   =========================================================================== */

/**
 * The frame's height — the viewport, less the strip above it.
 *
 * Two wrong answers were measured before this one:
 *
 *   `flex-1`   `<main>` is a BLOCK box, so there is no flex line to grow along.
 *              The console sat at its content height with 570px of blank paper
 *              under it at 1440x900.
 *   `h-full`   a percentage height needs a parent with a definite `height`, and
 *              `<main>` is stretched by the shell's flex column while its
 *              computed `height` stays `auto`. Chrome does not resolve it:
 *              measured `frame 439` inside `main 839` at 1440x900, `626` inside
 *              `783` at 390x844, and `615 / 783` at 320.
 *
 * So the box is named. **61px, not the 56 the strip advertises** — `MbEventBar`
 * sets `min-h-[56px]` but wraps a 48px `MbButtonLink` in `py-1.5` and adds its
 * own bottom rule, so it renders 61. Subtracting the advertised number left the
 * document five pixels taller than the viewport on every route at every size
 * (`scrollHeight 905` against `clientHeight 900`; `849 / 844` at 390), and a
 * console that scrolls by five pixels is still a console that scrolls.
 * `--mb-safe-top` is subtracted as well because the strip carries `.mb-safe-top`
 * and grows by the notch inset once `viewport-fit: cover` lands (W2's commit).
 *
 * `dvh` with a `vh` fallback is charter W5 acceptance 9: on iOS the dynamic
 * toolbar makes `100vh` taller than the visible viewport, which is exactly what
 * puts a bottom-anchored rail under the browser chrome.
 *
 * The 61 is the one number in this file that another workstream can invalidate.
 * It fails loudly rather than silently — the page starts scrolling — and the
 * real fix is `min-h-dvh` plus a flex `<main>` on `AppShell.tsx`'s focus
 * wrapper, which is W2's file to change.
 */
const FRAME_H =
  "relative h-[calc(100vh_-_61px_-_var(--mb-safe-top))] [@supports(height:100dvh)]:h-[calc(100dvh_-_61px_-_var(--mb-safe-top))]";

/* ---------------------------------------------------------------------------
   WHY THE IN-PAGE COURT VIEW IS NOT `position: fixed`

   It was, and it did not work. `MatchbookShell` puts `.mb-enter` on `<main>`,
   whose animation is `both`-filled, so `<main>`'s computed transform settles at
   `matrix(1, 0, 0, 1, 0, 0)` — the identity matrix, but NOT the keyword `none`.
   A transformed element is the containing block for its fixed descendants, so
   `fixed inset-0` resolved against `<main>` rather than the viewport: measured
   `top 61, height 390` in a 390px viewport, which both failed to cover the
   screen AND made the document scroll 61px.

   Escaping it means a portal to `<body>`, which would unmount and remount the
   whole console — and the fallback's real job is the wake lock and the
   landscape scoreboard layout, not the last 61 pixels. So the in-page mode is
   the console's own box with `data-view="court"`: the chrome compacts, the
   columns go side by side, the screen stays awake, and the navy strip stays put
   with the way out on it. The notice says so in as many words rather than
   pretending it is fullscreen.

   Court View is landscape-only, so it and the landscape console resolve to the
   SAME layout through the SAME media query — which is what brief §3.4 asks for
   ("the console automatically adopts the Court View layout") and why there is
   no second, JS-driven mechanism for it to drift against.
   --------------------------------------------------------------------------- */

/* The hairline inside the gutter. Two spans rather than one responsive span,
   because the axis follows the GRID's axis and the grid turns to columns on
   either of two conditions — `sm` (wide enough) or `max-height:520px`
   (landscape). A single element cannot express "vertical if either", so each
   orientation is drawn by the one that matches. */
const RULE_VERTICAL =
  "absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-mb-navy sm:block [@media(max-height:520px)]:block";
const RULE_HORIZONTAL =
  "absolute left-0 top-1/2 block h-px w-full -translate-y-1/2 bg-mb-navy sm:hidden [@media(max-height:520px)]:hidden";

export interface MbConsoleSide {
  team: MbTeam;
  /** The team's own colour. Rendered as a bar, never as a ground (charter D-9). */
  accent?: string;
  score: number;
  leading: boolean;
  won: boolean;
  /** The other half of `won`. Muted name and numeral — the loss channel. */
  lost: boolean;
  /** Games taken in a series, or null outside one. */
  games?: number | null;
}

export interface MbConsoleSeries {
  length: number;
  /** Null when the counters were never written — the chip is omitted, not zeroed. */
  game: number | null;
  homeWins: number;
  awayWins: number;
}

export type MbConsoleMode = "scoring" | "final" | "watch";

export interface MatchConsoleProps {
  home: MbConsoleSide;
  away: MbConsoleSide;
  /** Fixture identity for the navy strip, the `<h1>` and the document title. */
  title: string;
  /** Competition name, or the guest note. */
  kicker?: string | null;
  /**
   * Where this fixture sits in its competition — "Semi-Finals", "Round 3",
   * "Court 2". A bracket semifinal used to say nowhere on the screen that it
   * was a semifinal, and a win-2-&-out match carried no series context at all.
   */
  stage?: string | null;
  /** Rendered beside the Final mark. The date the result was recorded. */
  completedOn?: string | null;
  back: { href?: string; onClick?: () => void; label: string };
  mode: MbConsoleMode;
  guest?: boolean;
  series?: MbConsoleSeries | null;
  /** Scoring */
  onScore?: (side: "home" | "away") => void;
  onAdjust?: (side: "home" | "away", delta: number) => void;
  onUndo?: () => void;
  onEnd?: () => void;
  canUndo?: boolean;
  /** False while the persisted stack has not been consulted yet. */
  undoRestored?: boolean;
  canComplete?: boolean;
  endLabel?: string;
  /** One short line above the rail. Tie explanations, the guest note, offline. */
  hint?: ReactNode;
  /** `mode="final"` rail. */
  finalActions?: { secondary?: MbAction; primary: MbAction };
  /** `mode="watch"` — a shared session where this device may not score. */
  live?: { status: MbLiveStatusValue; secondsAgo?: number; onRetry?: () => void };
  /** Dialogs. Rendered outside the Court View target so they portal cleanly. */
  children?: ReactNode;
}

/**
 * The score, announced once, politely, 400ms after it settles.
 *
 * The console this replaces announced nothing at all and kept TWO numerals in
 * the accessibility tree during every transition (`AnimatePresence
 * mode="popLayout"` keyed on the score). `MbScoreNumeral` is `aria-hidden` by
 * default, so this region is the only score a screen reader ever meets.
 */
const useScoreAnnouncement = (text: string): string => {
  const [announced, setAnnounced] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setAnnounced(text), 400);
    return () => window.clearTimeout(timer);
  }, [text]);
  return announced;
};

/** `Surge 18–15 Riptide · Tournament Tracker`, so a backgrounded tab still reads. */
const useDocumentTitle = (title: string) => {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} · Tournament Tracker`;
    return () => {
      document.title = previous;
    };
  }, [title]);
};

/**
 * The stamp that marks a new game in a series.
 *
 * Series continuation is an IN-PLACE state change — the match resets to 0–0 and
 * stays on the route (`useMatchPage`'s black box) — so without a deliberate mark
 * the scorer sees both numerals silently drop to zero and has to work out why.
 * Charter W5 acceptance 2 requires it not to fall out of the generic entrance,
 * and it does not: it is keyed on the game number, lives for 1.4s, and is the
 * only thing on the screen that arrives after the console does.
 */
const useGameStamp = (game: number | null): number | null => {
  const [seen, setSeen] = useState(game);
  const [stamp, setStamp] = useState<number | null>(null);

  /* Detected during render, which is React's documented way to adjust state
     when a prop changes. An effect would raise the stamp one frame after the
     numerals had already dropped to 0–0, which is exactly the frame it exists
     to explain. */
  if (seen !== game) {
    setSeen(game);
    if (game !== null && seen !== null && game > seen) setStamp(game);
  }

  useEffect(() => {
    if (stamp === null) return;
    const timer = window.setTimeout(() => setStamp(null), 1400);
    return () => window.clearTimeout(timer);
  }, [stamp]);

  return stamp;
};

const setCells = (series: MbConsoleSeries): MbSetCell[] => {
  const played = series.homeWins + series.awayWins;
  return Array.from({ length: series.length }, (_, i) => {
    const game = i + 1;
    return {
      game,
      state: game <= played ? "played" : game === played + 1 ? "current" : "upcoming",
    };
  });
};

/** The hairline between two facts on one strip. Never a bullet character. */
const Dot = () => (
  <span aria-hidden="true" className="h-[3px] w-[3px] shrink-0 bg-mb-ink-muted" />
);

export const MatchConsole = ({
  home,
  away,
  title,
  kicker,
  stage = null,
  completedOn = null,
  back,
  mode,
  guest = false,
  series = null,
  onScore,
  onAdjust,
  onUndo,
  onEnd,
  canUndo = false,
  undoRestored = true,
  canComplete = false,
  endLabel = "End Match",
  hint,
  finalActions,
  live,
  children,
}: MatchConsoleProps) => {
  /* The Fullscreen API needs the ELEMENT, which is why the shell's focus
     variant puts `children` directly inside `<main>` with nothing between it
     and the page (shell brief R4). */
  const frameRef = useRef<HTMLDivElement | null>(null);
  const court = useCourtView({ target: frameRef });
  const [rotatePrompt, setRotatePrompt] = useState(false);

  const scoreline = `${home.team.name} ${home.score}–${away.score} ${away.team.name}`;
  useDocumentTitle(scoreline);
  const announcement = useScoreAnnouncement(
    `${home.team.name} ${home.score}, ${away.team.name} ${away.score}`
  );
  const stamp = useGameStamp(series?.game ?? null);

  const canEdit = mode === "scoring";
  const viewOnly = mode === "watch";

  const onCourtToggle = () => {
    if (!court.isCourtView && !court.canEnter) {
      setRotatePrompt(true);
      return;
    }
    court.toggle();
  };

  /* Only while there is something to undo. A finished match was still telling
     the reader when Undo would start working. */
  const undoHint =
    canEdit && undoRestored && !canUndo ? "Undo starts from the next point." : null;

  const railHint = hint ?? undoHint;

  /* --------------------------------------------------------------- rails */

  const scoringRail = (
    <MbActionBar
      secondary={{
        label: "Undo",
        icon: "undo",
        onClick: onUndo,
        disabled: !canUndo,
        tone: "outline-navy",
      }}
      primary={{
        label: endLabel,
        icon: "check",
        onClick: onEnd,
        disabled: !canComplete,
        tone: "coral",
      }}
    />
  );

  const finalRail = finalActions && (
    <MbActionBar secondary={finalActions.secondary} primary={finalActions.primary} />
  );

  const watchRail = (
    <div className="mb-action-bar">
      <MbLiveStatus
        status={live?.status ?? "live"}
        secondsAgo={live?.secondsAgo}
        onRetry={live?.onRetry}
      />
    </div>
  );

  const rail = mode === "scoring" ? scoringRail : mode === "final" ? finalRail : watchRail;

  /* The one status mark, drawn one way. All three tones carry a frame so the
     slot is visibly one object; the MARK inside it is what differs, which is
     `Badge.tsx`'s deliberate greyscale channel (a pulsing disc, a circled tick,
     a hollow disc) rather than three hues of one square. `solid` is permitted
     for `live` alone — every other tone degrades to `framed` in the component,
     because white-on-tone clears 4.5:1 only on `--mb-red`. */
  const statusMark =
    mode === "final" ? (
      <MbBadge tone="final" variant="framed">
        Final
      </MbBadge>
    ) : guest ? (
      <MbBadge tone="guest" variant="framed">
        Guest
      </MbBadge>
    ) : (
      <MbBadge tone="live" variant="solid">
        Live
      </MbBadge>
    );

  /**
   * WHAT THE NAVY STRIP SAYS, AND WHY IT IS NOT THE FIXTURE.
   *
   * `MbEventBar` truncates its title into whatever the strip has left after the
   * Back control, and the fixture is two team names joined by " v " — measured
   * at 87 characters with two 42-character names, losing 468px at 390 and 538px
   * at 320, which rubric 4.4 counts as a truncated header. It was also the same
   * two names the two 24px column heads carry sixty pixels below it.
   *
   * The strip says WHERE you are; the columns say WHO. The fixture survives in
   * the `<h1>`, in the document title and in the route announcement, none of
   * which is width-bound.
   *
   * The EVENT ALONE, not the event and the stage: "Spring Invitational · Round
   * 1" lost 28px at 320 while "Spring Invitational" fits, and the stage is
   * already on the paper strip directly underneath. A very long competition
   * name still truncates here at 320 — `MbEventBar` truncates by construction —
   * and that is W2's box.
   */
  const eventLine = kicker || "Match";

  /* -------------------------------------------------------------- render */

  return (
    <MatchbookShell variant="focus" back={back} masthead={{ title, shortTitle: eventLine }}>
      <div
        ref={frameRef}
        data-view={court.isCourtView ? "court" : "console"}
        className={`flex min-h-0 flex-col overflow-hidden bg-mb-paper-bright ${FRAME_H}`}
      >
        {/* The console's one heading. `MbEventBar` sets the fixture in a span,
            not an <h1>, so this is the document's only level-one heading and it
            carries no live value — the score has its own region below. */}
        <h1 className="sr-only">{title} — live scoring console</h1>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </p>

        {/* ---------------------------------------------------- fixture line

            THE ENTRANCE IS AUTHORED HERE, not inherited. `.mb-enter-grid` on
            the column grid staggered by `:nth-child`, and child 2 is the 8px
            divider — so the authored order was column, hairline, column and the
            away side arrived two steps behind the home side for no reason at
            all. The order now says what it means: chrome settles, then BOTH
            columns together (they are co-equal), then the rail. */}
        <div
          className={`mb-enter z-20 flex shrink-0 items-center gap-3 border-b border-mb-navy bg-mb-paper-bright px-3 py-2 sm:px-4 [@media(max-height:520px)]:py-1`}
        >
          <span className="flex min-w-0 flex-1 items-center gap-3">
            {statusMark}

            {/* ONE WRAPPER FOR THE WHOLE FIXTURE LINE, and it leaves as a unit
                below `sm`.

                Two things forced that. The separating rules must never outlive
                the facts they separate — the competition's name was left
                trailing a bare dot on a phone once the stage moved down a row —
                and at 320 the strip has a status mark and a 106px Court View
                key on it, which left 99px for a 111px competition name and
                truncated it by 12px. Below `sm` the strip carries the status
                and the way into Court View and nothing else; every fact goes to
                the row underneath, where it has the full width. */}
            {(kicker || stage || completedOn || series) && (
              <span className="hidden min-w-0 items-center gap-3 sm:flex">
                {kicker && (
                  <span className="mb-kicker min-w-0 truncate" title={kicker}>
                    {kicker}
                  </span>
                )}
                {stage && (
                  <>
                    <Dot />
                    <span className="mb-kicker shrink-0">{stage}</span>
                  </>
                )}
                {completedOn && (
                  <>
                    <Dot />
                    <span className="mb-kicker shrink-0 tabular-nums" suppressHydrationWarning>
                      {completedOn}
                    </span>
                  </>
                )}
                {series && (
                  <>
                    <Dot />
                    <span className="mb-kicker shrink-0">Best of {series.length}</span>
                    <MbSetStrip sets={setCells(series)} current={series.game ?? 1} />
                  </>
                )}
              </span>
            )}
          </span>

          <MbButton
            variant="outline-navy"
            size="sm"
            icon={court.isCourtView ? "collapse" : "expand"}
            onClick={onCourtToggle}
            className="shrink-0"
          >
            {court.isCourtView ? "Exit Court View" : "Court View"}
          </MbButton>
        </div>

        {/* Below `sm` every fact about the fixture gets this row to itself, at
            the full width of the card, because the strip above cannot hold the
            competition's name AND a 106px Court View key inside 320px. It is
            `sm:hidden`, and every landscape viewport is at least 640px wide, so
            this row never appears in landscape and needs no height query of its
            own. The competition truncates first because the stage, the date and
            the series are each a handful of characters and are what the reader
            cannot reconstruct from the navy strip. */}
        {(kicker || stage || completedOn || series) && (
          <div className="flex shrink-0 items-center gap-3 overflow-hidden border-b border-mb-rule px-3 py-1.5 sm:hidden">
            {kicker && (
              <span className="mb-kicker min-w-0 truncate" title={kicker}>
                {kicker}
              </span>
            )}
            {stage && (
              <>
                {kicker && <Dot />}
                <span className="mb-kicker shrink-0">{stage}</span>
              </>
            )}
            {completedOn && (
              <>
                {(kicker || stage) && <Dot />}
                <span className="mb-kicker shrink-0 tabular-nums" suppressHydrationWarning>
                  {completedOn}
                </span>
              </>
            )}
            {series && (
              <>
                {(kicker || stage || completedOn) && <Dot />}
                <span className="mb-kicker shrink-0">Best of {series.length}</span>
                <MbSetStrip sets={setCells(series)} current={series.game ?? 1} />
              </>
            )}
          </div>
        )}

        {court.notice && (
          <p className="shrink-0 border-b border-mb-rule bg-mb-paper-bright px-3 py-1.5 text-[0.72rem] leading-[1.4] text-mb-ink-muted">
            {court.notice}
          </p>
        )}

        {/* -------------------------------------------------------- columns */}
        <div
          className={`relative grid min-h-0 flex-1 grid-cols-1 grid-rows-[1fr_8px_1fr] sm:grid-cols-[1fr_8px_1fr] sm:grid-rows-1 ${MB_SHORT.sideBySide}`}
        >
          <MbScoreSide
            team={home.team}
            accent={home.accent}
            score={home.score}
            side="home"
            leading={home.leading}
            won={home.won}
            lost={home.lost}
            games={home.games ?? null}
            canEdit={canEdit}
            viewOnly={viewOnly}
            onScore={onScore && (() => onScore("home"))}
            onAdjust={onAdjust && ((delta: number) => onAdjust("home", delta))}
            className="mb-enter mb-stagger-1 min-h-0"
          />

          {/* One divider, one device, in both axes — and an 8px track rather
              than a 1px one. The two tap columns are adjacent interactive
              targets, so hard-fail 2's 8px separation floor applies to the
              boundary between them, and it is not a formality here: a thumb
              that lands a pixel the wrong side of a hairline awards the point
              to the other team. The gutter is dead space; the navy hairline is
              drawn down its centre, so the card still reads as one ruled sheet.
              Measured before: `SPACING 1` on every scoring route. */}
          <span aria-hidden="true" className="relative">
            <span className={RULE_VERTICAL} />
            <span className={RULE_HORIZONTAL} />
          </span>

          <MbScoreSide
            team={away.team}
            accent={away.accent}
            score={away.score}
            side="away"
            leading={away.leading}
            won={away.won}
            lost={away.lost}
            games={away.games ?? null}
            canEdit={canEdit}
            viewOnly={viewOnly}
            onScore={onScore && (() => onScore("away"))}
            onAdjust={onAdjust && ((delta: number) => onAdjust("away", delta))}
            className="mb-enter mb-stagger-1 min-h-0"
          />

          {stamp !== null && (
            <span
              /* Spans both tracks and sits on the rule, because the new game
                 belongs to the match rather than to either side. Navy, not
                 coral: coral has exactly two jobs on this screen — the primary
                 action, and the score that just changed — and a third one on a
                 passing stamp is what took the census to three. */
              className="mb-enter pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 border-[1.5px] border-mb-navy bg-mb-paper-bright px-4 py-2"
              role="status"
            >
              <span className="matchbook-display text-[1.2rem] mb-track-display font-bold text-mb-navy tabular-nums">
                Game {stamp}
              </span>
            </span>
          )}
        </div>

        {/* ----------------------------------------------------------- hint

            THE ROW IS ALWAYS THERE, EVEN WHEN IT IS BLANK, and that is the
            whole reason it is written this way. `undoRestored` flips from false
            to true when the persisted stack has been consulted, one commit
            after hydration, so a conditionally-rendered hint appeared out of
            nowhere and pushed the columns and the rail up by 34px — measured
            **CLS 0.0306 with one shift entry at 390x844**, against the 0.0000
            the console had before the row existed. The tie explanation has the
            same problem in the other direction: it would resize the columns on
            the point that levelled the scores.

            A blank ruled strip under two scoring columns is a caption line with
            nothing to caption, which is what a printed card does anyway. A
            reserved box is what invariant 27 asks for. It is reserved only where the flip can happen —
            a scoring console — so a final, whose hint is fixed for the life of
            the screen, does not spend 36px of paper saying nothing. */}
        {(canEdit || railHint) && (
          <p className="flex min-h-[36px] shrink-0 items-center border-t border-mb-rule bg-mb-paper-bright px-4 py-2 text-[0.85rem] leading-[1.35] text-mb-ink-muted [@media(max-height:520px)]:min-h-[28px] [@media(max-height:520px)]:py-1">
            {railHint}
          </p>
        )}

        {/* ----------------------------------------------------------- rail */}
        <div className="mb-enter mb-stagger-2 shrink-0">{rail}</div>
      </div>

      <RotateDeviceDialog open={rotatePrompt} onOpenChange={setRotatePrompt} />
      {children}
    </MatchbookShell>
  );
};
