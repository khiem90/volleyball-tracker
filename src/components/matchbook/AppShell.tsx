"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { MatchbookMasthead, type MastheadProps } from "./Masthead";
import { MatchbookSidebar, type MbSidebarCta } from "./Sidebar";
import { MatchbookTopStrip, type MbTopStripAction, type MbTopStripBack } from "./TopStrip";
import {
  MatchbookBottomBar,
  MatchbookLandscapeRail,
  mbActiveNavItem,
} from "./BottomBar";
import { MbEventBar } from "./EventBar";

/* ===========================================================================
   ONE SHELL — the ROUTE declares its variant; a nav component never
   string-matches the pathname to decide whether to hide itself.

     console  sidebar (>=lg) + top strip + bottom bar (<lg) + editorial masthead
     public   no sidebar/bottom bar/account chip — brand lockup and a centred
              max-w-[1100px] column (the sanctioned exception to "no max-w")
     focus    no chrome except one 44px exit control in `MbEventBar`; children
              sit directly inside <main> so the fullscreen target is unwrapped.

   "Alive": `<main>` carries `.mb-enter` and is KEYED on the pathname so the
   entrance replays per navigation (removed by the reduced-motion clamp); the
   chrome is a sibling of `<main>`, outside the key, so it never re-mounts.
   A page adds `.mb-enter-grid` to its own panel grid — never to table rows.
   =========================================================================== */

export type MatchbookShellVariant = "console" | "public" | "focus";

/* ------------------------------------------------- which shell is this URL? */

/**
 * THE ROUTE → VARIANT PREDICATE. `app/loading.tsx` is the ROOT boundary and
 * Next paints the outermost invalidated boundary first, so a skeleton that
 * assumed `console` would flash the private navigation on public/focus routes.
 * The boundary asks the URL instead. Pages still declare their own variant;
 * `src/__tests__/shell/shellVariant.test.ts` fails if a guess and a
 * declaration ever disagree.
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
   * `usePathname()` through the one predicate in `BottomBar.tsx`.
   */
  active?: string;
  masthead?: MastheadProps;
  cta?: MbShellCta;
  /** The back/exit control: the mobile top strip's on `console`, the event
      bar's on `focus`. */
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
    /* `[pathname]` alone: `name` can change with no navigation (a data title
       resolving), and that run would clear the first-paint guard, focus
       `<main>` and scroll it under the sticky top strip. `preventScroll` is
       the belt — a route change already leaves Next at the document top. */
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

/* `.mb-skip-link` alone renders under the 44px floor; `.mb-btn-touch`
   supplies it and `flex items-center` centres the words in the taller box. */
const SKIP_LINK = "mb-skip-link mb-btn-touch flex items-center";

/** `max-w` is added only by `variant="public"`. */
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
        {/* `--mb-coral-deep`, not `--mb-coral`: raw coral fails 4.5:1 at this
            size on paper; the ink twin clears it. The masthead's emphasised
            word stays raw coral — it ships at display sizes under the 3:1
            large-text floor. */}
        <span className="matchbook-display text-[0.95rem] mb-track-title font-bold leading-none">
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
            needs to hand to the Fullscreen API. */}
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
      {/* First focusable node in the document; `position: fixed`, so its place
          in the DOM costs nothing visually. */}
      <a href="#mb-main" className={SKIP_LINK}>
        Skip to content
      </a>

      <div className="flex">
        <MatchbookSidebar active={here} cta={cta} />
        {/* A sibling in the flex row, not a `fixed` overlay: in normal flow it
            reserves its own 60px, so nothing needs a matching `padding-left`
            that could drift. Exactly one of the three navs is displayed at any
            (width, height) — see THE LANDSCAPE NAVIGATION GATE in globals.css. */}
        <MatchbookLandscapeRail active={here} />

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
