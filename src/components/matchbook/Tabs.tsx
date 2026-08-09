"use client";

import { useRef } from "react";
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
 * `aria-controls` is not emitted: the panel is the caller's markup and this
 * component cannot know its id, and a dangling reference is worse than an
 * absent one. Callers that want the association add `aria-labelledby` to their
 * panel and an `id` to the matching tab via their own wrapper.
 */
export const MbTabs = ({
  value,
  onValueChange,
  items,
  urlKey,
  className = "",
}: {
  value: string;
  onValueChange: (value: string) => void;
  items: MbTabItem[];
  /** When set, the selected value is mirrored into this query parameter. */
  urlKey?: string;
  className?: string;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  if (items.length === 0) return null;

  const activeIndex = items.findIndex((item) => item.value === value);
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
    <div className={`mb-tabs ${className}`} role="tablist">
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
            className="mb-tab"
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
  );
};
