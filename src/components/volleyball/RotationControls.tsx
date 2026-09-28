"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import type { RotationNumber, GameMode } from "@/lib/volleyball/types";
import { isSetterFrontRow, getFrontRowAttackerCount } from "@/lib/volleyball/rotations";

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
      <div className="space-y-4">
        {/* Rotation Stepper. On a phone the six rotations take a row of their own. */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={onPrev}
            className="rounded-full"
            aria-label="Previous rotation"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </Button>

          <div className="order-first flex w-full items-center justify-center gap-1.5 sm:order-none sm:w-auto">
            {([1, 2, 3, 4, 5, 6] as RotationNumber[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onRotationChange(r)}
                className={`
                  w-11 h-11 rounded-full font-bold text-lg transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                  ${
                    rotation === r
                      ? "bg-primary text-primary-foreground shadow-lg scale-110"
                      : "bg-accent hover:bg-accent/80 text-foreground hover:scale-105"
                  }
                `}
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
            className="rounded-full"
            aria-label="Next rotation"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </Button>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1">
            <span className="text-muted-foreground">Setter:</span>
            <span className="font-semibold">{setterPosition}</span>
          </Badge>
          <Badge variant="secondary" className="gap-1.5 px-3 py-1">
            <span className="text-muted-foreground">Attackers:</span>
            <span className="font-semibold">{attackerCount} Front</span>
          </Badge>
        </div>

        {/* Toggle Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* Serving/Receiving Toggle */}
          <div className="flex rounded-xl border border-border p-1 bg-accent/30">
            <button
              type="button"
              onClick={() => onModeChange("serving")}
              className={`
                min-h-11 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
                ${
                  mode === "serving"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }
              `}
              aria-pressed={mode === "serving"}
            >
              Serving
            </button>
            <button
              type="button"
              onClick={() => onModeChange("receiving")}
              className={`
                min-h-11 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
                ${
                  mode === "receiving"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }
              `}
              aria-pressed={mode === "receiving"}
            >
              Receiving
            </button>
          </div>

          {/* Libero Toggle */}
          <button
            type="button"
            onClick={() => onLiberoToggle(!liberoActive)}
            className={`
              min-h-11 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-1
              ${
                liberoActive
                  ? "bg-purple-500/20 border-purple-500/50 text-purple-700 focus:ring-purple-500"
                  : "bg-accent border-border text-muted-foreground hover:border-primary/50 focus:ring-primary"
              }
            `}
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
            className={`
              min-h-11 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200
              flex items-center gap-1.5
              focus:outline-none focus:ring-2 focus:ring-offset-1
              ${
                showOverlaps
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-700 focus:ring-amber-500"
                  : "bg-accent border-border text-muted-foreground hover:border-primary/50 focus:ring-primary"
              }
            `}
            aria-pressed={showOverlaps}
          >
            {showOverlaps ? (
              <EyeIcon className="w-3.5 h-3.5" />
            ) : (
              <EyeSlashIcon className="w-3.5 h-3.5" />
            )}
            Overlaps
          </button>

          {/* Movement Arrows Toggle */}
          <button
            type="button"
            onClick={() => onShowArrowsToggle(!showArrows)}
            className={`
              min-h-11 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200
              flex items-center gap-1.5
              focus:outline-none focus:ring-2 focus:ring-offset-1
              ${
                showArrows
                  ? "bg-blue-500/20 border-blue-500/50 text-blue-700 focus:ring-blue-500"
                  : "bg-accent border-border text-muted-foreground hover:border-primary/50 focus:ring-primary"
              }
            `}
            aria-pressed={showArrows}
          >
            <ArrowPathIcon className="w-3.5 h-3.5" />
            Arrows
          </button>
        </div>
      </div>
    );
  }
);
RotationControls.displayName = "RotationControls";
