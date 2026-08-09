"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useState, type ReactNode } from "react";
import { MbIcon } from "./MbIcon";

/** Heights as a fraction of the viewport; anything outside 0..1 is discarded. */
const usableSnaps = (points?: number[]) => (points ?? []).filter((p) => p > 0 && p <= 1);

/**
 * Mounted only while the sheet is open — Radix unmounts the portal on close, so
 * the snap index resets on its own and no effect is needed to reset it.
 */
const SheetFrame = ({
  title,
  points,
  children,
}: {
  title: string;
  points: number[];
  children: ReactNode;
}) => {
  const [snap, setSnap] = useState(0);

  const index = Math.min(snap, Math.max(points.length - 1, 0));
  const height = points.length > 0 ? `${(points[index] * 100).toFixed(2)}dvh` : undefined;
  const stepped = points.length > 1;
  const expanded = stepped && index === points.length - 1;

  return (
    <DialogPrimitive.Content
      aria-describedby={undefined}
      style={height ? { height } : undefined}
      /* `.mb-sheet` already pads for the home indicator, so a footer inside it
         must not add the inset a second time. */
      className="mb-sheet pointer-events-auto w-full outline-none [&>.mb-dialog-foot]:pb-3 sm:mx-auto sm:w-[34rem] sm:max-w-[calc(100vw-2rem)]"
    >
      <header className="mb-dialog-head">
        <DialogPrimitive.Title className="matchbook-display min-w-0 truncate text-[0.95rem] font-bold tracking-[0.05em]">
          {title}
        </DialogPrimitive.Title>
        <div className="-my-2 -mr-2 flex shrink-0 items-center">
          {stepped && (
            <button
              type="button"
              className="mb-btn-touch inline-flex items-center justify-center rounded-[3px] transition-colors hover:bg-[var(--mb-tint-2)]"
              onClick={() => setSnap(expanded ? 0 : index + 1)}
              title={expanded ? "Collapse sheet" : "Expand sheet"}
              aria-label={expanded ? "Collapse sheet" : "Expand sheet"}
              aria-expanded={expanded}
            >
              <MbIcon id={expanded ? "collapse" : "expand"} size={18} />
            </button>
          )}
          <DialogPrimitive.Close
            className="mb-btn-touch inline-flex items-center justify-center rounded-[3px] transition-colors hover:bg-[var(--mb-tint-2)]"
            title="Close"
            aria-label="Close"
          >
            <MbIcon id="close" size={18} />
          </DialogPrimitive.Close>
        </div>
      </header>
      {children}
    </DialogPrimitive.Content>
  );
};

/**
 * Bottom sheet. Drag-to-expand is deferred (charter §2.3): `snapPoints` are
 * discrete heights cycled by a real 44px button, so the affordance survives
 * without a pointer and without a gesture nobody can discover.
 *
 * `side` is typed to its one shipped value. A left/right rail needs a different
 * radius and a different entrance, both of which live in `globals.css`; a
 * compile error is the correct way for a caller to discover that.
 *
 * Content supplies its own scroll region — wrap it in `MbDialogBody`, and use
 * `MbDialogFooter` if it needs a pinned action row.
 */
export const MbSheet = ({
  open,
  onOpenChange,
  title,
  side = "bottom",
  snapPoints,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  side?: "bottom";
  /** Discrete heights, 0..1 of the viewport. Opens at the first one. */
  snapPoints?: number[];
  children: ReactNode;
}) => (
  <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="mb-dialog-overlay z-50" />
      <div
        className="pointer-events-none fixed inset-0 z-50 flex flex-col justify-end"
        data-side={side}
      >
        <SheetFrame title={title} points={usableSnaps(snapPoints)}>
          {children}
        </SheetFrame>
      </div>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
);
