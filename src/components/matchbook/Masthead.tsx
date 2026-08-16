"use client";

import type { ReactNode } from "react";
import { MbButton, MbButtonLink } from "./Button";
import { MbAccountChip } from "./AccountChip";
import type { MbAction } from "./ActionBar";

/* ===========================================================================
   THE EDITORIAL MASTHEAD

   The same 70-line block is copy-pasted into all six converted screens
   (`page.tsx`, `teams`, `quick-match`, `competitions`, `summaries`, `tools`)
   and it has already drifted: `tools` added `whitespace-nowrap` to the `<h1>`,
   the badge caption is tracked 0.28em on `/teams` and 0.22em on `/tools` and
   `/summaries`, `/quick-match` inverted the badge's value/label order, and only
   three of the six put `suppressHydrationWarning` on the client-rendered date.

   This is that block, once. Two normalisations are deliberate and are the
   reason the extraction is worth doing rather than a straight copy:

     1. The badge is NAVY — frame, value and caption. The caption moved first
        (`--mb-coral` measures 3.26:1 on `--mb-paper` against the 4.5:1 floor
        for 0.6rem/700 text — register D-10); the frame and numeral followed
        when the coral census closed at three declared jobs (primary action,
        selection mark, masthead lockup) and "a framed count" was measured as
        a fourth meaning. The badge's identity is its 2px border WEIGHT — the
        only one in the system (§3.3) — not its hue, so it survives the move
        unchanged in greyscale. Coral in the masthead is now exactly one
        thing: the emphasised title word.

     2. Badge caption tracking is 0.22em everywhere (`display/badge-label`), and
        the value always sits above the caption.

   `suppressHydrationWarning` is carried here so the six callers cannot forget
   it (shell brief R11).
   =========================================================================== */

/** A count over a word: "8 / TEAMS". */
export interface MbMastheadCountBadge {
  value: ReactNode;
  label: string;
}

/** Two stacked display words: "LIVE / NOW". */
export interface MbMastheadLinesBadge {
  lines: [string, string];
}

export type MbMastheadBadge = MbMastheadCountBadge | MbMastheadLinesBadge;

const isLines = (badge: MbMastheadBadge): badge is MbMastheadLinesBadge =>
  "lines" in badge;

/** See `MastheadBadge`: the one 2px frame is never spent on a count of nothing. */
const isZeroCount = (badge: MbMastheadBadge): boolean =>
  !isLines(badge) && badge.value === 0;

export interface MastheadProps {
  /**
   * The one `<h1>` on the screen. A `ReactNode` so the caller supplies the
   * two-tone split — exactly one `<span className="text-mb-coral">` (invariant
   * 6, coral job 3).
   */
  title: ReactNode;
  /**
   * A short plain-text form of the title, for the mobile top strip and the
   * route announcement. `MatchbookShell` reads it; the masthead itself does
   * not render it. Falls back to the nav label for the active section.
   */
  shortTitle?: string;
  badge?: MbMastheadBadge;
  /** `display/meta`. Client-rendered dates are safe here — see the note above. */
  dateLine?: ReactNode;
  /** `display/kicker`, under the date line. */
  subLine?: ReactNode;
  /** A status mark beside the title — an `MbBadge`, an `MbLiveStatus`. */
  status?: ReactNode;
  /** At most two, at most one `variant="coral"` (invariants 6 and 15). */
  actions?: MbAction[];
  /**
   * The account chip. `MatchbookShell` passes `false` for `variant="public"`,
   * which must not touch `AuthContext` at all (shell brief R6).
   */
  account?: boolean;
}

/* ------------------------------------------------------------------- badge */

/**
 * The count lockup. `border-[2px]` is one of the two marks the rule tiers
 * reserve 2px for (`globals.css`, "rule tiers"); it is not a structural rule
 * and must not be moved onto the accent tier.
 *
 * NAVY, frame and numeral both. The badge was coral's fifth measured job —
 * four consecutive verdicts counted "masthead count-badge rail + numeral" as
 * its own meaning ("here is a framed number") against a two-job ceiling, and
 * it is not the primary action, not a selection mark, and not the lockup's
 * emphasised word. What makes this badge a badge was never the hue: it is the
 * only 2px border in the system, and that WEIGHT is the mark (§3.3 reserves
 * 2px for exactly this object). Navy keeps the weight, prints identically in
 * greyscale, and takes the numeral from 3.26:1 to 11.79:1 on paper.
 *
 * -------------------------------------------------- NEVER FRAME A ZERO
 *
 * A count badge whose value is `0` is not rendered at all.
 *
 * The 2px frame is the loudest border weight in the system — which is exactly
 * why it must not be spent on nothing. Measured on an empty account at 390:
 * `/teams` painted a 60x50 2px box at (288.8, 77) holding a `0` over `TEAMS`,
 * and `/summaries` painted the same box around `0 RESULTS`. The loudest mark
 * on a first-run screen was an alert-shaped frame around the absence the rest
 * of the page was calmly explaining ("what this page becomes", "ways to add
 * teams").
 *
 * It is enforced here rather than at the two call sites because it is a
 * property of the MARK, not of a route, and because `/` and `/competitions`
 * already withhold their badges on first run — this makes the other two agree
 * with them instead of each screen re-deciding. A caller that genuinely has a
 * zero to state has the whole dateline and the panels to state it in.
 *
 * Only a literal numeric zero counts. `/quick-match`'s badge is the string
 * `#1` and `/tools`'s is `4`; neither is affected, and a populated `/teams`
 * still paints `8 TEAMS`.
 */
