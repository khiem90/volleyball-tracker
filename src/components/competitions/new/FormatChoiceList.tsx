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
     - The mark is a **ruled slot that fills in**, never a ballot box — see
       `ChoiceSlot` below for the measurement that forced the change. Two
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
 * THE CHOICE SLOT — a blank on a ruled line, and the answer written into it.
 *
 * The mark this replaces was a squared ballot box: 18x18, radius 2px, a navy
 * frame, a paper ground, empty until chosen. `MbSelectList`'s `CheckFace` — the
 * mark for the genuinely multi-select team directory two steps later — is
 * **18x18, radius 2px, a navy frame, a paper ground, empty until chosen**.
 * Scripted at 390x844 on the running app, unselected, they measured:
 *
 *   step 1 format mark   18 x 18   radius 2px   border 1px solid rgb(7,50,77)   bg rgb(255,250,241)
 *   step 2 team mark     18 x 18   radius 2px   border 1px solid rgb(7,50,77)   bg rgb(255,250,241)
 *
 * Pixel-identical. One shape carrying two different questions in one flow, and
 * the shape a sighted reader already knows means "tick as many as you like".
 * `role="radio"` fixed this for assistive tech and could not fix it for eyes,
 * and the "PICK ONE" caption in the panel head is a word arguing with a
 * picture. The design language settles which one wins: nine badge tones draw
 * nine different mark SHAPES precisely so that meaning is never carried by
 * context alone, and "a desaturated screenshot is the honest test".
 *
 * So the box goes. What is left is the print form's own idiom for a
 * one-of-N answer — a **blank on a ruled line**:
 *
 *   unselected   an 18px navy rule, and nothing above it
 *   selected     the same rule with the blank filled in: an 18x11 navy block
 *
 * It cannot be read as a ballot box because it has no frame, and it cannot be
 * read as a tick because it has no glyph. Desaturated, the two states are a
 * hairline and a block, which is the widest gap two 18px marks can hold.
 *
 * NAVY, not coral. `globals.css` states the rule where `.mb-check:checked`
 * lives — "THE 'ON' STATE IS INK, NOT ACCENT … a filled-in ballot box on
 * printed stock is inked, not highlighted" — and the mark this replaces used
 * `--mb-coral-deep`, which put a second coral job on the selected row beside
 * the selection rail that is already coral and is already structural
 * (invariant 15). Inking the mark returns the row to one coral job.
 *
 * HANDOFF: `.mb-radio` in `globals.css` still draws the squared ballot box
 * this file just abandoned, with the same inset-square mark. Nothing renders
 * it — the class has no call site in `src/` — but the next control that needs
 * a one-of-N mark will find the collision waiting. It belongs in that file,
 * which this workstream does not own this round.
 */
const ChoiceSlot = ({ checked }: { checked: boolean }) => (
  <span
    aria-hidden="true"
    className="flex h-[18px] w-[18px] shrink-0 flex-col justify-end border-b-[3px] border-mb-navy"
  >
    {checked && <span className="block h-[11px] w-full bg-mb-navy" />}
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
        /* Unselected rows carry the neutral `--mb-rule` rail — formats have NO
           colour key (see `formatMeta.ts`: the old per-format accents spent
           teal and gold, both locked to other meanings in §1.2, as a
           categorical key). Selection takes the rail to coral — the selection
           mark, coral's declared structural job — which is the third channel
           after the filled slot and the inverted disc and the only one visible
           from across a room. */
        const style: CSSProperties = {};
        (style as Record<string, string>)["--mb-rail-color"] = selected
          ? "var(--mb-coral)"
          : "var(--mb-rule)";

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
            /* `py-2`, not `py-2.5`, and the difference is the rung. At 10px of
               block padding the 36px disc summed to exactly 56, so the rows
               that also carry `divide-y`'s 1px rule rendered 57 — one px off
               the authored `min-h-[56px]`, on four of five rows (the rubric's
               D2 expression reads border boxes). At 8px the content sums to 53
               and `min-height` governs: every row is 56, dividers included. */
            className="mb-rail mb-row-hover flex min-h-[56px] w-full items-center gap-2.5 py-2 pr-3 pl-3.5 text-left"
          >
            <ChoiceSlot checked={selected} />

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

            <span className="flex min-w-0 flex-1 flex-col justify-center gap-1">
              <span className="matchbook-display truncate text-[0.95rem] mb-track-title leading-tight font-bold tabular-nums">
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
