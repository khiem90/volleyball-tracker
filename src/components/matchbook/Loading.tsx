"use client";

/* ===========================================================================
   ROUTE-LEVEL STATES

     MbPageLoading     MatchbookShell + a skeleton grid at the final geometry.
     MbRouteState      the visible body of a failure route, drawn once.
     MB_ROUTE_STATE    the copy for error / not-found / global-error, in one
                       place so `app/error.tsx` and the gallery cannot drift.

   Loading is a skeleton at the FINAL geometry, never a spinner: the reader can
   start parsing the layout before data lands, and nothing moves when it does.
   The frame is the REAL `MatchbookShell` — live, clickable nav — and this file
   does not re-declare a millimetre of it: a loading screen drawn on a replica
   of the shell jumps when the real one arrives.
   =========================================================================== */

import { useSyncExternalStore, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { STORAGE_KEY } from "@/context/appReducer";
import { MatchbookShell, type MatchbookShellVariant } from "./AppShell";
import { MbSkeleton } from "./Skeleton";
import { MbEmptyState, type MbEmptyStateAction } from "./EmptyState";
import type { PanelEmptyTone } from "./Panel";

/* --------------------------------------------------------- reserved heights

   Each console route declares the geometry it is about to become. The numbers
   are MEASURED off the shipped page at 390x844 and 1440x900 (`pw/mb-geom.mjs`),
   not estimated, and each table is ordered exactly as the page's own grid
   children are — same spans, same column grouping — so a panel's bones land
   where its content will.

   Two geometries where the route's composition swaps on emptiness: `full` and
   `empty`, chosen by `emptySignal` against the same `localStorage` the page
   reads (`readAccount`). Unknown accounts (server render, blocked storage,
   corrupt blob) fall back to `full` — right for the common case, and wrong
   exactly once per user: the SSR HTML of a brand-new account's first cold
   document reserves `full` before hydration corrects it, and any value the
   server could guess instead would be wrong far more often.

   Upkeep: these are dimensions of OTHER components' output, so they rot when
   those components change. `src/__tests__/shell/skeletonSpec.test.ts` pins the
   shape but not the numbers — re-run `pw/mb-geom.mjs` (and `--empty`) after
   any panel-level redesign. */

/** One panel's bones. `h` is 390x844, `xl` is 1440x900; `xl` defaults to `h`. */
export interface MbSkeletonPanelSpec {
  h: number;
  xl?: number;
  /** `false` mirrors a real panel that renders no `.mb-panel-head`. */
  head?: boolean;
}

/**
 * One grid child: a column span and the panels stacked inside it. `3` is on
 * the list because `/teams` ships a 5/4/3 row — the skeleton matches the
 * shipped page's spans, not the ideal scale.
 */
export interface MbSkeletonCellSpec {
  span: 3 | 4 | 5 | 7 | 12;
  panels: MbSkeletonPanelSpec[];
}

export interface MbSkeletonRouteSpec {
  /** The page's own grid classes, copied verbatim so the columns agree. */
  grid: string;
  /** Height from the top of `<main>`'s padding box to the first panel — the
   *  masthead, plus any filter bar the page carries above its grid. */
  lead: number;
  leadXl: number;
  /** A full-width control band the page renders BELOW its grid —
   *  `/quick-match`'s `MbActionBar` is the one shipped case. The measured box
   *  height only; the grid gap above it is the skeleton's own `mt-4`. */
  tail?: number;
  tailXl?: number;
  cells: MbSkeletonCellSpec[];
}

/**
 * Which count being zero means this route draws its first-run composition.
 * A name rather than a predicate so the table stays data and the test can
 * exercise every branch. Each mirrors the page's OWN emptiness test:
 *
 *   played        `/` and `/summaries` — `isFirstRun`: no completed non-bye
 *                 match and no in-progress one.
 *   competitions  `/competitions` — no competitions.
 *   teams         `/teams` — no teams.
 *   twoTeams      `/quick-match` — a fixture needs two sides, so the collapse
 *                 fires at ONE team as well as none. Kept separate from
 *                 `teams`: `/teams` at one team is a working directory and
 *                 must keep its full geometry.
 */
export type MbEmptySignal = "played" | "teams" | "competitions" | "twoTeams";

export interface MbRouteSkeleton {
  /** The account with data. Also the fallback whenever the account is unknown. */
  full: MbSkeletonRouteSpec;
  /** The first-run composition. Omitted where the route does not vary. */
  empty?: MbSkeletonRouteSpec;
  /** Required with `empty`, meaningless without it. */
  emptySignal?: MbEmptySignal;
}

/**
 * Keyed by exact pathname. `active` is deliberately NOT consulted: routes
 * borrow a parent's `active` for the nav mark without being its shape, so an
 * unmeasured route falls through to the generic grid rather than borrowing a
 * sibling's geometry.
 */
export const MB_ROUTE_SKELETON: Record<string, MbRouteSkeleton> = {
  "/": {
    emptySignal: "played",
    full: {
      grid: "grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12",
      lead: 202,
      leadXl: 68,
      cells: [
        { span: 7, panels: [{ h: 568, xl: 465 }] },
        { span: 5, panels: [{ h: 404, xl: 278, head: false }] },
        { span: 4, panels: [{ h: 338, xl: 317 }] },
        { span: 4, panels: [{ h: 562, xl: 541 }] },
        { span: 4, panels: [{ h: 337, xl: 316 }] },
        { span: 4, panels: [{ h: 482, xl: 461 }] },
        { span: 4, panels: [{ h: 464, xl: 443 }] },
        { span: 4, panels: [{ h: 337 }] },
      ],
    },
    /* Two panels: the progression, then the ruled index of what the page
       becomes. */
    empty: {
      grid: "grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12",
      lead: 156,
      leadXl: 68,
      cells: [
        { span: 7, panels: [{ h: 349, head: false }] },
        { span: 5, panels: [{ h: 442, xl: 365 }] },
      ],
    },
  },
  "/teams": {
    emptySignal: "teams",
    full: {
      grid: "grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12",
      lead: 140,
      leadXl: 76,
      cells: [
        { span: 7, panels: [{ h: 961, xl: 798 }] },
        { span: 5, panels: [{ h: 177, head: false }, { h: 405, xl: 377, head: false }] },
        { span: 5, panels: [{ h: 746, xl: 549 }] },
        { span: 4, panels: [{ h: 629, xl: 608 }] },
        { span: 3, panels: [{ h: 372 }] },
      ],
    },
    /* Two panels, not six: the empty directory withholds the mute panels and
       prints one ledger of what the page becomes (`src/app/teams/page.tsx`). */
    empty: {
      grid: "grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12",
      lead: 120,
      leadXl: 68,
      cells: [
        { span: 7, panels: [{ h: 471, xl: 421 }] },
        { span: 5, panels: [{ h: 229, xl: 213 }] },
      ],
    },
  },
  "/quick-match": {
    emptySignal: "twoTeams",
    full: {
      grid: "grid-cols-1 gap-4 xl:grid-cols-12",
      lead: 92,
      leadXl: 76,
      /* The route ends in `MbActionBar` (Start Scoring), below the grid. At
         `xl` the bar's `mt-auto` parks it on the viewport bottom, so the tail
         under-states the desktop document by the auto margin — which is air,
         not a control. */
      tail: 82,
      cells: [
        { span: 7, panels: [{ h: 543, xl: 301 }] },
        { span: 5, panels: [{ h: 222, head: false }] },
        { span: 7, panels: [{ h: 362, xl: 239 }] },
        { span: 5, panels: [{ h: 153 }] },
      ],
    },
    /* Two panels, not four: below two teams the preview and the two strips
       under it are withheld into one index (`src/app/quick-match/page.tsx`). */
    empty: {
      grid: "grid-cols-1 gap-4 xl:grid-cols-12",
      lead: 92,
      leadXl: 76,
      /* The bar ships on the empty route too — Start Scoring, disabled. */
      tail: 82,
      cells: [
        { span: 7, panels: [{ h: 192 }] },
        { span: 5, panels: [{ h: 213, xl: 277 }] },
      ],
    },
  },
  "/competitions": {
    emptySignal: "competitions",
    full: {
      grid: "grid-cols-1 gap-4 xl:grid-cols-12",
      lead: 120,
      leadXl: 68,
      cells: [
        { span: 7, panels: [{ h: 469, xl: 437 }] },
        { span: 5, panels: [{ h: 296, xl: 207, head: false }] },
        { span: 7, panels: [{ h: 647, xl: 509 }] },
        { span: 5, panels: [{ h: 151, xl: 130 }] },
        { span: 4, panels: [{ h: 136 }] },
        { span: 4, panels: [{ h: 372 }] },
        { span: 4, panels: [{ h: 226, xl: 205 }] },
      ],
    },
    /* The one route whose GRID also changes: with two panels the page pairs
       them at `md` instead of running one column to `xl`. */
    empty: {
      grid: "grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12",
      lead: 120,
      leadXl: 68,
      cells: [
        { span: 7, panels: [{ h: 442, xl: 359 }] },
        { span: 5, panels: [{ h: 228, xl: 207 }] },
      ],
    },
  },
  "/summaries": {
    emptySignal: "played",
    full: {
      /* The tallest lead in the app: a three-control filter bar sits between
         the masthead and the grid, each control on its own line on a phone. */
      grid: "grid-cols-1 gap-4 xl:grid-cols-12",
      lead: 407,
      leadXl: 185,
      cells: [
        { span: 7, panels: [{ h: 2210, xl: 1335 }, { h: 595, xl: 403 }] },
        {
          span: 5,
          panels: [
            { h: 196, xl: 182, head: false },
            { h: 269, xl: 253 },
            { h: 261, xl: 240 },
            { h: 112 },
          ],
        },
      ],
    },
    /* The filter bar does not ship on the empty page, so the lead is the
       masthead alone. The empty page is SHORTER than the viewport, so
       `documentElement.scrollHeight` floors at the viewport height and no
       longer reports content height — anything comparing this spec to a
       document height has to account for that floor. */
    empty: {
      grid: "grid-cols-1 gap-4 xl:grid-cols-12",
      lead: 120,
      leadXl: 68,
      cells: [
        { span: 7, panels: [{ h: 153 }] },
        { span: 5, panels: [{ h: 323, xl: 277 }] },
      ],
    },
  },
  /* No `empty`: the toolkit is static content — the same page on every
     account. */
  "/tools": {
    full: {
      grid: "grid-cols-1 gap-4 xl:grid-cols-12",
      lead: 136,
      leadXl: 76,
      cells: [
        { span: 12, panels: [{ h: 353, xl: 260 }] },
        { span: 7, panels: [{ h: 249, xl: 207 }] },
        { span: 5, panels: [{ h: 325, xl: 334, head: false }] },
      ],
    },
  },
};

/* ------------------------------------------------------------- the account

   The skeleton reads the same `localStorage` blob `AppContext` reads, because
   waiting for `AppContext` is exactly what the skeleton is covering for:
   `AppContext` starts at `initialState` and fills in a mount effect, so asking
   it would return "empty" for every account on the first frame.

   `useSyncExternalStore` rather than `useEffect` + `useState`: this component
   server-renders, and `getServerSnapshot` is the sanctioned way to say "the
   server cannot know" without hydrating a mismatch. Server and hydrating
   client both see `null` and reserve `full`; the client re-renders with the
   real answer immediately after. */

/** Only the three counts any `emptySignal` asks about. */
export interface MbAccountShape {
  teams: number;
  competitions: number;
  /** Completed non-bye matches plus in-progress ones — `isFirstRun`'s count. */
  played: number;
}

interface StoredMatch {
  status?: string;
  isBye?: boolean;
}

/** `null` for anything unreadable, which reserves `full`. */
const shapeOf = (raw: string | null): MbAccountShape | null => {
  // No key at all is not a failure — it is a brand new account, which is the
  // single most important case this whole table exists to get right.
  if (raw === null) return { teams: 0, competitions: 0, played: 0 };
  try {
    const state = JSON.parse(raw) as {
      teams?: unknown[];
      competitions?: unknown[];
      matches?: StoredMatch[];
    };
    const matches = Array.isArray(state?.matches) ? state.matches : [];
    return {
      teams: Array.isArray(state?.teams) ? state.teams.length : 0,
      competitions: Array.isArray(state?.competitions) ? state.competitions.length : 0,
      played: matches.filter(
        (m) => (m?.status === "completed" && !m?.isBye) || m?.status === "in_progress"
      ).length,
    };
  } catch {
    return null;
  }
};

/* `useSyncExternalStore` calls `getSnapshot` on every render and compares by
   reference, so a fresh object each time is an infinite render loop. The raw
   string is the cache key: same blob, same shape object. */
let cachedRaw: string | null | undefined;
let cachedShape: MbAccountShape | null = null;

const readAccount = (): MbAccountShape | null => {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Blocked storage (private mode, embedded webview). Unknown, not empty.
    return null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedShape = shapeOf(raw);
  }
  return cachedShape;
};

