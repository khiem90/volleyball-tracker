"use client";

/* ===========================================================================
   ROUTE-LEVEL STATES (charter §2.3, GAP-8, shell R6, W2 / P2b)

   Three things live here, because all three are the same object seen from
   different angles — "the route is not showing its content yet, and here is
   the reason":

     MbPageLoading     MatchbookShell + a skeleton grid at the final geometry.
     MbRouteState      the visible body of a failure route, drawn once.
     MB_ROUTE_STATE    the copy for error / not-found / global-error, in one
                       place so `app/error.tsx` and the gallery cannot drift.

   ---------------------------------------------- why a skeleton, not a spinner

   Invariant 26 is a hard fail: "Loading is a skeleton at the FINAL GEOMETRY,
   never a spinner and never a full-page blocking spinner." The reason is not
   taste. A spinner says "something is happening"; a skeleton says "this is
   what is arriving, and it is arriving HERE". The second one lets the reader
   start parsing the layout — which panel is standings, which is the schedule —
   before a single byte of data lands, and it means nothing moves when the data
   does. `PageLoadingSpinner`, which this replaces, additionally rendered the
   legacy `<Navigation/>`, so every converted route flashed the pre-Matchbook
   header before painting cream (invariant 2, also a hard fail).

   The frame is the REAL shell, not a grey approximation of one: the actual
   sidebar with the actual nav links, live and clickable. A user who lands on a
   slow route can navigate straight back out of it, which a spinner has never
   allowed.

   ------------------------------------------------------------- THE SHELL

   `MatchbookShell` (`AppShell.tsx`, W2/P2a) is the shell, and this file does
   not re-declare a millimetre of it. That is not tidiness: a loading screen
   drawn on a *replica* of the shell is the exact defect this replaces —
   `PageLoadingSpinner` painted a plausible-looking header that was not the
   header, so the real one arrived and everything jumped.

   It briefly carried its own `MbPageFrame` because `AppShell.tsx` did not
   exist when this was written. The sibling landed it mid-round and the frame
   was deleted rather than kept, so there is one shell in the codebase and not
   one-and-a-half.
   =========================================================================== */

