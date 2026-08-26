"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { MbDialogBody } from "./Dialog";
import { MbIcon } from "./MbIcon";
import { MbSheet } from "./Sheet";
import { useMbReducedMotion } from "./useMbReducedMotion";

/* ===========================================================================
   THE ONE NAV TABLE — the sidebar, the bottom bar, the top strip and the shell
   all import it, so no two navs can disagree about what "active" means.
   `BottomBar.tsx` holds it rather than `AppShell.tsx` because `AppShell`
   imports this file; the reverse would be an import cycle.
   =========================================================================== */

export interface MbNavItem {
  href: string;
  /** The word in the bar and the rail. Also the announced route name. */
  label: string;
  /** Sprite icon id. */
  icon: string;
}

/**
 * The five primary destinations, in the order they appear in both navs.
 * `/tools` is the sixth destination and lives in the More sheet — a bar of six
 * equal cells plus More is seven, which is 55px per cell at 390px and reads as
 * a toolbar rather than a nav.
 */
export const MB_NAV: MbNavItem[] = [
  { href: "/", label: "Overview", icon: "overview" },
  { href: "/teams", label: "Teams", icon: "teams" },
  { href: "/quick-match", label: "Quick", icon: "quick" },
  { href: "/competitions", label: "Compete", icon: "compete" },
  { href: "/summaries", label: "History", icon: "history" },
];

/** Destinations that live behind "More" rather than in the bar. */
export const MB_NAV_MORE: MbNavItem[] = [
  { href: "/tools", label: "Tools", icon: "tools" },
];

/** Every destination the shell knows about, bar plus sheet. */
export const MB_NAV_ALL: MbNavItem[] = [...MB_NAV, ...MB_NAV_MORE];

/**
 * The one active-route predicate. `/` matches only itself; everything else
 * matches its own path and anything below it, so `/competitions/new` and
 * `/competitions/comp-1` both light "Compete".
 */
export const mbNavActive = (pathname: string, href: string): boolean =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

/** The destination whose section `pathname` is in, or `null` off the map. */
export const mbActiveNavItem = (pathname: string): MbNavItem | null =>
  MB_NAV_ALL.find((item) => mbNavActive(pathname, item.href)) ?? null;

/* ------------------------------------------------------------------ geometry */

/**
 * The bar's own height (cell + top rule), safe area excluded, in CSS px.
 * A cell is 56: a 44px floor plus the caption line, which is what makes the
 * icon and the word both legible without either crowding the other.
 */
export const MB_BOTTOM_BAR_CELL = 56;

/**
 * What a page must reserve at the bottom so the last panel is never covered.
 * Exported as a CSS length because the safe-area inset is only known at paint.
 * `MatchbookShell` applies it; a page that renders its own scroller pads with
 * this.
 */
export const MB_BOTTOM_BAR_H = `calc(${MB_BOTTOM_BAR_CELL + 1}px + var(--mb-safe-bottom))`;

/**
 * The landscape rail's width: 60px is the narrowest cell that clears the
 * longest caption ("OVERVIEW") after the selection border and inline padding.
 */
export const MB_LANDSCAPE_RAIL_W = 60;

/**
 * The other half of `Toast.tsx`'s `MB_TOAST_OFFSET_VAR` contract: the float
 * stack sits bottom-centre and would land on top of this bar. A `<style>`
 * element rather than a JS-set custom property because the bar's visibility is
 * decided by two media queries a JS value cannot know about — a desktop toast
 * would float above a bar that is not there. The rule set mirrors the bar's
 * own `lg:hidden` and `max-height:500px` gates exactly.
 */
const TOAST_OFFSET_CSS = `
:root { --mb-toast-offset: ${MB_BOTTOM_BAR_CELL + 1}px; }
@media (min-width: 1024px) { :root { --mb-toast-offset: 0px; } }
@media (max-height: 500px) { :root { --mb-toast-offset: 0px; } }
`;

/**
 * `.mb-nav-item` is unlayered CSS, so a Tailwind utility cannot outrank it —
 * inline style is the one declaration that wins. Reusing it rather than
 * hand-rolling a cell keeps the press ink, hover wash, `touch-action` and the
 * coarse-pointer 44px floor without re-deriving any of them.
 */
const CELL_STYLE: CSSProperties = {
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  gap: "0.25rem",
  /* Minimal inline padding: a truncation guard, not breathing room — anything
     wider clips "OVERVIEW" in a 320px viewport's cell. */
  padding: "0.3rem 0.1rem",
  minHeight: MB_BOTTOM_BAR_CELL,
  fontSize: "inherit",
  // `.mb-nav-item`'s 3px left rail is the *sidebar's* orientation of the
  // selection mark. Here the same mark runs along the top edge.
  borderLeftWidth: 0,
  position: "relative",
  width: "100%",
};