/** The server has no `localStorage` and must not guess. */
const serverAccount = (): MbAccountShape | null => null;

const subscribeAccount = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

const IS_EMPTY: Record<MbEmptySignal, (a: MbAccountShape) => boolean> = {
  played: (a) => a.played === 0,
  teams: (a) => a.teams === 0,
  competitions: (a) => a.competitions === 0,
  twoTeams: (a) => a.teams < 2,
};

/** The one place `full` and `empty` are chosen between. Exported for the test. */
export const mbSkeletonSpecFor = (
  entry: MbRouteSkeleton,
  account: MbAccountShape | null
): MbSkeletonRouteSpec => {
  if (!entry.empty || !entry.emptySignal || account === null) return entry.full;
  return IS_EMPTY[entry.emptySignal](account) ? entry.empty : entry.full;
};

/**
 * The one place a reserved height is applied. A `<style>` element because the
 * heights are DATA and Tailwind only compiles a utility whose literal text
 * appears in a source file — `h-[${spec.h}px]` compiles to nothing — while
 * inline style cannot carry a media query. So the breakpoint lives here and
 * the numbers arrive as custom properties. 1280px is Tailwind's `xl`, the
 * breakpoint every one of these grids switches its columns at.
 */
const RESERVED_CSS = `
.mb-skel-fixed { height: var(--mb-skel-h); overflow: hidden; }
@media (min-width: 1280px) { .mb-skel-fixed { height: var(--mb-skel-h-xl); } }
`;

