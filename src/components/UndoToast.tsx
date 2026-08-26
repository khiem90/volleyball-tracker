"use client";

/* ===========================================================================
   THE UNDO STRIP — SKIN ONLY

   The undo machinery (`pushUndo` / `performUndo` / `clearUndo`,
   `MAX_UNDO_STACK_SIZE`, the Ctrl+Z listener, the restore order) lives in
   `GlobalUndoToast.tsx`; none of it lives here. This file is presentation
   only, keeping the `UndoToastProps` contract from `@/types/undo` unchanged.

   Do not add an `onKeyDown` for Enter/Space: both buttons are native
   `<button>`s, so the browser already fires `click` for both keys and a
   handler double-fires the undo on Enter.
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