/**
 * The same cell, stood on its end for `MatchbookLandscapeRail`. Two
 * differences: `minHeight` is the bare 44px floor (a rail cell is `flex: 1` in
 * a viewport-tall column, so the floor is a floor, not the height), and
 * `borderLeftWidth` is NOT zeroed — a left rail is the orientation
 * `.mb-nav-item` was written for, so its own `[data-active]` border draws the
 * selection mark with no second implementation.
 */
const RAIL_CELL_STYLE: CSSProperties = {
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  gap: "0.25rem",
  padding: "0.3rem 0.1rem",
  minHeight: 44,
  fontSize: "inherit",
  position: "relative",
  width: "100%",
  height: "100%",
};

/* --------------------------------------------------------------------- cell */

/**
 * The selection mark, as its own element so it can grow from centre — a
 * `scaleX()` transform on a 3px band, the only animated thing in the shell,
 * so it cannot move a letterform or trigger layout. `--mb-rule-accent` is the
 * same tier `.mb-nav-item`'s left rail and `.mb-tab`'s underline use: one
 * mark, three orientations, one width.
 */
const ActiveRule = ({ active, still }: { active: boolean; still: boolean }) => (
  <span
    aria-hidden="true"
    style={{
      position: "absolute",
      insetInline: 0,
      top: 0,
      height: "var(--mb-rule-accent)",
      background: "var(--mb-coral)",
      transformOrigin: "center",
      transform: active ? "scaleX(1)" : "scaleX(0)",
      // Under prefers-reduced-motion the transition is removed rather than
      // hurried, so the rule is simply already there.
      transition: still
        ? "none"
        : "transform var(--mb-dur-base) var(--mb-ease-out)",
    }}
  />
);

/**
 * The caption. A child `<span>` because `.mb-nav-item` pins `font-size` from
 * unlayered CSS; the span has no competing rule, so the smaller step applies
 * cleanly. Kicker size at nav tracking — kicker tracking would clip
 * "OVERVIEW" in the cell. The word stays NAVY when active: coral fails the
 * 4.5:1 text floor at this size, so the state is carried by the rule and the
 * weight, which also survives greyscale.
 */
const CellLabel = ({ label, active }: { label: string; active: boolean }) => (
  <span
    className={`matchbook-display block w-full truncate text-center text-[0.62rem] leading-none mb-track-nav ${
      active ? "font-bold" : "font-semibold"
    }`}
  >
    {label}
  </span>
);

/* ---------------------------------------------------------------------- bar */

/**
 * The mobile primary navigation. `<nav><ul><li>` rather than a flex row of
 * anchors: it is the markup a screen reader expects, and the hairline between
 * two `<li>` cells is a measured divider — what makes six abutting cells a
 * ruled ledger rather than six controls crowded under the separation floor.
 */
