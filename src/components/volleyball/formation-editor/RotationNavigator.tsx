"use client";

import { memo } from "react";
import type { RotationNumber, GameMode } from "@/lib/volleyball/types";
import { toggleClass } from "../styles";
import { LABEL } from "@/components/shared/classes";

type RotationNavigatorProps = {
  currentRotation: RotationNumber;
  currentMode: GameMode;
  liberoActive: boolean;
  onRotationChange: (rotation: RotationNumber) => void;
  onModeChange: (mode: GameMode) => void;
  onLiberoChange: (active: boolean) => void;
};

const ROTATION_BUTTONS: RotationNumber[] = [1, 2, 3, 4, 5, 6];

const SUB_LABEL = `mb-1 block ${LABEL}`;

export const RotationNavigator = memo(function RotationNavigator({
  currentRotation,
  currentMode,
  liberoActive,
  onRotationChange,
  onModeChange,
  onLiberoChange,
}: RotationNavigatorProps) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className={LABEL}>Rotation Navigator</h3>

      {/* Rotation Selector */}
      <div>
        <label className={SUB_LABEL}>Rotation</label>
        <div className="flex gap-1">
          {ROTATION_BUTTONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRotationChange(r)}
              className={`${toggleClass(currentRotation === r)} flex-1 px-0 tabular-nums`}
              aria-pressed={currentRotation === r}
            >
              R{r}
            </button>
          ))}
        </div>
      </div>

      {/* Mode Toggle */}
      <div>
        <label className={SUB_LABEL}>Mode</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onModeChange("serving")}
            className={`${toggleClass(currentMode === "serving")} flex-1`}
            aria-pressed={currentMode === "serving"}
          >
            Serving
          </button>
          <button
            type="button"
            onClick={() => onModeChange("receiving")}
            className={`${toggleClass(currentMode === "receiving")} flex-1`}
            aria-pressed={currentMode === "receiving"}
          >
            Receiving
          </button>
        </div>
      </div>

      {/* Libero Toggle */}
      <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-label font-medium">
        <input
          type="checkbox"
          checked={liberoActive}
          onChange={(e) => onLiberoChange(e.target.checked)}
          className="field-check"
        />
        Show Libero
      </label>
    </div>
  );
});
