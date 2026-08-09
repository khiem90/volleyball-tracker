"use client";

import { forwardRef } from "react";
import { MbIcon } from "./MbIcon";

export type MbIconButtonTone = "plain" | "navy" | "coral" | "outline" | "outline-navy";
export type MbIconButtonSize = "md" | "lg";

/**
 * `plain` is the unadorned control the close affordance and masthead overflow
 * need: `.mb-btn` geometry, no fill, no rule, navy ink that goes coral on
 * hover. The four remaining tones are the `.mb-btn` variants unchanged.
 */
const TONE_CLASS: Record<MbIconButtonTone, string> = {
  plain:
    "border-transparent bg-transparent text-mb-navy hover:bg-[var(--mb-tint-2)] hover:text-mb-coral",
  navy: "mb-btn-navy",
  coral: "mb-btn-coral",
  outline: "mb-btn-outline",
  "outline-navy": "mb-btn-outline-navy",
};

/**
 * 44 and 56 — the same two steps `.mb-stepper` uses for its ± buttons and the
 * two ends of `MbButton`'s scale. Fixing both axes makes `.mb-btn`'s horizontal
 * padding inert (the flex centring keeps the glyph on the border-box centre
 * because the padding is symmetric), so the square is exact without fighting
 * the unlayered rule.
 *
 * **These two steps are not `MbButton`'s two middle steps.** A labelled button
 * has a type axis this control does not, so its scale needs a step between the
 * floor and the commit size; a lone glyph has nothing to put there. The map is:
 *
 * | this control    | box  | pairs with              |
 * | --------------- | ---- | ----------------------- |
 * | `size="md"`     | 44px | `MbButton size="sm"`    |
 * | `size="lg"`     | 56px | `MbButton size="lg"`    |
 * |  —              | 48px | `MbButton size="md"`    |
 *
 * So a row that puts the default disc next to a default `MbButton` sits 4px out
 * of line. Pair the disc with `sm`, or take both to `lg`. Measured across
 * `/dev/kit` and all six shipped routes: zero such rows exist today, which is
 * why the enum is left alone rather than renamed out from under its call sites
 * — but it is the first thing a masthead will get wrong, so it is written down
 * here rather than discovered.
 */
const SIZE_CLASS: Record<MbIconButtonSize, string> = {
  md: "h-11 w-11",
  lg: "h-14 w-14",
};

const ICON_SIZE: Record<MbIconButtonSize, number> = { md: 18, lg: 22 };

export type MbIconButtonProps = {
  /** Sprite icon id. */
  icon: string;
  /** Becomes both `title` and `aria-label`. Required — this control has no text. */
  label: string;
  size?: MbIconButtonSize;
  tone?: MbIconButtonTone;
} & Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "title" | "aria-label" | "children"
>;

/**
 * `ref` is forwarded so Radix `asChild` can compose it — `MbMenu`'s trigger
 * used to hand-copy this component's markup for exactly that reason — and so
 * focus can be restored to the control that opened a dialog.
 */
export const MbIconButton = forwardRef<HTMLButtonElement, MbIconButtonProps>(
  ({ icon, label, size = "md", tone = "plain", className = "", type = "button", ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      title={label}
      aria-label={label}
      className={`mb-btn mb-btn-touch ${TONE_CLASS[tone]} ${SIZE_CLASS[size]} disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...rest}
    >
      <MbIcon id={icon} size={ICON_SIZE[size]} className="shrink-0" />
    </button>
  )
);
MbIconButton.displayName = "MbIconButton";
