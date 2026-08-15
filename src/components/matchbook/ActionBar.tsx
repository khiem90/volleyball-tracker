"use client";

import type { CSSProperties, ReactNode } from "react";
import { MbButton, MbButtonLink, type MbButtonVariant } from "./Button";

/**
 * The bar's tones *are* the button's variants — one union, not a second
 * four-value union that happens to have the same members. Aliasing rather than
 * re-declaring is what stops the two drifting when a variant is added.
 */
export type MbActionTone = MbButtonVariant;

export interface MbAction {
  label: string;
  /** Sprite icon id rendered before the label. */
  icon?: string;
  onClick?: () => void;
  /** Renders `MbButtonLink` (an `<a>`) instead of `MbButton`. */
  href?: string;
  disabled?: boolean;
  /** Busy: blocks activation, swaps the glyph, never animates. */
  loading?: boolean;
  /** Defaults to `coral` for `primary`, `outline-navy` for `secondary`. */
  tone?: MbActionTone;
}

/**
 * The bar's height, safe area included, as a CSS length.
 *
 * `.mb-action-bar` is `position: sticky`, so a page whose bar is the last child
 * of its scroller needs no padding at all. The constant exists for the two
 * cases that do: a bar rendered outside the scrolled flow, and any page that
 * also carries the fixed `MatchbookBottomBar` underneath it.
 *
 * Not a guess at the rendered node — the component pins `min-height` to this
 * exact value and the natural height (a 1.5px rule, 0.75rem, a 56px
 * `MbButton size="lg"` and 0.75rem = 81.5px) sits just under it, so the bar
 * measures 82px on the nose. Verified, not asserted.
 */
export const MB_ACTION_BAR_H = "calc(82px + var(--mb-safe-bottom))";

/**
 * The same bar below `sm` **with** a `status`, where the status takes its own
 * line — 390px cannot hold "Step 2 of 3 · 8 teams selected", a Back and a
 * Create competition on one 56px row without truncating the commit verb.
 *
 * Pinned the same way, over a 105.5px natural height. Pad by this one whenever
 * the bar carries a status.
 *
 * One case exceeds it: a `secondary` whose label cannot share a 390px row with
 * a long `primary`. The controls then wrap to a line each and the bar grows by
 * one 64px row (56px control + the 8px row gap) — deliberately, because
 * clipping the commit verb is worse. Keep phone primaries short, or budget
 * `calc(169px + var(--mb-safe-bottom))` (`calc(145px + var(--mb-safe-bottom))`
 * when there is no status). Both measured at 390px, not derived.
 */
export const MB_ACTION_BAR_H_STACKED = "calc(106px + var(--mb-safe-bottom))";

/**
 * The two constants as Tailwind classes. Written out in full because the
 * scanner reads source text, not values — keep them in step with the exports
 * above. Inline `min-height` is deliberately not used: `max-sm:` has to be able
 * to win, and an inline declaration would outrank it.
 */
const MIN_H = "min-h-[calc(82px_+_var(--mb-safe-bottom))]";
const MIN_H_STACKED = "max-sm:min-h-[calc(106px_+_var(--mb-safe-bottom))]";

/**
 * `flex-auto` on a phone, `flex-initial` from `sm` up.
 *
 * The `auto` basis is load-bearing: a flex line breaks on *base* sizes, so two
 * controls that cannot sit side by side at 390px each take a full-width line
 * instead of shrinking. With `flex-1` (basis 0) they would never wrap and the
 * commit verb would truncate to "Create compet…" — the one label in the bar
 * that must never be clipped.
 */
const FLEX = "flex-auto sm:flex-initial";

/**
 * Both branches are the real control now. The bar used to re-implement
 * `.mb-btn mb-btn-lg` plus the busy and disabled recipes by hand so that a
 * `href` action could be an anchor; `MbButtonLink` is that anchor, so there is
 * nothing left to copy — and the two can no longer disagree about a size, a
 * glyph or what "busy" looks like.
 *
 * A destination stays an anchor rather than a button so it keeps middle-click,
 * "open in new tab" and the status bar. It stops being one when it is refused:
 * a disabled or busy `href` renders as a `<button>` because `<a>` has no
 * disabled state and a pointer-events trick would still be reachable by
 * keyboard.
 */
const BarAction = ({ action, primary }: { action: MbAction; primary: boolean }) => {
  const tone = action.tone ?? (primary ? "coral" : "outline-navy");

  if (action.href && !action.disabled && !action.loading) {
    return (
      <MbButtonLink
        href={action.href}
        variant={tone}
        size="lg"
        icon={action.icon}
        className={FLEX}
      >
        {action.label}
      </MbButtonLink>
    );
  }

  return (
    <MbButton
      variant={tone}
      size="lg"
      icon={action.icon}
      loading={action.loading}
      disabled={action.disabled}
      className={FLEX}
      onClick={action.onClick}
    >
      {action.label}
    </MbButton>
  );
};

/**
 * The bottom-anchored commit bar: one primary, at most one secondary, and a
 * short status line. The only such bar in the system — the wizard's sticky
 * footer and the scoring console's action rail are both this component
 * (charter Appendix B).
 *
 * `status` is always one truncating line — it is for a short measure
 * ("Step 2 of 3", "8 teams selected"); anything longer belongs above the bar.
 * See `MB_ACTION_BAR_H` / `MB_ACTION_BAR_H_STACKED` for the heights this
 * produces and the one phone case that exceeds them.
 */
export const MbActionBar = ({
  status,
  secondary,
  primary,
  sticky = true,
  className = "",
}: {
  status?: ReactNode;
  secondary?: MbAction;
  primary: MbAction;
  sticky?: boolean;
  className?: string;
}) => {
  // `.mb-action-bar` is unlayered, so neither a `static` nor a `gap-y-*`
  // utility can outrank its `position: sticky` / `gap: 0.75rem`. Inline can.
  const style: CSSProperties = { rowGap: "0.5rem" };
  if (!sticky) style.position = "static";

  return (
    <div
      className={`mb-action-bar flex-wrap sm:flex-nowrap ${MIN_H} ${
        status ? MIN_H_STACKED : ""
      } ${className}`}
      style={style}
    >
      {status ? (
        /* `w-full` is what breaks the line below `sm`. From `sm` up the status
           returns to the left of the controls on the same row. */
        <div className="w-full min-w-0 truncate text-[0.72rem] leading-4 text-mb-ink-muted tabular-nums sm:w-auto sm:flex-1">
          {status}
        </div>
      ) : (
        /* Without a status the primary fills the width on a phone and sits
           right on a desktop; this spacer is what moves it. */
        <span aria-hidden="true" className="hidden flex-1 sm:block" />
      )}
      {secondary && <BarAction action={secondary} primary={false} />}
      <BarAction action={primary} primary />
    </div>
  );
};
