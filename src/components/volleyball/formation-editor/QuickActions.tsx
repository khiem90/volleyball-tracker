"use client";

import { memo } from "react";
import { GROUP_LABEL } from "../styles";

type QuickActionsProps = {
  hasCopiedFrame: boolean;
  onCopyFrame: () => void;
  onPasteFrame: () => void;
  onResetRotation: () => void;
};

export const QuickActions = memo(function QuickActions({
  hasCopiedFrame,
  onCopyFrame,
  onPasteFrame,
  onResetRotation,
}: QuickActionsProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className={GROUP_LABEL}>Quick Actions</h3>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onCopyFrame} className="btn btn-fill px-4">
          Copy Frame
        </button>
        <button
          type="button"
          onClick={onPasteFrame}
          disabled={!hasCopiedFrame}
          className="btn btn-fill px-4"
        >
          Paste Frame
        </button>
        <button type="button" onClick={onResetRotation} className="btn btn-danger-quiet px-4">
          Reset Rotation
        </button>
      </div>
    </div>
  );
});
