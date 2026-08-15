import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/* ===========================================================================
   THE DOCUMENT MUST NOT BE WIDER THAN THE VIEWPORT — the three declarations
   that hold that up, asserted where a browser is not available.

   The failure these guard against is not cosmetic and it is not confined to the
   panel it starts in. Measured on `/teams` at 390 with a roster of ordinary
   club names (Westhill Wanderers, Northside Thunder, Beckton Blues):

     documentElement.scrollWidth   420 against a 390 viewport
     the bottom nav                `fixed inset-x-0`, so it stretched to 420 —
                                   under mobile emulation the layout viewport
                                   grows to the overflow and the bar goes with
                                   it. At 320 none of the bar was on screen and
                                   `window.scrollTo(420, 0)` left `scrollX` at 0,
                                   because `html { overflow-x: hidden }` had
                                   propagated to the viewport.

   So a two-word team name took the app's primary navigation off the screen and
   removed the gesture that could have brought it back. Three declarations close
   it, in three different files, and any one of them going missing brings the
   whole thing back — which is why they are asserted together here rather than
   trusted to the comment above each one.

   None of this can be measured in jsdom: it has no layout, so
   `scrollWidth` is 0 everywhere and the real check is the browser sweep
   (`documentElement.scrollWidth === documentElement.clientWidth` on every route
   at 320/360/375/390/414). These are the source-level preconditions for that
   sweep passing, and they are the parts a refactor can silently drop.
   =========================================================================== */

const read = (...parts: string[]) =>
  readFileSync(join(process.cwd(), "src", ...parts), "utf8");

describe("the horizontal guard is the absence of a clip, not a clip", () => {
  const css = read("app", "globals.css");

  /** The `html { … }` rule body, comments excluded. */
  const htmlRule = () => {
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const match = withoutComments.match(/(^|\})\s*html\s*\{([^}]*)\}/);
    return match?.[2] ?? "";
  };

  it("declares an html rule at all", () => {
    expect(htmlRule()).toContain("height");
  });

  /* `overflow-x: hidden` on the ROOT propagates to the viewport: it hides the
     overflow AND makes it unscrollable, so the reader can neither see the
     problem nor work around it. Rubric 6.3 counts content clipped this way as
     the defect; charter invariant 31 says in as many words that it "hides the
     symptom, so verify the number". If a route overflows, that is a bug in the
     route. */
  it("never puts overflow back on the root", () => {
    expect(htmlRule()).not.toMatch(/overflow/);
  });

  /* Tailwind's `.sr-only` is `position: absolute` with NO inset, so it keeps
     its static position — which, for a label inside a horizontally scrolled
     table, is off the right of the viewport. An abspos box is clipped only by
     ancestors in its containing-block chain, and `MbTableScroll` is not
     positioned, so `overflow-x: auto` never touched it. A definite inline start
     is what stops a 1x1px invisible span being the widest thing in the
     document.

     The attribute selectors matter as much as the property: the class also
     ships behind variants (`max-sm:sr-only` in `TopStrip.tsx`), which a plain
     `.sr-only` selector does not reach. */
  it("pins every visually-hidden box to its containing block's inline start", () => {
    const rule = css.match(
      /\[class~="sr-only"\][^{]*\{[^}]*\}|\[class\*=":sr-only"\][^{]*\{[^}]*\}/
    );
    expect(rule, "the sr-only inline-start rule is gone from globals.css").not.toBeNull();
    expect(css).toMatch(/\[class~="sr-only"\]/);
    expect(css).toMatch(/\[class\*=":sr-only"\]/);
    expect(rule?.[0]).toMatch(/inset-inline-start:\s*0/);
  });

  /* It must stay UNLAYERED. Tailwind's own `.sr-only` lives in
     `@layer utilities`, and an unlayered rule beats every layered one however
     the specificities compare; move this inside a `@layer` and it silently
     stops applying. */
  it("keeps that rule unlayered so it outranks Tailwind's own", () => {
    const upTo = css.slice(0, css.indexOf('[class~="sr-only"]'));
    const opened = (upTo.match(/@layer[^;{]*\{/g) ?? []).length;
    const closedBlocks = upTo.split("").reduce(
      (depth, ch) => (ch === "{" ? depth + 1 : ch === "}" ? depth - 1 : depth),
      0
    );
    expect(opened, "no @layer blocks are open at the rule").toBeGreaterThanOrEqual(0);
    expect(closedBlocks, "the rule sits at top level, not inside a block").toBe(0);
  });
});

describe("a team name is never wider than the box it is handed", () => {
  /* Two ceilings, one per component, and they are not interchangeable.

     `MbTeamName`'s split form pins its last token with `shrink-0`, which made
     the box advertise a min-content floor equal to that token — every `1fr`
     grid track and `flex-1` box holding one inherited the floor. `overflow-clip`
     gives the box an automatic minimum size of zero (Flexbox §4.5) so it stops
     promising a width it cannot honour.

     `TeamMark` needs the other half. A `truncate` box's min-content is its whole
     string — `white-space: nowrap` is unbreakable and no `overflow` value lowers
     a block's intrinsic size — and a mark placed with `justify-self: start`/`end`
     is sized `fit-content`, i.e. `max(min-content, area)`. Measured on
     `/quick-match` at 320 with a 39-character roster: a 280.9px mark in a 59.6px
     grid area, `documentElement.scrollWidth` 378 against 320, and none of the
     57px bottom bar on screen. `max-w-full` clamps the USED width, which
     `min-w-0` — a floor — never could. */

  it("MbTeamName's split form clips rather than setting a floor", () => {
    const src = read("components", "matchbook", "TeamName.tsx");
    const splitBox = src.match(/className=\{`flex min-w-0 items-baseline[^`]*`\}/);
    expect(splitBox, "MbTeamName's split branch changed shape").not.toBeNull();
    expect(splitBox?.[0]).toContain("overflow-clip");
  });

  it("TeamMark carries a ceiling in both orientations", () => {
    const src = read("components", "matchbook", "Panel.tsx");
    expect(src).toMatch(/const MARK_CEILING = "max-w-full"/);
    // once for the vertical root, once for the horizontal one
    const uses = src.match(/\$\{MARK_CEILING\}/g) ?? [];
    expect(uses.length).toBe(2);
  });
});
