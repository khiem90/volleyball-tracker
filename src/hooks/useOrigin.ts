import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** The page's origin, for links that point back at this deployment; empty on the server. */
export const useOrigin = (): string =>
  useSyncExternalStore(
    subscribe,
    () => window.location.origin,
    () => "",
  );
