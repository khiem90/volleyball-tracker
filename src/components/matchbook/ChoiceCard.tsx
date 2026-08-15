"use client";

import type { CSSProperties } from "react";
import { MbIcon } from "./MbIcon";
import { MbCheckMark } from "./SelectList";

/**
 * The "pick a thing" tile — wizard format grid, tools hub, any future chooser.
 *
 * `accent` is a **contained mark only** (charter D-9): it colours the 3px rail
 * down the card's spine and nothing else. It never becomes ink or a fill,
 * because the accents in `FORMAT_META` include `--mb-gold`, which measures
 * 2.15:1 on paper — fine as a rule, illegal as a glyph.
 *
 * Selection therefore rides three channels that all survive a greyscale squint:
 * the rail turns coral, the emblem disc inverts from outline to a navy fill,
 * and the ballot box fills and takes a check.
 */
export const MbChoiceCard = ({
  icon,
  accent,
  title,
  description,
  kicker,
  selected,
  onSelect,
  disabledReason,
  className = "",
}: {
  /** Sprite icon id shown in the emblem disc. */
  icon: string;
  /** Rail colour. Pass an `--mb-*` token reference, never a literal. */
  accent?: string;
  title: string;
  description: string;
  /** Eyebrow on the footer rule, e.g. "Min 4 teams". */
  kicker?: string;
  selected: boolean;
  onSelect: () => void;
  /** When set, the card is disabled and this sentence renders in the footer. */
  disabledReason?: string;
  className?: string;
}) => {
  const disabled = Boolean(disabledReason);

  const cardStyle: CSSProperties = {};
  (cardStyle as Record<string, string>)["--mb-rail-color"] = disabled
    ? "var(--mb-rule)"
    : selected
      ? "var(--mb-coral)"
      : accent ?? "var(--mb-rule)";
  // .mb-tile hard-codes border-color, so a dimmed disabled rule has to be inline.
  if (disabled) cardStyle.borderColor = "var(--mb-rule)";

  // `.mb-icon-disc` sets border-color and color in unlayered CSS, which beats
  // every Tailwind colour utility (they live in @layer utilities). The disc has
  // to be styled inline or the glyph disappears into its own fill.
  const discStyle: CSSProperties = disabled
    ? { borderColor: "var(--mb-rule)", color: "var(--mb-ink-muted)" }
    : selected
      ? {
          borderColor: "var(--mb-navy)",
          background: "var(--mb-navy)",
          color: "var(--mb-paper-bright)",
        }
      : { borderColor: "var(--mb-navy)", color: "var(--mb-navy)" };

  const footer = disabled ? disabledReason : kicker;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      data-selected={selected}
      style={cardStyle}
      className={`mb-tile mb-rail mb-row-hover flex h-full min-h-[44px] flex-col items-start gap-2.5 rounded-[4px] p-4 pl-[1.15rem] text-left ${
        disabled ? "cursor-not-allowed" : ""
      } ${className}`}
    >
      <span className="flex w-full items-start justify-between gap-3">
        <span aria-hidden="true" className="mb-icon-disc h-11 w-11" style={discStyle}>
          <MbIcon id={icon} size={20} />
        </span>
        <span
          aria-hidden="true"
          className={`mt-1 inline-grid h-[18px] w-[18px] shrink-0 place-content-center rounded-[2px] border-[1.5px] ${
            selected
              ? "border-mb-coral-deep bg-mb-coral-deep text-mb-paper-bright"
              : disabled
                ? "border-mb-rule"
                : "border-mb-navy"
          }`}
        >
          {selected && <MbCheckMark />}
        </span>
      </span>

      <span
        className={`matchbook-display text-[0.95rem] mb-track-title font-bold leading-tight break-words tabular-nums ${
          disabled ? "text-mb-ink-muted" : ""
        }`}
      >
        {title}
      </span>

      <span className="text-[0.78rem] leading-snug text-mb-ink-muted break-words tabular-nums">
        {description}
      </span>

      {footer && (
        <span className="mt-auto flex w-full items-start gap-1.5 border-t border-mb-rule pt-2.5">
          {disabled && (
            <MbIcon
              id="warning"
              size={13}
              className="mt-[1px] shrink-0 text-mb-ink-muted"
            />
          )}
          <span
            className={
              disabled
                ? "text-[0.72rem] leading-snug text-mb-ink-muted tabular-nums"
                : "mb-kicker tabular-nums"
            }
          >
            {footer}
          </span>
        </span>
      )}
    </button>
  );
};