/** A `.mb-panel-head`'s box, and one ruled `px-4 py-2.5` row. Both measured. */
const HEAD_H = 43;
const ROW_H = 49;

/** Enough rows to fill the taller of the two reservations. The cap is 45
 *  because the archive's ledger legitimately reserves 2210px of 79px rows —
 *  a lower cap leaves blank paper inside the fixed box. */
const rowsFor = (spec: MbSkeletonPanelSpec): number => {
  const tallest = Math.max(spec.h, spec.xl ?? spec.h);
  const body = tallest - (spec.head === false ? 0 : HEAD_H);
  return Math.min(45, Math.max(1, Math.round(body / ROW_H)));
};

const reserved = (h: number, xl?: number): CSSProperties =>
  ({ "--mb-skel-h": `${h}px`, "--mb-skel-h-xl": `${xl ?? h}px` }) as CSSProperties;

/* ------------------------------------------------------------------- bones */

/** Sized so the bar reads as the height it will be, not as a hairline. */
const Bar = ({
  h,
  w,
  className = "",
}: {
  h: string;
  w: string;
  className?: string;
}) => (
  <span className={`block ${h} ${w} ${className}`}>
    <MbSkeleton w="100%" h="100%" radius={2} />
  </span>
);


/* --------------------------------------------------------------- skeletons */

