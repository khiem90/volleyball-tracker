"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useEffect, useState, type ReactNode } from "react";
import { MbIcon } from "./MbIcon";

/**
 * Bottom sheet. Drag-to-expand is deferred (charter §2.3): `snapPoints` are
 * discrete heights as a fraction of the viewport, cycled by a real 44px button
 * so the affordance survives without a pointer.
 *
 * `side` is typed to its one shipped value; a left/right rail would need a
 * different radius, and `globals.css` is frozen outside W1's own passes.
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
}) => {
  const points = snapPoints?.filter((p) => p > 0 && p <= 1) ?? [];
  const [snap, setSnap] = useState(0);

  useEffect(() => {
    if (open) setSnap(0);
  }, [open]);

  const index = Math.min(snap, Math.max(points.length - 1, 0));
  const height = points.length > 0 ? `${(points[index] * 100).toFixed(2)}dvh` : undefined;
  const expanded = points.length > 1 && index === points.length - 1;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="mb-dialog-overlay z-50" />
        <div
          className="pointer-events-none fixed inset-0 z-50 flex flex-col justify-end"
          data-side={side}
        >
          <DialogPrimitive.Content
            aria-describedby={undefined}
            style={height ? { height } : undefined}
            className="mb-sheet pointer-events-auto w-full outline-none sm:mx-auto sm:w-[34rem] sm:max-w-[calc(100vw-2rem)]"
          >
            <header className="mb-dialog-head">
              <DialogPrimitive.Title className="matchbook-display min-w-0 truncate text-[0.95rem] font-bold tracking-[0.05em]">
                {title}
              </DialogPrimitive.Title>
              <div className="-my-2 -mr-2 flex shrink-0 items-center">
                {points.length > 1 && (
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
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
