"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MbIcon } from "./MbIcon";

export interface MbTabItem {
  value: string;
  label: string;
  /** Sprite icon id shown before the label. */
  icon?: string;
  /** Right-aligned tally; rendered tabular so switching tabs cannot reflow the row. */
  count?: number;
}

/**
 * Hand-rolled tablist — deliberately not `@radix-ui/react-tabs`, which is
 * deleted in P4. Automatic activation: arrow keys move focus and select, which
 * is the WAI-ARIA pattern for tabs whose panels are already mounted.
 *
 * `.mb-tabs` is a horizontal scroller, so two things this component owns:
 * the active tab is scrolled into view whenever it changes (a value restored
 * from a URL can start off-screen), and each overflowing edge grows a 1.5px
 * navy hairline — the system's own rule vocabulary standing in for the
 * gradient fade invariant 24 forbids.
 *
 * `aria-controls` is not emitted: the panel is the caller's markup and this
 * component cannot know its id, and a dangling reference is worse than an
 * absent one. Callers that want the association add `aria-labelledby` to their
 * panel and an `id` to the matching tab via their own wrapper.
 *
 * `className` lands on the positioned wrapper; everything else (notably the
 * `aria-label` a tablist needs) is spread onto the tablist itself.
 */
export const MbTabs = ({
  value,
  onValueChange,
  items,
  urlKey,
  className = "",
  ...rest
}: {
  value: string;
  onValueChange: (value: string) => void;
  items: MbTabItem[];
  /** When set, the selected value is mirrored into this query parameter. */
  urlKey?: string;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "className" | "role">) => {
  const router = useRouter();
  const pathname = usePathname();
  const listRef = useRef<HTMLDivElement | null>(null);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const [edge, setEdge] = useState({ start: false, end: false });

  const activeIndex = items.findIndex((item) => item.value === value);

  const measure = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdge({ start: el.scrollLeft > 1, end: max > 1 && el.scrollLeft < max - 1 });
  }, []);

  useEffect(() => {
    measure();
    const el = listRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, items.length]);

  useEffect(() => {
    // `auto` behaviour, so this is instant under prefers-reduced-motion too.
    refs.current[activeIndex]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeIndex]);

  if (items.length === 0) return null;

  const rovingIndex = activeIndex === -1 ? 0 : activeIndex;

  const select = (next: string) => {
    onValueChange(next);
    if (!urlKey) return;
    const params = new URLSearchParams(window.location.search);
    params.set(urlKey, next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = items.length - 1;
    let next = -1;
    if (event.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === -1) return;
    event.preventDefault();
    refs.current[next]?.focus();
    select(items[next].value);
  };

  return (
    <div className={`relative min-w-0 ${className}`}>
      <div
        ref={listRef}
        className="mb-tabs"
        role="tablist"
        onScroll={measure}
        {...rest}
      >
        {items.map((item, index) => {
          const active = item.value === value;
          return (
            <button
              key={item.value}
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="button"
              role="tab"
              className="mb-tab tabular-nums"
              data-active={active}
              aria-selected={active}
              tabIndex={index === rovingIndex ? 0 : -1}
              onClick={() => select(item.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {item.icon && <MbIcon id={item.icon} size={14} className="shrink-0" />}
              {item.label}
              {item.count !== undefined && (
                <span className="text-[0.72rem] font-normal tabular-nums text-mb-ink-muted">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {edge.start && (
        <span
          aria-hidden="true"
          className="mb-rule-vertical pointer-events-none absolute inset-y-0 left-0"
        />
      )}
      {edge.end && (
        <span
          aria-hidden="true"
          className="mb-rule-vertical pointer-events-none absolute inset-y-0 right-0"
        />
      )}
    </div>
  );
};