import { useSyncExternalStore, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { STORAGE_KEY } from "@/context/appReducer";
import { MatchbookShell, type MatchbookShellVariant } from "./AppShell";
import { MbSkeleton } from "./Skeleton";
import { MbEmptyState, type MbEmptyStateAction } from "./EmptyState";
import type { PanelEmptyTone } from "./Panel";

/* --------------------------------------------------------- reserved heights

   A skeleton that is a third of the height of what replaces it is a layout
   shift with extra steps (invariant 27). Measured before this table existed,
   `MbPageLoading` drew the same five panels on every route and the document
   grew when the data landed:

       route          390x844                    1440x900
       /              1593 -> 3164   +1571       900 -> 1318   +418
       /teams         1593 -> 3333   +1740       900 -> 1249   +349
       /competitions  1593 -> 2509    +916       900 -> 1344   +444
       /summaries     1593 -> 3170   +1577       900 -> 1792   +892
       /quick-match   1593 -> 1373    -220       900 ->  900     +0
       /tools         1593 -> 1798    +205       900 ->  900     +0

   — and on `/competitions` it drew five panels for seven real ones, in the
   wrong spans, so nothing it reserved was even in the right column.

   So each console route now declares the geometry it is about to become. The
   numbers are MEASURED off the shipped page at 390x844 and 1440x900
   (`pw/mb-geom.mjs`), not estimated, and the table is ordered exactly as the
   page's own grid children are — same spans, same column grouping — so a
   panel's bones land where its content will.

   ------------------------------------------------- TWO GEOMETRIES, NOT ONE

   A route's height depends on its data, and on `/` and `/competitions` so does
   its PANEL COUNT: the first-run composition draws TWO panels where a
   populated account draws eight. This table used to hold only the populated
   numbers, and argued that no single skeleton could be 0px against both — true
   as far as it went, and it picked the safer residual, because reserving too
   little GROWS the document under a finger that is already reaching, while
   reserving too much only ends the page sooner.

   That argument was sound for a ±200px residual. It stopped being sound when
   the first-run work landed and the empty compositions collapsed. Measured
   against the empty fixture at 390x844, with the populated numbers reserved:

       route          skeleton -> loaded          panels
       /              3173 -> 1117    -2056       8 -> 2
       /teams         3342 -> 1543    -1799       6 -> 6
       /competitions  2520 ->  960    -1560       7 -> 2
       /summaries     3178 -> 1600    -1578       6 -> 6
       /quick-match   1382 -> 1195     -187       4 -> 4

   That is the state EVERY user is in for their first thirty seconds, and what
   it shows them is a tall ghost of an app they do not have, which then
   collapses to a fifth of its height. It is the same defect the first-run work
   was done to remove, arriving through the loading door: eight panels of
   nothing, promised and then withdrawn.

   The premise was also simply false. The skeleton CAN know which composition
   is coming, because it can read the same `localStorage` the page reads — see
   `readAccount` below. So each route carries `full` and, where its composition
   swaps, `empty`, plus the `emptySignal` that decides between them. Unknown
   accounts (server render, blocked storage, corrupt blob) still fall back to
   `full`, which keeps the old safe-residual argument exactly where it belongs
   — as the FALLBACK rather than the whole policy. Measured after, same fixture
   and viewport, every route 0px per panel and correct in its panel count:

       route          390x844          1440x900
       /              1127 -> 1117     900 -> 900
       /teams         1553 -> 1543     900 -> 900
       /competitions   970 ->  960     900 -> 900
       /summaries     1608 -> 1600     900 -> 900
       /quick-match   1204 -> 1195     900 -> 900

   (The residual 8–10px on the phone is `.mb-enter-grid`'s entrance transform
   sampled mid-flight, not a box — it is the same 9px the populated table has
   always carried, and it goes to 0 at rest.)

   ------------------------------------------- ONE RESIDUAL: THE COLD DOCUMENT

   `getServerSnapshot` returns "unknown", so the SSR'd HTML of a cold load
   reserves `full` on every account. React re-renders with the real snapshot
   directly after hydration — which is why every in-app navigation measures 0px
   above — but on a COLD document that correction has no visible window:
   hydration and `AuthContext` resolve in the same breath, so the next thing
   painted is the page itself, not a corrected skeleton. Measured on `/` with
   the empty fixture at 390x844, sampled every frame from commit:

       157ms  8 panels / 3173px   the SSR skeleton (full geometry)
       748ms  2 panels / 1117px   the real first-run page

   So a brand-new account still meets one over-tall skeleton, once, on its
   first document. Fixing that needs a value the server does not have, and the
   two ways to get one are both worse: guessing `empty` instead moves the wrong
   geometry onto every RETURNING user, who cold-loads far more often than a new
   user does it once; and an inline pre-paint script that reads `localStorage`
   into an attribute would have to live in `app/layout.tsx` and re-express this
   whole table as CSS overrides. `full` is the right fallback because it is
   right for the common case and wrong exactly once per user.

   ------------------------------------------------------------------ upkeep

   These are dimensions of OTHER components' output, so they rot when those
   components change. `src/__tests__/shell/skeletonSpec.test.ts` pins the shape
   (every console destination has a spec; every span is on the 12-col scale;
   every reserved height is positive; an `empty` spec implies a signal), which
   catches a deleted route but not a re-cut panel. Re-run `pw/mb-geom.mjs`
   (and `pw/mb-geom.mjs --empty`) after any panel-level redesign. */

/** One panel's bones. `h` is 390x844, `xl` is 1440x900; `xl` defaults to `h`. */
export interface MbSkeletonPanelSpec {
  h: number;
  xl?: number;
  /** `false` mirrors a real panel that renders no `.mb-panel-head`. */
  head?: boolean;
}

/**
 * One grid child: a column span and the panels stacked inside it.
 *
 * `3` is on the list because `/teams` ships a 5/4/3 row. Invariant 4 names
 * 7/5, 4/4/4 and 12 as the scale, and this table is not the place to argue
 * with a shipped page — a skeleton that drew 4/4/4 over a 5/4/3 row would put
 * every bone in the wrong column to make a different file's point.
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
  cells: MbSkeletonCellSpec[];
}

/**
 * Which count being zero means this route draws its first-run composition.
 *
 * A name rather than a predicate so the table stays data and the test can
 * exercise every branch. Each one mirrors the page's OWN emptiness test, and
 * where it does not it is named here:
 *
 *   played        `/` — `useMatchbookDashboard`'s `isFirstRun`, verbatim: no
 *                 completed non-bye match and no in-progress one.
 *                 `/summaries` reads the same count; its ledger is a list of
 *                 exactly those matches.
 *   competitions  `/competitions` — `useMatchbookCompete`'s `isFirstRun` is
 *                 `rows.length === 0`, and `rows` is `competitions` mapped.
 *   teams         `/teams` and `/quick-match`. Neither swaps its panel COUNT;
 *                 both collapse when the directory has nothing to list, and a
 *                 match cannot exist without teams, so this is the stricter
 *                 of the two conditions and never fires on an account that
 *                 has data to show.
 */
export type MbEmptySignal = "played" | "teams" | "competitions";

export interface MbRouteSkeleton {
  /** The account with data. Also the fallback whenever the account is unknown. */
  full: MbSkeletonRouteSpec;
  /** The first-run composition. Omitted where the route does not vary. */
  empty?: MbSkeletonRouteSpec;
  /** Required with `empty`, meaningless without it. */
  emptySignal?: MbEmptySignal;
}

/**
 * Keyed by exact pathname. `active` is deliberately NOT consulted:
 * `/tools/volleyball-rotations/my-formations` passes `active="/tools"` for the
 * nav mark and is not remotely the shape of `/tools`, so a route that has not
 * been measured falls through to the generic grid rather than borrowing a
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
        { span: 5, panels: [{ h: 238, head: false }] },
        { span: 4, panels: [{ h: 249, xl: 228 }] },
        { span: 4, panels: [{ h: 283, xl: 262 }] },
        { span: 4, panels: [{ h: 337, xl: 316 }] },
        { span: 4, panels: [{ h: 309, xl: 288 }] },
        { span: 4, panels: [{ h: 419, xl: 398 }] },
        { span: 4, panels: [{ h: 292 }] },
      ],
    },
    /* Two panels: the progression, then the ruled index of what the page
       becomes. The masthead is 46px shorter here than on a populated account
       because its dateline has no figures to print. */
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
      lead: 134,
      leadXl: 70,
      cells: [
        /* Re-measured 964/598 -> 960/594. The directory's head is now 64px
           (it gained a second line); the 4px is that rule settling. NOTE for
           whoever integrates this round: `teamPanels.tsx` was being edited by
           another agent while this was measured, and this panel was seen at
           750 mid-edit before settling back to 960 across three consecutive
           runs. Re-run `pw/mb-geom.mjs` once that file is final. */
        { span: 7, panels: [{ h: 960, xl: 594 }] },
        { span: 5, panels: [{ h: 169, head: false }, { h: 377, head: false }] },
        { span: 5, panels: [{ h: 700, xl: 525 }] },
        { span: 4, panels: [{ h: 382, xl: 361 }] },
        { span: 3, panels: [{ h: 372 }] },
      ],
    },
    /* Same six panels in the same five cells — this page keeps its shape and
       only loses its rows. */
    empty: {
      grid: "grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12",
      lead: 134,
      leadXl: 70,
      cells: [
        { span: 7, panels: [{ h: 153 }] },
        { span: 5, panels: [{ h: 169, head: false }, { h: 153, head: false }] },
        { span: 5, panels: [{ h: 174, xl: 153 }] },
        { span: 4, panels: [{ h: 274, xl: 252 }] },
        { span: 3, panels: [{ h: 252, xl: 273 }] },
      ],
    },
  },
  "/quick-match": {
    emptySignal: "teams",
    full: {
      grid: "grid-cols-1 gap-4 xl:grid-cols-12",
      lead: 134,
      leadXl: 70,
      cells: [
        { span: 7, panels: [{ h: 330, xl: 301 }] },
        { span: 5, panels: [{ h: 293, head: false }] },
        { span: 7, panels: [{ h: 260, xl: 239 }] },
        { span: 5, panels: [{ h: 153 }] },
      ],
    },
    empty: {
      grid: "grid-cols-1 gap-4 xl:grid-cols-12",
      lead: 134,
      leadXl: 70,
      cells: [
        { span: 7, panels: [{ h: 192 }] },
        { span: 5, panels: [{ h: 293, head: false }] },
        { span: 7, panels: [{ h: 220, xl: 198 }] },
        { span: 5, panels: [{ h: 153 }] },
      ],
    },
  },
  "/competitions": {
    emptySignal: "competitions",
    full: {
      grid: "grid-cols-1 gap-4 xl:grid-cols-12",
      lead: 148,
      leadXl: 68,
      cells: [
        { span: 7, panels: [{ h: 465, xl: 430 }] },
        { span: 5, panels: [{ h: 296, xl: 207, head: false }] },
        { span: 7, panels: [{ h: 647, xl: 509 }] },
        { span: 5, panels: [{ h: 117, xl: 96 }] },
        { span: 4, panels: [{ h: 85 }] },
        { span: 4, panels: [{ h: 237 }] },
        { span: 4, panels: [{ h: 265 }] },
      ],
    },
    /* The one route whose GRID also changes: with two panels the page pairs
       them at `md` instead of running one column to `xl`. Copied verbatim from
       the shipped page, same as every other `grid` in this table. */
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
      /* The tallest lead in the app: this page puts a three-control filter bar
         between its masthead and its grid, and on a phone those controls each
         take their own line. */
      grid: "grid-cols-1 gap-4 xl:grid-cols-12",
      lead: 401,
      leadXl: 179,
      cells: [
        { span: 7, panels: [{ h: 1335 }, { h: 363, xl: 222 }] },
        {
          span: 5,
          panels: [
            { h: 196, xl: 182, head: false },
            { h: 253 },
            { h: 274, xl: 253 },
            { h: 112 },
          ],
        },
      ],
    },
    /* The filter bar ships on the empty page too, so the lead is unchanged and
       only the ledger collapses — 1335 to 207, which was the single largest
       reservation error in the app. */
    empty: {
      grid: "grid-cols-1 gap-4 xl:grid-cols-12",
      lead: 401,
      leadXl: 179,
      cells: [
        { span: 7, panels: [{ h: 207 }, { h: 153 }] },
        {
          span: 5,
          panels: [
            { h: 153, head: false },
            { h: 153 },
            { h: 144, xl: 123 },
            { h: 153 },
          ],
        },
      ],
    },
  },
  /* No `empty`: the toolkit is static content, so this route is the same page
     on every account. Measured -9px against the empty fixture, which is the
     entrance transform and not a box. */
  "/tools": {
    full: {
      grid: "grid-cols-1 gap-4 xl:grid-cols-12",
      lead: 130,
      leadXl: 70,
      cells: [
        { span: 12, panels: [{ h: 906, xl: 260 }] },
        { span: 7, panels: [{ h: 249, xl: 207 }] },
        { span: 5, panels: [{ h: 326, xl: 335, head: false }] },
      ],
    },
  },
};

