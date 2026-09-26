"use client";

import { useCallback, useSyncExternalStore } from "react";
import { fullscreenSupported } from "@/lib/scoring";

// Safari still prefixes the API; an iPhone has no element fullscreen at all.
type FullscreenDocument = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FullscreenRoot = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

const fullscreenElement = (doc: FullscreenDocument): Element | null =>
  doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;

const subscribeToFullscreen = (onChange: () => void) => {
  document.addEventListener("fullscreenchange", onChange);
  document.addEventListener("webkitfullscreenchange", onChange);
  return () => {
    document.removeEventListener("fullscreenchange", onChange);
    document.removeEventListener("webkitfullscreenchange", onChange);
  };
};

// Support never changes while the page is open, so there is nothing to subscribe to.
const subscribeToNothing = () => () => {};

const readIsFullscreen = () => fullscreenElement(document as FullscreenDocument) !== null;
const readIsSupported = () => fullscreenSupported(document as FullscreenDocument);
const readFalse = () => false;

/**
 * Fullscreen as a bonus. `isSupported` says whether the device has the API
 * at all, so a page can hide the button where it would do nothing;
 * `isFullscreen` follows the document, including an exit by the Escape
 * key; `toggleFullscreen` asks or exits and swallows a refusal.
 */
export const useFullscreen = () => {
  const isSupported = useSyncExternalStore(subscribeToNothing, readIsSupported, readFalse);
  const isFullscreen = useSyncExternalStore(subscribeToFullscreen, readIsFullscreen, readFalse);

  const toggleFullscreen = useCallback(async () => {
    const doc = document as FullscreenDocument;
    const root = document.documentElement as FullscreenRoot;
    try {
      if (fullscreenElement(doc)) {
        await (doc.exitFullscreen ? doc.exitFullscreen() : doc.webkitExitFullscreen?.());
      } else {
        await (root.requestFullscreen
          ? root.requestFullscreen()
          : root.webkitRequestFullscreen?.());
      }
    } catch (error) {
      // A device that advertises the API and then refuses it, or a request
      // outside a user gesture, leaves the page as it was.
      console.warn("Fullscreen was refused:", error);
    }
  }, []);

  return { isSupported, isFullscreen, toggleFullscreen };
};
