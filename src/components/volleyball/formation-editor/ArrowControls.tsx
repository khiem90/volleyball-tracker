"use client";

import { memo } from "react";
import type { PlayerRole, CourtPosition } from "@/lib/volleyball/types";
import { Icon } from "@/components/shared/Icon";
import { LABEL } from "@/components/shared/classes";

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
    <div className="flex flex-col gap-2">
      <h3 className={LABEL}>Movement Arrows</h3>

      {/* Draw Arrow Button / Drawing State */}
      {isDrawingArrow ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-tile bg-action-tint p-2.5">
            <span className="live-dot" aria-hidden="true" />
            <span className="text-caption font-medium text-action">
              {arrowStartRole
                ? `Click on the court where ${arrowStartRole} should move`
                : "Click a player to start drawing"}
            </span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onDoneDrawing} className="btn btn-ink flex-1">
              Done
            </button>
            {arrowStartRole && (
              <button type="button" onClick={onCancelSelection} className="btn btn-fill">
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <button type="button" onClick={onStartDrawing} className="btn btn-ink w-full">
          <Icon id="swap" size={14} />
          Draw Arrow
        </button>
      )}

      {/* Arrow List */}
      {arrowEntries.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {arrowEntries.map(([role]) => (
            <div
              key={role}
              className="flex items-center rounded-pill bg-fill pl-3 text-caption font-medium"
            >
              <span>{role}</span>
              <button
                type="button"
                onClick={() => onRemoveArrow(role)}
                className="flex size-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:text-danger"
                aria-label={`Remove arrow for ${role}`}
              >
                <Icon id="close" size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