/* ------------------------------------------------------------- the account

   The skeleton needs one bit before any React state exists: is this account
   populated? It reads the same `localStorage` blob `AppContext` reads, because
   the alternative — waiting for `AppContext` — is exactly what the skeleton is
   covering for. `AppContext` starts at `initialState` and fills in a mount
   effect, so a skeleton that asked it would be told "empty" on every account
   in the world for the first frame, which is the wrong answer far more often
   than the right one.

   `useSyncExternalStore` rather than `useEffect` + `useState`: this component
   server-renders, and `getServerSnapshot` is the sanctioned way to say "the
   server cannot know" without hydrating a mismatch (invariant 50). The server
   and the hydrating client both see `null` and reserve `full`; the client
   re-renders with the real answer immediately after. */

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
 * The one place a reserved height is applied.
 *
 * It is a `<style>` element rather than two Tailwind arbitrary classes because
 * the heights are DATA — a table of measured numbers — and Tailwind only
 * compiles a utility whose literal text appears in a source file, so
 * `h-[${spec.h}px]` would compile to nothing at all. Inline style cannot carry
 * a media query, so the breakpoint lives here and the numbers arrive as custom
 * properties. `globals.css` is W1-exclusive for the whole programme (charter
 * H1), which is the same reason `BottomBar.tsx` declares its toast offset in a
 * `<style>` of its own.
 *
 * 1280px is Tailwind's `xl`, which is the breakpoint every one of these grids
 * switches its columns at.
 */
