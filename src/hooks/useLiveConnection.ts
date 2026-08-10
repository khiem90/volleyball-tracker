"use client";

/* ===========================================================================
   THE LIVE CONNECTION (public-share brief N1, W6 / P3b)

   `MbLiveStatus` draws five words. This is the thing that decides which one is
   true, and it exists because the shipped viewer had no answer at all: the only
   "live" signal on `/session/<code>` was a 2px amber dot with `animate-pulse`
   on it, which pulses identically whether the socket is delivering, stalled,
   or dead. A viewer in a gym on bad wifi could watch a frozen 12–7 for twenty
   minutes and the page would keep telling them it was live.

   ------------------------------------------------------------- what it reads

   Not `navigator.onLine` alone. That property means "a network interface
   exists", so `false` is trustworthy and `true` is merely "not certainly
   offline" — `useOnlineStatus` says so in its own docblock. A snapshot error is
   better evidence than the browser's, so the two are combined:

     ended       the document is gone — the organiser ended the event
     offline     no interface. Nothing is arriving and nothing will
     reconnecting an interface exists but the subscription faulted. Firestore
                 retries on its own, so this is a state that resolves itself
     live        a payload has landed and nothing has faulted since
     idle        subscribed, nothing received yet, nothing wrong

   `reconnecting` and `offline` both set `stale`, which is the flag the screen
   uses to keep the last known scores on-screen behind a banner instead of
   replacing them with an error card (brief DoD 15).

   -------------------------------------------------------------- the 1s tick

   `secondsAgo` has to keep counting or "Updated 3s ago" is a lie thirty
   seconds later. The interval therefore lives HERE and this hook is called
   from ONE leaf component (`SessionLiveStatus`) rather than from the page, so
   a clock tick re-renders a 120px strip and not a standings table. That is
   also why `since` is returned: a caller that only needs the state word can
   read `status` from the page-level classification and never mount the timer.
   =========================================================================== */

import { useEffect, useRef, useState } from "react";
import { useOnlineStatus } from "./useOnlineStatus";
import type { MbLiveStatusValue } from "@/components/matchbook/LiveStatus";

export interface MbLiveConnection {
  status: MbLiveStatusValue;
  /** Age of the last payload, in seconds. Undefined before the first one. */
  secondsAgo?: number;
  /** True when what is on screen is older than what the source holds. */
  stale: boolean;
  /** Epoch millis of the last payload, or null. Stable across ticks. */
  since: number | null;
}

const TICK_MS = 1000;

export const useLiveConnection = ({
  subscribed,
  version,
  faulted = false,
  ended = false,
  tick = true,
}: {
  /** True once a subscription is open. */
  subscribed: boolean;
  /**
   * Any value that changes when a payload lands — `session.updatedAt`, a
   * revision counter, the payload object itself. Identity is enough.
   */
  version: unknown;
  /** The subscription reported an error. Overrides `navigator.onLine`. */
  faulted?: boolean;
  /** The source document no longer exists. */
  ended?: boolean;
  /** Set false to skip the interval when the age is not being rendered. */
  tick?: boolean;
}): MbLiveConnection => {
  const online = useOnlineStatus();

  /* `Date.now()` may not be called during render — it is the textbook impure
     read, and `react-hooks/purity` says so — so the arrival time is stamped in
     an effect. The one-frame lag that buys is confined to `secondsAgo`:
     `status` below is derived from whether a payload EXISTS, not from when it
     landed, so a fresh subscription reads "Live" on its first paint and simply
     has no age beside it until the first tick. */
  const seenRef = useRef<unknown>(undefined);
  const [receivedAt, setReceivedAt] = useState<number | null>(null);

  useEffect(() => {
    if (version === undefined || version === null) return;
    if (seenRef.current === version) return;
    seenRef.current = version;
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- a clock
       reading is exactly the value that may not be taken during render; the
       effect is the only legal place for it. */
    setReceivedAt(Date.now());
  }, [version]);

  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!tick || receivedAt === null) return;
    /* `setNow` only from the callback. The FIRST paint must not depend on a
       clock, or the server and the client disagree and React logs a hydration
       mismatch on a page whose whole job is to be pasted into a group chat. */
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [tick, receivedAt]);

  const arrived = version !== undefined && version !== null;

  const status: MbLiveStatusValue = ended
    ? "ended"
    : !online
      ? "offline"
      : faulted
        ? "reconnecting"
        : arrived
          ? "live"
          : subscribed
            ? "idle"
            : "idle";

  return {
    status,
    /**
     * `0` — not `undefined` — for the window between "a payload exists" and
     * "the clock has ticked once".
     *
     * `MbLiveStatus` omits the whole age line when `secondsAgo` is undefined,
     * so returning undefined for that window inserted a `<span>` into the navy
     * strip roughly one second after every load. Measured by `audit.mjs`
     * MOTION on `session-live-token`, where it showed up as **538 drifts** —
     * not motion at all, but the node list shifting by one index because an
     * element appeared between the two sampled frames. It is a real layout
     * insertion on load either way (invariant 27), and the honest value for a
     * payload that has just arrived is "just now", which is exactly what
     * `relative(0)` prints.
     */
    secondsAgo: !arrived
      ? undefined
      : receivedAt === null || now === null
        ? 0
        : Math.max(0, (now - receivedAt) / 1000),
    stale: status === "offline" || status === "reconnecting",
    since: receivedAt,
  };
};
