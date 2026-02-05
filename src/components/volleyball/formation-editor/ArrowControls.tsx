"use client";

import { memo } from "react";
import type { PlayerRole, CourtPosition } from "@/lib/volleyball/types";

type ArrowControlsProps = {
  isDrawingArrow: boolean;
  arrowStartRole: PlayerRole | null;
  arrowEntries: [PlayerRole, { from: CourtPosition; to: CourtPosition }][];
  onStartDrawing: () => void;
  onDoneDrawing: () => void;
  onCancelSelection: () => void;
  onRemoveArrow: (role: PlayerRole) => void;
};

export const ArrowControls = memo(function ArrowControls({
  isDrawingArrow,
  arrowStartRole,
  arrowEntries,
  onStartDrawing,
  onDoneDrawing,
  onCancelSelection,
  onRemoveArrow,
}: ArrowControlsProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
        Movement Arrows
      </h3>

      {/* Draw Arrow Button / Drawing State */}
      {isDrawingArrow ? (
        <div className="space-y-2">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-medium text-primary">
                {arrowStartRole
                  ? `Click on the court where ${arrowStartRole} should move`
                  : "Click a player to start drawing"}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onDoneDrawing}
              className="flex-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
            >
              Done
            </button>
            {arrowStartRole && (
              <button
                type="button"
                onClick={onCancelSelection}
                className="px-3 py-1.5 text-sm bg-accent rounded-lg hover:bg-accent/80"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onStartDrawing}
          className="w-full px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium flex items-center justify-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
          Draw Arrow
        </button>
      )}

      {/* Arrow List */}
      {arrowEntries.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {arrowEntries.map(([role]) => (
            <div
              key={role}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-accent/50 text-xs"
            >
              <span className="font-medium">{role}</span>
              <button
                type="button"
                onClick={() => onRemoveArrow(role)}
                className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-red-500 transition-colors"
                aria-label={`Remove arrow for ${role}`}
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