/**
 * Name-bar widths, cycled rather than randomised: `Math.random()` differs
 * between server and client and hydrates as a mismatch, and a single width
 * renders a barcode. Whole class names, not interpolated fragments — Tailwind
 * only generates a utility whose literal text appears in a source file.
 */
const ROW_WIDTHS = ["w-[78%]", "w-[62%]", "w-[88%]", "w-[54%]", "w-[70%]"];

/* ------------------------------------------------------------ the boot gate

   `/summaries` swaps its whole composition on emptiness, and `AppContext`
   fills from `localStorage` in a mount EFFECT — after first paint — so a cold
   document would paint the empty composition once and then swap, a large
   layout shift. No React-side answer can fix that first paint: the only thing
   that runs before the first layout of a cold document is an inline script.

     MbBootSniff    executes AT PARSE. Reads the same blob `readAccount`
                    reads, applies the same `played` test, and injects a
                    `<style>` into `<head>` hiding whichever first-paint
                    variant is not this account's, plus `--mb-boot-ledger`
                    (the populated ledger's height). Pre-boot the page renders
                    BOTH variants; the injected rule picks one before either
                    is painted.
     MbLedgerBones  the ledger's reservation, clipped to `--mb-boot-ledger`.
     MbBootPanelBones
                    a withheld panel's reservation, at its measured height.

   An injected `<style>`, NOT a class on `<html>`: `<html>` is React-rendered,
   and a class added before hydration is an attribute mismatch React 19
   reports as a console error — while head nodes the server did not send are
   the one thing hydration explicitly tolerates. The gate classes exist only
   while `useMatchbookHistory().hydrating` is true; a client-side navigation
   never mounts the sniff. Storage unreadable leaves `full` set — unknown
   reserves the populated geometry, the same fallback as above.

   The numbers are measured off the shipped populated ledger: a one-line row
   is 44px from `sm` up, the two-line narrow cut 79px, a day band 31px, the
   "Showing 25 of N" footer 34px. */

