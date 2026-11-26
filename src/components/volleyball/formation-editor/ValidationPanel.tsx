"use client";

import { memo } from "react";
import { GROUP_LABEL } from "../styles";

type ValidationError = {
  message: string;
};

type ValidationPanelProps = {
  blockingErrors: ValidationError[];
  overlapWarnings: ValidationError[];
};

export const ValidationPanel = memo(function ValidationPanel({
  blockingErrors,
  overlapWarnings,
}: ValidationPanelProps) {
  if (blockingErrors.length === 0 && overlapWarnings.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className={GROUP_LABEL}>Validation</h3>

      {blockingErrors.length > 0 && (
        <div className="rounded-tile border border-danger/40 bg-danger-tint p-3 text-danger">
          <p className="mb-1 text-label font-semibold">
            Errors ({blockingErrors.length})
          </p>
          <ul className="flex flex-col gap-1 text-caption">
            {blockingErrors.slice(0, 3).map((err, i) => (
              <li key={i}>{err.message}</li>
            ))}
            {blockingErrors.length > 3 && (
              <li>...and {blockingErrors.length - 3} more</li>
            )}
          </ul>
        </div>
      )}

      {overlapWarnings.length > 0 && (
        <div className="rounded-tile bg-fill p-3">
          <p className="mb-1 text-label font-semibold">
            Overlap Warnings ({overlapWarnings.length})
          </p>
          <ul className="flex flex-col gap-1 text-caption text-ink-soft">
            {overlapWarnings.slice(0, 5).map((warn, i) => (
              <li key={i}>{warn.message}</li>
            ))}
            {overlapWarnings.length > 5 && (
              <li>...and {overlapWarnings.length - 5} more</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
});
