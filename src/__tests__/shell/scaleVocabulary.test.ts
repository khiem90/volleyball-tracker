import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/* ===========================================================================
   THE SCALE IS DECLARED — THIS MAKES IT IN FORCE.

   Two independent critics measured the same tree and both failed it: a design
   language that names 25 type steps, 7 gap values and 4 radii, rendering 55
   type tuples, 12 gap values and 5 radii. None of the excess was a decision.
   Every one was a call site that reached for the Tailwind value next to the
   right one — `gap-1` where the vocabulary starts at `gap-1.5`, `gap-5` where
   the grid gap is `gap-4`, `rounded-[1px]` where the mark radius is 2px — and
   nothing in review or in the browser sweep said so, because a 1px difference
   is invisible one call site at a time and only exists as a census.

   So the census lives here, in a test that needs no browser and no dev server.
   It reads source, not layout, so it cannot see a value that arrives through a
   computed style — that is what `pw/mine-scale.mjs` is for. What it CAN see is
   every literal an engineer types, which is where all twelve of those gap
   values came from.

   `globals.css` is deliberately not scanned. A rule that sets `gap: 1px` on
   `.mb-segmented` is a decision about one control, made once, in the file that
   owns it. A `gap-1` in a route file is nobody's decision at all.
   =========================================================================== */

const ROOT = join(process.cwd(), "src");

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".tsx") || entry.endsWith(".ts")) out.push(full);
  }
  return out;
};

/**
 * Not exemptions on the merits. Every file below carries the same residue,
 * measured, and every one is being rewritten by a different agent in this same
 * round; asserting on a file two people are editing turns a guard into a race.
 * Delete a name the moment its owner lands and this test says immediately
 * whether they finished.
 *
 * `court/` is here for a different reason and is not a to-do: its display type
 * is SVG `<text>` inside a `viewBox`, where size and tracking are user units
 * that scale with the diagram. The px ladder does not apply to it.
 */
const OTHER_SLICES = [
  "components/matchbook/court/",
  "components/matchbook/AppShell.tsx",
  "components/matchbook/BottomBar.tsx",
  "components/matchbook/CourtCard.tsx",
  "components/matchbook/MatchRow.tsx",
  "components/matchbook/Panel.tsx",
  "components/matchbook/ScoreNumeral.tsx",
  "components/matchbook/ScoreSide.tsx",
  "components/matchbook/Sidebar.tsx",
  "components/matchbook/StandingsTable.tsx",
  "components/matchbook/TopStrip.tsx",
  "components/matchbook/panels.tsx",
  "components/matchbook/teamPanels.tsx",
  "app/match/",
  "app/quick-match/page.tsx",
  "app/summaries/page.tsx",
];

const FILES = [
  ...walk(join(ROOT, "components", "matchbook")),
  ...walk(join(ROOT, "app")).filter((f) => f.endsWith("page.tsx")),
].filter((f) => {
  const path = f.replace(/\\/g, "/");
  if (path.includes("__tests__")) return false;
  return !OTHER_SLICES.some((skip) => path.includes(`/src/${skip}`));
});

const read = (f: string) => readFileSync(f, "utf8");
const rel = (f: string) => relative(process.cwd(), f).replace(/\\/g, "/");

/**
 * Blank every comment while keeping the line count, so a finding's line number
 * still points at the right line.
 *
 * This kit quotes the design language in prose constantly — `rounded-[1px]`
 * appears inside the comment explaining why it is no longer used — and a test
 * that fails on its own documentation is a test somebody deletes rather than
 * reads. Stripping has to survive block comments spanning lines, which is why
 * it runs over the whole file rather than line by line.
 */
const decommented = (source: string) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, lead: string) => lead + " ".repeat(m.length - lead.length));

/** Every match of `re` in real code, as `file:line  match  —  the line`. */
const hits = (re: RegExp) => {
  const out: string[] = [];
  for (const file of FILES) {
    const lines = decommented(read(file)).split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const found = lines[i].match(re);
      if (found) out.push(`${rel(file)}:${i + 1}  ${found[0]}  —  ${lines[i].trim().slice(0, 96)}`);
    }
  }
  return out;
};

