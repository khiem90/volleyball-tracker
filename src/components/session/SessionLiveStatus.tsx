"use client";

/* ===========================================================================
   THE ONE TICKING THING ON THE PAGE

   `useLiveConnection` runs a 1s interval so "Updated 12s ago" stays true. That
   interval is mounted HERE, in a leaf, and nowhere else — a clock tick
   re-renders this 140px strip and never the standings table beside it. The
   page derives `faulted` and `ended` itself, cheaply, from the phase.
   =========================================================================== */

import { MbLiveStatus } from "@/components/matchbook/LiveStatus";
import { useLiveConnection } from "@/hooks/useLiveConnection";

export const SessionLiveStatus = ({
  version,
  faulted,
  ended,
  tone = "paper",
  onRetry,
}: {
  /** Changes whenever a snapshot lands — `session.updatedAt` is enough. */
  version: unknown;
  faulted: boolean;
  ended: boolean;
  tone?: "navy" | "paper";
  onRetry?: () => void;
}) => {
  const live = useLiveConnection({ subscribed: true, version, faulted, ended });

  return (
    <MbLiveStatus
      status={live.status}
      secondsAgo={live.secondsAgo}
      tone={tone}
      onRetry={live.stale ? onRetry : undefined}
    />
  );
};
