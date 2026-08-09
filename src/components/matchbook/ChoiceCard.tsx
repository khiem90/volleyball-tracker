"use client";

import type { CSSProperties } from "react";
import { MbIcon } from "./MbIcon";

/**
 * The "pick a thing" tile — wizard format grid, tools hub, any future chooser.
 *
 * Selection rides three channels so it survives a greyscale squint test:
 * the coral `.mb-rail` spine, a filled ballot box, and the emblem inverting
 * from an outlined disc to a solid one.
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
  /** Emblem colour. Pass an `--mb-*` token reference, never a literal. */
  accent?: string;
  title: string;
  description: string;
  /** Eyebrow on the footer rule, e.g. "Min 4 teams". */
  kicker?: string;
  selected: boolean;
  onSelect: () => void;
  /** Present ⇒ the card is disabled and this sentence renders in the footer. */
  disabledReason?: string;
  className?: string;
}) => {
  const disabled = Boolean(disabledReason);
  const tone = disabled ? "var(--mb-ink-muted)" : accent ?? "var(--mb-navy)";

  // .mb-tile hard-codes border-color, so a dimmed disabled rule has to be inline.
  const cardStyle: CSSProperties = {};
  if (selected) {
    (cardStyle as Record<string, string>)["--mb-rail-color"] = "var(--mb-coral)";
  }
  if (disabled) cardStyle.borderColor = "var(--mb-rule)";

  const emblemStyle: CSSProperties = selected
    ? { background: tone, borderColor: tone, color: "var(--mb-paper-bright)" }
    : { borderColor: tone, color: tone };

  const footer = disabled ? disabledReason : kicker;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      data-selected={selected}
      style={cardStyle}
      className={`mb-tile mb-row-hover flex h-full min-h-[44px] flex-col items-start gap-2.5 rounded-[4px] p-4 text-left ${
        selected ? "mb-rail" : ""
      } ${disabled ? "cursor-not-allowed" : ""} ${className}`}
    >
      <span className="flex w-full items-start justify-between gap-3">
        <span
          className="mb-icon-disc h-11 w-11"
          style={emblemStyle}
          aria-hidden="true"
        >
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
          {selected && <MbIcon id="check" size={12} />}
        </span>
      </span>

      <span
        className={`matchbook-display text-[0.95rem] font-bold leading-tight tracking-[0.05em] break-words ${
          disabled ? "text-mb-ink-muted" : ""
        }`}
      >
        {title}
      </span>

      <span className="text-[0.78rem] leading-snug text-mb-ink-muted break-words">
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
                ? "text-[0.72rem] leading-snug text-mb-ink-muted"
                : "mb-kicker"
            }
          >
            {footer}
          </span>
        </span>
      )}
    </button>
  );
};
