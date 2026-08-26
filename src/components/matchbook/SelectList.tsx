"use client";

import { memo, useState } from "react";
import type { ReactNode } from "react";
import { MbIcon } from "./MbIcon";
import { PanelEmpty } from "./Panel";

/** Row pitch in px. Fixed so ten rows read as a block and windowing is exact. */
const ROW_H = 48;
/** Rows visible before the list scrolls. */
const VIEWPORT_ROWS = 9;
/** Windowing only earns its keep past this many rows. */
const WINDOW_THRESHOLD = 60;
const OVERSCAN = 6;

const HIDE_CLASS = {
  sm: "hidden sm:block",
  md: "hidden md:block",
  lg: "hidden lg:block",
} as const;

/**
 * One frozen array for every caller that omits `columns`. A `= []` default
 * would mint a new reference on every render and silently defeat the row memo
 * — the exact cost this component exists to avoid.
 */
const NO_COLUMNS: readonly never[] = [];

export interface MbSelectColumn<T> {
  key: string;
  /** Uppercase abbreviated header, e.g. "Entered in". */
  header: string;
  render: (item: T) => ReactNode;
  /** Hide the column below this breakpoint. Only ever hide redundant context. */
  hide?: keyof typeof HIDE_CLASS;
  align?: "left" | "right";
  /** CSS width for the cell. Defaults to 6rem. */
  width?: string;
}

/**
 * The system tick, drawn the way `.mb-check:checked::after` draws it, so a
 * ballot box, a choice card and a completed wizard step all carry one mark.
 * The sprite's `check` is a *circled* tick and reads as a ring below ~16px,
 * which is why this is a border pair and not an `<MbIcon>`.
 *
 * Inherits `currentColor`; the caller owns the ink.
 */
export const MbCheckMark = ({ size = 7 }: { size?: number }) => (
  <span
    aria-hidden="true"
    className="block border-b-2 border-l-2 border-current"
    style={{
      width: size,
      height: Math.round(size * 0.58),
      transform: "rotate(-45deg) translate(0.5px, -1px)",
    }}
  />
);

/* The on-state fills NAVY — "a filled-in ballot box on printed stock is
   inked, not highlighted" (`globals.css`, `.mb-check:checked`). This face
   used to fill `--mb-coral-deep`, which both contradicted that settled rule
   and multiplied coral once per ticked row. */
const CheckFace = ({ state }: { state: "on" | "off" | "mixed" }) => (
  <span
    aria-hidden="true"
    className={`inline-grid h-[18px] w-[18px] shrink-0 place-content-center rounded-[2px] border-[1.5px] ${
      state === "off"
        ? "border-mb-navy bg-mb-paper-bright"
        : "border-mb-navy bg-mb-navy text-mb-paper-bright"
    }`}
  >
    {state === "on" && <MbCheckMark />}
    {state === "mixed" && (
      <span className="block h-[2px] w-[8px] bg-mb-paper-bright" />
    )}
  </span>
);

const Cell = <T,>({
  column,
  item,
  head,
}: {
  column: MbSelectColumn<T>;
  item?: T;
  head?: boolean;
}) => (
  <span
    style={{ width: column.width ?? "6rem" }}
    className={`shrink-0 truncate ${column.hide ? HIDE_CLASS[column.hide] : "block"} ${
      column.align === "right" ? "text-right" : "text-left"
    } ${
      head
        ? "mb-kicker"
        : "text-[0.72rem] tabular-nums text-mb-ink-muted"
    }`}
  >
    {head ? column.header : item !== undefined ? column.render(item) : null}
  </span>
);

interface MbSelectRowProps<T> {
  item: T;
  itemKey: string;
  selected: boolean;
  onToggle: (key: string) => void;
  renderPrimary: (item: T) => ReactNode;
  columns: MbSelectColumn<T>[];
}

const MbSelectRowInner = <T,>({
  item,
  itemKey,
  selected,
  onToggle,
  renderPrimary,
  columns,
}: MbSelectRowProps<T>) => (
  <li
    className="border-b border-mb-rule last:border-b-0"
    style={{ height: ROW_H }}
  >
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={() => onToggle(itemKey)}
      data-selected={selected}
      className={`mb-row-hover flex h-full w-full items-center gap-3 px-3 text-left ${
        selected ? "mb-rail" : ""
      }`}
    >
      <CheckFace state={selected ? "on" : "off"} />
      {/*
        A flex box, not a `truncate` block: `renderPrimary` usually returns an
        inline-flex mark (`TeamMark`), and an inline-flex child of a truncating
        block is clipped without ever showing an ellipsis. As a flex item with
        `min-w-0` it shrinks, and its own `truncate` fires.
      */}
      <span className="flex min-w-0 flex-1 items-center overflow-hidden">
        {renderPrimary(item)}
      </span>
      {columns.map((column) => (
        <Cell key={column.key} column={column} item={item} />
      ))}
    </button>
  </li>
);

