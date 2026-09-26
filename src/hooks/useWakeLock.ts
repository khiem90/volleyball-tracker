"use client";

import { useEffect } from "react";

/**
 * Keep the screen awake while `active`. The browser drops a wake lock
 * whenever the page is hidden, so it is asked for again each time the page
 * comes back into view, and only then: a lock still held, or a request
 * still in flight, is never doubled. It is released when `active` turns
 * false or the page unmounts. A device without the API, or one that
 * refuses the request (low battery, a hidden tab), leaves the page as it
 * was.
 */
export const useWakeLock = (active: boolean): void => {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let requesting = false;
    let gone = false;

    const request = async () => {
      if (gone || requesting || sentinel || document.visibilityState !== "visible") return;
      requesting = true;
      try {
        const lock = await navigator.wakeLock.request("screen");
        // The page left while the request was in flight.
        if (gone) {
          await lock.release();
          return;
        }
        sentinel = lock;
        // The browser lets go on its own when the page is hidden; forget
        // the lock so the next visibility change asks for a new one.
        lock.addEventListener("release", () => {
          if (sentinel === lock) sentinel = null;
        });
      } catch {
        // Refused. Nothing to do; the screen simply follows its own timeout.
      } finally {
        requesting = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void request();
    };

    void request();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      gone = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [active]);
};
