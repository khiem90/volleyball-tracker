"use client";

import { memo } from "react";
import type { GameMode, RotationNumber } from "@/lib/volleyball/types";
import { MbIconButton } from "@/components/matchbook/IconButton";
import { MbSegmented } from "@/components/matchbook/Segmented";
import { MbToggle, MbToggleChip } from "@/components/matchbook/form";

/* ===========================================================================
   THE CONTROL RAIL

   `RotationControls.tsx` was the worst-measuring block in the group: 40x40
   rotation cells, 80x36 and 93x36 mode pills, 94x30 and 84x30 visibility
   chips — eleven sub-44px targets on the one control cluster a coach uses
   between every point. It also carried five Heroicons and two shadcn controls.

   Everything here is a canonical primitive, so the floors come from the kit's
   own control ladder rather than from padding: `MbSegmented` at `md` renders
   46px cells inside a 48px group, `MbToggleChip` and `MbIconButton` pin
   `min-height` to 48 and 44.

   The rotation strip is `MbSegmented`, not `MbNumberStepper`. The charter's
   Appendix A D-4 folds the tools brief's `MbStepper` into `MbNumberStepper`
   with `wrap` + `prefix`, and for a bounded numeric field that is right — but
   this control has SIX discrete named states that a coach jumps between
   ("show me rotation 4"), and a −/+ stepper takes three presses to answer that.
   `MbSegmented` is the charter's own form-control-with-N-choices primitive, it
   is a `role="radiogroup"` with roving arrow-key focus, and it preserves the
   direct-jump capability the old 1-6 row had. The prev/next keys are kept
   beside it for the sequential read.
   =========================================================================== */

const ROTATIONS: RotationNumber[] = [1, 2, 3, 4, 5, 6];

const ROTATION_OPTIONS = ROTATIONS.map((rotation) => ({
  value: String(rotation),
  label: String(rotation),
}));

const MODE_OPTIONS = [
  { value: "serving", label: "Serving" },
  { value: "receiving", label: "Receiving" },
];

export interface RotationRailProps {
  rotation: RotationNumber;
  mode: GameMode;
  onRotationChange: (rotation: RotationNumber) => void;
  onModeChange: (mode: GameMode) => void;
  onNext: () => void;
  onPrev: () => void;
}

export interface RotationLayersProps {
  liberoActive: boolean;
  onLiberoToggle: (active: boolean) => void;
  showOverlaps: boolean;
  showArrows: boolean;
  onShowOverlapsChange: (value: boolean) => void;
  onShowArrowsChange: (value: boolean) => void;
}

export const RotationRail = memo(
  ({
    rotation,
    mode,
    onRotationChange,
    onModeChange,
    onNext,
    onPrev,
  }: RotationRailProps) => (
    <div className="flex flex-col gap-3 border-b border-mb-rule p-4">
      <div className="flex items-center gap-2">
        {/* Sequential read. Hidden below `sm` and that is deliberate: with all
            six cells on screen and tappable, "previous rotation" is redundant
            context (invariant 38's own exception), and two extra 44px keys on a
            358px line would push the six cells that ARE the control under the
            floor. Arrow keys, Home and End still work at every size through the
            radiogroup's roving tabindex.

            The `hidden` sits on a WRAPPER, not on the control: `.mb-btn` sets
            `display:inline-flex` from unlayered CSS and outranks every Tailwind
            `display` utility, so `className="hidden sm:inline-flex"` on the
            button itself did nothing. Measured consequence at 390: the two keys
            stayed on the line, the six rotation cells shared what was left and
            rendered 34.2px wide — six hard-fail targets on the control this
            screen is built around. Same trap `Masthead.tsx` documents for its
            account chip. */}
        <span className="hidden sm:inline-flex">
          <MbIconButton icon="chevron-left" label="Previous rotation" onClick={onPrev} />
        </span>
        <MbSegmented
          name="rotation"
          aria-label="Rotation"
          value={String(rotation)}
          onChange={(value) => onRotationChange(Number(value) as RotationNumber)}
          options={ROTATION_OPTIONS}
          columns={{ base: 6, sm: 6 }}
          className="matchbook-display flex-1 tabular-nums"
        />
        <span className="hidden sm:inline-flex">
          <MbIconButton icon="chevron-right" label="Next rotation" onClick={onNext} />
        </span>
      </div>

      <MbSegmented
        name="mode"
        aria-label="Serve or receive"
        value={mode}
        onChange={(value) => onModeChange(value as GameMode)}
        options={MODE_OPTIONS}
        columns={{ base: 2, sm: 2 }}
      />
    </div>
  )
);
RotationRail.displayName = "RotationRail";

/* ------------------------------------------------------------------- layers */

