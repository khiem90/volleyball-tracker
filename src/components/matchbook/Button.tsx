"use client";

import { MbIcon } from "./MbIcon";

export type MbButtonVariant = "coral" | "navy" | "outline" | "outline-navy";
export type MbButtonSize = "sm" | "md" | "lg" | "touch";

const VARIANT_CLASS: Record<MbButtonVariant, string> = {
  coral: "mb-btn-coral",
  navy: "mb-btn-navy",
  outline: "mb-btn-outline",
  "outline-navy": "mb-btn-outline-navy",
};

/**
 * Every size clears the 44px floor. `.mb-btn` on its own is 38.8px and the
 * blanket coarse-pointer floor in globals.css is armed by W2, not P1, so the
 * size class is what carries the guarantee here. `size` therefore sets the type
 * step and the box, never the hit area (charter §4.33 is a hard fail and
 * outranks the §2.3 size note). `touch` is kept as the explicit opt-in name the
 * charter gives dense consoles; after the floor it resolves the same as `md`.
 */
const SIZE_CLASS: Record<MbButtonSize, string> = {
  sm: "mb-btn-touch",
  md: "mb-btn-touch",
  lg: "mb-btn-lg",
  touch: "mb-btn-touch",
};

/**
 * The type step lands on the label, not on the button. `.mb-btn` sets
 * `font-size` and is *unlayered* CSS, while Tailwind utilities live in
 * `@layer utilities` — an unlayered declaration wins over any layer regardless
 * of specificity, so `text-[…]` on the button element is silently inert. The
 * label span has no competing rule, so the step applies there cleanly and
 * without an `!important`. `sm` is `display/link` (0.72rem/600/0.04em), the
 * named step design language §2.1 already carries; `md`/`touch` inherit
 * `display/button` and `lg` inherits `.mb-btn-lg`'s 0.9rem.
 */
const LABEL_CLASS: Record<MbButtonSize, string> = {
  sm: "text-[0.72rem] tracking-[0.04em]",
  md: "",
  lg: "",
  touch: "",
};

const ICON_SIZE: Record<MbButtonSize, number> = { sm: 12, md: 14, lg: 16, touch: 14 };

export const MbButton = ({
  variant,
  size = "md",
  icon,
  iconRight,
  loading = false,
  fullWidth = false,
  className = "",
  children,
  type = "button",
  onClick,
  ...rest
}: {
  variant: MbButtonVariant;
  size?: MbButtonSize;
  /** Sprite icon id rendered before the label. */
  icon?: string;
  /** Sprite icon id rendered after the label. */
  iconRight?: string;
  /**
   * Busy state. Keeps the button focusable and keeps its label, blocks
   * activation (including a `type="submit"` form post) and never animates —
   * invariant 45 allows exactly one infinite loop in the system and it is the
   * live dot. The present-participle label is what carries "in progress".
   */
  loading?: boolean;
  fullWidth?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const glyph = ICON_SIZE[size];
  const leading = loading ? "refresh" : icon;
  return (
    <button
      type={type}
      className={`mb-btn ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${
        fullWidth ? "w-full" : ""
      } ${loading ? "cursor-progress" : ""} disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={
        loading
          ? (event) => {
              event.preventDefault();
              event.stopPropagation();
            }
          : onClick
      }
      {...rest}
    >
      {leading && <MbIcon id={leading} size={glyph} className="shrink-0" />}
      {children !== undefined && children !== null && children !== false && (
        <span className={`min-w-0 truncate tabular-nums ${LABEL_CLASS[size]}`}>
          {children}
        </span>
      )}
      {iconRight && <MbIcon id={iconRight} size={glyph} className="shrink-0" />}
    </button>
  );
};
