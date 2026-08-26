"use client";

import { memo } from "react";
import { MbButton } from "@/components/matchbook/Button";
import {
  MbDialog,
  MbDialogBody,
  MbDialogFooter,
} from "@/components/matchbook/Dialog";

/* ===========================================================================
   ROTATE TO ENTER COURT VIEW

   A static line drawing, deliberately not animated: infinite animation is
   reserved for `.mb-live-dot` alone, and a looping element on a modal is a
   vestibular hazard. Every stroke is `currentColor` or a `--mb-*` token —
   the no-literal-colours rule counts colours inside SVG.
   =========================================================================== */

const RotateDiagram = () => (
  <svg
    viewBox="0 0 160 76"
    role="img"
    aria-label="A portrait phone turning to landscape"
    className="h-[76px] w-full max-w-[220px] text-mb-navy"
    fill="none"
  >
    {/* Portrait */}
    <rect
      x="8.5"
      y="8.5"
      width="38"
      height="59"
      rx="3"
      stroke="currentColor"
      strokeWidth="3"
    />
    <line x1="20" y1="16" x2="35" y2="16" stroke="currentColor" strokeWidth="3" />

    {/* The turn — navy, like the rest of the pictogram: coral would spend the
        accent on an illustration. The curve and the arrowhead are the
        emphasis; an instruction drawing in an almanac is ruled in ink. */}
    <path
      d="M62 26c12-9 24-9 36 0"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <path
      d="M92 20l7 6-8 5"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Landscape — the same phone, turned. Its earpiece is now on the short
        edge, which is the whole point of the drawing. */}
    <rect
      x="93.5"
      y="18.5"
      width="59"
      height="38"
      rx="3"
      stroke="currentColor"
      strokeWidth="3"
    />
    <line x1="145" y1="30" x2="145" y2="45" stroke="currentColor" strokeWidth="3" />
  </svg>
);

type RotateDeviceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const RotateDeviceDialog = memo(function RotateDeviceDialog({
  open,
  onOpenChange,
}: RotateDeviceDialogProps) {
  return (
    <MbDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Turn the device sideways"
      icon="expand"
      description="Court View is landscape only — it gives the score the full width of the screen and keeps the display awake."
      size="sm"
    >
      <MbDialogBody>
        <div className="flex flex-col items-center gap-3 py-2">
          <RotateDiagram />
          <p className="text-center text-[0.85rem] leading-[1.5] text-mb-ink-muted">
            Rotate to landscape, then tap Court View again. Scoring keeps working
            here in the meantime.
          </p>
        </div>
      </MbDialogBody>

      <MbDialogFooter>
        <MbButton variant="coral" onClick={() => onOpenChange(false)}>
          Got it
        </MbButton>
      </MbDialogFooter>
    </MbDialog>
  );
});
