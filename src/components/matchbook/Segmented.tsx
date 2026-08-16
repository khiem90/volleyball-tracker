"use client";

import { useRef } from "react";
import { MB_CONTROL_HEIGHT, type MbCompositeSize } from "./Button";
import { MbIcon } from "./MbIcon";

export interface MbSegmentedOption {
  value: string;
  label: string;
  /** Sprite icon id shown before the label. */
  icon?: string;
}

/**
 * A framed composite, so `md` and `lg` only — `Button.tsx` has the derivation.
 * The short version: the interior WIDTH of a framed composite is `rung − 2`,
 * and at `sm` it would be 42px — under the floor for the segments, which are
 * the actual targets (rubric HF-2).
 *
 * The cells' HEIGHT is the full rung — 48/56, the same number as the group —
 * because the frame is drawn as an inset `outline`, which is paint rather than
 * layout (see the group's inline style below). The segments therefore measure
 * on the ladder in the D2 sweep, which enumerates cells, not groups. Before
 * that correction the group's block borders charged the cells down to 46/54 —
 * two numbers on no ladder — and before THAT this was `"sm" | "md"` measured
 * on the *cell* (44 / 48), which meant the group a caller lines up against a
 * text field rendered 46 / 50 and never matched anything.
 */
export type MbSegmentedSize = MbCompositeSize;

/**
 * Written out rather than interpolated: Tailwind generates a class only if the
 * literal appears in source. Six is the ceiling — past that the control wraps
 * to a second row instead of squeezing cells under the 44px floor.
 */
const COLS_BASE: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

const COLS_SM: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
  5: "sm:grid-cols-5",
  6: "sm:grid-cols-6",
};

const clampColumns = (n: number) => Math.min(6, Math.max(1, Math.round(n)));

/**
 * The form-control sibling of `MbTabs` (charter Appendix A D-3): tabs switch a
 * view, this picks a value. `role="radiogroup"` with real radio semantics,
 * arrow-key roving tabindex, and a grid that wraps to another row rather than
 * squeezing a cell below the touch floor.
 *
 * A radiogroup needs an accessible name: pass `aria-label`, or `aria-labelledby`
 * pointing at the `MbField` label. Both reach the group through `...rest`.
 */
export const MbSegmented = ({
  value,
  onChange,
  name,
  options,
  columns,
  size = "md",
  fullWidth = true,
  className = "",
  style,
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
  /** Group id; each option gets `${name}-${value}` so a field label can target it. */
  name: string;
  options: MbSegmentedOption[];
  /** Column count below and above `sm`. Defaults keep every cell ≥44px wide. */
  columns?: { base: number; sm: number };
  /** Ladder rung of the **group box**: `md` = 48px, `lg` = 56px. */
  size?: MbSegmentedSize;
  fullWidth?: boolean;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "onChange">) => {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  if (options.length === 0) return null;

  const base = clampColumns(columns?.base ?? (options.length <= 2 ? options.length : 2));
  const sm = clampColumns(columns?.sm ?? Math.min(options.length, 4));
  const selectedIndex = options.findIndex((option) => option.value === value);
  const rovingIndex = selectedIndex === -1 ? 0 : selectedIndex;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = options.length - 1;
    let next = -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown")
      next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === -1) return;
    event.preventDefault();
    refs.current[next]?.focus();
    onChange(options[next].value);
  };

  const cell = MB_CONTROL_HEIGHT[size];

  return (
    <div
      id={name}
      role="radiogroup"
      data-size={size}
      className={`mb-segmented ${COLS_BASE[base]} ${COLS_SM[sm]} ${
        fullWidth ? "w-full" : "w-fit"
      } ${className}`}
      style={{
        /**
         * THE FRAME IS PAINT, NOT LAYOUT (the composite half of G21).
         *
         * `.mb-segmented`'s block borders used to charge the cells for the
         * frame: group 48, cells 46 — and 46 is the number the D2 sweep sees,
         * because an audit enumerates `role="radio"` buttons, not the group
         * div around them (the rubric names "46/58" as the pair that fails
         * the ladder twice). So the border comes off and the same 1px navy
         * ring is drawn as an inset `outline`, which occupies zero layout and
         * paints OVER the cells' outer edge — outlines render in the final
         * paint phase (CSS 2.1 App. E), so the ring survives the cells'
         * paper ground, and `overflow: hidden` still clips the square cell
         * corners to the group's 4px radius. Cells now measure the rung
         * itself: 48 at `md`, 56 at `lg`, group and cell one number at last.
         * The 1px navy dividers are unchanged — they are the grid `gap` with
         * the group's navy ground showing through, not borders.
         *
         * gridAutoRows is the wrap fix, and the reason a group can no longer
         * render two cell heights at once. Measured before:
         * `MbSegmented[data-size="md"]` with the options "North Pavilion
         * Court" / "South Hall" laid out 54.38px and 48px segments in one
         * control. Grid stretches items *within* a row, so the wrapping label
         * grew its own row and the short label kept the `min-height`. `1fr`
         * rows in an auto-height grid all resolve to the tallest row's base
         * size (CSS Grid §12.7), so every row of one group is the same height
         * by construction, however many rows there are and whatever wraps.
         * `minmax` keeps the ladder rung as the floor.
         *
         * NOTE for whoever owns globals.css: `.mb-segmented` still declares
         * the `border`, and `.mb-segmented > *` / the `[data-size]` variants
         * still declare `min-height` 44px/48px. All are superseded by the
         * inline declarations here (this component is `.mb-segmented`'s only
         * consumer) and can be deleted; if the border is deleted, keep it as
         * the outline written below.
         */
        border: 0,
        outline: "var(--mb-rule-edge) solid var(--mb-navy)",
        outlineOffset: "calc(-1 * var(--mb-rule-edge))",
        gridAutoRows: `minmax(${cell}px, 1fr)`,
        ...style,
      }}
      {...rest}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            id={`${name}-${option.value}`}
            type="button"
            role="radio"
            aria-checked={selected}
            data-selected={selected}
            tabIndex={index === rovingIndex ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            /* `py-1!` halves the unlayered `padding: 0.5rem 0.75rem`'s vertical
               half — important because that rule is unlayered and outranks any
               Tailwind utility that is not. It buys the second line of a
               wrapped label the room to sit inside the rung instead of pushing
               past it: 2 lines x 16px + 8px padding = 40px, inside 48. Single
               line cells do not move, because `minHeight` still governs and the
               flex centring is unchanged. */
            className="py-1!"
            style={{ minHeight: cell }}
          >
            {option.icon && <MbIcon id={option.icon} size={14} className="shrink-0" />}
            {/* `leading-tight` (1.25), not the inherited 1.5: a wrapped label
                measured 2 x 19.19px and blew the box open. Nothing is
                truncated — the design language's promise for this control is
                that it wraps rather than clips. */}
            <span className="min-w-0 break-words leading-tight tabular-nums">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};
