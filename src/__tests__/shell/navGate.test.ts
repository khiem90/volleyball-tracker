import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MB_NAV, MB_NAV_ALL, MB_NAV_MORE } from "@/components/matchbook/BottomBar";

/* ===========================================================================
   EXACTLY ONE NAVIGATION, AT EVERY VIEWPORT (N1)

   The shell ships three primary navigations and each one hides itself with its
   own rule, written in a different file in a different language:

     MatchbookSidebar        `hidden … lg:flex`                    Sidebar.tsx
     MatchbookBottomBar      `lg:hidden [@media(max-height:500px)]:hidden`
                                                                  BottomBar.tsx
     MatchbookLandscapeRail  `@media (max-height: 500px) and
                              (max-width: 1023.98px)`             globals.css

   Three independent hide rules is exactly how the app arrived at a landscape
   phone that matched TWO of them and none of the shows: measured at 568x320,
   640x360, 667x375, 844x390 and 896x414, on every console route, **0 visible
   nav elements and one reachable destination** — `/`, behind the top strip's
   wordless crest.

   So this test does not check that three strings are present. It reads the
   three breakpoints OUT of the three sources, evaluates all three rules over a
   grid of viewports, and fails if any viewport gets two navigations or none.
   Change the bar's height gate without moving the rail's and this goes red on
   the band that opens up between them.
   =========================================================================== */

const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), "utf8");

const CSS = read("src", "app", "globals.css");
const BOTTOM_BAR = read("src", "components", "matchbook", "BottomBar.tsx");
const SIDEBAR = read("src", "components", "matchbook", "Sidebar.tsx");
const APP_SHELL = read("src", "components", "matchbook", "AppShell.tsx");

/** Tailwind's `lg`, which all three rules are written against. */
const LG = 1024;

/* --------------------------------------------------- breakpoints, extracted */

/** `[@media(max-height:500px)]:hidden` on the fixed bottom bar. */
const barMaxHeight = (() => {
  const m = /\[@media\(max-height:(\d+)px\)\]:hidden/.exec(BOTTOM_BAR);
  return m ? Number(m[1]) : null;
})();

/** The rail's own two-condition query in `globals.css`. */
const railQuery = (() => {
  const m =
    /@media\s*\(max-height:\s*([\d.]+)px\)\s*and\s*\(max-width:\s*([\d.]+)px\)\s*\{\s*\.mb-landscape-rail\s*\{\s*display:\s*flex/.exec(
      CSS
    );
  return m ? { maxHeight: Number(m[1]), maxWidth: Number(m[2]) } : null;
})();

describe("the three gates are readable from their own sources", () => {
  it("the bottom bar hides below a stated height and at lg", () => {
    expect(barMaxHeight).toBe(500);
    expect(BOTTOM_BAR).toMatch(/lg:hidden/);
  });

  it("the sidebar is lg-and-up only", () => {
    expect(SIDEBAR).toMatch(/\bhidden\b[^"]*\blg:flex\b/);
  });

  it("the landscape rail defaults to display:none and is turned on by one query", () => {
    expect(/\.mb-landscape-rail\s*\{\s*display:\s*none;\s*\}/.test(CSS)).toBe(true);
    expect(railQuery).not.toBeNull();
  });
});

/* ------------------------------------------------------- the rule, evaluated */

type Nav = "sidebar" | "bar" | "rail";

const shown = (w: number, h: number): Nav[] => {
  const out: Nav[] = [];
  if (w >= LG) out.push("sidebar");
  if (w < LG && h > (barMaxHeight ?? 0)) out.push("bar");
  if (railQuery && h <= railQuery.maxHeight && w <= railQuery.maxWidth) out.push("rail");
  return out;
};

/** The five landscape phones the defect was measured on, plus its neighbours. */
const VIEWPORTS: [number, number][] = [
  // portrait phones
  [320, 568], [360, 640], [375, 667], [390, 844], [414, 896],
  // landscape phones — every one of these had NO navigation
  [568, 320], [640, 360], [667, 375], [844, 390], [896, 414],
  // tablets, both orientations
  [768, 1024], [834, 1112], [1024, 768], [1112, 834],
  // desktop, including a short window and both sides of the lg seam
  [1280, 800], [1366, 768], [1440, 900], [1440, 480],
  [1023, 700], [1023, 500], [1023.5, 400], [1024, 500], [1024, 320],
];

describe("every viewport gets exactly one navigation", () => {
  it.each(VIEWPORTS)("%ix%i", (w, h) => {
    expect(shown(w, h)).toHaveLength(1);
  });

  it("landscape phones get the rail, portrait phones the bar, desktop the sidebar", () => {
    expect(shown(568, 320)).toEqual(["rail"]);
    expect(shown(896, 414)).toEqual(["rail"]);
    expect(shown(390, 844)).toEqual(["bar"]);
    expect(shown(834, 1112)).toEqual(["bar"]);
    expect(shown(1440, 900)).toEqual(["sidebar"]);
    // a short DESKTOP window keeps the sidebar; the rail must not leak into it
    expect(shown(1440, 400)).toEqual(["sidebar"]);
  });

  it("the rail's width gate is the exact complement of Tailwind's lg", () => {
    // 1023.98, not 1023: a fractional viewport width between the two would
    // otherwise match neither the rail nor `lg` and paint no navigation at all.
    expect(railQuery?.maxWidth).toBeGreaterThan(LG - 1);
    expect(railQuery?.maxWidth).toBeLessThan(LG);
  });

  it("the rail's height gate is the exact complement of the bar's", () => {
    expect(railQuery?.maxHeight).toBe(barMaxHeight);
  });
});

/* ------------------------------------------------------------- the contents */

describe("the rail carries every destination, and only the console has one", () => {
  it("renders MB_NAV_ALL — a new destination cannot reach the rail and miss the bar", () => {
    expect(MB_NAV_ALL).toHaveLength(MB_NAV.length + MB_NAV_MORE.length);
    expect(MB_NAV_ALL).toHaveLength(6);
    const rail = BOTTOM_BAR.slice(BOTTOM_BAR.indexOf("MatchbookLandscapeRail"));
    expect(rail).toMatch(/MB_NAV_ALL\.map/);
  });

  it("six 44px cells fit the shortest landscape phone", () => {
    // 320px tall, the smallest landscape viewport, against the 44px touch
    // floor — the reason the rail carries six destinations rather than the
    // bar's five-plus-a-sheet.
    expect(MB_NAV_ALL.length * 44).toBeLessThanOrEqual(320);
  });

  it("only the console branch of the shell mounts it", () => {
    expect(APP_SHELL).toMatch(/<MatchbookLandscapeRail\s+active=\{here\}\s*\/>/);
    // one mount site, and it is after the `focus` and `public` early returns
    expect(APP_SHELL.match(/<MatchbookLandscapeRail/g)).toHaveLength(1);
    const railAt = APP_SHELL.indexOf("<MatchbookLandscapeRail");
    expect(railAt).toBeGreaterThan(APP_SHELL.indexOf('if (variant === "focus")'));
    expect(railAt).toBeGreaterThan(APP_SHELL.indexOf('if (variant === "public")'));
  });

  it("honours the horizontal safe-area insets it now sits inside", () => {
    // the horizontal axis only matters once a nav sits at the notch edge of
    // a landscape phone
    expect(CSS).toMatch(/--mb-safe-left:\s*env\(safe-area-inset-left,\s*0px\)/);
    expect(BOTTOM_BAR).toMatch(/paddingLeft:\s*"var\(--mb-safe-left\)"/);
  });
});
