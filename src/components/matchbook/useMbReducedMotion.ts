// prefers-reduced-motion, read straight from matchMedia.
//
// Deliberately does NOT wrap framer-motion's useReducedMotion: importing it
// for a media query would reintroduce the library everywhere.
//
// useSyncExternalStore (rather than useState + useEffect) so the first client
// render already returns the real value — a useEffect implementation renders
// `false` once, a frame of motion for a user who asked for none.

import { useSyncExternalStore } from "react";

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

let cached: MediaQueryList | null = null;

/** The one MediaQueryList instance, created lazily so SSR never touches window. */
const mediaQuery = (): MediaQueryList | null => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }
  if (!cached) cached = window.matchMedia(REDUCED_MOTION_QUERY);
  return cached;
};

const subscribe = (onStoreChange: () => void): (() => void) => {
  const mql = mediaQuery();
  if (!mql) return () => {};
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", onStoreChange);
    return () => mql.removeEventListener("change", onStoreChange);
  }
  // Safari < 14 only exposes the deprecated listener pair.
  mql.addListener(onStoreChange);
  return () => mql.removeListener(onStoreChange);
};

const getSnapshot = (): boolean => mediaQuery()?.matches ?? false;

/** The server cannot know the preference; motion is opt-out, so assume "no". */
const getServerSnapshot = (): boolean => false;

/**
 * `true` when the user has asked for reduced motion.
 * Consumers must render the END STATE, not a shorter animation.
 */
export const useMbReducedMotion = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