const MastheadBadge = ({ badge }: { badge: MbMastheadBadge }) => (
  <div className="flex shrink-0 flex-col items-center border-[2px] border-mb-navy px-2.5 py-1 text-center">
    {isLines(badge) ? (
      badge.lines.map((line) => (
        <span
          key={line}
          className="matchbook-display text-[0.66rem] mb-track-status font-bold leading-tight text-mb-navy"
        >
          {line}
        </span>
      ))
    ) : (
      <>
        <span className="matchbook-display text-2xl mb-track-display font-bold leading-none text-mb-navy tabular-nums">
          {badge.value}
        </span>
        {/* `mt-1.5` separates the two FONT boxes, not the two inks. Oswald's
            content area is ~1.5em, so under `leading-none` the value's box
            bleeds 6px below its 24px line box — measured on `/quick-match`'s
            `#5`: value box bottom y=113 against the label's box top y=107, a
            26x6 intersection at 43% of the label's height, which the harness
            rightly refuses to wave off as a graze. The inks never touched
            (the bleed is the font's internal leading, empty for digits); the
            margin makes the geometry say what the paint always did. 6px, not
            4: at 4px the boxes still meet at the 2.0px noise floor and the
            verdict rides on subpixel rounding. */}
        <span className="matchbook-display mt-1.5 text-[0.6rem] mb-track-badge font-bold text-mb-navy">
          {badge.label}
        </span>
      </>
    )}
  </div>
);

/* ----------------------------------------------------------------- actions */

/**
 * `flex-auto` below `sm`, `flex-initial` from `sm` up — the same rule
 * `MbActionBar` uses, and for the same reason: a flex line breaks on *base*
 * sizes, so two actions that cannot share a 390px row each take a full-width
 * line instead of shrinking their labels to "Record Resu…".
 *
 * Nothing is hidden on a phone. The brief proposed collapsing to one action
 * below `sm`, but invariant 38 forbids hiding anything but redundant context,
 * and a masthead's second action ("Quick Add", "Manage Event") is not redundant.
 */
const MastheadAction = ({ action }: { action: MbAction }) => {
  const variant = action.variant ?? "navy";
  const flex = "flex-auto sm:flex-initial";

  if (action.href && !action.disabled && !action.loading) {
    return (
      <MbButtonLink href={action.href} variant={variant} icon={action.icon} className={flex}>
        {action.label}
      </MbButtonLink>
    );
  }

  return (
    <MbButton
      variant={variant}
      icon={action.icon}
      loading={action.loading}
      disabled={action.disabled}
      onClick={action.onClick}
      className={flex}
    >
      {action.label}
    </MbButton>
  );
};

/* ---------------------------------------------------------------- masthead */

export const MatchbookMasthead = ({
  title,
  badge,
  dateLine,
  subLine,
  status,
  actions = [],
  account = true,
}: MastheadProps) => {
  // Invariant 6 caps the row at two. Slicing rather than warning keeps the
  // contract enforceable at runtime as well as in review.
  const shown = actions.slice(0, 2);

  return (
    <header className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-4">
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
        {/* `break-words`, never `truncate`: a clipped event name is the one
            string on the screen the reader cannot reconstruct (register D-20).
            `text-balance`, because at 375 a long title wraps and an unbalanced
            wrap drops the last word onto its own line under a full first line
            ("VOLLEYBALL ROTATIONS" set 10 glyphs + 9 alone); balance evens the
            two lines so a wrapped masthead reads as a set block, not an
            accident. */}
        <h1 className="matchbook-display min-w-0 break-words text-balance text-4xl mb-track-masthead font-bold leading-none sm:text-5xl">
          {title}
        </h1>

        {badge && !isZeroCount(badge) && <MastheadBadge badge={badge} />}
        {status}

        {(dateLine || subLine) && (
          <div className="hidden min-w-0 sm:block">
            {dateLine && (
              <p
                className="matchbook-display text-[0.74rem] mb-track-status font-bold tabular-nums"
                suppressHydrationWarning
              >
                {dateLine}
              </p>
            )}
            {subLine && (
              <p className="mb-kicker tabular-nums" suppressHydrationWarning>
                {subLine}
              </p>
            )}
          </div>
        )}
      </div>

      {(shown.length > 0 || account) && (
        /* `w-full` below `sm` is load-bearing, not cosmetic. The header is one
           wrapping flex line; without it the action row is sized by what the
           title cluster leaves over — measured at 390px, that was a ~100px
           column in which every `MbButton` truncated its label to nothing and
           three buttons rendered as three bare glyphs. Given its own line each
           action has real width, and `flex-auto` on the controls lets two share
           the line when they fit and take a line each when they do not. */
        <div className="flex w-full min-w-0 flex-wrap items-center gap-3 sm:ml-auto sm:w-auto sm:justify-end">
          {shown.map((action) => (
            <MastheadAction key={action.label} action={action} />
          ))}
          {/* Below `md` the account lives in the top strip and the More sheet,
              so this is redundant context rather than a hidden destination.
              The `hidden` utility goes on a WRAPPER: `.mb-btn` sets
              `display: inline-flex` in unlayered CSS and would outrank it on
              the control itself. */}
          {account && (
            <span className="hidden md:inline-flex">
              <MbAccountChip variant="masthead" />
            </span>
          )}
        </div>
      )}
    </header>
  );
};
