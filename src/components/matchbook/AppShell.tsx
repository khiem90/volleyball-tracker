"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { MatchbookMasthead, type MastheadProps } from "./Masthead";
import { MatchbookSidebar, type MbSidebarCta } from "./Sidebar";
import { MatchbookTopStrip, type MbTopStripAction, type MbTopStripBack } from "./TopStrip";
import { MatchbookBottomBar, mbActiveNavItem } from "./BottomBar";
import { MbEventBar } from "./EventBar";

/* ===========================================================================
   ONE SHELL, DECLARED ONCE

   The app ships five mutually exclusive shells today and the route decides
   which visual system, which navigation model and which palette you get, with
   no transition between them. `src/app/layout.tsx` renders no chrome at all, so
   every page re-declares its own — the same 70 lines, six times.

   This is that shell. Three variants, and the ROUTE declares which one it is
   rather than a nav component string-matching the pathname to decide whether to
   hide itself (shell brief R6, which is how `/session/*` is handled today).

     console  sidebar (>=lg) + top strip + bottom bar (<lg) + editorial masthead
     public   no sidebar, no bottom bar, no account chip — a brand lockup and a
              centred max-w-[1100px] column. THE sanctioned exception to "no
              max-w" (GAP-15.3).
     focus    no chrome except one 44px exit control in `MbEventBar`. It must
              not wrap the fullscreen target (R4), so `children` sits directly
              inside `<main>` with nothing between.

   ------------------------------------------------------------------ "alive"

   Two things, and only two, make a route arrive rather than appear:

     1. `<main>` carries `.mb-enter` and is KEYED on the pathname, so the
        entrance replays on navigation instead of only on first mount. Opacity
        plus a 10px rise over `--mb-dur-slow`; removed outright under
        prefers-reduced-motion by the clamp in `globals.css`.
     2. The chrome does not move. The sidebar, the top strip and the bottom bar
        are siblings of `<main>`, outside the key, so they never re-mount and
        never animate on a route change (brief §4.3). The bottom bar's coral
        rule grows across, which is the one animated mark in the shell.

   A page adds `.mb-enter-grid` to its own panel grid for the staggered
   settle — that is a per-screen authoring decision, capped at six by the CSS,
   and never applied to table rows (invariant 42).
   =========================================================================== */

export type MatchbookShellVariant = "console" | "public" | "focus";

/* ------------------------------------------------- which shell is this URL? */

/**
 * THE ROUTE → VARIANT PREDICATE, and why a shell that is otherwise declared by
 * the page needs one.
 *
 * `app/loading.tsx` is the ROOT loading boundary, and Next always paints the
 * OUTERMOST invalidated boundary first: a nested `loading.tsx` takes over only
 * once the parent subtree has resolved, so it cannot remove the frames above
 * it. `app/match/loading.tsx` states this residual in its own docblock and
 * hands it here. Measured against a PRODUCTION build (`next build && next
 * start`, 390x844, `waitUntil:"commit"`) with the root boundary declaring
 * `variant="console"`:
 *
 *   /summary/GYMDAY                     12 `.mb-nav-item` + `nav[aria-label=
 *   /session/SUMMER                     "Primary"]` + the bottom bar in the
 *   /tools/…/shared/demoShare1          FIRST PAINTED FRAME, for 34 / 40 / 172
 *   /login                              / 255 ms respectively.
 *
 * That is the app's private navigation on the four screens the product hands
 * to strangers — and on `/login`, which has no shell at all. It is also
 * invariant 26's own words failing: a skeleton at "the FINAL GEOMETRY" is
 * exactly what the console shell is not, on a route whose final geometry is a
 * centred 1100px column with no rail.
 *
 * The fix is not another nested boundary. It is that the root boundary stops
 * assuming, and asks the URL — which is the same question `MatchbookShell`
 * already answers for `active`, through the same `usePathname()`.
 *
 * PAGES STILL DECLARE THEIR OWN VARIANT. This does not replace that (shell
 * brief R6: the ROUTE declares which shell it is, rather than a component
 * string-matching the pathname to decide whether to hide itself). It is the
 * loading boundary's best guess at what the page is about to declare, and
 * `src/__tests__/shell/shellVariant.test.ts` reads every `page.tsx` in
 * `src/app` and fails if a guess and a declaration ever disagree.
 */
const MB_PUBLIC_ROOTS = [
  "/session",
  "/summary",
  "/tools/volleyball-rotations/shared",
] as const;

const MB_FOCUS_ROOTS = ["/match", "/tools/volleyball-rotations/editor"] as const;

/** Segment-boundary aware: `/summaries` is NOT under `/summary`. */
const under = (pathname: string, root: string) =>
  pathname === root || pathname.startsWith(`${root}/`);

export const mbShellVariantFor = (pathname: string): MatchbookShellVariant => {
  if (MB_PUBLIC_ROOTS.some((root) => under(pathname, root))) return "public";
  if (MB_FOCUS_ROOTS.some((root) => under(pathname, root))) return "focus";
  return "console";
};

