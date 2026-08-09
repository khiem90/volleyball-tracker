"use client";

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
 * 44 and 56 — the same two steps `.mb-stepper` uses for its ± buttons. Fixing
 * both axes makes `.mb-btn`'s horizontal padding inert (the flex centring keeps
 * the glyph on the border-box centre because the padding is symmetric), so the
 * square is exact without fighting the unlayered rule.
 */
const SIZE_CLASS: Record<MbIconButtonSize, string> = {
  md: "h-11 w-11",
  lg: "h-14 w-14",
};

const ICON_SIZE: Record<MbIconButtonSize, number> = { md: 18, lg: 22 };

export const MbIconButton = ({
  icon,
  label,
  size = "md",
  tone = "plain",
  className = "",
  type = "button",
  ...rest
}: {
  /** Sprite icon id. */
  icon: string;
  /** Becomes both `title` and `aria-label`. Required — this control has no text. */
  label: string;
  size?: MbIconButtonSize;
  tone?: MbIconButtonTone;
} & Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "title" | "aria-label" | "children"
>) => (
  <button
    type={type}
    title={label}
    aria-label={label}
    className={`mb-btn mb-btn-touch ${TONE_CLASS[tone]} ${SIZE_CLASS[size]} disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    {...rest}
  >
    <MbIcon id={icon} size={ICON_SIZE[size]} className="shrink-0" />
  </button>
);
