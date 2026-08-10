"use client";

import { useRef } from "react";
import type { CSSProperties } from "react";
import { MbIcon } from "@/components/matchbook/MbIcon";
import type { MbFormatOption } from "@/components/matchbook/useMatchbookNewCompetition";
import type { CompetitionType } from "@/types/game";

/* ===========================================================================
   THE FORMAT CHOOSER — five options, one choice, one screen

   This replaces a grid of five `MbChoiceCard`s. Two measured defects killed
   that grid, and they were the same defect twice:

   1. **IT LOOKED LIKE A MULTI-SELECT.** Each card carried an unlabelled empty
      ballot box in its top-right corner and `aria-pressed="false"` on the
      button — the toggle-button contract, five times over, on a list where
      exactly one answer is legal. Nothing on the screen said "pick one".
   2. **1.7 OF 5 FITTED ON A PHONE.** Measured at 390x844: each card 324x187,
      the first at y=307.75, the sticky commit bar covering everything past
      y=681. Two cards were reachable without scrolling and the second was
      clipped, so choosing between five formats meant scrolling and
      remembering. A chooser you cannot see is not a comparison.

   Both are fixed by the same move: the choice becomes a **ruled list of five
   rows inside one panel**, not five framed cards.

     - `role="radiogroup"` with real `role="radio"` children, arrow-key roving
       tabindex and Home/End — the semantics `MbSegmented` already ships, at a
       size that fits a sentence. `aria-checked` replaces `aria-pressed`, so
       assistive tech is told this is one-of-five rather than five on/off
       switches.
     - The mark is a **squared ballot box carrying an inset coral square** —
       what the design language (§3.3) specifies for `.mb-radio` — never the
       tick `MbSelectList` uses for its genuinely multi-select rows. Two
       different marks for two different questions, and neither is a circle,
       because 999px is reserved.
     - The mark sits **first in the row, against the name**, not floating in a
       far corner where it belonged to nothing.
     - Each row is 56px, so five of them plus the panel head measure ~330px
       against the ~437px a phone has above the commit bar. All five are
       comparable without scrolling, which is the whole job.

   ------------------------------------------------ what moved off the row

   The card's full sentence ("Every team plays every other team once.
   Standings decide the winner.") is now a four-word summary. The sentence is
   not lost: `FormatPreviewPanel` prints `FORMAT_META[format].blurb` verbatim
   as its first line the moment a format is chosen, one panel below. So the
   list is the comparison and the preview is the detail — which is what the
   preview panel was already for.
   =========================================================================== */

/**
 * The squared ballot box for a ONE-OF-N choice.
 *
 * `MbSelectList`'s `CheckFace` fills with coral and draws a tick; this fills
 * nothing and insets a coral square. Both are 18px boxes at radius 2, so they
 * are the same family — the mark inside is what says "one" or "many".
 */
const RadioFace = ({ checked }: { checked: boolean }) => (
  <span
    aria-hidden="true"
    className="inline-grid h-[18px] w-[18px] shrink-0 place-content-center rounded-[2px] border-[1.5px] border-mb-navy bg-mb-paper-bright"
  >
    {checked && (
      <span className="block h-[8px] w-[8px] rounded-[2px] bg-mb-coral-deep" />
    )}
  </span>
);

export interface FormatChoiceListProps {
  options: MbFormatOption[];
  value: CompetitionType | null;
  onChange: (type: CompetitionType) => void;
  /** Accessible name for the group. */
  label: string;
}

export const FormatChoiceList = ({
  options,
  value,
  onChange,
  label,
}: FormatChoiceListProps) => {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedIndex = options.findIndex((option) => option.type === value);
  /* Roving tabindex: the group is ONE tab stop. Before a choice exists that
     stop is the first option, exactly as `MbSegmented` resolves it. */
  const tabbable = selectedIndex === -1 ? 0 : selectedIndex;

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    const last = options.length - 1;
    let next = -1;
    if (event.key === "ArrowDown" || event.key === "ArrowRight")
      next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft")
      next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === -1) return;
    event.preventDefault();
    refs.current[next]?.focus();
    onChange(options[next].type);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex flex-col divide-y divide-mb-rule"
    >
      {options.map((option, index) => {
        const selected = option.type === value;
        /* The accent is a CONTAINED MARK — a 3px rail down the row's spine and
           nothing else (charter D-9). `--mb-gold` measures 2.15:1 on paper, so
           it may rule but never ink. Selection takes the rail to coral, which
           is the third channel after the ballot mark and the inverted disc and
           the only one visible from across a room. */
        const style: CSSProperties = {};
        (style as Record<string, string>)["--mb-rail-color"] = selected
          ? "var(--mb-coral)"
          : option.meta.accent;

        return (
          <button
            key={option.type}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            data-selected={selected}
            tabIndex={index === tabbable ? 0 : -1}
            onClick={() => onChange(option.type)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            style={style}
            className="mb-rail mb-row-hover flex min-h-[56px] w-full items-center gap-2.5 py-2.5 pr-3 pl-3.5 text-left"
          >
            <RadioFace checked={selected} />

            {/* `.mb-icon-disc` sets `border-color` and `color` from unlayered
                CSS, which outranks every Tailwind colour utility, so the disc
                is inked inline — the same correction `MbChoiceCard` and
                `NameStep` both document. 36px, not 44: the row's text column
                is 36px tall, so the disc costs nothing in height here. */}
            <span
              aria-hidden="true"
              className="mb-icon-disc h-9 w-9 shrink-0"
              style={
                selected
                  ? {
                      borderColor: "var(--mb-navy)",
                      background: "var(--mb-navy)",
                      color: "var(--mb-paper-bright)",
                    }
                  : { borderColor: "var(--mb-navy)", color: "var(--mb-navy)" }
              }
            >
              <MbIcon id={option.meta.icon} size={16} />
            </span>

            <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
              <span className="matchbook-display truncate text-[0.95rem] leading-tight font-bold tracking-[0.05em] tabular-nums">
                {option.meta.label}
              </span>
              <span className="truncate text-[0.72rem] leading-tight text-mb-ink-muted tabular-nums">
                {option.summary}
              </span>
            </span>

            {/* The one number worth comparing across five rows, right-aligned
                so it reads as a column. It never disables the option: the very
                next step can create teams, so a short library is a note, not a
                dead end. */}
            <span className="mb-kicker shrink-0 tabular-nums">
              {option.kicker}
            </span>
          </button>
        );
      })}
    </div>
  );
};