describe("spacing vocabulary — design language 3.3, 'the complete set, do not add values'", () => {
  /*
   * 3, 6, 8, 10, 12, 16, 24 — form squares, inline icon↔text (1.5/2/2.5/3),
   * the grid gap, and the masthead's column gutter. Nothing else.
   *
   * The two that reached this tree and are not in it were `gap-1` / `gap-y-1`
   * (4px, 1064 rendered instances) and `gap-0.5` (2px, 112). Both sit one
   * Tailwind step below the smallest value the language names, which is
   * exactly why nobody noticed: 4px looks like a spacing decision and 6px
   * looks like the same decision.
   */
  const OFF_LADDER =
    /(?<![-\w])gap(?:-[xy])?-(?:0(?:\.5)?|1|3\.5|5|7|9|10|11|12|14|16|20|24|28|32)(?![\d.])/;

  it("no gap-0.5 / gap-1 / gap-3.5 / gap-5 / gap-10 in the kit or the routes", () => {
    expect(hits(OFF_LADDER)).toEqual([]);
  });

  /* The arbitrary form. `gap-[3px]` is the one the language names; anything
     else written as an arbitrary value is a new number by definition. */
  it("the only arbitrary gap literal is the 3px form-square rung", () => {
    const bad = hits(/(?<![-\w])gap(?:-[xy])?-\[[^\]]+\]/).filter(
      (h) => !/gap(?:-[xy])?-\[3px\]/.test(h)
    );
    expect(bad).toEqual([]);
  });
});

describe("radius vocabulary — design language 3.3", () => {
  /*
   * 4px panels/buttons/inputs, 3px score and seed boxes, 2px marks, 999px for
   * the four reserved discs. A 1px corner is not a radius, it is a rounding
   * error that survived review — and it was the whole of the off-vocabulary
   * radius count, at 48 rendered corners.
   */
  it("no arbitrary radius outside {2, 3, 4, 999}px", () => {
    const bad = hits(/rounded-\[[^\]]+\]/).filter(
      (h) => !/rounded-\[(?:2px|3px|4px|999px)\]/.test(h)
    );
    expect(bad).toEqual([]);
  });

  /* "Anything ≥ rounded-lg is an anti-pattern" — 3.3, verbatim. */
  it("no rounded-lg or larger", () => {
    expect(hits(/className=[^\n]*\brounded-(?:lg|xl|2xl|3xl|full)\b/)).toEqual([]);
  });
});

describe("the tracking ladder — design language 2.1a, charter invariant 8", () => {
  /*
   * `letter-spacing` inherits. A `<span class="matchbook-display font-bold">`
   * with no rung of its own takes whatever the row around it happens to carry,
   * which is how one component rendered 0.02em in one panel and 0.08em in
   * another. Every display element carries its own rung — including the ones
   * whose size comes from a parent, which are precisely the ones that look
   * like they do not need it.
   */
  it("every class list that names matchbook-display also names a rung", () => {
    const bare: string[] = [];
    for (const file of FILES) {
      const source = decommented(read(file));
      // Class lists only — a docblock that says "matchbook-display" is prose.
      for (const m of source.matchAll(/className=\{?[`"]([^"`]*)[`"]/g)) {
        const list = m[1];
        if (!/\bmatchbook-display\b/.test(list)) continue;
        // A rung is an `.mb-track-*` class, `tracking-normal` (2.1a's figures
        // and marks), or the one measured `tracking-[…]` literal.
        if (/\btracking-/.test(list) || /\bmb-track-[a-z]+\b/.test(list)) continue;
        const line = source.slice(0, m.index ?? 0).split(/\r?\n/).length;
        bare.push(`${rel(file)}:${line}  ${list.slice(0, 110)}`);
      }
    }
    expect(bare).toEqual([]);
  });

  /* An arbitrary tracking is un-auditable: nothing in review tells you whether
     `[0.1em]` is `display/status` or a guess. 2.1a allows exactly one, and it
     is `MatchbookBottomBar`'s label, measured in a comment beside it — which
     lives in another slice's file and so is out of this scan already. */
  it("no bare tracking-[…] anywhere in scope", () => {
    expect(hits(/tracking-\[[^\]]+\]/)).toEqual([]);
  });
});

describe("type scale — design language 2.1, 'never introduce a size between two steps'", () => {
  /** Every named step, in rem, from the display and body tables of 2.1. */
  const NAMED = new Set([
    "0.6",
    "0.62",
    "0.66",
    "0.72",
    "0.74",
    "0.78",
    "0.8",
    "0.82",
    "0.85",
    "0.9",
    "0.95",
    "1.05",
    "1.2",
    "1.5",
    "1.875",
    "2.25",
    "3",
    "3.75",
  ]);

  it("every text-[…rem] literal is a named step", () => {
    const bad: string[] = [];
    for (const h of hits(/text-\[(\d*\.?\d+)rem\]/)) {
      const value = /text-\[(\d*\.?\d+)rem\]/.exec(h)?.[1];
      if (value && !NAMED.has(value)) bad.push(h);
    }
    expect(bad).toEqual([]);
  });
});