const BOOT_ROW_M = 79;
const BOOT_ROW = 44;
const BOOT_BAND = 31;
const BOOT_NOTE = 34;

const BOOT_SCRIPT = `(function () {
  var full = true;
  var h = "";
  try {
    var raw = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
    if (raw === null) { full = false; }
    else {
      var st = JSON.parse(raw);
      var ms = Array.isArray(st.matches) ? st.matches : [];
      var done = [];
      var live = 0;
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i] || {};
        if (m.status === "completed" && !m.isBye) done.push(m.completedAt || 0);
        else if (m.status === "in_progress") live++;
      }
      full = done.length + live > 0;
      if (done.length > 0) {
        done.sort(function (a, b) { return b - a; });
        var top = done.slice(0, 25);
        var days = {};
        for (var j = 0; j < top.length; j++) days[new Date(top[j]).toDateString()] = 1;
        h = top.length * (window.innerWidth < 640 ? ${BOOT_ROW_M} : ${BOOT_ROW})
          + Object.keys(days).length * ${BOOT_BAND}
          + (done.length > 25 ? ${BOOT_NOTE} : 0) + "px";
      }
    }
  } catch (e) {}
  try {
    var s = document.createElement("style");
    s.textContent =
      (full ? ".mb-boot-empty-only{display:none}" : ".mb-boot-full-only{display:none}") +
      (h ? ":root{--mb-boot-ledger:" + h + "}" : "");
    document.head.appendChild(s);
  } catch (e) {}
})();`;

/**
 * The sniff. Must be rendered BEFORE any `.mb-boot-full-only` /
 * `.mb-boot-empty-only` element in document order — the script executes when
 * the parser reaches it. Render it only while the page is pre-boot. The
 * `<style>` here is `RESERVED_CSS` because `MbBootPanelBones` reserves through
 * the same `.mb-skel-fixed` contract `MbPageLoading` uses.
 */
