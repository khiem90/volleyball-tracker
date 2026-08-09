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
 * size is what carries the guarantee here. `size` therefore sets the type step
 * and horizontal rhythm, never the hit area (charter §4.33 is a hard fail and
 * outranks the §2.3 size note). `touch` is kept as the explicit opt-in name the
 * charter gives dense consoles; after the floor it resolves the same as `md`.
 */
const SIZE_CLASS: Record<MbButtonSize, string> = {
  sm: "mb-btn-touch px-3 text-[0.72rem] tracking-[0.04em]",
  md: "mb-btn-touch",
  lg: "mb-btn-lg",
  touch: "mb-btn-touch",
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
  /** Busy state: keeps focus, blocks activation, never animates. */
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
      onClick={loading ? undefined : onClick}
      {...rest}
    >
      {leading && <MbIcon id={leading} size={glyph} className="shrink-0" />}
      {children !== undefined && children !== null && children !== false && (
        <span className="min-w-0 truncate">{children}</span>
      )}
      {iconRight && <MbIcon id={iconRight} size={glyph} className="shrink-0" />}
    </button>
  );
};
