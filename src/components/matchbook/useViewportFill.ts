"use client";

import { useEffect, useRef } from "react";

/* ===========================================================================
   THE VIEWPORT-FILL COLUMN — the floor under every sticky `MbActionBar`

   A sticky bar only sticks INSIDE ITS OWN CONTAINING BLOCK, so on a page
   shorter than the viewport it has nothing to stick to and comes to rest
   wherever the content happens to end. Measured on an empty account at
   390x844 on wizard step 2 — a directory panel holding one empty state — the
   document was exactly 844px, the bar's bottom edge sat at y=637, and 207px
   of blank cream ran from there to the tab bar.

   The fix: the column that holds the bar publishes its own distance from the
   top of the document as `--mb-fill-top` and takes at least the rest of the
   viewport, so the bar reaches the bottom on a short page and behaves
   identically on a long one. Pair `MB_VIEWPORT_FILL` (the class) with
   `useMbViewportFill` (the measurement) on the same node, and give the bar
   `mt-auto` — the auto top margin is what sends the column's last child to
   the far end of that height instead of leaving it stacked under the content.
   On a page taller than the viewport the margin resolves to 0 and nothing
   moves.

   Extracted from `competitions/new/page.tsx` (where the measurements above
   were taken) so `/quick-match`'s commit bar is the same object rather than a
   second derivation — design language §8's "wizard-style commit goes in a
   bottom `MbActionBar`" now has one floor under it, not one per route.
   =========================================================================== */

/**
 * The column reaches the bottom of the viewport, whatever is in it.
 *
 * `<main>` is a plain block inside the shell's flex column and does not
 * stretch, so a page whose content is shorter than the screen ends early and
 * the sticky commit bar comes to rest mid-screen. The height needed is
 * `100svh − the bar's own bottom offset − the column's distance from the top
 * of the document`, and only the last term is unknowable in CSS: it is the
 * top strip, the main padding and the masthead, and it measured 149 / 145 /
 * 88px at 390 / 834 / 1440 on the wizard. Encoding those three numbers would
 * tie a route to the masthead's exact rendered height, which it does not own;
 * measuring the node is one layout read that cannot go stale.
 *
 * The fallback in the class (`9.5rem` = 152px) is what the first paint uses
 * before the effect runs — within 3px of the measured phone value, so there
 * is no settle to see.
 */
export const MB_VIEWPORT_FILL =
  "min-h-[calc(100svh_-_var(--mb-toast-offset,0px)_-_var(--mb-fill-top,9.5rem))]";

export const useMbViewportFill = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    /* The last value written. It is the loop guard as well as an optimisation:
       writing `min-height` changes the body's height, which wakes the observer
       below, and without this the two would drive each other. The top cannot
       change as a result of the write — `min-height` only ever moves the
       node's bottom edge — so a re-read that returns the same number ends the
       cycle in one pass. */
    let last = -1;
    const apply = () => {
      if (!node.isConnected) return;
      /**
       * The offsetParent chain, NOT `getBoundingClientRect`.
       *
       * `<main>` carries `.mb-enter`, whose keyframes open at
       * `translateY(10px)`, so a rect read taken while the route's entrance is
       * in flight is 10px too low — and it was, consistently, on the two
       * viewports whose animation had not finished by the time the font
       * promise resolved: the effect wrote 159px against a settled 149px at
       * 390 and 98px against 88px at 1440, leaving a 10px band of cream under
       * the bar. `offsetTop` is a layout position and no transform is in it.
       */
      let top = 0;
      for (
        let el: HTMLElement | null = node;
        el;
        el = el.offsetParent as HTMLElement | null
      )
        top += el.offsetTop;
      if (top === last) return;
      last = top;
      node.style.setProperty("--mb-fill-top", `${top}px`);
    };

    apply();
    /* Measuring once on mount is not enough, and the failure is measurable:
       the masthead is set in Oswald, and until the face loads it renders in
       the fallback at a different height. Measured on the tablet viewport, a
       mount-only read wrote 155px against a settled 145px — a 10px band of
       cream under the bar that nothing later corrected. The font promise
       covers the swap; the observer covers everything else (a masthead
       dateline that rewraps, a notice appearing above the grid). */
    void document.fonts?.ready.then(apply).catch(() => {});
    const observer = new ResizeObserver(apply);
    observer.observe(document.body);
    window.addEventListener("resize", apply);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, []);
  return ref;
};