export const MbBootSniff = () => (
  <>
    <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
    <style>{RESERVED_CSS}</style>
  </>
);

/**
 * A withheld panel's first-paint reservation: `MbSkeletonPanel` pinned to the
 * height the route table measured for it, shown only while the boot sniff has
 * ruled the account populated.
 */
export const MbBootPanelBones = ({ h, xl, head = true }: MbSkeletonPanelSpec) => (
  <MbSkeletonPanel
    rows={rowsFor({ h, xl, head })}
    head={head !== false}
    className="mb-boot-full-only mb-skel-fixed"
    style={reserved(h, xl)}
  />
);

/**
 * The populated ledger's first-paint reservation: bone rows at the ledger's
 * own rhythm, clipped to the height the sniff computed. With the variable
 * unset (storage unreadable) the bones run their natural 25-row height.
 */
export const MbLedgerBones = () => (
  <div
    aria-hidden="true"
    className="mb-boot-full-only overflow-hidden"
    style={{ height: "var(--mb-boot-ledger, auto)" }}
  >
    {Array.from({ length: 25 }, (_, i) => (
      <div
        key={i}
        className="grid h-[79px] grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-2 border-b border-mb-rule px-4 sm:h-[44px]"
      >
        <Bar h="h-[0.66rem]" w="w-10" />
        <span className="min-w-0">
          <Bar h="h-[0.82rem]" w={ROW_WIDTHS[i % ROW_WIDTHS.length]} />
        </span>
        <Bar h="h-[0.66rem]" w="w-16" className="hidden lg:block" />
      </div>
    ))}
  </div>
);

/**
 * One panel's bones at the shipped row rhythm: a `.mb-panel-head`, then ruled
 * rows carrying a crest slot, a name and a right-ranged measure — the shared
 * anatomy of the standings, schedule, results and readiness panels.
 */
export const MbSkeletonPanel = ({
  rows = 4,
  head = true,
  style,
  className = "",
}: {
  rows?: number;
  /** `false` drops the `.mb-panel-head`, for panels that ship without one. */
  head?: boolean;
  /**
   * Carries the reserved-height custom properties. Only honoured when
   * `.mb-skel-fixed` is in `className` AND `RESERVED_CSS` is on the page;
   * standalone callers pass neither and get a panel sized to its rows.
   */
  style?: CSSProperties;
  className?: string;
}) => (
  <section className={`mb-panel ${className}`} style={style} aria-hidden="true">
    {/* The bars sit inside 24px SLOTS rather than being 24px themselves: a
        `.mb-panel-head` is sized by its title's line box, not its glyph
        height, so a bar cut to the type step alone makes the skeleton head
        shorter than the real one and the top of every panel jumps. The slot
        restores the line box; the bar keeps the type step. */}
    {head && (
      <header className="mb-panel-head">
        <span className="flex h-6 w-[9rem] max-w-[60%] items-center">
          <MbSkeleton w="100%" h="0.95rem" radius={2} />
        </span>
        <span className="flex h-6 w-[4.5rem] items-center">
          <MbSkeleton w="100%" h="0.62rem" radius={2} />
        </span>
      </header>
    )}
    <div className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-mb-rule px-4 py-2.5 last:border-b-0"
        >
          {/* The crest slot is 24 x 28 — `Crest`'s own aspect (96:112) at the
              `md` step — so the row height is right before any data arrives. */}
          <Bar h="h-[28px]" w="w-[24px]" className="shrink-0" />
          <span className="min-w-0 flex-1">
            <Bar h="h-[0.82rem]" w={ROW_WIDTHS[i % ROW_WIDTHS.length]} />
          </span>
          <Bar h="h-[0.9rem]" w="w-10" className="shrink-0" />
        </div>
      ))}
    </div>
  </section>
);

