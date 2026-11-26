// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/contrast";

/*
 * The design-system guard. Every screen is built from the role tokens, the two
 * scales, and the shared classes in src/app/globals.css. This file reads every
 * source file, the stylesheet included, and fails on a name from either of the
 * two designs that came before, on a radius that is not a step of the scale,
 * and on a dark-mode utility, so no screen can quietly be restyled back. The
 * lists live here and nowhere else; docs/design-system.md repeats them in
 * prose.
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
    name: "dark-mode utility",
    pattern: new RegExp(`(?<![\\w-])dark:`, "g"),
  },
];

/* Every forbidden class in one piece of source text, rule by rule. */
function violationsIn(text: string): string[] {
  return forbidden.flatMap((rule) => [...text.matchAll(rule.pattern)].map((match) => match[0]));
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

  it("flags a dark-mode utility", () => {
    expect(violationsIn("dark:bg-ink")).toEqual(["dark:"]);
    expect(violationsIn("sm:dark:text-white")).toEqual(["dark:"]);
  });

  it("lets the role utilities through", () => {
    const allowed = [
      "border-line",
      "bg-ground",
      "bg-surface",
      "text-ink-soft",
      "text-danger",
      "ring-action",
      "bg-ink/55",
      "hover:bg-fill",
      "data-[variant=destructive]:text-danger",
      "border",
      "border-b",
      "border-ink-soft/75",
      "rounded-card",
      "rounded-full",
      "text-primary-color-name",
      "focus:outline-none",
      "accent-color",
      "darker:",
    ];
    for (const className of allowed) {
      expect(violationsIn(className), className).toEqual([]);
    }
  });
});

describe("the contrast ratio", () => {
  it("runs from 1 for a color on itself to 21 for black on white", () => {
    expect(contrastRatio("#15181b", "#15181b")).toBe(1);
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
  });

  /* The two prototype values the spec replaced, and the green that replaced one of them. */
  it("fails the prototype's green and soft ink and passes the spec's green", () => {
    expect(contrastRatio("#ffffff", "#0a8a57")).toBeCloseTo(4.39, 2);
    expect(contrastRatio("#6b727a", "#f1f3f4")).toBeCloseTo(4.37, 2);
    expect(contrastRatio("#ffffff", "#087a4d")).toBeGreaterThanOrEqual(4.5);
  });
});

const stylesheet = readFileSync(
  fileURLToPath(new URL("../../app/globals.css", import.meta.url)),
  "utf8",
);

/* Every custom property in a piece of CSS with its value: "--ink: #15181b;" gives ink. */
function customProperties(css: string): Record<string, string> {
  const found: Record<string, string> = {};
  for (const [, name, value] of css.matchAll(/--([\w-]+):\s*([^;]+);/g)) found[name] = value.trim();
  return found;
}

const tokens = customProperties(stylesheet);

