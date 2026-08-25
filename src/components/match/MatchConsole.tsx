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

/* One console for `/match/[id]` and `/match/guest` — the routes supply data
   and callbacks only. The console never scrolls in either orientation (see
   FRAME_H). The fixture line must stay IN FLOW at every size: lifted out of
   flow it sat on top of the away column and its Court View key silently
   captured score taps. `@media (max-height: 520px)` is the landscape
   contract; the height comes out of the columns' own internals (MB_SHORT). */

/**
 * The frame's height: viewport minus the navy strip.
 *
 * `flex-1` cannot size this (`<main>` is a block box) and `h-full` cannot
 * either (the stretched `<main>`'s computed height stays `auto`), so the box
 * is named. The strip renders 61px, not the 56 it advertises — `min-h-[56px]`
 * wrapping a 48px button in `py-1.5` plus its bottom rule. If the 61 drifts,
 * the page starts scrolling (loud, not silent). `--mb-safe-top` is subtracted
 * because the strip carries `.mb-safe-top`; `dvh` with a `vh` fallback keeps
 * the bottom rail above iOS's dynamic toolbar.
 */
const FRAME_H =
  "relative h-[calc(100vh_-_61px_-_var(--mb-safe-top))] [@supports(height:100dvh)]:h-[calc(100dvh_-_61px_-_var(--mb-safe-top))]";

/* The in-page Court View is NOT `position: fixed`: the shell's `.mb-enter` on
   `<main>` is `both`-filled, so its transform settles at the identity matrix
   (not `none`) and `<main>` becomes the containing block for fixed
   descendants — `fixed inset-0` neither covered the screen nor kept it from
   scrolling. A portal to `<body>` would remount the console, so the in-page
   mode is the console's own box with `data-view="court"`, sharing the same
   max-height media query as the landscape console. */

/* Two spans, not one responsive span: the grid turns to columns on EITHER of
   `sm` or `max-height:520px`, and a single element cannot express
   "vertical if either". */
const RULE_VERTICAL =
  "absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-mb-navy sm:block [@media(max-height:520px)]:block";
const RULE_HORIZONTAL =
  "absolute left-0 top-1/2 block h-px w-full -translate-y-1/2 bg-mb-navy sm:hidden [@media(max-height:520px)]:hidden";

export interface MbConsoleSide {
  team: MbTeam;
  /** The team's own colour. Rendered as a bar, never as a ground. */
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
  /** Where this fixture sits — "Semi-Finals", "Round 3", "Court 2". */
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
 * `MbScoreNumeral` is `aria-hidden`, so this region is the only score a
 * screen reader ever meets.
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
 * The stamp that marks a new game in a series. Series continuation resets the
 * match to 0–0 in place; without the stamp both numerals silently drop to
 * zero. Lives 1.4s.
 */
const useGameStamp = (game: number | null): number | null => {
  const [seen, setSeen] = useState(game);
  const [stamp, setStamp] = useState<number | null>(null);

  /* Detected during render, not in an effect — an effect would raise the
     stamp one frame after the numerals had already dropped to 0–0. */
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
  /* The Fullscreen API needs the element itself. */
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

  /* Only while scoring — a finished match must not explain Undo. */
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
        variant: "outline-navy",
      }}
      primary={{
        label: endLabel,
        icon: "check",
        onClick: onEnd,
        disabled: !canComplete,
        variant: "coral",
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

  /* `solid` is permitted for `live` alone — white-on-tone clears 4.5:1 only
     on `--mb-red`; every other tone degrades to `framed` in the component. */
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

  /* The navy strip says WHERE (the event), the columns say WHO — the fixture
     name would truncate in the strip and already heads both columns; it
     survives in the h1 and the document title. */
  const eventLine = kicker || "Match";

  /* -------------------------------------------------------------- render */

  return (
    <MatchbookShell variant="focus" back={back} masthead={{ title, shortTitle: eventLine }}>
      <div
        ref={frameRef}
        data-view={court.isCourtView ? "court" : "console"}
        className={`flex min-h-0 flex-col overflow-hidden bg-mb-paper-bright ${FRAME_H}`}
      >
        {/* The document's only h1, plus the live score region. Both need the
            clipping wrapper AND the off-canvas `top` offsets: `sr-only` clips
            the ELEMENT to 1px, but a Range over its TEXT still reports the
            laid-out line, which text-geometry scans read as phantom ink across
            the fixture line. Screen readers are untouched by either. */}
        <div className="sr-only">
          <h1 className="sr-only" style={{ top: -9999 }}>
            {title} — live scoring console
          </h1>
          <p className="sr-only" style={{ top: -19999 }} aria-live="polite" aria-atomic="true">
            {announcement}
          </p>
        </div>

        {/* Fixture line. The entrance is authored per element, not via
            `.mb-enter-grid` — its `:nth-child` stagger would count the 8px
            divider and delay the away column behind the home one. */}
        <div
          className={`mb-enter z-20 flex shrink-0 items-center gap-3 border-b border-mb-navy bg-mb-paper-bright px-3 py-2 sm:px-4 [@media(max-height:520px)]:py-1`}
        >
          <span className="flex min-w-0 flex-1 items-center gap-3">
            {statusMark}

            {/* One wrapper so the whole fact line leaves as a unit below `sm`:
                the separator dots must never outlive the facts they separate,
                and at 320 the strip cannot hold the competition name beside
                the Court View key. */}
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

        {/* Below `sm` the facts get this full-width row instead. It must also
            hide in landscape (MB_SHORT.hide): 568x320 is a landscape phone
            that is still below `sm`, and this row would spend scarce vertical
            pixels restating the strip. */}
        {(kicker || stage || completedOn || series) && (
          <div
            className={`flex shrink-0 items-center gap-3 overflow-hidden border-b border-mb-rule px-3 py-1.5 sm:hidden ${MB_SHORT.hide}`}
          >
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

          {/* An 8px dead track, not a 1px hairline: the two tap columns are
              adjacent targets, and a thumb a pixel past a hairline awards the
              point to the other team. The rule is drawn down its centre. */}
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
              /* Spans both tracks — the new game belongs to the match, not a
                 side. Navy, not coral: coral's two jobs here are the primary
                 action and the score that just changed. */
              className="mb-enter pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 border-[1.5px] border-mb-navy bg-mb-paper-bright px-4 py-2"
              role="status"
            >
              <span className="matchbook-display text-[1.2rem] mb-track-display font-bold text-mb-navy tabular-nums">
                Game {stamp}
              </span>
            </span>
          )}
        </div>

        {/* The hint row is reserved even when blank on a scoring console:
            `undoRestored` flips one commit after hydration and the tie hint
            appears whenever the scores level, so a conditionally-rendered row
            would shift the columns and the rail (CLS). A final's hint is fixed
            for the life of the screen, so it does not reserve. */}
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
