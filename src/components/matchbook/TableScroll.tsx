"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { MbIcon } from "./MbIcon";

/* ===========================================================================
   THE TABLE SCROLLER, WITH ITS EDGE CUE

   Charter invariant 32: "Only `.mb-table` wrappers, the bracket rail and the
   tool rail scroll horizontally, EACH WITH A VISIBLE EDGE CUE." Every shipped
   `.mb-table` had the scroller and none of them had the cue. Measured at 390px:

     /        standings table   lost  67px of 356 — the Form column
     /teams   directory table   lost 238px of 356 — Next Match and Status
                                are entirely off-screen, Pts is cut mid-figure

   238px is 67% of the panel's own width. Nothing on the screen said so: the
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
   a rule and a letterform, not a gradient fade: invariant 24 bans gradients
   outright, which is why neither a mask nor a shadow is used, and invariant 36
   bans hover-only affordances, which is why it is always painted rather than
   revealed on hover. Nothing in this component is positioned.

   The caption appears only when an edge is genuinely overflowing, so a table
   that fits — every one of these at 1440 — carries no furniture at all.

   ------------------------------------------------------------- keyboard

   No `tabIndex` on the scroller. Chromium gives a scroll container its own tab
   stop when it holds no focusable descendant (the standings table), and where
   there ARE focusable descendants (the directory's row buttons) scrolling
   follows focus. Forcing `tabindex="0"` onto a `<div>` would trade a solved
   problem for an `a11y not-native` failure in the sweep.
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
