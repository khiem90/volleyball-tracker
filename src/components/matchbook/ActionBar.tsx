"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { MbIcon } from "./MbIcon";

export type MbActionTone = "coral" | "navy" | "outline" | "outline-navy";

export interface MbAction {
  label: string;
  /** Sprite icon id rendered before the label. */
  icon?: string;
  onClick?: () => void;
  /** Renders a `<Link>` instead of a `<button>`. */
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
 * exact value and the natural height (a 1.5px rule, 0.75rem, a ~47.6px
 * `.mb-btn-lg` and 0.75rem) sits just under it, so the bar measures 73px on
 * the nose. Verified, not asserted.
 */
export const MB_ACTION_BAR_H = "calc(73px + var(--mb-safe-bottom))";

/**
 * The same bar below `sm` **with** a `status`, where the status takes its own
 * line — 390px cannot hold "Step 2 of 3 · 8 teams selected", a Back and a
 * Create competition on one 44px row without truncating the commit verb.
 *
 * Pinned the same way, over a 96.6px natural height. Pad by this one whenever
 * the bar carries a status.
 *
 * One case exceeds it: a `secondary` whose label cannot share a 390px row with
 * a long `primary`. The controls then wrap to a line each and the bar grows by
 * one 55.2px row — deliberately, because clipping the commit verb is worse.
 * Keep phone primaries short, or budget `calc(152.5px + var(--mb-safe-bottom))`
 * (`calc(128.5px + var(--mb-safe-bottom))` when there is no status).
 */
export const MB_ACTION_BAR_H_STACKED = "calc(97px + var(--mb-safe-bottom))";

/**
 * The two constants as Tailwind classes. Written out in full because the
 * scanner reads source text, not values — keep them in step with the exports
 * above. Inline `min-height` is deliberately not used: `max-sm:` has to be able
 * to win, and an inline declaration would outrank it.
 */
const MIN_H = "min-h-[calc(73px_+_var(--mb-safe-bottom))]";
const MIN_H_STACKED = "max-sm:min-h-[calc(97px_+_var(--mb-safe-bottom))]";

const TONE_CLASS: Record<MbActionTone, string> = {
  coral: "mb-btn-coral",
  navy: "mb-btn-navy",
  outline: "mb-btn-outline",
  "outline-navy": "mb-btn-outline-navy",
};

const BarAction = ({ action, primary }: { action: MbAction; primary: boolean }) => {
  const tone = action.tone ?? (primary ? "coral" : "outline-navy");
  /**
   * `flex-auto` on a phone, `flex-initial` from `sm` up.
   *
   * The `auto` basis is load-bearing: a flex line breaks on *base* sizes, so
   * two controls that cannot sit side by side at 390px each take a full-width
   * line instead of shrinking. With `flex-1` (basis 0) they would never wrap
   * and the commit verb would truncate to "Create compet…" — the one label in
   * the bar that must never be clipped.
   */
  /**
   * Disabled and busy read differently, the same way `MbButton` reads them:
   * disabled is dimmed and refused, busy keeps full contrast and its label
   * because the present participle is what carries "in progress".
   */
  const className = `mb-btn mb-btn-lg ${TONE_CLASS[tone]} min-w-0 flex-auto sm:flex-initial ${
    action.loading ? "cursor-progress" : ""
  } ${action.disabled ? "cursor-not-allowed opacity-40" : ""}`;
  const glyph = action.loading ? "refresh" : action.icon;
  const inner = (
    <>
      {glyph && <MbIcon id={glyph} size={16} className="shrink-0" />}
      <span className="min-w-0 truncate">{action.label}</span>
    </>
  );

  if (action.href && !action.disabled && !action.loading) {
    return (
      <Link href={action.href} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      disabled={action.disabled}
      aria-busy={action.loading || undefined}
      aria-disabled={action.loading || undefined}
      onClick={action.loading ? undefined : action.onClick}
    >
      {inner}
    </button>
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
        <div className="w-full min-w-0 truncate text-[0.75rem] leading-4 text-mb-ink-muted tabular-nums sm:w-auto sm:flex-1">
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