/**
 * Column spans as whole class names, because Tailwind compiles a utility only
 * when its literal text appears in a source file — `xl:col-span-${n}` compiles
 * to nothing at all, which is a skeleton silently collapsing to one column.
 */
const SPAN_CLASS: Record<MbSkeletonCellSpec["span"], string> = {
  3: "xl:col-span-3",
  4: "xl:col-span-4",
  5: "xl:col-span-5",
  7: "xl:col-span-7",
  12: "xl:col-span-12",
};

/**
 * The fallback layout for a route with no measured spec: a 7/5 pair, then
 * 4/4/4 rows. A lookup rather than arithmetic so an off-scale span cannot be
 * expressed.
 */
const genericSpan = (i: number): string =>
  i === 0 ? SPAN_CLASS[7] : i === 1 ? SPAN_CLASS[5] : SPAN_CLASS[4];

/**
 * The masthead's bones — the exact furniture every console masthead carries,
 * at the same steps, so nothing jumps when the real one replaces it.
 */
export const MbSkeletonMasthead = () => (
  <header className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-4">
    <div className="flex items-center gap-4">
      {/* text-4xl / sm:text-5xl at leading-none = 36px, then 48px. */}
      <Bar h="h-9 sm:h-12" w="w-[13rem] max-w-[62vw]" />
      <span className="hidden flex-col gap-1.5 sm:flex">
        <Bar h="h-[0.74rem]" w="w-[6rem]" />
        <Bar h="h-[0.62rem]" w="w-[8rem]" />
      </span>
    </div>
    <div className="ml-auto hidden items-center gap-3 sm:flex">
      <Bar h="h-12" w="w-[9rem]" />
      <Bar h="h-12" w="w-[9rem]" />
    </div>
  </header>
);

/** The measured route's grid: its own columns, its own spans, its own heights. */
const MeasuredGrid = ({ spec }: { spec: MbSkeletonRouteSpec }) => (
  <>
    {/* The masthead's bones inside the box the real masthead (plus any filter
        bar the page carries) will fill. */}
    <div className="mb-skel-fixed" style={reserved(spec.lead, spec.leadXl)}>
      <MbSkeletonMasthead />
    </div>
    <div className={`mb-enter-grid grid ${spec.grid}`}>
      {spec.cells.map((cell, i) => (
        <div key={i} className={`flex flex-col gap-4 ${SPAN_CLASS[cell.span]}`}>
          {cell.panels.map((panel, j) => (
            <MbSkeletonPanel
              key={j}
              rows={rowsFor(panel)}
              head={panel.head !== false}
              className="mb-skel-fixed"
              style={reserved(panel.h, panel.xl)}
            />
          ))}
        </div>
      ))}
    </div>
    {/* The post-grid band, where the route ships one: a full-width bone at
        the band's own height. */}
    {spec.tail !== undefined && (
      <div
        aria-hidden="true"
        className="mb-skel-fixed mt-4"
        style={reserved(spec.tail, spec.tailXl)}
      >
        <MbSkeleton w="100%" h="100%" radius={2} />
      </div>
    )}
  </>
);

/**
 * The fallback grid for a route with no measured spec. `panels` defaults to 5
 * because 7/5 + 4/4/4 is exactly two full rows; callers wanting a fuller page
 * should pass 2 + 3n.
 */
const GenericGrid = ({ panels }: { panels: number }) => (
  <div className="mb-enter-grid grid grid-cols-1 gap-4 xl:grid-cols-12">
    {Array.from({ length: Math.max(1, panels) }, (_, i) => (
      <div key={i} className={genericSpan(i)}>
        <MbSkeletonPanel rows={i === 0 ? 6 : 4} />
      </div>
    ))}
  </div>
);

/**
 * The loading state of a whole route. `panels` only applies when the route is
 * unmeasured — a route in `MB_ROUTE_SKELETON` draws its own panels and
 * ignores it.
 */