const RESERVED_CSS = `
.mb-skel-fixed { height: var(--mb-skel-h); overflow: hidden; }
@media (min-width: 1280px) { .mb-skel-fixed { height: var(--mb-skel-h-xl); } }
`;

/** A `.mb-panel-head`'s box, and one ruled `px-4 py-2.5` row. Both measured. */
const HEAD_H = 43;
const ROW_H = 49;

/** Enough rows to fill the taller of the two reservations, and never a barcode. */
const rowsFor = (spec: MbSkeletonPanelSpec): number => {
  const tallest = Math.max(spec.h, spec.xl ?? spec.h);
  const body = tallest - (spec.head === false ? 0 : HEAD_H);
  return Math.min(30, Math.max(1, Math.round(body / ROW_H)));
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
 * Name-bar widths, cycled rather than randomised.
 *
 * `Math.random()` here would produce a different width on the server and the
 * client and hydrate as a mismatch (invariant 50), and a single width would
 * render a barcode. Five ratios, deterministic, and the eye reads them as a
 * list of names of different lengths.
 *
 * Whole class names, not interpolated fragments: Tailwind generates a utility
 * only when its literal text appears in a source file, so `w-[${ratio}]` would
 * compile to nothing at all.
 */
const ROW_WIDTHS = ["w-[78%]", "w-[62%]", "w-[88%]", "w-[54%]", "w-[70%]"];

/**
 * One panel's bones at the shipped row rhythm: a `.mb-panel-head` with a title
 * and a meta figure, then ruled rows of `px-4 py-2.5` carrying a crest slot, a
 * name and a right-ranged measure. That is the anatomy of the standings,
 * schedule, results and readiness panels alike, which is why one skeleton
 * stands in for all of them without lying about any.
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
   * `.mb-skel-fixed` is in `className` AND `RESERVED_CSS` is on the page —
   * which `MbPageLoading` guarantees. Standalone callers pass neither and get
   * a panel that sizes to its rows, exactly as before.
   */
  style?: CSSProperties;
  className?: string;
}) => (
  <section className={`mb-panel ${className}`} style={style} aria-hidden="true">
    {/* The bars sit inside 24px SLOTS rather than being 24px themselves. A
        `.mb-panel-head` is sized by its title's line box, not by its glyph
        height, so a bar cut to the 0.95rem type step made the skeleton head
        35.38px against the real head's 42.98px — a 7.6px jump at the top of
        every panel the moment the data landed. The slot restores the line box;
        the bar keeps the type step. Measured at 1440: 44.19 against 42.98 —
        a 1.21px rounding difference rather than a visible step, and the rows
        below it are already exact (49 / 49 / 49 / 48 on both). */}
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
 * 4/4/4 rows. Invariant 4 permits 7/5, 4/4/4 and 12 and nothing else, so this
 * is a lookup rather than an arithmetic layout — an off-scale span cannot be
 * expressed.
 */
const genericSpan = (i: number): string =>
  i === 0 ? SPAN_CLASS[7] : i === 1 ? SPAN_CLASS[5] : SPAN_CLASS[4];

/**
 * The masthead's bones. Two-tone display line, the framed count badge, the
 * dateline pair, and two 48px actions — the exact furniture every converted
 * console masthead carries, at the same steps, so nothing jumps when the real
 * one replaces it.
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
    {/* The masthead's bones inside the box the real masthead will fill. On
        `/summaries` that box is 401px on a phone, because the page puts a
        three-control filter bar under its title and each control takes its own
        line there — reserving only the title would leave the ledger 250px
        short of where it lands. */}
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
  </>
);

