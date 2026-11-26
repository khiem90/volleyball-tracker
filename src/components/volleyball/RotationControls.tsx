"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/shared/Chip";
import { Icon } from "@/components/shared/Icon";
import type { RotationNumber, GameMode } from "@/lib/volleyball/types";
import { isSetterFrontRow, getFrontRowAttackerCount } from "@/lib/volleyball/rotations";
import { toggleClass } from "./styles";

type RotationControlsProps = {
  rotation: RotationNumber;
  mode: GameMode;
  liberoActive: boolean;
  showOverlaps: boolean;
  showArrows: boolean;
  onRotationChange: (r: RotationNumber) => void;
  onModeChange: (m: GameMode) => void;
  onLiberoToggle: (active: boolean) => void;
  onShowOverlapsToggle: (show: boolean) => void;
  onShowArrowsToggle: (show: boolean) => void;
  onNext: () => void;
  onPrev: () => void;
};

/** One half of the Serving and Receiving switch. */
const modeClass = (on: boolean): string =>
  `min-h-11 rounded-chip px-4 text-label font-semibold transition-colors ${
    on ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
  }`;

export const RotationControls = memo(
  ({
    rotation,
    mode,
    liberoActive,
    showOverlaps,
    showArrows,
    onRotationChange,
    onModeChange,
    onLiberoToggle,
    onShowOverlapsToggle,
    onShowArrowsToggle,
    onNext,
    onPrev,
  }: RotationControlsProps) => {
    const setterPosition = isSetterFrontRow(rotation) ? "Front Row" : "Back Row";
    const attackerCount = getFrontRowAttackerCount(rotation);

    return (
      <div className="flex flex-col gap-4">
        {/* Rotation Stepper. On a phone the six rotations take a row of their own. */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={onPrev}
            aria-label="Previous rotation"
          >
            <Icon id="chevron-left" size={20} />
          </Button>

          <div className="order-first flex w-full items-center justify-center gap-1.5 sm:order-none sm:w-auto">
            {([1, 2, 3, 4, 5, 6] as RotationNumber[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onRotationChange(r)}
                className={`size-11 rounded-full text-title font-bold tabular-nums transition-colors ${
                  rotation === r
                    ? "bg-ink text-white"
                    : "bg-fill text-ink hover:bg-ink/10"
                }`}
                aria-label={`Rotation ${r}`}
                aria-pressed={rotation === r}
              >
                {r}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={onNext}
            aria-label="Next rotation"
          >
            <Icon id="chevron-right" size={20} />
          </Button>
        </div>

        {/* Status chips */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Chip>
            <span className="font-medium text-ink-soft">Setter:</span>
            {setterPosition}
          </Chip>
          <Chip>
            <span className="font-medium text-ink-soft">Attackers:</span>
            {attackerCount} Front
          </Chip>
        </div>

        {/* Toggle Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* Serving/Receiving Toggle */}
          <div className="flex rounded-tile bg-fill p-1">
            <button
              type="button"
              onClick={() => onModeChange("serving")}
              className={modeClass(mode === "serving")}
              aria-pressed={mode === "serving"}
            >
              Serving
            </button>
            <button
              type="button"
              onClick={() => onModeChange("receiving")}
              className={modeClass(mode === "receiving")}
              aria-pressed={mode === "receiving"}
            >
              Receiving
            </button>
          </div>

          {/* Libero Toggle */}
          <button
            type="button"
            onClick={() => onLiberoToggle(!liberoActive)}
            className={`${toggleClass(liberoActive)} px-4`}
            aria-pressed={liberoActive}
          >
            Libero {liberoActive ? "ON" : "OFF"}
          </button>
        </div>

        {/* Visibility Toggles */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* Overlap Lines Toggle */}
          <button
            type="button"
            onClick={() => onShowOverlapsToggle(!showOverlaps)}
            className={toggleClass(showOverlaps)}
            aria-pressed={showOverlaps}
          >
            <Icon id={showOverlaps ? "eye" : "eye-off"} size={14} />
            Overlaps
          </button>

          {/* Movement Arrows Toggle */}
          <button
            type="button"
            onClick={() => onShowArrowsToggle(!showArrows)}
            className={toggleClass(showArrows)}
            aria-pressed={showArrows}
          >
            <Icon id="swap" size={14} />
            Arrows
          </button>
        </div>
      </div>
    );
  }
);
RotationControls.displayName = "RotationControls";
