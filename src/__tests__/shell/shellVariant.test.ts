import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import {
  mbIsChromelessRoute,
  mbShellVariantFor,
} from "@/components/matchbook/AppShell";

/* ===========================================================================
   THE ROOT LOADING BOUNDARY MUST PREDICT THE PAGE'S OWN SHELL

   `app/loading.tsx` paints before any nested boundary — Next shows the
   outermost invalidated boundary first — so it, not `app/session/loading.tsx`,
   decides what the FIRST FRAME of a public share link looks like. It derives
   the variant from the pathname through `mbShellVariantFor`.

   That prediction is only as good as its agreement with what the page then
   declares. The second block below reads every `page.tsx` under `src/app` and
   fails if any of them declares a shell variant the predicate would not have
   guessed — which is what turns "a list of prefixes in one file" into a rule
   the codebase actually enforces. A new public route added under, say,
   `/invite/*` fails this test the moment its page says `variant="public"`.
   =========================================================================== */

const APP = join(process.cwd(), "src", "app");

/** Route paths, with dynamic segments filled in by a plausible sample. */
const SAMPLE: Record<string, string> = {
  "[shareCode]": "SUMMER",
  "[shareId]": "mbPreview1",
  "[id]": "m-rrf-001",
  "[state]": "error",
};

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

/** `src/app/summary/[shareCode]/page.tsx` -> `/summary/SUMMER` */
const routeOf = (file: string) =>
  "/" +
  relative(APP, file)
    .split(sep)
    .slice(0, -1)
    .map((seg) => SAMPLE[seg] ?? seg)
    .join("/");

/**
 * `/dev/kit` and `/dev/states/*` are the harness galleries: they render all
 * three shells side by side on purpose, so "one variant per route" is not a
 * claim about them. They are also `NODE_ENV !== "production"` only.
 */
const PAGES = walk(APP)
  .filter((f) => f.endsWith(`${sep}page.tsx`))
  .filter((f) => !relative(APP, f).startsWith(`dev${sep}`));

describe("mbShellVariantFor", () => {
  it("puts every public share surface on the public shell", () => {
    expect(mbShellVariantFor("/session/SUMMER")).toBe("public");
    expect(mbShellVariantFor("/session/ABC123")).toBe("public");
    expect(mbShellVariantFor("/summary/GYMDAY")).toBe("public");
    expect(mbShellVariantFor("/tools/volleyball-rotations/shared/x1")).toBe(
      "public"
    );
  });

  it("puts the scoring console and the formation editor on the focus shell", () => {
    expect(mbShellVariantFor("/match/m-sec-048")).toBe("focus");
    expect(mbShellVariantFor("/match/guest")).toBe("focus");
    expect(mbShellVariantFor("/tools/volleyball-rotations/editor")).toBe("focus");
  });

  it("leaves everything else on the console shell", () => {
    for (const route of [
      "/",
      "/teams",
      "/quick-match",
      "/competitions",
      "/competitions/new",
      "/competitions/comp-rr-summer-league",
      "/summaries",
      "/tools",
      "/tools/volleyball-rotations",
      "/tools/volleyball-rotations/my-formations",
    ])
      expect(mbShellVariantFor(route)).toBe("console");
  });

  it("matches on segment boundaries, so /summaries is not under /summary", () => {
    expect(mbShellVariantFor("/summaries")).toBe("console");
    expect(mbShellVariantFor("/summaries/anything")).toBe("console");
    /* `/matchmaking` would be a console route, not a scoring console. */
    expect(mbShellVariantFor("/matchmaking")).toBe("console");
    expect(mbShellVariantFor("/sessions")).toBe("console");
  });

  it("treats only /login as chromeless", () => {
    expect(mbIsChromelessRoute("/login")).toBe(true);
    expect(mbIsChromelessRoute("/login/reset")).toBe(true);
    expect(mbIsChromelessRoute("/")).toBe(false);
    expect(mbIsChromelessRoute("/session/SUMMER")).toBe(false);
  });
});

describe("the predicate agrees with every shipped page.tsx", () => {
  it("finds the route tree", () => {
    expect(PAGES.length).toBeGreaterThan(10);
  });

  for (const file of PAGES) {
    const route = routeOf(file);
    const source = readFileSync(file, "utf8");
    /* Only the three shell variants. No other component in the app uses these
       three strings for its own `variant` prop — buttons take navy/coral/
       outline-navy/ghost, badges framed/solid/text, the account chip
       masthead/rail/compact. */
    const declared = new Set(
      [...source.matchAll(/variant=["'](console|public|focus)["']/g)].map(
        (m) => m[1]
      )
    );

    if (declared.size === 0) continue;

    it(`${route} declares ${[...declared].join(" + ")}`, () => {
      /* A route may legitimately declare one variant across all of its states
         (loading / not-found / ready). If it ever declared two, the boundary
         could not predict it and the route would need its own answer. */
      expect([...declared]).toHaveLength(1);
      expect(mbShellVariantFor(route)).toBe([...declared][0]);
    });
  }
});
