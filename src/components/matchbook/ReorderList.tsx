"use client";

import { useEffect, useId, useRef, useState } from "react";
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { MbIconButton } from "./IconButton";
import { PanelEmpty } from "./Panel";

/**
 * The move, as a pure function. `onReorder` reports intent as a pair of indices
 * — the smallest honest statement of what happened — and this turns that pair
 * into the next array, so no caller re-writes the splice.
 */
export const mbReorder = <T,>(items: readonly T[], from: number, to: number): T[] => {
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

type MbReorderControl = "handle" | "up" | "down";

interface RowBox {
  top: number;
  height: number;
}

/**
 * Ordered list whose rows can be re-ranked.
 *
 * Three input paths, all equal citizens:
 *   pointer  the grip is Pointer Events + `setPointerCapture`, so one code path
 *            serves mouse, pen and finger. `touch-action:none` is inline because
 *            `.mb-btn` sets `manipulation` outside Tailwind's utility layer and
 *            would otherwise win the cascade and let the page scroll mid-drag.
 *   buttons  a visible 44px up / down pair — the non-drag path, which is also
 *            the only path a switch or voice user has.
 *   keyboard `Alt+ArrowUp` / `Alt+ArrowDown` anywhere in the row.
 *
 * Every move is announced through one polite `aria-live` region, and focus is
 * moved to the row's new position so a repeated press keeps moving one item
 * rather than walking down the list.
 *
 * Nothing animates: the dragged row tracks the pointer (direct manipulation,
 * not motion) and the other rows hold still behind a coral insertion rule.
 */
export const MbReorderList = <T,>({
  items,
  onReorder,
  renderItem,
  getKey,
  getLabel,
  label = "Order",
  emptyMessage = "Nothing to order yet — add items and they appear here.",
  disabled = false,
  className = "",
}: {
  items: T[];
  /** Apply it with `mbReorder(items, from, to)`. */
  onReorder: (from: number, to: number) => void;
  renderItem: (item: T, index: number) => ReactNode;
  /** Stable row key. Defaults to the index — safe here because nothing animates. */
  getKey?: (item: T, index: number) => string;
  /** Names the row in every control label and in the announcement. */
  getLabel?: (item: T, index: number) => string;
  /** Accessible name of the `<ol>`. */
  label?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
}) => {
  const hintId = useId();
  const listRef = useRef<HTMLOListElement>(null);
  const boxesRef = useRef<RowBox[]>([]);
  const boundsRef = useRef({ top: 0, bottom: 0 });
  const startYRef = useRef(0);
  const focusRef = useRef<{ index: number; control: MbReorderControl } | null>(null);

  const [drag, setDrag] = useState<{ index: number; over: number; dy: number } | null>(
    null,
  );
  const [announcement, setAnnouncement] = useState("");

  const locked = disabled || items.length < 2;
  const nameOf = (index: number) =>
    getLabel ? getLabel(items[index], index) : `Item ${index + 1}`;

  // Focus follows the row to its new position; if the control that moved it is
  // now disabled (the row hit an end), the grip takes the focus instead.
  useEffect(() => {
    const pending = focusRef.current;
    if (!pending) return;
    focusRef.current = null;
    const row = listRef.current?.children[pending.index];
    if (!row) return;
    const wanted = row.querySelector<HTMLButtonElement>(
      `[data-mb-reorder="${pending.control}"] button`,
    );
    const grip = row.querySelector<HTMLButtonElement>(
      '[data-mb-reorder="handle"] button',
    );
    (wanted && !wanted.disabled ? wanted : grip)?.focus();
  });

  const move = (from: number, to: number, control: MbReorderControl) => {
    if (disabled || to === from || to < 0 || to >= items.length) return;
    setAnnouncement(`${nameOf(from)} moved to position ${to + 1} of ${items.length}.`);
    focusRef.current = { index: to, control };
    onReorder(from, to);
  };

  const beginDrag = (event: ReactPointerEvent<HTMLElement>, index: number) => {
    if (locked || !event.isPrimary) return;
    const list = listRef.current;
    if (!list) return;
    boxesRef.current = Array.from(list.children).map((row) => {
      const rect = row.getBoundingClientRect();
      return { top: rect.top, height: rect.height };
    });
    const listRect = list.getBoundingClientRect();
    boundsRef.current = { top: listRect.top, bottom: listRect.bottom };
    startYRef.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ index, over: index, dy: 0 });
  };

  const trackDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (!drag) return;
    const boxes = boxesRef.current;
    const box = boxes[drag.index];
    if (!box) return;

    // Cross a neighbour's midpoint and it yields its slot; stop at the first
    // neighbour that has not been crossed, so the target is always contiguous.
    const y = event.clientY;
    let over = drag.index;
    for (let i = drag.index - 1; i >= 0; i--) {
      if (y >= boxes[i].top + boxes[i].height / 2) break;
      over = i;
    }
    for (let i = drag.index + 1; i < boxes.length; i++) {
      if (y <= boxes[i].top + boxes[i].height / 2) break;
      over = i;
    }

    const dy = Math.min(
      Math.max(y - startYRef.current, boundsRef.current.top - box.top),
      boundsRef.current.bottom - (box.top + box.height),
    );
    setDrag({ index: drag.index, over, dy });
  };

  const endDrag = (event: ReactPointerEvent<HTMLElement>, commit: boolean) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!drag) return;
    const { index, over } = drag;
    setDrag(null);
    if (commit) move(index, over, "handle");
  };

  const onRowKeyDown = (event: ReactKeyboardEvent<HTMLLIElement>, index: number) => {
    if (!event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const control = (event.target as HTMLElement)
      .closest<HTMLElement>("[data-mb-reorder]")
      ?.dataset.mbReorder as MbReorderControl | undefined;
    move(index, index + (event.key === "ArrowUp" ? -1 : 1), control ?? "handle");
  };

  return (
    <div className={`flex min-w-0 flex-col ${className}`}>
      <p id={hintId} className="sr-only">
        Press Alt with the up or down arrow keys to move an item, or drag its grip.
      </p>

      {items.length === 0 ? (
        <PanelEmpty message={emptyMessage} />
      ) : (
        <ol
          ref={listRef}
          aria-label={label}
          className={`min-w-0 ${drag ? "select-none" : ""}`}
        >
          {items.map((item, index) => {
            const name = nameOf(index);
            const dragging = drag?.index === index;
            const target = drag !== null && drag.over === index && drag.over !== drag.index;
            const above = target && drag.over < drag.index;

            const style: CSSProperties | undefined = dragging
              ? {
                  transform: `translateY(${drag.dy}px)`,
                  zIndex: 3,
                  background: "var(--mb-paper-bright)",
                  boxShadow: "var(--mb-panel-shadow)",
                }
              : undefined;

            return (
              <li
                key={getKey ? getKey(item, index) : index}
                data-dragging={dragging || undefined}
                onKeyDown={(event) => onRowKeyDown(event, index)}
                style={style}
                /* `py-[3px]`: the grip and the up/down pair are 44px tall, so a
                   row that only fits them leaves ~7px between one row's
                   controls and the next row's — under the 8px separation
                   invariant 33 requires. Three pixels of row padding buys the
                   clearance on both sides of every hairline. */
                className="mb-row-hover relative flex min-w-0 items-center gap-1.5 border-b border-mb-rule px-2 py-[3px] last:border-b-0"
              >
                {target && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 h-[3px] bg-mb-coral"
                    style={above ? { top: -2 } : { bottom: -2 }}
                  />
                )}

                <span data-mb-reorder="handle" className="shrink-0">
                  <MbIconButton
                    icon="drag"
                    label={`Reorder ${name}`}
                    aria-describedby={hintId}
                    disabled={locked}
                    style={{ touchAction: "none" }}
                    className={dragging ? "cursor-grabbing" : "cursor-grab"}
                    onPointerDown={(event) => beginDrag(event, index)}
                    onPointerMove={trackDrag}
                    onPointerUp={(event) => endDrag(event, true)}
                    onPointerCancel={(event) => endDrag(event, false)}
                  />
                </span>

                <span className="matchbook-display w-5 shrink-0 text-right text-[0.8rem] mb-track-button font-bold leading-none tabular-nums text-mb-ink-muted">
                  {index + 1}
                </span>

                {/* A flex box for the same reason `MbSelectRow` uses one: an
                    inline-flex mark inside a truncating block is clipped with
                    no ellipsis, while a flex item with `min-w-0` shrinks. */}
                <span className="flex min-w-0 flex-1 items-center overflow-hidden py-2">
                  {renderItem(item, index)}
                </span>

                <span className="flex shrink-0 items-center gap-2">
                  <span data-mb-reorder="up">
                    <MbIconButton
                      icon="chevron-down"
                      label={`Move ${name} up`}
                      disabled={locked || index === 0}
                      onClick={() => move(index, index - 1, "up")}
                      className="[&>svg]:rotate-180"
                    />
                  </span>
                  <span data-mb-reorder="down">
                    <MbIconButton
                      icon="chevron-down"
                      label={`Move ${name} down`}
                      disabled={locked || index === items.length - 1}
                      onClick={() => move(index, index + 1, "down")}
                    />
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
};
