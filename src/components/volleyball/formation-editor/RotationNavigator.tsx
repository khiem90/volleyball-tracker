"use client";

import { memo } from "react";
import type { RotationNumber, GameMode } from "@/lib/volleyball/types";

type RotationNavigatorProps = {
  currentRotation: RotationNumber;
  currentMode: GameMode;
  liberoActive: boolean;
  onRotationChange: (rotation: RotationNumber) => void;
  onModeChange: (mode: GameMode) => void;
  onLiberoChange: (active: boolean) => void;
};

const ROTATION_BUTTONS: RotationNumber[] = [1, 2, 3, 4, 5, 6];

export const RotationNavigator = memo(function RotationNavigator({
  currentRotation,
  currentMode,
  liberoActive,
  onRotationChange,
  onModeChange,
  onLiberoChange,
}: RotationNavigatorProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
        Rotation Navigator
      </h3>

      {/* Rotation Selector */}
      <div>
        <label className="block text-sm font-medium mb-1">Rotation</label>
        <div className="flex gap-1">
          {ROTATION_BUTTONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRotationChange(r)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                currentRotation === r
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent hover:bg-accent/80"
              }`}
            >
              R{r}
            </button>
          ))}
        </div>
      </div>

      {/* Mode Toggle */}
      <div>
        <label className="block text-sm font-medium mb-1">Mode</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onModeChange("serving")}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentMode === "serving"
                ? "bg-primary text-primary-foreground"
                : "bg-accent hover:bg-accent/80"
            }`}
          >
            Serving
          </button>
          <button
            type="button"
            onClick={() => onModeChange("receiving")}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentMode === "receiving"
                ? "bg-primary text-primary-foreground"
                : "bg-accent hover:bg-accent/80"
            }`}
          >
            Receiving
          </button>
        </div>
      </div>

      {/* Libero Toggle */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={liberoActive}
            onChange={(e) => onLiberoChange(e.target.checked)}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm font-medium">Show Libero</span>
        </label>
      </div>
    </div>
  );
});
