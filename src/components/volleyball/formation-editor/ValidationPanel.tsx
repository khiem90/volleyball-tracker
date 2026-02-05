"use client";

import { memo } from "react";

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
    <div className="space-y-2">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
        Validation
      </h3>

      {blockingErrors.length > 0 && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm">
          <p className="font-medium text-red-700 dark:text-red-300 mb-1">
            Errors ({blockingErrors.length})
          </p>
          <ul className="text-red-600 dark:text-red-400 text-xs space-y-1">
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
        <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-sm">
          <p className="font-medium text-yellow-700 dark:text-yellow-300 mb-1">
            Overlap Warnings ({overlapWarnings.length})
          </p>
          <p className="text-yellow-600 dark:text-yellow-400 text-xs">
            Some positions may violate overlap rules.
          </p>
        </div>
      )}
    </div>
  );
});
