"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { MbIcon } from "./MbIcon";

/* ===========================================================================
   THE TABLE SCROLLER, WITH ITS EDGE CUE

   Only `.mb-table` wrappers, the bracket rail and the tool rail scroll
   horizontally, EACH WITH A VISIBLE EDGE CUE. Without the cue a phone-width
   table can hide most of its own columns and nothing on the screen says so: the
   header row ended at "Pts" with a clean panel border beside it, which reads as
   the end of the table rather than the edge of a window onto it.

   ------------------------------------------------- why a caption, not a rule

   `MbTabs` cues its overflow with a `.mb-rule-vertical` hairline at the cut
   edge, and that was the first thing tried here. It fails twice on a table:

     1. These scrollers run flush to the panel's own 1.5px navy border, so the
        hairline paints exactly on top of it and adds no pixel.
     2. Absolutely positioning it requires `position: relative` on the wrapper,
        and a positioned wrapper LATER IN THE DOM than the panel head paints
        over the head link's `::before` hit expander. Measured with the
        hairlines in place: `audit.mjs --desktop` reported "View Full Table",
        "View All Teams" and "View Full Standings" back at 98.3x17.3 — three
        44px rescues lost to a decoration that was invisible anyway.

   So the cue is a caption under the table, in the system's own `mb-kicker`
   micro-caps with a chevron pointing at the side that still has content. It is
   a rule and a letterform, not a gradient fade: gradients are banned
   outright (so no mask or shadow), and hover-only affordances are banned
   (so it is always painted). Nothing in this component is positioned.

   The caption appears only when an edge is genuinely overflowing, so a table
   that fits — every one of these at 1440 — carries no furniture at all.

   ------------------------------------------------------------- keyboard

   No `tabIndex` on the scroller. Chromium gives a scroll container its own tab
   stop when it holds no focusable descendant (the standings table), and where
   there ARE focusable descendants (the directory's row buttons) scrolling
   follows focus. Forcing `tabindex="0"` onto a `<div>` would trade a solved
   problem for an `a11y not-native` failure in the sweep.

   ------------------------------------ what this scroller does NOT clip (R2)

   `overflow-x: auto` clips only the descendants for which this box is in the
   CONTAINING-BLOCK chain. An absolutely positioned descendant's containing
   block is its nearest POSITIONED ancestor, and nothing here is positioned — so
   an abspos box inside the table is laid out against a panel column OUTSIDE
   this scroller and is not clipped by it at all. It keeps its static position,
   which for anything past the fold of a scrolled table is off the right of the
   viewport, and that widens the DOCUMENT.

   That is not hypothetical. It is what shipped: Tailwind's `.sr-only` is
   `position: absolute` with no inset, `FormLetters` puts one in the last cell
   of every directory row, and the result was `documentElement.scrollWidth` 420
   against a 390 viewport with the bottom nav dragged off-screen behind it. The
   full mechanism is in globals.css under THE ESCAPED LABEL.

   The guard is there and not here, and that is deliberate, because the obvious
   fix here is worse than the bug. Making this box a containing block means
   `position: relative` (or `contain: paint`, which also creates a stacking
   context), and a positioned wrapper LATER IN THE DOM than the panel head
   paints over the head link's `::before` hit expander. Measured on `/` at 1440,
   probing every `.mb-panel-link` with `elementFromPoint` down its own column,
   real hit height with `position: relative` added to this wrapper:

     View Full Table        46px -> 43px   (under the 44px floor: LOST)
     View All Courts        47px -> 47px
     View Full Bracket      47px -> 47px

   One rescue lost to a containing block nobody can see, to fix something that
   is fixed properly one declaration earlier. So: NOTHING IN THIS COMPONENT IS
   POSITIONED, and anything absolutely positioned inside a `.mb-table` must
   carry a definite inline inset of its own.
   =========================================================================== */

export interface MbTableScrollProps {
  /**
   * The word in the caption — "columns" for a table, whatever the rail is
   * elsewhere. It is the reader's word, so it is the caller's.
   */
  unit?: string;
  children: ReactNode;
}

export const MbTableScroll = ({ unit = "columns", children }: MbTableScrollProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [edge, setEdge] = useState({ start: false, end: false });

  /**
   * One measurement, three triggers: mount, resize (the panel is a grid cell
   * whose width changes at every rung) and the scroller's own scroll. State is
   * written unconditionally — React bails out of an identical render itself,
   * and comparing here would only move the same check earlier.
   */
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdge({ start: el.scrollLeft > 1, end: max > 1 && el.scrollLeft < max - 1 });
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    /* The scroller AND its content: a table that gains a row does not change
       the wrapper's box, but a table that gains a column does — and the
       directory is filtered live on `/teams`, so neither the row set nor the
       widest cell is static. */
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [measure, children]);

  const cut = edge.start || edge.end;

  return (
    <>
      <div ref={ref} className="min-w-0 overflow-x-auto" onScroll={measure}>
        {children}
      </div>

      {cut && (
        <p className="mb-kicker flex items-center justify-center gap-1.5 border-t border-mb-rule py-1.5">
          {edge.start && <MbIcon id="chevron-left" size={10} className="shrink-0" />}
          More {unit}
          {edge.end && <MbIcon id="chevron-right" size={10} className="shrink-0" />}
        </p>
      )}
    </>
  );
};