/**
 * The fallback grid, for a route with no measured spec — the public share
 * shells, the scoring console, `/dev/states`, and anything added since the
 * table was last re-measured.
 *
 * `panels` defaults to 5 because 7/5 + 4/4/4 is exactly two full rows — the
 * first screenful — and a short final row would advertise a layout the real
 * page does not have. Callers wanting a fuller page should pass 2 + 3n.
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
 * The loading state of a whole route.
 *
 * `panels` is the COUNT USED WHEN THE ROUTE IS UNMEASURED. A console route in
 * `MB_ROUTE_SKELETON` draws its own panels, in its own spans, at its own
 * heights, and ignores it — which is the whole point: `app/loading.tsx` cannot
 * know that `/competitions` has seven panels and `/summaries` has six, and it
 * should not have to. It passes a floor and the route supplies the truth.
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
  /* The URL, never `active`. `active` is the nav-highlight hint and several
     routes borrow a parent's — `/tools/volleyball-rotations/my-formations`
     passes `active="/tools"` and looks nothing like `/tools`. Keying the
     geometry off it would reserve a 906px toolkit panel for a formations list. */
  const pathname = usePathname();
  const account = useSyncExternalStore(subscribeAccount, readAccount, serverAccount);
  const entry = variant === "console" ? MB_ROUTE_SKELETON[pathname ?? ""] : undefined;
  const spec = entry ? mbSkeletonSpecFor(entry, account) : undefined;

  return (
    /* No `masthead` prop: a loading route has no title to put in one yet, so the
       masthead's own bones are drawn below, inside `<main>`, where the real one
       will land. Passing a placeholder title here would be a lie that then has
       to be replaced, which is a second layout change on top of the first. */
    <MatchbookShell variant={variant} active={active}>
      {spec && <style>{RESERVED_CSS}</style>}
      {/* One polite announcement for the whole route. The skeleton itself is
          aria-hidden, so a screen reader hears this once instead of crawling
          forty empty boxes. It names WHAT is loading rather than saying
          "Loading" into the void, which is the difference between a status and
          a noise. */}
      <span className="sr-only" role="status">
        Loading page content
      </span>
      {/* `variant="focus"` gives `<main>` no padding — deliberately, because on a
          real scoring route `children` is the element handed to the Fullscreen
          API (shell R4). A skeleton is not that element, so it supplies the
          gutter itself rather than sitting flush to the bezel.

          It also draws NO masthead there: on `focus` the navy `MbEventBar` IS
          the masthead, and the shell has already drawn it above.

          `.mb-enter-grid` is the system's entrance vocabulary, and this is its
          first shipped consumer (register D-26). The panels arrive in reading
          order over 480ms — the skeleton is the one place a stagger is
          unambiguously honest, because there is no data whose order it could
          be misrepresenting. Removed outright under prefers-reduced-motion. */}
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
 * The copy for the three failure routes, written once.
 *
 * It lives here rather than inline in `app/error.tsx` so the gallery can render
 * the real strings — a screenshot of a state whose words were retyped for the
 * demo proves nothing about the state that ships.
 *
 * None of them names a provider, a stack frame or an error message
 * (invariant 28). `app/error.tsx` surfaces the Next.js `digest` as a reference
 * code instead, which is the one string that is both safe and useful.
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
 * The visible body of a failure route, drawn once.
 *
 * `app/error.tsx`, `app/not-found.tsx`, `app/global-error.tsx` and the
 * `/dev/states/*` harness all render THIS — they differ only in the frame they
 * put around it and in which actions they can offer (`global-error` has no
 * router, so it has no links). That matters more than it looks: a gallery or a
 * harness that retypes a state's copy proves nothing about the state that
 * ships, and these are the three screens least likely to be looked at again
 * once they are written.
 *
 * The digest is rendered as a `.mb-code-chip` — a reference token, not an error
 * message. `error.message` never appears anywhere in this component's inputs.
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