describe("the role tokens", () => {
  it("reads a custom property's value from a piece of CSS", () => {
    expect(customProperties(":root {\n  --ink: #15181b;\n  --radius-card:14px;\n}")).toEqual({
      ink: "#15181b",
      "radius-card": "14px",
    });
  });

  /* The spec's token table. */
  it.each([
    ["ground", "#f1f3f4"],
    ["surface", "#ffffff"],
    ["ink", "#15181b"],
    ["ink-soft", "#626971"],
    ["line", "#eceef0"],
    ["fill", "#f1f3f4"],
    ["action", "#087a4d"],
    ["action-tint", "#e2f4eb"],
    ["danger", "#cf3f32"],
  ])("%s is %s", (role, value) => {
    expect(tokens[role]).toBe(value);
  });

  /* Text on what it sits on. White is the text on a green or red button. */
  it.each([
    ["ink", "surface"],
    ["ink", "ground"],
    ["ink-soft", "surface"],
    ["ink-soft", "ground"],
    ["ink-soft", "fill"],
    ["#ffffff", "action"],
    ["action", "surface"],
    ["action", "action-tint"],
    ["#ffffff", "danger"],
    ["danger", "danger-tint"],
  ])("%s on %s reaches 4.5 to 1", (text, ground) => {
    const color = (name: string) => (name.startsWith("#") ? name : tokens[name]);
    expect(color(text), text).toMatch(/^#[0-9a-f]{6}$/);
    expect(color(ground), ground).toMatch(/^#[0-9a-f]{6}$/);
    expect(contrastRatio(color(text), color(ground))).toBeGreaterThanOrEqual(4.5);
  });
});

/* A length in px: "14px" is 14, "1rem" is 16. */
const px = (length: string): number =>
  length.endsWith("rem") ? parseFloat(length) * 16 : parseFloat(length);

/* The smallest and largest px a size token can take: a clamp() gives its two ends. */
function pxRange(value: string): [number, number] {
  const clamp = value.match(/^clamp\(([^,]+),.+,([^,]+)\)$/);
  return clamp ? [px(clamp[1].trim()), px(clamp[2].trim())] : [px(value), px(value)];
}

describe("the radius and type scales", () => {
  it("reads a size token's range in px", () => {
    expect(pxRange("14px")).toEqual([14, 14]);
    expect(pxRange("0.65625rem")).toEqual([10.5, 10.5]);
    expect(pxRange("clamp(1.75rem, 1.6rem + 0.6vw, 1.875rem)")).toEqual([28, 30]);
  });

  /* Cards and dialogs, tiles and square controls, small chips and icon backings, buttons and status chips. */
  it.each([
    ["card", 14],
    ["tile", 10],
    ["chip", 8],
    ["pill", 9999],
  ])("rounded-%s is %dpx", (step, size) => {
    expect(pxRange(tokens[`radius-${step}`] ?? "")).toEqual([size, size]);
  });

  /* A page title, a card title or a row's name, body, a control's label, secondary text, a tab label, a court's score. */
  it.each([
    ["page-title", 28, 30],
    ["title", 16, 16],
    ["body", 15, 15],
    ["label", 14, 14],
    ["caption", 13, 13],
    ["tab", 10.5, 10.5],
    ["score", 44, 44],
  ])("text-%s runs from %dpx to %dpx", (step, smallest, largest) => {
    expect(pxRange(tokens[`text-${step}`] ?? "")).toEqual([smallest, largest]);
  });
});

describe("the typeface", () => {
  const layout = readFileSync(
    fileURLToPath(new URL("../../app/layout.tsx", import.meta.url)),
    "utf8",
  );
  /* The custom property next/font writes the loaded face to. */
  const fontVariable = layout.match(/variable:\s*"(--[\w-]+)"/)?.[1];

  it("is Figtree alone, with Oswald and Outfit no longer loaded", () => {
    expect(layout).toMatch(/import \{ Figtree \} from "next\/font\/google"/);
    expect(layout).not.toMatch(/oswald|outfit/i);
    expect(stylesheet).not.toMatch(/oswald|outfit/i);
  });

  /*
   * The stylesheet's theme reads the font on :root, so the font's variable
   * has to be set on <html>. Set one element lower, on <body>, it is not
   * there to read and every screen falls back to the system font.
   */
  it("is set on the element the stylesheet reads it from", () => {
    expect(fontVariable).toBeDefined();
    expect(tokens["font-sans"]).toContain(`var(${fontVariable})`);
    expect(layout).toMatch(/<html[^>]*className=\{\w+\.variable\}/);
    expect(layout).not.toMatch(/<body[^>]*\.variable/);
  });
});

/*
 * The shadcn-style tokens from before the old theme. The volleyball tools were
 * their last reader. With the names gone from the stylesheet, a class such as
 * bg-primary or border-border draws nothing, and the radius steps are
 * Tailwind's own again.
 */
describe("the legacy tokens", () => {
  const legacyColors = [
    "background", "foreground", "card", "card-foreground", "popover", "popover-foreground",
    "primary", "primary-foreground", "secondary", "secondary-foreground", "muted",
    "muted-foreground", "accent", "accent-foreground", "destructive", "border", "input", "ring",
    "chart-1", "chart-2", "chart-3", "chart-4", "chart-5",
  ];

  it.each(legacyColors)("%s is not defined, and no utility is made from it", (name) => {
    expect(tokens[name]).toBeUndefined();
    expect(tokens[`color-${name}`]).toBeUndefined();
  });

  /* The old 4px base and the steps worked out from it. */
  it("leave Tailwind's radius steps alone", () => {
    expect(tokens.radius).toBeUndefined();
    for (const step of ["sm", "md", "lg", "xl", "2xl", "3xl", "4xl"]) {
      expect(tokens[`radius-${step}`], step).toBeUndefined();
    }
  });

  /* Every element's border color and the page's ground and ink come from the role tokens. */
  it("are not what the base layer's defaults read", () => {
    const base = stylesheet.slice(stylesheet.indexOf("@layer base"));
    expect(base).toMatch(/\*\s*\{\s*@apply border-line\b/);
    expect(base).toMatch(/body\s*\{\s*@apply bg-ground text-ink;/);
  });
});

/*
 * The theme this design replaced put the mb prefix on a class or a token
 * (mb-btn, text-mb-navy, --mb-rule) and on a component or a type (MbIcon).
 * Tailwind's bottom margin shares the prefix: mb-4, mb-auto, mb-px, and
 * mb-[3px] are not the old theme.
 */
const mbPrefix = /(?<![A-Za-z0-9])mb-(?!(?:auto|px)(?![\w-]))[a-z][a-z0-9]*(?:-[a-z0-9]+)*|(?<![A-Z])Mb[A-Z]\w*/g;

/* The theme's name and its two fonts, in any case and inside any longer name. */
const oldWords = /matchbook|oswald|outfit/gi;

/* Every old-theme name in one piece of source text: the mb names first, then the words. */
function oldThemeNamesIn(text: string): string[] {
  return [...text.matchAll(mbPrefix), ...text.matchAll(oldWords)].map((match) => match[0]);
}

/*
 * The old theme's nine colors as hex, and its navy and coral as the rgb
 * triplets its washes were written with. Its names are caught above. These
 * are the values, which a class string or an inline style can carry under no
 * name at all.
 */
const oldPalette =
  /#(?:f7f0e4|fffaf1|07324d|ee4b34|148f89|e6a01f|5a347d|16885f|5d6c70)(?![0-9a-f])|rgba?\(\s*(?:7,\s*50,\s*77|238,\s*75,\s*52)(?!\d)/gi;

/* Every old-theme color in one piece of source text. */
function oldPaletteIn(text: string): string[] {
  return [...text.matchAll(oldPalette)].map((match) => match[0]);
}

/* A radius utility with whatever follows it: rounded, rounded-lg, sm:rounded-t-[8px]. */
const radiusUtility = new RegExp(
  `(?<![\\w-])${variants}rounded(?:-(?:\\[[^\\]\\s]*\\]|\\([^)\\s]*\\)|[a-z0-9]+))*(?![\\w-])`,
  "g",
);

/* The four steps on any corner or side, plus rounded-full for a circle and rounded-none for a square corner. */
const onTheScale = /(?:^|:)rounded(?:-(?:[trblse]|tl|tr|bl|br|ss|se|es|ee))?-(?:card|tile|chip|pill|full|none)$/;

/*
 * Every radius in one piece of source text that is not a step of the scale.
 * It reads words, not markup, so "rounded" in a comment counts too.
 */
function radiiOffTheScaleIn(text: string): string[] {
  return [...text.matchAll(radiusUtility)]
    .map((match) => match[0])
    .filter((utility) => !onTheScale.test(utility));
}

describe("the old theme's names", () => {
  it("flags the mb prefix on a class, a token, and a component", () => {
    expect(oldThemeNamesIn('className="mb-btn mb-btn-navy"')).toEqual(["mb-btn", "mb-btn-navy"]);
    expect(oldThemeNamesIn("text-mb-ink-muted hover:bg-mb-navy/6")).toEqual(["mb-ink-muted", "mb-navy"]);
    expect(oldThemeNamesIn('{ color: "var(--mb-green)" }')).toEqual(["mb-green"]);
    expect(oldThemeNamesIn('<MbIcon id="trash" size={14} />')).toEqual(["MbIcon"]);
    expect(oldThemeNamesIn("form: MbFormResult[]")).toEqual(["MbFormResult"]);
  });

  it("flags the word matchbook and the two old font names", () => {
    expect(oldThemeNamesIn('from "@/components/matchbook/Panel"')).toEqual(["matchbook"]);
    expect(oldThemeNamesIn("matchbook-display Matchbook")).toEqual(["matchbook", "Matchbook"]);
    expect(oldThemeNamesIn('src="/assets/matchbook/brand/crest.svg"')).toEqual(["matchbook"]);
    expect(oldThemeNamesIn("var(--font-oswald)")).toEqual(["oswald"]);
    expect(oldThemeNamesIn("import { Outfit, Oswald }")).toEqual(["Outfit", "Oswald"]);
  });

  it("lets the bottom margin utilities and the role tokens through", () => {
    const allowed = [
      "mb-4",
      "mb-0.5",
      "-mb-2",
      "sm:mb-6",
      "mb-auto",
      "mb-px",
      "mb-[3px]",
      "mb-(--gap)",
      "thumb-up",
      "text-ink-soft",
      "bg-action-tint",
      "border-line",
      "<Icon id=\"trash\" />",
    ];
    for (const text of allowed) {
      expect(oldThemeNamesIn(text), text).toEqual([]);
    }
  });
});

describe("the old theme's palette", () => {
  it("flags its colors as hex and as the triplets of its washes", () => {
    expect(oldPaletteIn('themeColor: "#f7f0e4"')).toEqual(["#f7f0e4"]);
    expect(oldPaletteIn("border-[#07324D] text-[#EE4B34]")).toEqual(["#07324D", "#EE4B34"]);
    expect(oldPaletteIn("hover:bg-[rgba(7,50,77,0.04)]")).toEqual(["rgba(7,50,77"]);
    expect(oldPaletteIn("background: rgba(238, 75, 52, 0.06);")).toEqual(["rgba(238, 75, 52"]);
    expect(oldPaletteIn("rgb(7 50 77)")).toEqual([]);
  });

  it("lets the role tokens' values and other colors through", () => {
    const allowed = [
      "#f1f3f4",
      "#087a4d",
      "#cf3f32",
      "#eab308",
      "rgba(0, 0, 0, 0.1)",
      "rgba(7, 50, 770, 1)",
      "#07324d1",
      "id 07324d",
    ];
    for (const text of allowed) {
      expect(oldPaletteIn(text), text).toEqual([]);
    }
  });
});

describe("the named radius rule", () => {
  it("flags a radius that is not a step of the scale", () => {
    expect(radiiOffTheScaleIn("rounded-lg")).toEqual(["rounded-lg"]);
    expect(radiiOffTheScaleIn("rounded-[4px] rounded-[0.75rem]")).toEqual(["rounded-[4px]", "rounded-[0.75rem]"]);
    expect(radiiOffTheScaleIn("sm:rounded-2xl rounded-t-3xl")).toEqual(["sm:rounded-2xl", "rounded-t-3xl"]);
    expect(radiiOffTheScaleIn("rounded-(--radius-card)")).toEqual(["rounded-(--radius-card)"]);
    expect(radiiOffTheScaleIn('className="rounded border"')).toEqual(["rounded"]);
  });

  it("lets the four steps, a circle, and a square corner through", () => {
    const allowed = [
      "rounded-card",
      "rounded-tile",
      "rounded-chip",
      "rounded-pill",
      "rounded-t-card",
      "rounded-bl-tile",
      "sm:rounded-card",
      "data-[state=open]:rounded-pill",
      "rounded-full",
      "rounded-none",
      "rounded-tl-none",
      "isRounded",
      "roundedScore",
    ];
    for (const text of allowed) {
      expect(radiiOffTheScaleIn(text), text).toEqual([]);
    }
  });
});

/* Where the guard looks: every .ts, .tsx, and .css file under src, apart from its own folder. */
const src = fileURLToPath(new URL("../../", import.meta.url));

/* This folder, whose files spell the forbidden names out. */
const ownFolder = join("__tests__", "design");

const walk = (dir: string, wanted: RegExp): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) return walk(file, wanted);
    return wanted.test(entry.name) ? [file] : [];
  });

const pathOf = (file: string) => relative(src, file).split(sep).join("/");

const sourceFiles = walk(src, /\.(tsx?|css)$/).filter((file) => {
  const path = relative(src, file);
  return path !== ownFolder && !path.startsWith(ownFolder + sep);
});

/* What a check finds in one file's text, each hit as "path:line hit". */
function hitsIn(path: string, text: string, check: (line: string) => string[]): string[] {
  return text.split("\n").flatMap((line, index) => check(line).map((hit) => `${path}:${index + 1} ${hit}`));
}

/* Every hit of a check across the source. */
const offendersOf = (check: (line: string) => string[]): string[] =>
  sourceFiles.flatMap((file) => hitsIn(pathOf(file), readFileSync(file, "utf8"), check));

describe("the whole source", () => {
  it("is every source file, the stylesheet, and the tests outside this folder", () => {
    const paths = sourceFiles.map(pathOf);
    expect(paths).toContain("components/ui/dialog.tsx");
    expect(paths).toContain("components/shared/DeleteConfirmDialog.tsx");
    expect(paths).toContain("components/motion/index.tsx");
    expect(paths).toContain("context/AuthContext.tsx");
    expect(paths).toContain("app/(shell)/competitions/[id]/page.tsx");
    expect(paths).toContain("components/volleyball/RotationControls.tsx");
    expect(paths).toContain("app/(shell)/tools/volleyball-rotations/page.tsx");
    expect(paths).toContain("app/globals.css");
    expect(paths).toContain("__tests__/shell/shell.test.ts");
    expect(paths.filter((path) => path.startsWith("__tests__/design/"))).toEqual([]);
  });

  it("is reported by file and line", () => {
    const text = 'import { Icon } from "@/components/shared";\n<MbIcon className="rounded-lg mb-btn" />\n';
    expect(hitsIn("a/b.tsx", text, oldThemeNamesIn)).toEqual(["a/b.tsx:2 MbIcon", "a/b.tsx:2 mb-btn"]);
    expect(hitsIn("a/b.tsx", text, radiiOffTheScaleIn)).toEqual(["a/b.tsx:2 rounded-lg"]);
    expect(hitsIn("a/b.tsx", text, violationsIn)).toEqual([]);
  });

  it("uses no old token class and no dark-mode utility", () => {
    expect(offendersOf(violationsIn)).toEqual([]);
  });

  it("uses no name from the old theme", () => {
    expect(offendersOf(oldThemeNamesIn)).toEqual([]);
  });

  it("uses no color from the old theme's palette", () => {
    expect(offendersOf(oldPaletteIn)).toEqual([]);
  });

  it("uses no radius off the scale", () => {
    expect(offendersOf(radiiOffTheScaleIn)).toEqual([]);
  });
});

/*
 * Outside src the old theme lived in the asset folder that carried its name,
 * in the design document, and in the lines of the config files that pointed
 * at either. .scratch is left out on purpose: its specs and tickets name the
 * old theme as history.
 */
describe("the files around the source", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));

  it.each([
    "docs/design-system.md",
    "next.config.ts",
    "eslint.config.mjs",
    "components.json",
    "scripts/generate-icons.mjs",
  ])("%s uses no name from the old theme", (file) => {
    const text = readFileSync(join(root, file), "utf8");
    expect(hitsIn(file, text, oldThemeNamesIn)).toEqual([]);
    expect(hitsIn(file, text, oldPaletteIn)).toEqual([]);
  });

  it("keep no asset under a path that carries one", () => {
    const paths = walk(join(root, "public"), /./).map((file) => relative(root, file).split(sep).join("/"));
    expect(paths).toContain("public/assets/icons/sprite.svg");
    expect(paths.flatMap((path) => hitsIn(path, path, oldThemeNamesIn))).toEqual([]);
  });
});

