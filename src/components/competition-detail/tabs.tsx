"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { MbTabs, type MbTabItem } from "@/components/matchbook/Tabs";

/* ===========================================================================
   FORMAT VIEWS

   The single biggest mobile win available on this screen. A round robin at
   390px is a 2,600px scroll and a 16-team league is ~10,000px; below `xl` the
   tabs genuinely SWITCH, so a phone shows one panel at a time.

   At `xl` and above every panel is already on screen at once — that is the
   whole point of the 12-column console — so the strip is `xl:hidden`. It is
   redundant context there rather than hidden information (invariant 38): there
   is nothing the tabs could reveal that the reader is not already looking at.

   The value lives in `?tab=` (`MbTabs`' `urlKey`) so a refresh or a shared link
   holds position.

   Reading it back is the fiddly half. `window.location` does not exist on the
   server, so a lazy `useState` initialiser hydrates as a mismatch (invariant
   50); a `useEffect` that calls `setState` is a cascading render the lint rule
   rejects outright; and `useSearchParams()` drags a `<Suspense>` requirement
   into `next build`. `useSyncExternalStore` is the one primitive built for
   exactly this shape — a browser-only value with a declared server snapshot.
   React renders the server snapshot during hydration and re-renders once
   afterwards if the client's differs, with no warning and no effect.
   =========================================================================== */

/** The URL is only read once, at hydration, so nothing ever notifies. */
const NEVER = () => () => {};
const SERVER_SNAPSHOT = "";

export const useFormatTabs = (items: MbTabItem[], key = "tab") => {
  const fallback = items[0]?.value ?? "";
  const signature = items.map((item) => item.value).join("|");

  const fromUrl = useSyncExternalStore(
    NEVER,
    useCallback(
      () => new URLSearchParams(window.location.search).get(key) ?? "",
      [key]
    ),
    () => SERVER_SNAPSHOT
  );

  /** Set by a tab press; wins over the URL from that point on. */
  const [manual, setManual] = useState<string | null>(null);

  const restored = signature.split("|").includes(fromUrl) ? fromUrl : fallback;
  const value = manual ?? restored;

  return {
    value,
    setValue: setManual,
    /**
     * Below `xl` a panel outside the active view is not rendered to the
     * reader; at `xl` every panel is shown regardless.
     */
    groupClass: (group: string) => (group === value ? "" : "hidden xl:block"),
  };
};

export const FormatTabs = ({
  items,
  value,
  onValueChange,
  label,
}: {
  items: MbTabItem[];
  value: string;
  onValueChange: (value: string) => void;
  label: string;
}) => (
  <div className="mb-4 xl:hidden">
    <MbTabs
      items={items}
      value={value}
      onValueChange={onValueChange}
      urlKey="tab"
      aria-label={label}
    />
  </div>
);