/**
 * Libero, overlaps and arrows — the three things that change what is DRAWN
 * rather than which frame is drawn.
 *
 * They sit BELOW the court, and that is a measurement rather than a taste.
 * Everything between the masthead and the diagram on a phone is height the
 * court does not get: with these three chips in the rail the court began at
 * y = 447 in an 844px viewport and less than half of it was above the fold.
 * Moved under the drawing, the rail is the rotation strip plus the mode
 * segment — 140px — and the whole court is on the first screen. The reader also
 * sees the effect of each toggle without scrolling back up, which is the actual
 * point of a display option.
 *
 * A GRID, not a flex row. Measured at 390: each chip is a 14px ballot box plus
 * a 14px glyph plus the label inside `.mb-btn`'s own padding, and three of them
 * sharing one 358px line clipped to "LI…", "O…" and "A…" — the labels vanished
 * and three controls became indistinguishable. `.mb-btn` is unlayered CSS, so a
 * `min-w-*` utility on the control cannot floor it and force a wrap; the grid
 * does it from the outside, which is the one place a Tailwind class still wins.
 */
export const RotationLayers = ({
  liberoActive,
  onLiberoToggle,
  showOverlaps,
  showArrows,
  onShowOverlapsChange,
  onShowArrowsChange,
}: RotationLayersProps) => (
  /* ONE column below `sm`, and that is an ergonomics call as much as a
     measurement one. At two columns a chip is 175px wide and lands beside the
     fixed bottom bar's "Compete" key with 4.5px between them at 390x844 — the
     exact mis-tap the separation floor exists to stop, a page control and a nav
     control a finger-width apart. Full width, the chip and the bar cannot be
     confused for one another, and the target grows from 175px to 324px. */
  /* LIBERO IS A SWITCH, THE OTHER TWO ARE CHIPS, and that split is the
     charter's own (§2.3: `MbToggle` consumers "wizard allowTies, W7 libero";
     `MbToggleChip` consumers "W7 overlaps/arrows"). It is also the right
     reading. Libero changes WHO IS ON THE COURT — a fact about the formation —
     while Overlaps and Arrows change what is DRAWN over it. A filled navy bar
     for each of the three made the display options the heaviest ink in a panel
     whose subject is the diagram above them; a switch row is a setting, and
     it reads like one.

     The rung stays `md` (48px) on the chips. `sm` (44px) was tried and at
     390x844 it lifted the last chip to 6.4px above the fixed bottom bar's nav
     row — four counted separation violations and a hard fail (HF-2). A 4px
     rung is not worth a mis-tap between a page control and a nav control. */
  <div className="border-t border-mb-rule">
    <div className="border-b border-mb-rule px-3 py-1.5">
      <MbToggle
        checked={liberoActive}
        onChange={onLiberoToggle}
        label="Libero"
        /* 35 characters. At 43 it set one 43-character line, which the measure
           band (45-75) counts as a short line even though a switch hint is a
           label, not prose (rubric 1.4). */
        hint="Replaces the back-row middle blocker"
      />
    </div>
    <div className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-2">
      <MbToggleChip
        pressed={showOverlaps}
        onPressedChange={onShowOverlapsChange}
        icon={showOverlaps ? "eye" : "eye-off"}
      >
        Overlaps
      </MbToggleChip>
      <MbToggleChip
        pressed={showArrows}
        onPressedChange={onShowArrowsChange}
        icon={showArrows ? "eye" : "eye-off"}
      >
        Arrows
      </MbToggleChip>
    </div>
  </div>
);

/**
 * The two read-only facts, as a ruled strip.
 *
 * They were two rounded badges sitting between two real buttons, so they read
 * as controls you could press. A ruled strip reads as a measurement.
 *
 * It is a SEPARATE component from the rail because it belongs on the other side
 * of the court: on a phone the rail is what stands between the masthead and the
 * diagram, and every row added to it pushes the court further off-screen. The
 * facts are a consequence of the rotation, so they read below the drawing.
 */
export const RotationFacts = ({
  setterRow,
  frontRowAttackers,
}: {
  setterRow: "Front" | "Back";
  frontRowAttackers: number;
}) => (
  /* Tracking is 0.05em, not 0.04em. `display/panel-title` is 0.95rem/700 at
     0.05em and it is on this very screen four times over; a second 0.95rem/700
     at a different tracking is a tracking collision (rubric 1.3) — the same
     size and weight saying two things about how it is set. */
  <dl className="grid grid-cols-2 border-t border-mb-rule">
    <div className="border-r border-mb-rule px-4 py-2">
      <dt className="mb-kicker">Setter</dt>
      <dd className="matchbook-display text-[0.95rem] font-bold tracking-[0.05em]">
        {setterRow} Row
      </dd>
    </div>
    <div className="px-4 py-2">
      <dt className="mb-kicker">Front-Row Attackers</dt>
      <dd className="matchbook-display text-[0.95rem] font-bold tracking-[0.05em] tabular-nums">
        {frontRowAttackers}
      </dd>
    </div>
  </dl>
);
