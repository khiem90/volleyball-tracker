"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { nextUpdate, type UpdateEvent, type UpdateStatus } from "@/lib/appUpdate";

interface AppUpdateContextValue {
  status: UpdateStatus;
  /** The banner's Reload: let the new version in, then reload onto it. */
  reload: () => void;
}

const AppUpdateContext = createContext<AppUpdateContextValue | null>(null);

// A browser looks for a new service worker on a full page load, and an app
// left open on a phone can go all evening without one.
const CHECK_EVERY_MS = 30 * 60 * 1000;

// How long Reload waits for the new version to take over before reloading anyway.
const TAKEOVER_WAIT_MS = 3000;

/**
 * Watches the service worker for a newly deployed version and holds whether
 * the page offers it. It sits above every page, so the offer outlives a move
 * between the shell and the scoring page. Where no service worker is
 * registered, as in development, the status stays current.
 */
export const AppUpdateProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<UpdateStatus>("current");
  const statusRef = useRef<UpdateStatus>("current");
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const dispatch = useCallback((event: UpdateEvent) => {
    const step = nextUpdate(statusRef.current, event);
    statusRef.current = step.status;
    setStatus(step.status);
    if (step.effect === "activate") {
      const waiting = registrationRef.current?.waiting;
      if (waiting) {
        // The generated worker takes over when told to; see skipWaiting in
        // next.config.ts. The takeover reloads the page. Should the worker
        // be gone before it takes over, the tap still asked for a reload.
        waiting.postMessage({ type: "SKIP_WAITING" });
        window.setTimeout(() => window.location.reload(), TAKEOVER_WAIT_MS);
      } else {
        // Nothing waits any more, so reloading is all the tap can still mean.
        window.location.reload();
      }
    }
    if (step.effect === "reload") window.location.reload();
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const container = navigator.serviceWorker;
    let cancelled = false;
    let hadController = container.controller !== null;

    const onControllerChange = () => {
      dispatch({ type: "took-over", hadController });
      hadController = true;
    };
    container.addEventListener("controllerchange", onControllerChange);

    const offerWhenInstalled = (worker: ServiceWorker) => {
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed") {
          dispatch({ type: "waiting", controlled: container.controller !== null });
        }
      });
    };
    const onUpdateFound = () => {
      const installing = registrationRef.current?.installing;
      if (installing) offerWhenInstalled(installing);
    };

    // Ready waits for the registration next-pwa makes on load.
    void container.ready.then((registration) => {
      if (cancelled) return;
      registrationRef.current = registration;
      registration.addEventListener("updatefound", onUpdateFound);
      if (registration.installing) offerWhenInstalled(registration.installing);
      if (registration.waiting) {
        dispatch({ type: "waiting", controlled: container.controller !== null });
      }
    });

    const check = () => {
      registrationRef.current?.update().catch(() => {
        // Offline or the server is away; the next check tries again.
      });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    const timer = window.setInterval(check, CHECK_EVERY_MS);

    return () => {
      cancelled = true;
      container.removeEventListener("controllerchange", onControllerChange);
      registrationRef.current?.removeEventListener("updatefound", onUpdateFound);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(timer);
    };
  }, [dispatch]);

  const reload = useCallback(() => dispatch({ type: "reload" }), [dispatch]);

  return (
    <AppUpdateContext.Provider value={{ status, reload }}>{children}</AppUpdateContext.Provider>
  );
};

export const useAppUpdate = (): AppUpdateContextValue => {
  const context = useContext(AppUpdateContext);
  if (!context) throw new Error("useAppUpdate must be used within an AppUpdateProvider");
  return context;
};
