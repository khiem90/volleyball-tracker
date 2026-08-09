"use client";

import { useRef } from "react";
import { MbIcon } from "./MbIcon";

export interface MbSegmentedOption {
  value: string;
  label: string;
  /** Sprite icon id shown before the label. */
  icon?: string;
}

export type MbSegmentedSize = "sm" | "md";

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
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
  /** Group id; each option gets `${name}-${value}` so a field label can target it. */
  name: string;
  options: MbSegmentedOption[];
  /** Column count below and above `sm`. Defaults keep every cell ≥44px wide. */
  columns?: { base: number; sm: number };
  /** `sm` = 44px rows, `md` = 48px, matching the form-control family. */
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

  return (
    <div
      id={name}
      role="radiogroup"
      data-size={size}
      className={`mb-segmented ${COLS_BASE[base]} ${COLS_SM[sm]} ${
        fullWidth ? "w-full" : "w-fit"
      } ${className}`}
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
          >
            {option.icon && <MbIcon id={option.icon} size={14} className="shrink-0" />}
            <span className="min-w-0">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};
