"use client";

import { forwardRef } from "react";
import { MB_CONTROL_HEIGHT, type MbControlSize } from "./Button";
import { MbIcon } from "./MbIcon";

export type MbIconButtonTone = "plain" | "navy" | "coral" | "outline" | "outline-navy";

/**
 * The full ladder from `Button.tsx` — the same three rungs, meaning the same
 * three numbers. This control's box is its own target, so the floor rung is
 * available to it.
 */
export type MbIconButtonSize = MbControlSize;

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
 * Both axes fixed, so `.mb-btn`'s horizontal padding is inert (the flex
 * centring keeps the glyph on the border-box centre because the padding is
 * symmetric) and the square is exact without fighting the unlayered rule.
 *
 * **`md` used to be 44px here and 48px on `MbButton`.** That disagreement was
 * written down in this file as a known trap — with a table of which sizes to
 * pair with which — and then left in place, so a masthead putting the default
 * disc beside a default `MbButton` sat 4px out of line and no prop could fix
 * it. The trap is now deleted rather than documented: `md` is 48px here
 * because `md` is 48px everywhere.
 *
 * The three literals are written out because Tailwind only generates a class
 * whose text appears in source. `h-11` = 44, `h-12` = 48, `h-14` = 56.
 */
const SIZE_CLASS: Record<MbIconButtonSize, string> = {
  sm: "h-11 w-11",
  md: "h-12 w-12",
  lg: "h-14 w-14",
};

/**
 * The glyph rides the box: a lone icon has no type axis to carry the step, so
 * the only way `sm` and `md` read as different controls is the mark inside
 * them. 18 / 20 / 22 keeps the icon at ~40% of the box at every rung.
 */
const ICON_SIZE: Record<MbIconButtonSize, number> = { sm: 18, md: 20, lg: 22 };

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
  (
    {
      icon,
      label,
      size = "md",
      tone = "plain",
      className = "",
      type = "button",
      style,
      ...rest
    },
    ref
  ) => (
    <button
      ref={ref}
      type={type}
      title={label}
      aria-label={label}
      className={`mb-btn mb-btn-touch ${TONE_CLASS[tone]} ${SIZE_CLASS[size]} disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      data-size={size}
      /* `.mb-btn-touch`'s unlayered `min-height:44px` is a floor, not the box:
         it loses to the definite `height` below at every rung, and matches it
         at `sm`. Stated inline so the rung is auditable on the element itself
         and not only inferable from a Tailwind class; the caller's own `style`
         still wins because it is spread last. */
      style={{ height: MB_CONTROL_HEIGHT[size], width: MB_CONTROL_HEIGHT[size], ...style }}
      {...rest}
    >
      <MbIcon id={icon} size={ICON_SIZE[size]} className="shrink-0" />
    </button>
  )
);
MbIconButton.displayName = "MbIconButton";
