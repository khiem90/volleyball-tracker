"use client";

/* ===========================================================================
   THE UNDO STRIP — SKIN ONLY (charter H9, W2 / P2b)

   H9 is explicit: `pushUndo` / `performUndo` / `clearUndo`, `MAX_UNDO_STACK_SIZE`,
   the Ctrl+Z listener and the three-step restore order are byte-identical after
   this change. All of that lives in `GlobalUndoToast.tsx`; none of it lives
   here. This file is presentation, and only presentation, and it kept its
   `UndoToastProps` contract from `@/types/undo` unchanged so `GlobalUndoToast`
   calls it with the same five props it always did.

   What actually changed, and why each was a defect rather than a preference:

     framer-motion    banned on converted screens (design language §9). The
                      spring — `stiffness: 400, damping: 30` — was also an
                      overshoot, which invariant 41 forbids outright, and it
                      scaled the strip 0.95 → 1, which invariant 43's sibling
                      rule keeps off editorial surfaces. `.mb-toast`'s own
                      `mb-enter` keyframe replaces it: opacity + translateY,
                      token-timed, cancelled under prefers-reduced-motion.
     lucide-react     banned (invariant 17). Four glyphs → sprite ids.
     shadcn <Button>  banned (invariant 19). Two of them → `MbButton` /
                      `MbIconButton`, which is also what fixes the hit area:
                      `size="sm"` on the shadcn button rendered a 32px-tall
                      control and `size="icon-sm"` a 32 x 32 one, both under
                      the 44px floor that invariant 33 hard-fails.
     rounded-xl       radius 12px, outside the 4/3/2 vocabulary (invariant 24).
     backdrop-blur-md banned (invariant 24).
     bg-card/95,      pre-Matchbook tokens (invariant 51). The strip now paints
     text-primary,    from `.mb-toast`, so it is the same object as every other
     border-border    toast in the system rather than a lookalike.

   The hand-rolled `onKeyDown` for Enter and Space is gone too. Both buttons
   were already native `<button>`s, so the browser was firing `click` for both
   keys and the handler was calling `handleUndo` a second time on Enter. It was
   dead weight at best and a double-undo at worst.
   =========================================================================== */

import { memo } from "react";
import { MbToast } from "@/components/matchbook/Toast";
import type { UndoToastProps } from "@/types/undo";

export const UndoToast = memo(
  ({
    entry,
    additionalUndos,
    onUndo,
    onDismiss,
    isUndoing = false,
  }: UndoToastProps) => {
    if (!entry) return null;

    const handleUndo = () => {
      if (!isUndoing) {
        onUndo();
      }
    };

    // Show "Undo (N more)" when there are additional undos available
    const undoButtonText =
      additionalUndos > 0 ? `Undo (${additionalUndos} more)` : "Undo";

    return (
      <MbToast
        /* `success` because the message is a completed action — "Surge won" —
           and the strip's job is to confirm it happened and offer the way
           back. The tone rides the 4px left rule and the check glyph; the
           sentence itself stays navy. */
        tone="success"
        message={entry.description}
        action={{
          label: undoButtonText,
          onClick: handleUndo,
          icon: "undo",
          /* `loading` rather than `disabled`: it keeps the control focusable
             and keeps its label while blocking activation, so a keyboard user
             mid-undo is not thrown out of the tab order. */
          loading: isUndoing,
          ariaLabel: `Undo action${
            additionalUndos > 0 ? `, ${additionalUndos} more available` : ""
          }`,
        }}
        onDismiss={onDismiss}
        dismissLabel="Dismiss notification and clear undo history"
      />
    );
  }
);

UndoToast.displayName = "UndoToast";
