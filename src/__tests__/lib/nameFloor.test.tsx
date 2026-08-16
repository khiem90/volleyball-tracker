import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  MbTeamName,
  NAME_FLOOR,
  splitTeamName,
  TAIL_CEILING,
} from "@/components/matchbook/TeamName";

/* ===========================================================================
   THE NAME FLOOR, PINNED

   `TeamName.tsx` states the rule — a team name paints at least `NAME_FLOOR`
   characters, or the layout changes shape — and contributes a BACKSTOP to it:
   a cap on the pinned tail so the head can never paint nothing. The layouts
   deliver the floor; this class only stops the failure mode from being "no club
   name at all", and a single class is exactly the kind of thing a later edit
   deletes while "simplifying the markup".

   What is NOT asserted here is the painted-character count itself. Eight
   characters is a fact about rendered Oswald in a real box, and jsdom has no
   layout — it reports every width as 0. That measurement lives in the
   Playwright census (`nm-census.mjs`), which reconstructs each name per
   character with a Range and intersects every clipping ancestor. This file
   guards the things that are true without layout: the constant, the shape of
   the markup, and which of the two spans carries which promise.
   =========================================================================== */

const SPLIT = "Westhill Wanderers II";
const WHOLE = "Apex";

describe("the name floor", () => {
  it("is eight characters", () => {
    // Not a preference. Eight is where this roster's clubs stop colliding:
    // "Beckton " and "Marlow B" separate, "Bec VC" and "Mar VC" do not.
    expect(NAME_FLOOR).toBe(8);
  });

  it("keeps its backstop in the font's own figure width, and below the floor", () => {
    // `ch`, so the share tracks every type step, zoom and fallback face with
    // nothing to re-derive at a call site. A px value here would be a lie at
    // 0.72rem or at 200% zoom.
    const ch = /calc\(100%-(\d+)ch\)/.exec(TAIL_CEILING);
    expect(ch).not.toBeNull();
    // Far below the floor on purpose. A cap at or near `NAME_FLOOR` bites in
    // the ordinary range and trades the F15 middle-elision for this one: at
    // 11ch, "Westhill Wanderers" painted "WESTHILL WANDE" where plain elision
    // gave "WESTHIL… WANDERERS".
    expect(Number(ch![1])).toBeLessThan(NAME_FLOOR);
    // A CEILING on the tail, never a FLOOR on the head: a `min-width` on the
    // head binds even when the head is SHORT, which pushes the tail off the
    // end of an over-wide box and renders "Peak B" as "PEAK    B".
    expect(TAIL_CEILING).toContain("max-w-");
    expect(TAIL_CEILING).not.toContain("min-w-");
  });

  it("marks a cut tail with its own ellipsis, never a silent clip (F6)", () => {
    // `text-overflow` is inert under `overflow: clip`, so the first version
    // hard-cut the tail mid-word: "WE… WANDERE" in the widest 1440 bracket
    // cell, the head announcing its elision while the tail lied by omission.
    // `hidden` + `ellipsis` paints "WE… WANDER…" instead.
    expect(TAIL_CEILING).toContain("overflow-hidden");
    expect(TAIL_CEILING).toContain("text-ellipsis");
    expect(TAIL_CEILING).not.toContain("overflow-clip");
    // And never `truncate`: its `white-space: nowrap` would collapse the
    // joining space the tail carries via `whitespace-pre`.
    expect(TAIL_CEILING).not.toContain("truncate");
  });
});

describe("MbTeamName markup", () => {
  it("puts the ceiling on the tail and the ellipsis on the head", () => {
    const html = renderToStaticMarkup(<MbTeamName name={SPLIT} />);
    const [head, tail] = splitTeamName(SPLIT);

    // The head is the part that gives, and it gives with an ellipsis.
    expect(html).toContain(`class="min-w-0 truncate">${head}<`);
    // The tail is pinned — it never shrinks — and capped, so pinning it can
    // never starve the head below the floor.
    expect(html).toContain(TAIL_CEILING);
    expect(html).toContain("shrink-0 whitespace-pre");
    expect(html).toContain(`>${tail}<`);
  });

  it("keeps the whole name in the DOM whatever is painted", () => {
    // A screen reader, a find-in-page and a copy all get the full name; only
    // the paint is elided.
    const html = renderToStaticMarkup(<MbTeamName name={SPLIT} />);
    expect(html.replace(/<[^>]*>/g, "")).toBe(SPLIT);
    expect(html).toContain(`title="${SPLIT}"`);
  });

  it("does not build a two-span pair for a name with nothing to pin", () => {
    // One token: there is no tail, so there is no ceiling and no flex row —
    // a plain truncating block, which is what it always was.
    const html = renderToStaticMarkup(<MbTeamName name={WHOLE} />);
    expect(html).toContain("block truncate");
    expect(html).not.toContain(TAIL_CEILING);
  });
});