/**
 * `/login` is the one route that is not a shell at all — a full-bleed two-column
 * poster — so no variant is the right answer for it and the root boundary draws
 * the poster's own bones instead.
 */
export const mbIsChromelessRoute = (pathname: string) => under(pathname, "/login");

export type MbShellCta = MbSidebarCta;

/** The rail's default primary action, and the app's actual primary action. */
export const MB_DEFAULT_CTA: MbShellCta = {
  href: "/quick-match",
  label: "Quick Match",
  icon: "quick",
};

export interface MatchbookShellProps {
  variant?: MatchbookShellVariant;
  /**
   * Override the active section. Omit it and the shell derives it from
   * `usePathname()` through the one predicate in `BottomBar.tsx` — which is how
   * the three shipped navs came to disagree about `/competitions/new`.
   */
  active?: string;
  masthead?: MastheadProps;
  cta?: MbShellCta;
  /**
   * The back/exit control: the mobile top strip's on `console`, the event
   * bar's on `focus`. Not in the charter's shell signature, but without it the
   * `back` slot the charter gives `MatchbookTopStrip` and `MbEventBar` is
   * unreachable from a page.
   */
  back?: MbTopStripBack;
  /** One screen-specific icon action in the mobile top strip. */
  action?: MbTopStripAction;
  children: ReactNode;
}

/* ------------------------------------------------------- route announcement */

/**
 * Focus and the announcement, together, because they answer the same question:
 * "the URL changed — what happened?"
 *
 * Both are suppressed on the first paint. Moving focus on load fights the
 * browser's own restoration and announcing a page a screen reader is already
 * reading is noise; the point is the *transition*.
 */
const useRouteChange = (pathname: string, name: string) => {
  const mainRef = useRef<HTMLElement | null>(null);
  const liveRef = useRef<HTMLParagraphElement | null>(null);
  const settled = useRef(false);
  const nameRef = useRef(name);

  /* Declared FIRST so it commits before the announcement effect below reads it:
     on a navigation both change in the same commit and effects run in
     declaration order, so the announcement gets the new route's name. */
  useEffect(() => {
    nameRef.current = name;
  }, [name]);

  useEffect(() => {
    if (!settled.current) {
      settled.current = true;
      return;
    }
    /**
     * `preventScroll`, and `[pathname]` alone.
     *
     * The effect used to depend on `[pathname, name]`, and `name` is
     * `masthead.shortTitle` — which on `/competitions` is the SELECTED EVENT'S
     * NAME and therefore changes once, after the data resolves, with no
     * navigation at all. That second run cleared the first-paint guard and
     * focused `<main>`; `<main tabIndex={-1}>` sits directly under the sticky
     * mobile top strip, so the browser scrolled it into view and the route
     * arrived at **scrollY 57 with its own `<h1>` hidden behind the strip** —
     * measured at 390x844, and invariant 27's "no visible layout shift on
     * load" exactly. `/` and `/teams` were at scrollY 0 because their titles
     * are literals.
     *
     * Keying on the pathname makes the effect mean what its name says. The
     * `preventScroll` is the belt: a route change already leaves Next at the
     * top of the document, so moving focus there must never move the viewport
     * again — same rule `Tabs.tsx` states for its own rail.
     */
    mainRef.current?.focus({ preventScroll: true });
    /* Written imperatively, not through state. The live region is an external
       system — the announcement IS the DOM mutation, and routing it through a
       render would be a cascading setState inside an effect for no gain. React
       renders the node with no children, so it never contends for the text. */
    if (liveRef.current) liveRef.current.textContent = nameRef.current;
  }, [pathname]);

  return { mainRef, liveRef };
};

const RouteAnnouncer = ({
  liveRef,
}: {
  liveRef: React.RefObject<HTMLParagraphElement | null>;
}) => <p ref={liveRef} aria-live="polite" aria-atomic="true" className="sr-only" />;

/* -------------------------------------------------------------- main region */

/**
 * `.mb-skip-link` alone renders 135.8 x 36.8 — measured, and under the 44px
 * floor invariant 33 makes a hard fail. The class is W1's and is not this
 * workstream's to edit, so the consumption is fixed instead: `.mb-btn-touch`
 * supplies the floor (it is unlayered, so it beats nothing and loses to
 * nothing) and `flex items-center` keeps the words on the box's centre line
 * rather than parked at its top. `.mb-skip-link` sets no `display` of its own,
 * so the utility applies cleanly.
 */
const SKIP_LINK = "mb-skip-link mb-btn-touch flex items-center";

/** Invariant 3's exact geometry. `max-w` is added only by `variant="public"`. */
const MAIN_PADDING = "px-4 py-5 sm:px-6 lg:px-8";

/**
 * Below `lg` the fixed bottom bar covers the last 57px of the page plus the
 * home indicator, so `<main>` reserves the bar plus one `py-5` of breathing
 * room. In landscape under 500px tall the bar is hidden, so the reservation
 * goes with it.
 */
