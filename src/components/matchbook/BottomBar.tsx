"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { MbDialogBody } from "./Dialog";
import { MbIcon } from "./MbIcon";
import { MbSheet } from "./Sheet";
import { useMbReducedMotion } from "./useMbReducedMotion";

/* ===========================================================================
   THE ONE NAV TABLE

   Three navigations shipped and all three disagreed about what "active" means
   (shell brief W15): the sidebar used `pathname.startsWith(href)`, the mobile
   bar compared a hand-passed `active` prop by string equality, and the legacy
   desktop nav used `pathname === href`. The consequence was visible — on
   `/competitions/new` the sidebar highlighted Compete and the legacy nav
   highlighted nothing.

   The table and the predicate now live here, once, and the sidebar, the bottom
   bar, the top strip and the shell all import them. `BottomBar.tsx` holds them
   rather than `AppShell.tsx` because `AppShell` imports this file; the reverse
   would be an import cycle.
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
 * `/competitions/comp-1` both light "Compete" — which is what a section nav is
 * for and what all three shipped navs failed to agree on.
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
 * The landscape rail's width. 60px, and the number is the caption's.
 *
 * `.mb-nav-item`'s 3px selection border plus 2 x 1.6px of inline padding leaves
 * 53.8px of content, and "OVERVIEW" — the longest of the six labels — measures
 * 47px at `CellLabel`'s step. The bottom bar proves the same caption fits a
 * 53.3px cell at a 320px viewport, so 60px is that cell with room, not a guess.
 * It costs 60 of the 568–896 horizontal px a landscape phone has spare and
 * ZERO of the 320–414 vertical px the console contract protects.
 */
export const MB_LANDSCAPE_RAIL_W = 60;

/**
 * The other half of `Toast.tsx`'s `MB_TOAST_OFFSET_VAR` contract: the float
 * stack sits bottom-centre and would land on top of this bar.
 *
 * It is a `<style>` element rather than a `useEffect` that writes
 * `documentElement.style` because the bar's visibility is decided by two media
 * queries, and a JS-set custom property cannot know about either — a desktop
 * toast would float 57px above a bar that is not there. The rule set mirrors
 * the bar's own `lg:hidden` and `max-height:500px` gates exactly.
 *
 * `globals.css` is W1-exclusive for the whole programme (charter H1), so a
 * component that needs a media-gated custom property declares it where it is
 * used and states why here.
 */
const TOAST_OFFSET_CSS = `
:root { --mb-toast-offset: ${MB_BOTTOM_BAR_CELL + 1}px; }
@media (min-width: 1024px) { :root { --mb-toast-offset: 0px; } }
@media (max-height: 500px) { :root { --mb-toast-offset: 0px; } }
`;

/**
 * `.mb-nav-item` is unlayered CSS (it sets `display`, `gap`, `padding`,
 * `font-size` and `border-left` outside any `@layer`), so a Tailwind utility
 * cannot outrank it — the same trap `Button.tsx` documents for `.mb-btn`'s
 * padding. Inline style is the one declaration that wins.
 *
 * Reusing `.mb-nav-item` rather than hand-rolling a cell is deliberate: it
 * carries the flush press ink (`--mb-tint-press`, zero-duration in, eased out),
 * the hover wash, `touch-action: manipulation` and the armed coarse-pointer
 * 44px floor. A hand-rolled cell would have to re-derive all four, which is the
 * defect D-17 records against the kit's own controls.
 */
const CELL_STYLE: CSSProperties = {
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  gap: "0.25rem",
  /* 1.6px of inline padding, not the 4px a cell would normally take. It is a
     truncation guard rather than breathing room — the caption is centred in a
     59px cell at 390px and the padding only decides whether "OVERVIEW" (47px
     natural) clears the box at 320px, where the cell is 53px. At 0.25rem it
     did not. */
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
 * The same cell, stood on its end for `MatchbookLandscapeRail`.
 *
 * Two differences from `CELL_STYLE`, both consequences of the axis swap:
 *   - `minHeight` is the bare 44px floor rather than 56. A rail cell is
 *     `flex: 1` inside a viewport-tall column, so at the smallest landscape
 *     phone (320px tall) six cells divide to 53.3px each and the floor is a
 *     floor, not the height.
 *   - `borderLeftWidth` is NOT zeroed. The bottom bar has to move the selection
 *     mark to its top edge and draw it itself (`ActiveRule`); a left rail is the
 *     orientation `.mb-nav-item` was written for, so `border-left-color:
 *     var(--mb-coral)` on `[data-active="true"]` already draws it — one mark,
 *     one width, no second implementation.
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
 * The selection mark, as its own element so it can grow.
 *
 * Shell brief §4.2: the active rule "grows from centre, `--mb-dur-base`
 * `--mb-ease-out`, `transform: scaleX()` only" — the one animated thing in the
 * whole shell, and the only property it touches is a transform on a 3px band,
 * so it cannot move a letterform or trigger layout.
 *
 * `--mb-rule-accent` (3px), not the charter's "2px": the rule tiers in
 * `globals.css` reserve 2px for the masthead badge lockup alone (the schedule
 * spine is a solid-navy EDGE now — §3.5) and put every active/selected mark on
 * the 3px accent tier — which is what `.mb-nav-item`'s left rail and
 * `.mb-tab`'s underline already use. One mark, three orientations, one width.
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
      // No literal duration or easing (invariant 40) — both are tokens, and
      // under prefers-reduced-motion the transition is removed rather than
      // hurried, so the rule is simply already there (invariant 44).
      transition: still
        ? "none"
        : "transform var(--mb-dur-base) var(--mb-ease-out)",
    }}
  />
);