export const MatchbookBottomBar = ({ active }: { active?: string }) => {
  const pathname = usePathname();
  const here = active ?? pathname;
  const still = useMbReducedMotion();
  const [moreOpen, setMoreOpen] = useState(false);

  const moreActive = MB_NAV_MORE.some((item) => mbNavActive(here, item.href));

  return (
    <>
      <style>{TOAST_OFFSET_CSS}</style>
      <nav
        aria-label="Sections"
        className="mb-safe-bottom mb-print-hide fixed inset-x-0 bottom-0 z-40 border-t-[1.5px] border-mb-navy bg-mb-paper lg:hidden [@media(max-height:500px)]:hidden"
        style={{
          // The bar is fixed over horizontally scrolling brackets and rotation
          // rails; containment keeps those scrolls off its layer.
          contain: "layout paint",
        }}
      >
        <ul className="flex items-stretch">
          {MB_NAV.map((item, index) => {
            const on = mbNavActive(here, item.href);
            return (
              <li
                key={item.href}
                className={`flex min-w-0 flex-1 ${
                  index === 0 ? "" : "border-l border-mb-rule"
                }`}
              >
                <Link
                  href={item.href}
                  className="mb-nav-item"
                  style={CELL_STYLE}
                  data-active={on}
                  aria-current={on ? "page" : undefined}
                >
                  <ActiveRule active={on} still={still} />
                  <MbIcon id={item.icon} size={20} className="shrink-0" />
                  <CellLabel label={item.label} active={on} />
                </Link>
              </li>
            );
          })}

          <li className="flex min-w-0 flex-1 border-l border-mb-rule">
            <button
              type="button"
              className="mb-nav-item"
              style={CELL_STYLE}
              data-active={moreActive}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen(true)}
            >
              <ActiveRule active={moreActive} still={still} />
              <MbIcon id="more" size={20} className="shrink-0" />
              <CellLabel label="More" active={moreActive} />
            </button>
          </li>
        </ul>
      </nav>

      {/* Destinations only — the account lives in exactly one control per
          breakpoint (`AccountChip.tsx`), never here. `flush`: the rows start
          at the header's own rule and run edge to edge, the ledger idiom
          `MbMenu` uses; an inset list would draw an empty ruled row above the
          first label. */}
      <MbSheet open={moreOpen} onOpenChange={setMoreOpen} title="More">
        <MbDialogBody flush>
          <ul className="flex flex-col divide-y divide-mb-rule">
            {MB_NAV_MORE.map((item) => {
              const on = mbNavActive(here, item.href);
              return (
                <li key={item.href} className="flex">
                  <Link
                    href={item.href}
                    className="mb-nav-item"
                    style={{ minHeight: 48, width: "100%" }}
                    data-active={on}
                    aria-current={on ? "page" : undefined}
                    onClick={() => setMoreOpen(false)}
                  >
                    <MbIcon id={item.icon} size={18} className="shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </MbDialogBody>
      </MbSheet>
    </>
  );
};

/* --------------------------------------------------------------------- rail */

/**
 * THE LANDSCAPE RAIL. A landscape phone is under `lg` AND under 500px tall,
 * so it matches both of the other navs' hiding gates and would get neither.
 * The axis a nav takes is decided by which axis has room:
 *
 *   width >= 1024px                    `MatchbookSidebar`, 218px.
 *   width <  1024px, height >  500px   `MatchbookBottomBar`.
 *   width <  1024px, height <= 500px   THIS — 60px on the left edge.
 *
 * `variant="focus"` (fullscreen scoring, rotation editor) renders no
 * navigation at any size; `MatchbookShell` returns from that branch before
 * either nav exists. All six destinations, not 5+More: six cells down the
 * shortest landscape phone still clear the 44px floor, and a sheet on a
 * 320px-tall viewport would be a 320px-tall dialog.
 */
export const MatchbookLandscapeRail = ({ active }: { active?: string }) => {
  const pathname = usePathname();
  const here = active ?? pathname;

  return (
    /* `<nav>` is the OUTER element: the rail carries destinations and nothing
       else, so an `<aside>` around it would add an unlabelled `complementary`
       landmark whose only child is the navigation landmark a reader already
       has. */
    <nav
      aria-label="Sections"
      className="mb-landscape-rail mb-print-hide sticky top-0 max-h-screen min-h-screen shrink-0 flex-col overflow-y-auto border-r border-mb-navy bg-mb-paper"
      style={{
        borderRightWidth: "var(--mb-rule-edge)",
        /* The left edge is the NOTCH edge in landscape-left. Padding the rail
           rather than the list moves the selection border out with the cells. */
        paddingLeft: "var(--mb-safe-left)",
        paddingTop: "var(--mb-safe-top)",
        paddingBottom: "var(--mb-safe-bottom)",
        width: `calc(${MB_LANDSCAPE_RAIL_W}px + var(--mb-safe-left))`,
        /* Same as the bar: stuck over horizontal scrollers, so containment
           keeps those scrolls off its layer. */
        contain: "layout paint",
      }}
    >
      {/* `flex-1` everywhere and `min-h-0` NOWHERE: `min-height: auto` refuses
          to shrink below content, so the cells divide the rail evenly while
          they fit and the rail's `overflow-y-auto` takes over below 6 x 44.
          With `min-h-0` they would silently compress under the 44px floor. */}
      <ul className="flex flex-1 flex-col">
        {MB_NAV_ALL.map((item, index) => {
          const on = mbNavActive(here, item.href);
          return (
            <li
              key={item.href}
              className={`flex flex-1 ${
                index === 0 ? "" : "border-t border-mb-rule"
              }`}
            >
              <Link
                href={item.href}
                className="mb-nav-item"
                style={RAIL_CELL_STYLE}
                data-active={on}
                aria-current={on ? "page" : undefined}
              >
                <MbIcon id={item.icon} size={20} className="shrink-0" />
                <CellLabel label={item.label} active={on} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
