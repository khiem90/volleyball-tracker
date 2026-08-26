"use client";

import { memo } from "react";
import type { GameMode, RotationNumber } from "@/lib/volleyball/types";
import { MbIconButton } from "@/components/matchbook/IconButton";
import { MbSegmented } from "@/components/matchbook/Segmented";
import { MbToggle, MbToggleChip } from "@/components/matchbook/form";

/* ===========================================================================
   THE CONTROL RAIL

   Everything here is a canonical primitive so the touch floors come from the
   kit's own control ladder, never from padding. The rotation strip is
   `MbSegmented`, not a stepper: six discrete named states a coach jumps
   between directly, with the prev/next keys kept beside it for the
   sequential read.
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
        {/* Hidden below `sm`: two extra 44px keys on a narrow line would push
            the six cells that ARE the control under the touch floor; arrow
            keys still work through the radiogroup. The `hidden` must sit on a
            WRAPPER — `.mb-btn` sets `display:inline-flex` from unlayered CSS
            and outranks any Tailwind display utility on the button itself. */}
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
 * Libero, overlaps and arrows — the things that change what is DRAWN rather
 * than which frame is drawn. They sit BELOW the court: anything between the
 * masthead and the diagram is height the court does not get on a phone, and
 * a reader should see each toggle's effect without scrolling back up.
 *
 * A GRID, not a flex row: `.mb-btn` is unlayered CSS, so a `min-w-*` utility
 * on the chip cannot floor it and force a wrap — the grid does it from the
 * outside, the one place a Tailwind class still wins.
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
  /* LIBERO IS A SWITCH, THE OTHER TWO ARE CHIPS.
     Libero changes WHO IS ON THE COURT — a fact about the formation —
     while Overlaps and Arrows change what is DRAWN over it. A filled navy bar
     for each of the three made the display options the heaviest ink in a panel
     whose subject is the diagram above them; a switch row is a setting, and
     it reads like one.

     The rung stays `md` (48px) on the chips: at `sm` (44px) the last chip
     sits ~6px above the fixed bottom bar's nav row, and a 4px rung is not
     worth a mis-tap between a page control and a nav control. */
  <div className="border-t border-mb-rule">
    <div className="border-b border-mb-rule px-3 py-1.5">
      <MbToggle
        checked={liberoActive}
        onChange={onLiberoToggle}
        label="Libero"
        /* 35 characters — short enough to read as a label, not prose. */
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
     0.05em on this very screen four times over; a second 0.95rem/700 at a
     different tracking is a tracking collision. */
  <dl className="grid grid-cols-2 border-t border-mb-rule">
    <div className="border-r border-mb-rule px-4 py-2">
      <dt className="mb-kicker">Setter</dt>
      <dd className="matchbook-display text-[0.95rem] mb-track-title font-bold">
        {setterRow} Row
      </dd>
    </div>
    <div className="px-4 py-2">
      <dt className="mb-kicker">Front-Row Attackers</dt>
      <dd className="matchbook-display text-[0.95rem] mb-track-title font-bold tabular-nums">
        {frontRowAttackers}
      </dd>
    </div>
  </dl>
);