/**
 * One row of {@link MbSelectList}. Memoised, so it must be fed primitives and
 * stable callbacks: keep `onToggle`, `renderPrimary` and `columns` referentially
 * stable in the caller (module scope or `useCallback`/`useMemo`).
 */
export const MbSelectRow = memo(MbSelectRowInner) as typeof MbSelectRowInner;

/**
 * The hairline multi-select list.
 *
 * Selection is a `Set` of keys and is read with `.has()` once per row — never
 * `Array.includes`, which is O(n) per row and O(n²) per render.
 *
 * `search` / `onSearchChange` render the controlled search field only; the
 * caller owns filtering and passes the already-filtered `items`, because the
 * caller is also the one that has to make "select all" mean "select what is
 * on screen".
 */
export const MbSelectList = <T,>({
  items,
  getKey,
  selected,
  onToggle,
  onSelectAll,
  search,
  onSearchChange,
  columns = NO_COLUMNS as unknown as MbSelectColumn<T>[],
  renderPrimary,
  emptyMessage,
  windowed = true,
  label = "Selectable list",
  className = "",
}: {
  items: T[];
  getKey: (item: T) => string;
  selected: Set<string>;
  onToggle: (key: string) => void;
  /** Toggles every row currently in `items`. Omit to hide the control. */
  onSelectAll?: () => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  columns?: MbSelectColumn<T>[];
  renderPrimary: (item: T) => ReactNode;
  emptyMessage: string;
  /** Window the rows past ~60 items. Default true. */
  windowed?: boolean;
  /** Accessible name for the row list and its search field. */
  label?: string;
  className?: string;
}) => {
  const [scrollTop, setScrollTop] = useState(0);

  let selectedHere = 0;
  for (const item of items) if (selected.has(getKey(item))) selectedHere++;

  const allSelected = items.length > 0 && selectedHere === items.length;
  const headState = allSelected ? "on" : selectedHere > 0 ? "mixed" : "off";

  const virtual = windowed && items.length > WINDOW_THRESHOLD;
  const start = virtual
    ? Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN)
    : 0;
  const end = virtual
    ? Math.min(items.length, start + VIEWPORT_ROWS + OVERSCAN * 2)
    : items.length;
  const slice = virtual ? items.slice(start, end) : items;

  return (
    <div className={`flex min-h-0 min-w-0 flex-1 flex-col ${className}`}>
      {onSearchChange && (
        <div className="border-b border-mb-rule p-2">
          <label className="mb-search min-h-[44px]">
            <MbIcon id="search" size={14} className="shrink-0 text-mb-ink-muted" />
            <input
              type="text"
              inputMode="search"
              value={search ?? ""}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search"
              aria-label={`Search ${label}`}
              className="h-11 min-w-0 flex-1"
            />
          </label>
        </div>
      )}

      <div className="flex min-h-[44px] items-center gap-3 border-b-[1.5px] border-mb-navy px-3">
        {onSelectAll ? (
          <button
            type="button"
            role="checkbox"
            aria-checked={allSelected ? true : selectedHere > 0 ? "mixed" : false}
            onClick={onSelectAll}
            title={allSelected ? "Clear selection" : "Select all"}
            className="mb-row-hover -mx-2 flex min-h-[44px] flex-1 items-center gap-3 rounded-[3px] px-2 text-left"
          >
            <CheckFace state={headState} />
            <span className="mb-kicker">
              {allSelected ? "Clear all" : "Select all"}
            </span>
            <span className="mb-kicker ml-auto tabular-nums">
              {selectedHere} / {items.length}
            </span>
          </button>
        ) : (
          <>
            <span className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            <span className="mb-kicker flex-1 tabular-nums">
              {selectedHere} of {items.length} selected
            </span>
          </>
        )}
        {columns.map((column) => (
          <Cell key={column.key} column={column} head />
        ))}
      </div>

      {items.length === 0 ? (
        <PanelEmpty message={emptyMessage} />
      ) : (
        <ul
          aria-label={label}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          style={{ maxHeight: VIEWPORT_ROWS * ROW_H }}
          onScroll={
            virtual
              ? (event) => setScrollTop(event.currentTarget.scrollTop)
              : undefined
          }
        >
          {start > 0 && (
            <li aria-hidden="true" style={{ height: start * ROW_H }} />
          )}
          {slice.map((item) => {
            const key = getKey(item);
            return (
              <MbSelectRow
                key={key}
                item={item}
                itemKey={key}
                selected={selected.has(key)}
                onToggle={onToggle}
                renderPrimary={renderPrimary}
                columns={columns}
              />
            );
          })}
          {end < items.length && (
            <li aria-hidden="true" style={{ height: (items.length - end) * ROW_H }} />
          )}
        </ul>
      )}
    </div>
  );
};
