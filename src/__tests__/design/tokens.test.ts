// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/*
 * The design-system guard. Every matchbook screen is built from the mb-*
 * tokens and classes in src/app/globals.css; the old shadcn-style tokens are
 * legacy that only the volleyball tools still read. This file reads every
 * source file outside those tools and fails on anything from the forbidden
 * list below, so a dialog cannot quietly be restyled back. The list lives
 * here and nowhere else; docs/design-system.md repeats it in prose.
 */

/* Utilities that take a color token. */
const colorUtilities =
  "bg|text|border(?:-[xytblrse])?|ring-offset|ring|outline|fill|stroke|from|via|to|divide|shadow|placeholder|decoration|accent|caret";

/* The old tokens, with or without their -foreground pair. */
const oldTokens =
  "background|foreground|card|popover|primary|secondary|muted|accent|destructive|border|input|ring";

/* Tailwind variants in front of a utility: hover:, sm:, data-[state=open]:, and so on. */
const variants = "(?:[\\w\\-\\[\\]=]+:)*";

type Rule = { name: string; pattern: RegExp };

const forbidden: Rule[] = [
  {
    name: "old token class",
    pattern: new RegExp(
      `(?<![\\w-])${variants}(?:${colorUtilities})-(?:${oldTokens})(?:-foreground)?(?![\\w-])`,
      "g",
    ),
  },
  {
    /* rounded-lg is 4px and rounded-full is a circle, not a corner; both pass. */
    name: "radius above 4px",
    pattern: new RegExp(`(?<![\\w-])${variants}rounded(?:-[a-z]{1,2})?-(?:xl|2xl|3xl|4xl)(?![\\w-])`, "g"),
  },
  {
    name: "arbitrary radius above 4px",
    pattern: new RegExp(`(?<![\\w-])${variants}rounded(?:-[a-z]{1,2})?-\\[(\\d*\\.?\\d+)(px|rem)\\]`, "g"),
  },
  {
    name: "dark-mode utility",
    pattern: new RegExp(`(?<![\\w-])dark:`, "g"),
  },
];

/* Every forbidden class in one piece of source text, in order. */
function violationsIn(text: string): string[] {
  const found: string[] = [];
  for (const rule of forbidden) {
    for (const match of text.matchAll(rule.pattern)) {
      if (rule.name === "arbitrary radius above 4px") {
        const px = match[2] === "rem" ? Number(match[1]) * 16 : Number(match[1]);
        if (px <= 4) continue;
      }
      found.push(match[0]);
    }
  }
  return found;
}

describe("the forbidden list", () => {
  it("flags the old token utilities", () => {
    expect(violationsIn('className="bg-background"')).toEqual(["bg-background"]);
    expect(violationsIn("text-muted-foreground")).toEqual(["text-muted-foreground"]);
    expect(violationsIn("border-border")).toEqual(["border-border"]);
    expect(violationsIn("hover:bg-accent/80")).toEqual(["hover:bg-accent"]);
    expect(violationsIn("focus:ring-primary focus:ring-offset-2")).toEqual(["focus:ring-primary"]);
    expect(violationsIn("ring-offset-background")).toEqual(["ring-offset-background"]);
    expect(violationsIn("shadow-primary/20")).toEqual(["shadow-primary"]);
    expect(violationsIn("fill-muted-foreground stroke-foreground")).toEqual([
      "fill-muted-foreground",
      "stroke-foreground",
    ]);
    expect(violationsIn("data-[state=open]:bg-accent")).toEqual(["data-[state=open]:bg-accent"]);
  });

  it("flags radii above 4px and dark-mode utilities", () => {
    expect(violationsIn("rounded-xl")).toEqual(["rounded-xl"]);
    expect(violationsIn("sm:rounded-2xl rounded-t-3xl")).toEqual(["sm:rounded-2xl", "rounded-t-3xl"]);
    expect(violationsIn("rounded-[8px]")).toEqual(["rounded-[8px]"]);
    expect(violationsIn("rounded-[0.75rem]")).toEqual(["rounded-[0.75rem]"]);
    expect(violationsIn("dark:bg-mb-navy")).toEqual(["dark:"]);
  });

  it("lets the matchbook utilities through", () => {
    const allowed = [
      "border-mb-navy",
      "bg-mb-paper",
      "bg-mb-paper-bright",
      "text-mb-ink-muted",
      "text-mb-red",
      "ring-coral",
      "ring-mb-coral",
      "bg-mb-navy/55",
      "hover:bg-mb-navy/6",
      "data-[variant=destructive]:text-mb-red",
      "border",
      "border-b",
      "border-[1.5px]",
      "rounded-[4px]",
      "rounded-[2px]",
      "rounded-sm",
      "rounded-lg",
      "rounded-full",
      "shadow-[0_8px_22px_rgba(57,41,23,0.08)]",
      "text-primary-color-name",
      "focus:outline-none",
      "accent-color",
    ];
    for (const className of allowed) {
      expect(violationsIn(className), className).toEqual([]);
    }
  });
});

describe("the source outside the volleyball tools", () => {
  const src = fileURLToPath(new URL("../../", import.meta.url));

  /* The volleyball tools keep the old tokens until their redesign. */
  const skipped = [
    join("components", "volleyball"),
    join("app", "(shell)", "tools", "volleyball-rotations"),
    /* Defines the legacy token block and the base layer that reads it. */
    join("app", "globals.css"),
    /* This file, which spells the forbidden classes out. */
    join("__tests__", "design"),
  ];

  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) return walk(file);
      return /\.(tsx?|css)$/.test(entry.name) ? [file] : [];
    });

  const sourceFiles = walk(src).filter((file) => {
    const path = relative(src, file);
    return !skipped.some((prefix) => path === prefix || path.startsWith(prefix + sep));
  });

  it("reads the screens, the primitives, and the stylesheet's neighbours", () => {
    const paths = sourceFiles.map((file) => relative(src, file).split(sep).join("/"));
    expect(paths).toContain("components/ui/dialog.tsx");
    expect(paths).toContain("components/shared/DeleteConfirmDialog.tsx");
    expect(paths).toContain("app/(shell)/competitions/[id]/page.tsx");
    expect(paths).not.toContain("components/volleyball/RotationControls.tsx");
    expect(paths).not.toContain("app/(shell)/tools/volleyball-rotations/page.tsx");
    expect(paths).not.toContain("app/globals.css");
  });

  it("uses no old token class, radius above 4px, or dark-mode utility", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, index) => {
        for (const hit of violationsIn(line)) {
          offenders.push(`${relative(src, file).split(sep).join("/")}:${index + 1} ${hit}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
