"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/* ===========================================================================
   COURT VIEW — the landscape scoreboard, and the one place three browser APIs
   have to agree

   iPhone has no element fullscreen at all, so a rejected `requestFullscreen`
   falls back to an IN-PAGE mode that covers the viewport without the
   Fullscreen API, and says so in one line. The fullscreen target is the
   console element the caller hands in, never `document.documentElement` —
   which is why `MatchbookShell variant="focus"` puts `children` directly
   inside `<main>` with nothing between.
   =========================================================================== */

interface WakeLockSentinel {
  released: boolean;
  release: () => Promise<void>;
}

interface NavigatorWithWakeLock {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> };
}

type FullscreenCapableElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenCapableDocument = Document & {
  webkitFullscreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
};

/** Why Court View cannot be entered right now. */
export type MbCourtBlockedReason = "portrait" | null;

export interface MbCourtView {
  /** True in either mode — real fullscreen or the in-page fallback. */
  isCourtView: boolean;
  /** True only when the browser gave us a real fullscreen element. */
  isNativeFullscreen: boolean;
  /** False while the device is portrait: Court View is landscape-only. */
  canEnter: boolean;
  blockedReason: MbCourtBlockedReason;
  /**
   * A one-line explanation of something the user could not otherwise see —
   * today, only "this browser has no fullscreen mode". Never a raw error
   * string from the platform.
   */
  notice: string | null;
  dismissNotice: () => void;
  enter: () => void;
  exit: () => void;
  /** Enters, exits, or reports `blockedReason` without changing anything. */
  toggle: () => void;
}

const IN_PAGE_NOTICE =
  "This browser has no fullscreen mode, so Court View is running inside the page. Scoring works exactly the same.";

const isLandscape = (): boolean =>
  typeof window !== "undefined" && window.innerWidth > window.innerHeight;

const fullscreenElement = (): Element | null => {
  const doc = document as FullscreenCapableDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? doc.msFullscreenElement ?? null;
};

export const useCourtView = ({
  target,
}: {
  /** The element handed to the Fullscreen API — the console, not the shell. */
  target: RefObject<HTMLElement | null>;
}): MbCourtView => {
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isInPage, setIsInPage] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  /* Portrait devices exist before any interaction, so this starts pessimistic
     and is corrected on mount — never the other way round, which would flash a
     Court View button that is about to refuse. */
  const [landscape, setLandscape] = useState(false);

  const isCourtView = isNativeFullscreen || isInPage;

  /* ------------------------------------------------------------ wake lock */

  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = useCallback(async () => {
    const nav = navigator as NavigatorWithWakeLock;
    if (!nav.wakeLock) return;
    try {
      wakeLockRef.current = await nav.wakeLock.request("screen");
    } catch {
      /* Denied by policy, or the tab lost visibility mid-request. The screen
         dimming is a comfort, not a capability; the console still scores. */
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    const lock = wakeLockRef.current;
    wakeLockRef.current = null;
    if (!lock || lock.released) return;
    try {
      await lock.release();
    } catch {
      /* Already released by the platform. */
    }
  }, []);

  /* ---------------------------------------------------------- orientation */

  /**
   * The orientation listener also owns the auto-exit, rather than a second
   * effect watching `landscape` and calling `exit()`: rotating back to portrait
   * is an event from an external system, and reacting to it inside the listener
   * is one render instead of a cascade.
   */
  const currentRef = useRef({ isCourtView: false, exit: () => {} });

  useEffect(() => {
    const read = () => {
      const land = isLandscape();
      setLandscape(land);
      if (!land && currentRef.current.isCourtView) currentRef.current.exit();
    };
    read();
    window.addEventListener("resize", read);
    window.addEventListener("orientationchange", read);
    return () => {
      window.removeEventListener("resize", read);
      window.removeEventListener("orientationchange", read);
    };
  }, []);

  /* ------------------------------------------------------------- entering */

  const enter = useCallback(() => {
    if (!isLandscape()) return;

    const node = target.current as FullscreenCapableElement | null;
    const request =
      node?.requestFullscreen ?? node?.webkitRequestFullscreen ?? node?.msRequestFullscreen;

    void requestWakeLock();

    if (!node || !request) {
      setIsInPage(true);
      setNotice(IN_PAGE_NOTICE);
      return;
    }

    /* `.call(node)` because the three vendor entry points are plain methods on
       the element and lose their receiver when read off it. */
    Promise.resolve(request.call(node)).then(
      () => setIsNativeFullscreen(true),
      () => {
        /* iOS Safari on iPhone exposes no element fullscreen and some embedded
           WebViews reject the request outright. Both land here, and both get a
           Court View that works. */
        setIsInPage(true);
        setNotice(IN_PAGE_NOTICE);
      }
    );
  }, [requestWakeLock, target]);

  const exit = useCallback(() => {
    setIsInPage(false);
    setNotice(null);
    void releaseWakeLock();

    if (!fullscreenElement()) {
      setIsNativeFullscreen(false);
      return;
    }
    const doc = document as FullscreenCapableDocument;
    const release = doc.exitFullscreen ?? doc.webkitExitFullscreen ?? doc.msExitFullscreen;
    if (!release) {
      setIsNativeFullscreen(false);
      return;
    }
    Promise.resolve(release.call(doc)).then(
      () => setIsNativeFullscreen(false),
      () => setIsNativeFullscreen(false)
    );
  }, [releaseWakeLock]);

  const toggle = useCallback(() => {
    if (isCourtView) {
      exit();
      return;
    }
    /* Portrait is reported through `blockedReason`, so the caller can open the
       rotate prompt. Nothing changes here. */
    if (!isLandscape()) return;
    enter();
  }, [enter, exit, isCourtView]);

  /* ------------------------------------------------- staying in sync with
     the browser: Escape, the system gesture, and rotating back to portrait. */

  useEffect(() => {
    const sync = () => {
      const active = !!fullscreenElement();
      setIsNativeFullscreen(active);
      if (!active) void releaseWakeLock();
    };
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    document.addEventListener("msfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
      document.removeEventListener("msfullscreenchange", sync);
    };
  }, [releaseWakeLock]);

  /* What the orientation listener above reads when it fires. */
  useEffect(() => {
    currentRef.current = { isCourtView, exit };
  }, [isCourtView, exit]);

  /* Escape has no meaning to the browser in the in-page mode, so it is wired
     here — the keyboard path out must exist in both (DoD: "Escape exits Court
     View"). */
  useEffect(() => {
    if (!isInPage) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") exit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isInPage, exit]);

  /* Mobile drops the lock whenever the tab is backgrounded. */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && isCourtView) void requestWakeLock();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [isCourtView, requestWakeLock]);

  /* Leaving the route with the lock held would keep the screen awake on a page
     that is no longer scoring anything. */
  useEffect(() => () => void releaseWakeLock(), [releaseWakeLock]);

  return {
    isCourtView,
    isNativeFullscreen,
    canEnter: landscape,
    blockedReason: landscape || isCourtView ? null : "portrait",
    notice,
    dismissNotice: useCallback(() => setNotice(null), []),
    enter,
    exit,
    toggle,
  };
};
