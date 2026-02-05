"use client";

import { memo } from "react";

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
    <div className="space-y-2">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
        Quick Actions
      </h3>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCopyFrame}
          className="px-3 py-1.5 text-sm bg-accent rounded-lg hover:bg-accent/80"
        >
          Copy Frame
        </button>
        <button
          type="button"
          onClick={onPasteFrame}
          disabled={!hasCopiedFrame}
          className="px-3 py-1.5 text-sm bg-accent rounded-lg hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Paste Frame
        </button>
        <button
          type="button"
          onClick={onResetRotation}
          className="px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg"
        >
          Reset Rotation
        </button>
      </div>
    </div>
  );
});
