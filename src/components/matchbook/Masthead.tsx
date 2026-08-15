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

     1. The badge CAPTION is navy, not coral. `--mb-coral` measures 3.26:1 on
        `--mb-paper` and the floor for text under 18.66px is 4.5:1, so a
        0.6rem/700 coral caption is a live HF-6 on four shipped screens
        (register D-10). The coral job list in `globals.css` already scopes job
        3 to "the emphasised title word + the 2px badge frame" — the frame, not
        the caption. The frame and the ≥24px value stay coral: at that size the
        3:1 large-text floor applies and 3.26:1 clears it.

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

/** See `MastheadBadge`: the one coral frame is never spent on a count of nothing. */
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
  /** At most two, at most one `tone="coral"` (invariants 6 and 15). */
  actions?: MbAction[];
  /**
   * The account chip. `MatchbookShell` passes `false` for `variant="public"`,
   * which must not touch `AuthContext` at all (shell brief R6).
   */
  account?: boolean;
}

/* ------------------------------------------------------------------- badge */

/**
 * The coral lockup. `border-[2px]` is one of the two marks the rule tiers
 * reserve 2px for (`globals.css`, "rule tiers"); it is not a structural rule
 * and must not be moved onto the accent tier.
 *
 * ------------------------------------------------- CORAL NEVER FRAMES A ZERO
 *
 * A count badge whose value is `0` is not rendered at all.
 *
 * The design language lists this frame among coral's jobs and it is the only
 * place coral is used as a frame — which is exactly why it must not be spent
 * on nothing. Measured on an empty account at 390: `/teams` painted a 60x50
 * 2px coral box at (288.8, 77) holding a coral `0` over a navy `TEAMS`, and
 * `/summaries` painted the same box around `0 RESULTS`. The loudest mark on a
 * first-run screen was an alert-shaped frame around the absence the rest of
 * the page was calmly explaining ("what this page becomes", "ways to add
 * teams"). Coral's declared jobs are the accent, the CTA, the selection rail
 * and the schedule spine; "count of nothing" is not among them.
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
  <div className="flex shrink-0 flex-col items-center border-[2px] border-mb-coral px-2.5 py-1 text-center">
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
        <span className="matchbook-display text-2xl mb-track-display font-bold leading-none text-mb-coral tabular-nums">
          {badge.value}
        </span>
        <span className="matchbook-display text-[0.6rem] mb-track-badge font-bold text-mb-navy">
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
  const tone = action.tone ?? "navy";
  const flex = "flex-auto sm:flex-initial";

  if (action.href && !action.disabled && !action.loading) {
    return (
      <MbButtonLink href={action.href} variant={tone} icon={action.icon} className={flex}>
        {action.label}
      </MbButtonLink>
    );
  }

  return (
    <MbButton
      variant={tone}
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
            string on the screen the reader cannot reconstruct (register D-20). */}
        <h1 className="matchbook-display min-w-0 break-words text-4xl mb-track-masthead font-bold leading-none sm:text-5xl">
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