/**
 * The caption. It lives in a child `<span>` because `.mb-nav-item` pins
 * `font-size: 0.85rem` from unlayered CSS; the span has no competing rule, so
 * the smaller step applies there cleanly.
 *
 * It is `display/kicker`'s SIZE (0.62rem) at `display/nav`'s TRACKING (0.08em),
 * and that pairing is deliberate. A kicker's 0.16em is an eyebrow's tracking —
 * it labels the thing beside it and is never read on its own. This word is a
 * destination name, which is what `.mb-nav-item` sets at 0.08em. It is also the
 * difference between "OVERVIEW" fitting a 65px cell and clipping to "OVERVI…":
 * measured at 390px, 0.16em put the longest of the six labels over the cell.
 *
 * The word stays NAVY when the cell is active. The charter asked for a coral
 * label, but `--mb-coral` measures 3.55:1 on paper-bright and the floor for
 * text under 18.66px is 4.5:1 — that is HF-6, which outranks the charter — and
 * the coral job list in `globals.css` has already moved active nav INK to navy
 * for exactly this reason. The state is carried by the rule, the lift and the
 * weight instead, so it also survives greyscale (invariant 13).
 */
const CellLabel = ({ label, active }: { label: string; active: boolean }) => (
  <span
    className={`matchbook-display block w-full truncate text-center text-[0.62rem] leading-none tracking-[0.08em] ${
      active ? "font-bold" : "font-semibold"
    }`}
  >
    {label}
  </span>
);

/* ---------------------------------------------------------------------- bar */