const CONSOLE_MAIN_PAD =
  "pb-[calc(77px_+_var(--mb-safe-bottom))] lg:pb-5 [@media(max-height:500px)]:pb-5";

/* -------------------------------------------------------------- public head */

const PublicBrand = () => (
  <header className="mb-safe-top mb-print-hide border-b border-mb-rule bg-mb-paper">
    <div className="mx-auto flex w-full max-w-[1100px] items-center gap-2.5 px-4 py-3 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="mb-btn-touch inline-flex items-center gap-2.5 rounded-[3px] px-1 transition-colors hover:bg-[var(--mb-tint-2)]"
      >
        <Image
          src="/assets/matchbook/brand/crest.svg"
          alt=""
          width={26}
          height={30}
          priority
        />
        {/* "Tracker" is `--mb-coral-deep`, NOT `--mb-coral` — the same fix
            `Sidebar.tsx:86` took, arriving here late because the two lockups
            were written in different files on different days.

            Measured on `--mb-paper` at this exact step: `--mb-coral` is
            **3.26:1 at 15.2px/700** against the 4.5:1 floor that applies below
            18.66px — rubric HF-6, and this is `variant="public"`, so it was
            live on every share link the product hands to a stranger — the
            session viewer, the match report, the shared formation, `/login`
            and `global-error`. The ink twin measures **4.62:1** at the same size,
            and design language §1.3 declares it for exactly this case: "coral
            letterforms under 18.66px". The two-tone lockup survives intact.

            Coral job 3 — the masthead's emphasised word — is unaffected: that
            word ships at 36/48px where the 3:1 large-text floor applies. */}
        <span className="matchbook-display text-[0.95rem] font-bold leading-none tracking-[0.05em]">
          <span className="text-mb-navy">Tournament </span>
          <span className="text-mb-coral-deep">Tracker</span>
        </span>
      </Link>
    </div>
  </header>
);

/* -------------------------------------------------------------------- shell */

export const MatchbookShell = ({
  variant = "console",
  active,
  masthead,
  cta = MB_DEFAULT_CTA,
  back,
  action,
  children,
}: MatchbookShellProps) => {
  const pathname = usePathname();
  const here = active ?? pathname;

  const navItem = mbActiveNavItem(here);
  const routeName =
    masthead?.shortTitle ?? navItem?.label ?? "Tournament Tracker";

  const { mainRef, liveRef } = useRouteChange(pathname, routeName);

  /**
   * `tabIndex={-1}` so the skip link and the route-change focus move can land
   * on it; keyed on the pathname so `.mb-enter` replays per navigation.
   *
   * `variant="focus"` renders NO masthead even when one is passed. On that
   * variant `MbEventBar` *is* the masthead — it already carries the event's
   * name — and rendering both put the same string on the screen twice, once at
   * 0.95rem in the navy strip and once at 3rem underneath it. The prop is still
   * read there, for `shortTitle`.
   */
  const main = (extra: string) => (
    <main
      key={pathname}
      id="mb-main"
      ref={mainRef}
      tabIndex={-1}
      className={`mb-enter min-w-0 outline-none ${extra}`}
    >
      {masthead && variant !== "focus" && (
        <MatchbookMasthead {...masthead} account={masthead.account ?? variant === "console"} />
      )}
      {children}
    </main>
  );

  /* --------------------------------------------------------------- focus */
  if (variant === "focus") {
    return (
      <div className="matchbook-surface flex min-h-screen flex-col">
        <a href="#mb-main" className={SKIP_LINK}>
          Skip to content
        </a>
        <MbEventBar back={back ?? { href: "/", label: "Exit" }} title={routeName} />
        {/* No padding wrapper and no grid: `children` is whatever the console
            needs to hand to the Fullscreen API (R4). */}
        {main("flex-1")}
        <RouteAnnouncer liveRef={liveRef} />
      </div>
    );
  }

  /* --------------------------------------------------------------- public */
  if (variant === "public") {
    return (
      <div className="matchbook-surface min-h-screen">
        <a href="#mb-main" className={SKIP_LINK}>
          Skip to content
        </a>
        <PublicBrand />
        {main(`mx-auto w-full max-w-[1100px] ${MAIN_PADDING}`)}
        <RouteAnnouncer liveRef={liveRef} />
      </div>
    );
  }

  /* -------------------------------------------------------------- console */
  return (
    <div className="matchbook-surface min-h-screen">
      {/* First focusable node in the document (DoD 12). It is `position: fixed`
          in the stylesheet, so its place in the DOM costs nothing visually. */}
      <a href="#mb-main" className={SKIP_LINK}>
        Skip to content
      </a>

      <div className="flex">
        <MatchbookSidebar active={here} cta={cta} />

        <div className="flex min-w-0 flex-1 flex-col">
          <MatchbookTopStrip title={routeName} back={back} action={action} />
          {main(`${MAIN_PADDING} ${CONSOLE_MAIN_PAD}`)}
        </div>
      </div>

      <MatchbookBottomBar active={here} />
      <RouteAnnouncer liveRef={liveRef} />
    </div>
  );
};