describe("the icon sprite", () => {
  const icons = fileURLToPath(new URL("../../../public/assets/icons/", import.meta.url));
  const sprite = readFileSync(join(icons, "sprite.svg"), "utf8");

  /* The ids every screen may ask for. A screen never has to change which one it names. */
  const requiredIds = [
    "overview", "teams", "quick", "compete", "history", "tools",
    "settings", "help", "bell", "plus", "export", "import", "share",
    "print", "save", "search", "filter", "calendar", "clock", "location",
    "volleyball", "bracket", "chart", "swap", "court", "check",
    "warning", "live", "menu", "chevron-right", "chevron-down", "clipboard", "star",
    "mail", "lock", "login", "cloud", "close", "trash",
    "chevron-left", "flag", "maximize", "minimize", "undo", "crown", "minus", "trophy",
    "play", "pencil", "remove-user", "logout",
    "eye", "eye-off", "rsvp",
  ];

  /* The places source names a glyph. Group 1 is a bare string, group 2 an expression. */
  const askingPatterns = [
    /* The id of an icon tag. */
    /<Icon\b[^>]*?\sid=(?:"([^"]*)"|\{([^}]*)\})/g,
    /* An icon prop, key, or default: icon="x", filledIcon: "x", icon = "x", icon={a ? "x" : "y"}. */
    /\b\w*[iI]con\s*[:=]\s*(?:"([a-z]+(?:-[a-z]+)*)"|\{([^}]*)\})/g,
    /* A lookup table of glyphs: const STAT_ICONS = { Wins: "compete" }. */
    /\b[A-Z][A-Z_]*ICONS\b(?::[^=]*)?\s*=\s*()\{([^}]*)\}/g,
  ];

  /* Every icon id a piece of source text asks for, in order. */
  function iconIdsIn(text: string): string[] {
    const found: [number, string][] = [];
    for (const pattern of askingPatterns) {
      for (const match of text.matchAll(pattern)) {
        const ids = match[1] ? [match[1]] : [...(match[2] ?? "").matchAll(/["']([^"']*)["']/g)].map((m) => m[1]);
        ids.forEach((id, order) => found.push([match.index + order / 100, id]));
      }
    }
    /* "..." stands for an id in the recipes written in comments. */
    return found
      .sort((a, b) => a[0] - b[0])
      .map(([, id]) => id)
      .filter((id) => id !== "...");
  }

  /* The ids from a list that have no symbol in a sprite. */
  function missingFrom(spriteText: string, ids: string[]): string[] {
    const drawn = new Set([...spriteText.matchAll(/<symbol\b[^>]*?\sid="([^"]+)"/g)].map((m) => m[1]));
    return ids.filter((id) => !drawn.has(id));
  }

  const attribute = (attributes: string, name: string): string | undefined =>
    attributes.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];

  /*
   * What is wrong with a sprite's drawings, one "id: fault" per fault. A glyph
   * sits on the 256 grid. Each shape is filled with the text color, or stroked
   * with it at 16 units, the weight of the filled outlines.
   */
  function drawingFaultsIn(spriteText: string): string[] {
    const faults: string[] = [];
    for (const symbol of spriteText.matchAll(/<symbol\b([^>]*)>([\s\S]*?)<\/symbol>/g)) {
      const id = attribute(symbol[1], "id");
      const fault = (what: string) => faults.push(`${id}: ${what}`);
      const grid = attribute(symbol[1], "viewBox");
      if (grid !== "0 0 256 256") fault(`grid ${grid}`);
      for (const [, tag, attributes] of symbol[2].matchAll(/<([a-z]+)\b([^>]*)>/g)) {
        if (!["path", "rect", "circle", "line"].includes(tag)) {
          fault(tag);
          continue;
        }
        const fill = attribute(attributes, "fill");
        const stroke = attribute(attributes, "stroke");
        const width = attribute(attributes, "stroke-width");
        if (fill === undefined) fault("fill missing");
        else if (fill !== "currentColor" && fill !== "none") fault(`fill ${fill}`);
        if (stroke !== undefined && stroke !== "currentColor") fault(`stroke ${stroke}`);
        if (fill === "none" && stroke === undefined) fault("nothing drawn");
        if (stroke !== undefined && width !== "16") fault(`stroke width ${width}`);
      }
    }
    return faults;
  }

  it("reads the ids a piece of source asks for", () => {
    expect(iconIdsIn('<Icon id="trash" size={14} />')).toEqual(["trash"]);
    expect(iconIdsIn('<Icon\n  id="chevron-down"\n  size={13}\n/>')).toEqual(["chevron-down"]);
    expect(iconIdsIn('<Icon id={copied ? "check" : "clipboard"} size={14} />')).toEqual([
      "check",
      "clipboard",
    ]);
    expect(iconIdsIn('<Icon id={STAT_ICONS[stat.label] ?? "chart"} />')).toEqual(["chart"]);
    expect(iconIdsIn('<Panel icon="calendar" title="Schedule">')).toEqual(["calendar"]);
    expect(iconIdsIn('icon={controls.isClosed ? "undo" : "lock"}')).toEqual(["undo", "lock"]);
    expect(iconIdsIn('{ id: "home", href: "/", icon: "overview", filledIcon: "overview-fill" }')).toEqual([
      "overview",
      "overview-fill",
    ]);
    expect(iconIdsIn('icon = "warning",')).toEqual(["warning"]);
    expect(
      iconIdsIn('const STAT_ICONS: Record<string, string> = {\n  Wins: "compete",\n  Teams: "teams",\n};'),
    ).toEqual(["compete", "teams"]);
  });

  it("leaves alone what is not an icon id", () => {
    const notIcons = [
      '<input id="team-name" />',
      '<section id={panelId(id)}>',
      "icon?: string;",
      "icon: string;",
      '<Icon id={tab.icon} size={18} />',
      /* A size variant of the button, not a glyph. */
      'icon: "size-11 p-0",',
      /* The placeholder in a recipe comment. */
      '<Icon id="..." size={18} />',
      'icons: { icon: "/icons/icon-192x192.png" }',
    ];
    for (const text of notIcons) {
      expect(iconIdsIn(text), text).toEqual([]);
    }
  });

  it("names the ids a sprite lacks", () => {
    const small = '<svg><symbol id="plus" viewBox="0 0 256 256"/><symbol id="minus" viewBox="0 0 256 256"/></svg>';
    expect(missingFrom(small, ["plus", "minus"])).toEqual([]);
    expect(missingFrom(small, ["plus", "trash", "minus", "pluss"])).toEqual(["trash", "pluss"]);
    const withoutRsvp = sprite.replace('<symbol id="rsvp"', '<symbol id="rsvp-old"');
    expect(missingFrom(withoutRsvp, requiredIds)).toEqual(["rsvp"]);
  });

  it("still has all 54 ids", () => {
    expect(new Set(requiredIds).size).toBe(54);
    expect(missingFrom(sprite, requiredIds)).toEqual([]);
  });

  it("has a filled drawing for each of the five tabs", () => {
    const filled = ["overview-fill", "teams-fill", "compete-fill", "history-fill", "rsvp-fill"];
    expect(missingFrom(sprite, filled)).toEqual([]);
  });

  it("names a drawing off the grid, off the weight, or in a color of its own", () => {
    const good =
      '<symbol id="a" viewBox="0 0 256 256"><path fill="currentColor" d="M0,0Z"/></symbol>' +
      '<symbol id="b" viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-width="16" d="M0,0Z"/></symbol>';
    expect(drawingFaultsIn(good)).toEqual([]);
    expect(drawingFaultsIn('<symbol id="old" viewBox="0 0 24 24"><path fill="currentColor" d="M0,0Z"/></symbol>')).toEqual([
      "old: grid 0 0 24 24",
    ]);
    expect(
      drawingFaultsIn(
        '<symbol id="thin" viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-width="12" d="M0,0Z"/></symbol>',
      ),
    ).toEqual(["thin: stroke width 12"]);
    expect(
      drawingFaultsIn('<symbol id="navy" viewBox="0 0 256 256"><path fill="#172a3a" d="M0,0Z"/></symbol>'),
    ).toEqual(["navy: fill #172a3a"]);
    /* With no fill of its own a shape is drawn black, whatever the text color. */
    expect(drawingFaultsIn('<symbol id="bare" viewBox="0 0 256 256"><path d="M0,0Z"/></symbol>')).toEqual([
      "bare: fill missing",
    ]);
    expect(
      drawingFaultsIn('<symbol id="far" viewBox="0 0 256 256"><image href="https://example.com/a.svg"/></symbol>'),
    ).toEqual(["far: image"]);
  });

  it("draws every glyph on one grid, in one weight, in the color of the text around it", () => {
    expect(drawingFaultsIn(sprite)).toEqual([]);
  });

  it("keeps Phosphor's license notice beside it", () => {
    const notice = readFileSync(join(icons, "PHOSPHOR-LICENSE.txt"), "utf8");
    expect(notice).toContain("MIT License");
    expect(notice).toContain("Copyright (c) 2023 Phosphor Icons");
  });

  it("has every icon id the source asks for", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles.filter((name) => /\.tsx?$/.test(name))) {
      const asked = iconIdsIn(readFileSync(file, "utf8"));
      for (const id of missingFrom(sprite, asked)) offenders.push(`${pathOf(file)} ${id}`);
    }
    expect(offenders).toEqual([]);
  });
});