/**
 * The mobile primary navigation (GAP-3, charter D-16).
 *
 * It replaces a horizontally scrolling row of 30px text links whose sixth item
 * ("Tools") sat at x=450 in a 390px viewport with no fade, no chevron and no
 * scroll-snap — measured `nav.scrollWidth 458` against `clientWidth 390` — and
 * which was not sticky, so after one screen of scrolling a phone had no
 * navigation on screen at all.
 *
 * Structure is `<nav><ul><li>` rather than a flex row of anchors for two
 * reasons: it is the markup a screen reader expects from a navigation, and the
 * hairline between two `<li>` cells is a *measured divider between sibling list
 * rows*, which is what makes six abutting 65px cells a ruled ledger rather than
 * six controls crowded under the 8px separation floor.
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
          // R7: the bar is fixed over horizontally scrolling brackets and
          // rotation rails. Containment keeps those scrolls off its layer.
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

      {/* DESTINATIONS ONLY (G16).
          It used to end with `MbAccountChip variant="rail"` — the crest, the
          signed-in address and a full-width Sign out — while the top strip's
          own `•••`, 740px above it on the same screen, opened a menu carrying
          that same address and that same Sign out. Two unlabelled `•••` discs,
          the same two rows behind both. The account now lives in exactly one
          control per breakpoint (`AccountChip.tsx`), and this sheet is what its
          title says: the destinations that did not fit in the bar.

          `flush` + no `border-y` (G17). With the body's 1rem inset and a top
          rule on the list, the sheet drew a rule 16px under the header's rule
          with nothing between them — an empty ruled row above "TOOLS", which
          reads as a row whose label failed to render. The rows now start at the
          header's own rule and run edge to edge, which is the ledger idiom
          `MbMenu` already uses and the reason `MbDialogBody` has `flush`. */}
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
 * THE LANDSCAPE RAIL (N1).
 *
 * ------------------------------------------------------------------ the hole
 *
 * `MatchbookBottomBar` is `lg:hidden` **and** `[@media(max-height:500px)]:hidden`,
 * and `MatchbookSidebar` is `lg:` only. A landscape phone is under `lg` and
 * under 500px tall, so it matched both gates and got neither navigation.
 * Measured with a scripted visibility sweep — every `<nav>` and every anchor
 * pointing at one of the six destinations, each rect intersected against every
 * clipping ancestor and the viewport — at 568x320, 640x360, 667x375, 844x390
 * and 896x414, on `/`, `/teams`, `/quick-match`, `/competitions`, `/summaries`,
 * `/tools`, `/competitions/new`, two competition detail routes and
 * `/tools/volleyball-rotations`:
 *
 *   **0 visible nav elements, 1 reachable destination** — `/`, via the 44x44
 *   crest in the top strip, which carries no visible word. On the three routes
 *   that pass a `back` the crest is replaced by the chevron, so the one
 *   reachable destination is the parent list and `/` is unreachable too.
 *
 * That is invariant 38 ("nothing important is hidden behind a breakpoint —
 * only redundant context") failing on the app's entire primary navigation, for
 * the single gesture a user makes most: rotating the phone.
 *
 * ------------------------------------------------------------------ the rule
 *
 * Navigation is present on every `console` route at every viewport, and the
 * axis it takes is decided by which axis has room:
 *
 *   width >= 1024px                    `MatchbookSidebar`, 218px. Unchanged.
 *   width <  1024px, height >  500px   `MatchbookBottomBar`. Unchanged.
 *   width <  1024px, height <= 500px   THIS — 60px on the left edge.
 *
 * `variant="focus"` — the fullscreen scoring console (`/match/*`) and the
 * rotation editor — renders no navigation at all, at any size, and this does
 * not change that: `MatchbookShell` returns from the `focus` branch before
 * either nav exists. Invariant 39's landscape contract is about the SCORE, on a
 * screen that has never rendered a nav, so the bottom bar's `max-height:500px`
 * gate stays exactly as it is and the rail spends horizontal space instead —
 * 60px out of the 568-896 a landscape phone has, and none of the 320-414 it
 * does not.
 *
 * ------------------------------------------------------------- six, not 5+More
 *
 * The bar carries five destinations plus a More sheet because seven cells
 * across 390px is 55px each and reads as a toolbar. That arithmetic is
 * horizontal and does not survive the rotation: six cells down the SHORTEST
 * landscape phone (320px, minus the safe insets) divide to 53.3px, over the
 * 44px floor, so the sixth destination is simply in the rail. A sheet on a
 * 320px-tall viewport would also be a 320px-tall dialog, which is the thing the
 * height gate exists to avoid.
 *
 * `<nav><ul><li>` and a hairline between cells, for the same two reasons the
 * bar states: it is the markup a screen reader expects, and six abutting
 * interactive boxes at 0px separation need a measured divider rather than the
 * 8px gap there is no room for.
 */
export const MatchbookLandscapeRail = ({ active }: { active?: string }) => {
  const pathname = usePathname();
  const here = active ?? pathname;

  return (
    /* `<nav>` is the OUTER element, unlike `MatchbookSidebar`'s `<aside> >
       <nav>`. The rail carries destinations and nothing else — no brand, no
       CTA, no account — so an `<aside>` around it would add a second,
       unlabelled `complementary` landmark whose only child is the navigation
       landmark a reader already has. The sidebar earns its `<aside>` because it
       holds four different things. */
    <nav
      aria-label="Sections"
      className="mb-landscape-rail mb-print-hide sticky top-0 max-h-screen min-h-screen shrink-0 flex-col overflow-y-auto border-r border-mb-navy bg-mb-paper"
      style={{
        /* The `edge` tier — "the BOUNDARY of a thing" — as the token, not as a
           literal. The rule ladder in `globals.css` is explicit that nothing
           may reintroduce a fractional rule, and `border-r-[1.5px]` (which is
           what the bottom bar's top edge still uses) is one: it rasterised to
           1px here anyway, so the literal was buying nothing. */
        borderRightWidth: "var(--mb-rule-edge)",
        /* The rail sits on the left edge, which in landscape-left is the NOTCH
           edge — `env(safe-area-inset-left)` is 47px there and 0 everywhere
           else. Padding the rail rather than the list moves the 3px selection
           border out with the cells (invariant 34). `--mb-safe-left` is
           declared beside `--mb-safe-top`/`--mb-safe-bottom` in `globals.css`;
           it did not exist until a navigation moved to that edge. */
        paddingLeft: "var(--mb-safe-left)",
        paddingTop: "var(--mb-safe-top)",
        paddingBottom: "var(--mb-safe-bottom)",
        width: `calc(${MB_LANDSCAPE_RAIL_W}px + var(--mb-safe-left))`,
        /* R7, same as the bar: the rail is stuck over horizontally scrolling
           brackets and rotation rails. Containment keeps those scrolls off its
           layer. */
        contain: "layout paint",
      }}
    >
      {/* `flex-1` everywhere and `min-h-0` NOWHERE, deliberately. A column flex
          item's default `min-height: auto` refuses to shrink below its content,
          so six cells divide the rail evenly while they fit (53.3px each at
          320px tall, 68.2px at 414) and the rail's own `overflow-y-auto` takes
          over if a viewport ever appears that cannot hold 6 x 44. With
          `min-h-0` they would silently compress under the 44px floor instead —
          which is the failure mode, not the fallback. */}
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