export const MbPageLoading = ({
  variant = "console",
  active,
  panels = 5,
}: {
  variant?: MatchbookShellVariant;
  /** Route the shell should mark current. Omit and the shell reads the URL. */
  active?: string;
  panels?: number;
}) => {
  /* The URL, never `active`: `active` is the nav-highlight hint and several
     routes borrow a parent's without being its shape. */
  const pathname = usePathname();
  const account = useSyncExternalStore(subscribeAccount, readAccount, serverAccount);
  const entry = variant === "console" ? MB_ROUTE_SKELETON[pathname ?? ""] : undefined;
  const spec = entry ? mbSkeletonSpecFor(entry, account) : undefined;

  return (
    /* No `masthead` prop: the masthead's bones are drawn below, inside
       `<main>`, where the real one will land. */
    <MatchbookShell variant={variant} active={active}>
      {spec && <style>{RESERVED_CSS}</style>}
      {/* One polite announcement for the whole route; the skeleton itself is
          aria-hidden, so a screen reader hears this once instead of crawling
          forty empty boxes. */}
      <span className="sr-only" role="status">
        Loading page content
      </span>
      {/* `variant="focus"` gives `<main>` no padding — on a real scoring route
          `children` is the element handed to the Fullscreen API — so the
          skeleton supplies the gutter itself. It also draws no masthead there:
          on `focus` the navy `MbEventBar` IS the masthead, drawn by the shell
          above. `.mb-enter-grid` staggers the panels in reading order; removed
          outright under prefers-reduced-motion. */}
      <div
        aria-busy="true"
        className={variant === "focus" ? "px-4 py-5 sm:px-6 lg:px-8" : ""}
      >
        {spec ? (
          <MeasuredGrid spec={spec} />
        ) : (
          <>
            {variant !== "focus" && <MbSkeletonMasthead />}
            <GenericGrid panels={panels} />
          </>
        )}
      </div>
    </MatchbookShell>
  );
};

/* ------------------------------------------------------------- route states */

interface MbRouteStateCopy {
  tone: PanelEmptyTone;
  title: string;
  body: string;
}

/**
 * The copy for the three failure routes, written once so `app/error.tsx` and
 * the gallery cannot drift. None of them names a provider, a stack frame or
 * an error message; `app/error.tsx` surfaces the Next.js `digest` as a
 * reference code instead.
 */
export type MbRouteStateId = "error" | "notFound" | "globalError";

export const MB_ROUTE_STATE: Record<MbRouteStateId, MbRouteStateCopy> = {
  error: {
    tone: "error",
    title: "This page could not be loaded",
    body: "Something failed while the page was being built. Trying again usually fixes it — the rest of the app is unaffected.",
  },
  notFound: {
    tone: "notfound",
    title: "This page does not exist",
    body: "The address may be mistyped, or the competition it pointed at may have been deleted.",
  },
  globalError: {
    tone: "error",
    title: "The app could not start",
    body: "Something failed before the interface finished loading. Reloading is the only thing that helps from here.",
  },
};

/**
 * The visible body of a failure route, drawn once. `app/error.tsx`,
 * `app/not-found.tsx`, `app/global-error.tsx` and the `/dev/states/*` harness
 * all render THIS, differing only in frame and available actions
 * (`global-error` has no router, so no links). The digest renders as a
 * `.mb-code-chip` reference token; `error.message` never appears in this
 * component's inputs.
 */
export const MbRouteState = ({
  state,
  digest,
  actions,
}: {
  state: MbRouteStateId;
  /** Next.js's own error hash, if the boundary was given one. */
  digest?: string;
  actions: MbEmptyStateAction[];
}) => {
  const copy = MB_ROUTE_STATE[state];
  return (
    <MbEmptyState
      tone={copy.tone}
      title={copy.title}
      body={
        <>
          {copy.body}
          {digest && (
            <>
              {" "}
              <span className="mb-code-chip mt-2 inline-flex">Reference {digest}</span>
            </>
          )}
        </>
      }
      actions={actions}
    />
  );
};
