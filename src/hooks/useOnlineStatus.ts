"use client";

/**
 * `navigator.onLine`, as a React value (charter §2.3, W2/P2b).
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect`, for the same
 * reason `useMbReducedMotion` uses it: an effect-based implementation renders
 * `true` once and then corrects itself, which is a visible flash of the wrong
 * state on every mount for a user who is genuinely offline. The store form
 * returns the real value on the first CLIENT render.
 *
 * The SERVER snapshot is `true` — deliberately, and it is not the same claim.
 * The server cannot know, and an offline banner in the SSR HTML would be a
 * false statement rendered to every online user for one frame, plus a hydration
 * mismatch. Assuming "online" means the banner only ever appears as a client
 * correction, which is exactly what it is.
 *
 * WHAT `navigator.onLine` ACTUALLY MEANS: the browser has *a* network
 * interface. It does not mean the app's backend is reachable. `false` is
 * therefore trustworthy (no interface ⇒ certainly offline) while `true` is
 * merely "not certainly offline". Consumers that know better — a Firestore
 * snapshot error, a failed write — must be able to say so, which is why
 * `MbOfflineBanner` takes an `offline` override instead of reading this hook
 * unconditionally.
 */

import { useSyncExternalStore } from "react";

const subscribe = (onStoreChange: () => void): (() => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
};

/* `?? true` covers the environments that expose `navigator` without `onLine`
   (jsdom before 16, some WebViews). An undefined reading must not be read as
   "offline", for the same reason the server snapshot is `true`. */
const getSnapshot = (): boolean =>
  typeof navigator === "undefined" ? true : navigator.onLine ?? true;

const getServerSnapshot = (): boolean => true;

/** `true` while the browser reports a network connection. */
export const useOnlineStatus = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
