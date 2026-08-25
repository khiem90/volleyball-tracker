"use client";

import { useCallback, useRef } from "react";
import { dismissToast, toast } from "@/components/matchbook/Toast";
import type { MbScorePoint } from "@/hooks/useScoreHistory";

/* ===========================================================================
   THE SPOKEN HALF OF A POINT ROLLBACK (C16)

   Both consoles score optimistically and both undo through `useScoreHistory`,
   and until now the ONLY evidence an undo landed was the numeral itself: the
   figure cross-fades and flashes its bottom edge (`MbScoreNumeral` +
   `ScoreSide`'s render-derived direction — no new animation vocabulary, that
   flash IS the acknowledgment's visual half). This adds the verbal half — one
   strip naming what reverted and the score that is now true, "Point removed —
   14–12" — so the event survives a blink, a glance away, and a screen reader,
   which hears the aria-live score change but not WHY it went down.

   Two deliberate choices, both measured against the console it serves:

   RAIL, NOT FLOAT. `MbToastSlot`'s own docblock: on a scoring console the
   bottom third is the tap target, and the float column is a fixed
   `pointer-events-auto` strip sitting exactly over the action bar — measured
   at 390x844 the float strip covers the bar's Undo and End Match for the
   toast's whole life. An acknowledgment that blocks the very key that raised
   it (and every rapid double-undo) is worse than none. The rail is clear of
   both thumbs and both columns.

   ONE STRIP, UPDATED. A second undo retracts the first strip before speaking
   (`toast()` returns the id; there is no exit animation, so the swap is an
   instant text change). Without this, five rapid undos stack three strips and
   evict the oldest mid-read — noise, and a taller pile than the corner holds.

   Direction is derived from the totals: adjacent stack entries differ by
   exactly one point on one side (`bump` clamps at 0 and refuses duplicates),
   so a lower total is a removed point and a higher one is a restored point —
   undoing a `−1` correction puts the point BACK, and calling that "removed"
   would be lying by one.

   Reduced motion: the strip's entrance keyframe and the numeral's cross-fade
   are both already collapsed by the global clamp in `globals.css`; nothing
   here adds a duration, so reduced-motion yields the end state instantly.
   =========================================================================== */

export const useScoreRollbackToast = (): ((
  previous: MbScorePoint,
  target: MbScorePoint
) => void) => {
  const lastId = useRef<string | null>(null);

  return useCallback((previous, target) => {
    const removed = previous.home + previous.away > target.home + target.away;
    if (lastId.current) dismissToast(lastId.current);
    lastId.current = toast({
      tone: "info",
      icon: "undo",
      slot: "rail",
      message: `${removed ? "Point removed" : "Point restored"} — ${target.home}–${target.away}`,
    });
  }, []);
};
