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

import { MatchbookShell, type MatchbookShellVariant } from "./AppShell";
import { MbSkeleton } from "./Skeleton";
import { MbEmptyState, type MbEmptyStateAction } from "./EmptyState";
import type { PanelEmptyTone } from "./Panel";

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
export const MbSkeletonPanel = ({ rows = 4 }: { rows?: number }) => (
  <section className="mb-panel" aria-hidden="true">
    {/* The bars sit inside 24px SLOTS rather than being 24px themselves. A
        `.mb-panel-head` is sized by its title's line box, not by its glyph
        height, so a bar cut to the 0.95rem type step made the skeleton head
        35.38px against the real head's 42.98px — a 7.6px jump at the top of
        every panel the moment the data landed. The slot restores the line box;
        the bar keeps the type step. Measured at 1440: 44.19 against 42.98 —
        a 1.21px rounding difference rather than a visible step, and the rows
        below it are already exact (49 / 49 / 49 / 48 on both). */}
    <header className="mb-panel-head">
      <span className="flex h-6 w-[9rem] max-w-[60%] items-center">
        <MbSkeleton w="100%" h="0.95rem" radius={2} />
      </span>
      <span className="flex h-6 w-[4.5rem] items-center">
        <MbSkeleton w="100%" h="0.62rem" radius={2} />
      </span>
    </header>
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
 * Column spans, in the order the shipped console uses them: a 7/5 pair, then
 * 4/4/4 rows. Invariant 4 permits 7/5, 4/4/4 and 12 and nothing else, so this
 * is a lookup rather than an arithmetic layout — an off-scale span cannot be
 * expressed.
 */
const span = (i: number): string =>
  i === 0 ? "xl:col-span-7" : i === 1 ? "xl:col-span-5" : "xl:col-span-4";

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

/**
 * The loading state of a whole route.
 *
 * `panels` defaults to 5 because 7/5 + 4/4/4 is exactly two full rows — the
 * first screenful — and a short final row would advertise a layout the real
 * page does not have. Callers wanting a fuller page should pass 2 + 3n.
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
}) => (
  /* No `masthead` prop: a loading route has no title to put in one yet, so the
     masthead's own bones are drawn below, inside `<main>`, where the real one
     will land. Passing a placeholder title here would be a lie that then has
     to be replaced, which is a second layout change on top of the first. */
  <MatchbookShell variant={variant} active={active}>
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
        the masthead, and the shell has already drawn it above. */}
    <div
      aria-busy="true"
      className={variant === "focus" ? "px-4 py-5 sm:px-6 lg:px-8" : ""}
    >
      {variant !== "focus" && <MbSkeletonMasthead />}
      {/* `.mb-enter-grid` is the system's entrance vocabulary, and this is its
          first shipped consumer (register D-26). The panels arrive in reading
          order over 480ms — the skeleton is the one place a stagger is
          unambiguously honest, because there is no data whose order it could
          be misrepresenting. Removed outright under prefers-reduced-motion. */}
      <div className="mb-enter-grid grid grid-cols-1 gap-4 xl:grid-cols-12">
        {Array.from({ length: Math.max(1, panels) }, (_, i) => (
          <div key={i} className={span(i)}>
            <MbSkeletonPanel rows={i === 0 ? 6 : 4} />
          </div>
        ))}
      </div>
    </div>
  </MatchbookShell>
);

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
