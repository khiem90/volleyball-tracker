"use client";

import type { ReactNode } from "react";
import { MbButton, MbButtonLink } from "./Button";
import { MbAccountChip } from "./AccountChip";
import type { MbAction } from "./ActionBar";

/* ===========================================================================
   THE EDITORIAL MASTHEAD — declared once for every screen. The badge is NAVY
   (frame, value, caption): its identity is the system's only 2px border
   WEIGHT, not a hue, and coral in the masthead is exactly one thing — the
   emphasised title word. `suppressHydrationWarning` is carried here so
   callers cannot forget it on the client-rendered date.
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
   * two-tone split — exactly one `<span className="text-mb-coral">`.
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
  /** At most two, at most one `variant="coral"`. */
  actions?: MbAction[];
  /**
   * The account chip. `MatchbookShell` passes `false` for `variant="public"`,
   * which must not touch `AuthContext` at all.
   */
  account?: boolean;
}

/* ------------------------------------------------------------------- badge */

/**
 * The count lockup. `border-[2px]` is a reserved mark weight, not a
 * structural rule — the badge's whole identity is being the system's only 2px
 * border, so it is NAVY and survives greyscale unchanged.
 *
 * NEVER FRAME A ZERO: a count badge whose value is `0` is not rendered at
 * all — the loudest border weight must not box an absence the rest of the
 * page is calmly explaining. Enforced here because it is a property of the
 * MARK, not of a route. Only a literal numeric zero counts: `#1` and string
 * values are unaffected.
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
        {/* `mt-1.5` separates the two FONT boxes: Oswald's ~1.5em content
            area bleeds below the `leading-none` line box, so the margin keeps
            the value's box clear of the label's. */}
        <span className="matchbook-display mt-1.5 text-[0.6rem] mb-track-badge font-bold text-mb-navy">
          {badge.label}
        </span>
      </>
    )}
  </div>
);

/* ----------------------------------------------------------------- actions */

/**
 * `flex-auto` below `sm`, `flex-initial` from `sm` up — same rule as
 * `MbActionBar`: a flex line breaks on BASE sizes, so two actions that cannot
 * share a row take a line each instead of truncating their labels. Nothing is
 * hidden on a phone: a masthead's second action is not redundant context.
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
  // The row is capped at two; slicing keeps the contract enforced at runtime.
  const shown = actions.slice(0, 2);

  return (
    <header className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-4">
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
        {/* `break-words`, never `truncate`: a clipped event name cannot be
            reconstructed by the reader. `text-balance` evens a two-line wrap
            so it reads as a set block, not an accident.
            `[&>span]:whitespace-nowrap` is the authored wrap joint: a title is
            a neutral segment plus one emphasised <span>, and this pins every
            break to the seam BETWEEN them — the only wrap a masthead performs
            is the two-line lockup at the joint the caller wrote. The contract
            it buys: a title segment must set solid at 320px. */}
        <h1 className="matchbook-display min-w-0 break-words text-balance text-4xl mb-track-masthead font-bold leading-none sm:text-5xl [&>span]:whitespace-nowrap">
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
        /* `w-full` below `sm` is load-bearing: without it the action row is
           sized by what the title cluster leaves over and every label
           truncates to nothing. Given its own line, `flex-auto` lets two
           actions share it when they fit and take a line each when not. */
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
