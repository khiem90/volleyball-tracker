// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/contrast";

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

/*
 * The redesign's checks, from here to the next describe of the old guard.
 * They read the role tokens and the scales from the stylesheet, and they hold
 * the folders that have left the old theme to the new names.
 */

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

/*
 * Until the old theme is deleted its color names stay, and each one hands a
 * screen that still uses it the role that fits how the color was used.
 */
describe("the old theme's colors", () => {
  it.each([
    ["mb-paper", "ground"],
    ["mb-paper-bright", "surface"],
    ["mb-navy", "ink"],
    ["mb-ink-muted", "ink-soft"],
    ["mb-rule", "line"],
    /* The call to action, a winner, a leader. */
    ["mb-coral", "action"],
    ["mb-green", "action"],
    ["mb-teal", "action"],
    /* A draft, a middling reading, a highlight that is neither good news nor a warning. */
    ["mb-gold", "ink-soft"],
    ["mb-plum", "ink-soft"],
    ["mb-red", "danger"],
  ])("%s resolves to %s", (old, role) => {
    expect(tokens[old]).toBe(`var(--${role})`);
  });

  it("leave no color of their own in the stylesheet", () => {
    for (const hex of ["f7f0e4", "fffaf1", "07324d", "ee4b34", "148f89", "e6a01f", "5a347d", "16885f", "5d6c70"]) {
      expect(stylesheet, hex).not.toContain(hex);
    }
    expect(stylesheet).not.toMatch(/rgba\((?:7, 50, 77|238, 75, 52)/);
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
 * The folders and files that have left the old theme, relative to src. One to
 * a line, sorted by path. A ticket that moves a screen adds its line in its
 * sorted place, and from then on the two rules below hold for everything in it.
 */
const migrated: string[] = [
  "app/(shell)/layout.tsx",
  "app/(shell)/rsvp/new",
  "app/(shell)/rsvp/page.tsx",
  "app/login",
  "components/GlobalUndoToast.tsx",
  "components/UndoToast.tsx",
  "components/rsvpList/ListLinkPanel.tsx",
  "components/rsvpList/ListNoticesPanel.tsx",
  "components/rsvpList/ListOwnerPanel.tsx",
  "components/rsvpList/ListPeoplePanel.tsx",
  "components/rsvpList/ListSettingsPanel.tsx",
  "components/rsvpList/ListSetupFields.tsx",
  "components/rsvpList/ListTournamentsPanel.tsx",
  "components/rsvpList/NoticeList.tsx",
  "components/rsvpList/RsvpFields.tsx",
  "components/rsvpList/RsvpRows.tsx",
  "components/rsvpList/useListOwnerControls.ts",
  "components/rsvpList/useListsPage.ts",
  "components/rsvpList/useNewListPage.ts",
  "components/shared/AddTeamsForm.tsx",
  "components/shared/Brand.tsx",
  "components/shared/Card.tsx",
  "components/shared/Chip.tsx",
  "components/shared/DateTile.tsx",
  "components/shared/RecentForm.tsx",
  "components/shared/ScoreLine.tsx",
  "components/shared/TeamMark.tsx",
  "components/shared/TeamName.tsx",
  "components/shell",
  "components/ui/avatar.tsx",
  "components/ui/badge.tsx",
  "components/ui/button.tsx",
  "components/ui/dialog.tsx",
  "components/ui/dropdown-menu.tsx",
  "hooks/useLoginPage.ts",
  "lib/dateTile.ts",
  "lib/scoreLine.ts",
  "lib/shell.ts",
  "lib/teamColors.ts",
  "lib/teamShapes.ts",
  "lib/teamStats.ts",
  "lib/tournamentStatus.ts",
];

/*
 * The mb prefix on a class or a token (mb-btn, text-mb-navy, --mb-rule) and on
 * a component or a type (MbIcon). Tailwind's bottom margin shares the prefix:
 * mb-4, mb-auto, mb-px, and mb-[3px] are not the old theme.
 */
const mbPrefix = /(?<![A-Za-z0-9])mb-(?!(?:auto|px)(?![\w-]))[a-z][a-z0-9]*(?:-[a-z0-9]+)*|(?<![A-Z])Mb[A-Z]\w*/g;

/* The theme's name and its two fonts, in any case and inside any longer name. */
const oldWords = /matchbook|oswald|outfit/gi;

/* Every old-theme name in one piece of source text: the mb names first, then the words. */
function oldThemeNamesIn(text: string): string[] {
  return [...text.matchAll(mbPrefix), ...text.matchAll(oldWords)].map((match) => match[0]);
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

const sourceRoot = fileURLToPath(new URL("../../", import.meta.url));
const sourceFile = /\.(tsx?|css)$/;

/* The source files a list names: a listed file as it is, a listed folder with everything under it. */
function sourceFilesIn(entries: string[]): string[] {
  return entries.flatMap((entry) => {
    const path = join(sourceRoot, entry);
    if (sourceFile.test(entry)) return [path];
    return readdirSync(path, { recursive: true, encoding: "utf8" })
      .filter((name) => sourceFile.test(name))
      .map((name) => join(path, name));
  });
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

describe("the migrated folders", () => {
  it("are listed one to a line and sorted by path", () => {
    expect(migrated).toEqual([...new Set(migrated)].sort());
  });

  it("are read file by file, a folder with everything under it", () => {
    const paths = sourceFilesIn(["app/layout.tsx", "components/ui"]).map((file) =>
      relative(sourceRoot, file).split(sep).join("/"),
    );
    expect(paths).toContain("app/layout.tsx");
    expect(paths).toContain("components/ui/dialog.tsx");
    expect(paths).not.toContain("app/globals.css");
    expect(paths).not.toContain("components/shared/DeleteConfirmDialog.tsx");
  });

  it("use no old-theme name and no radius off the scale", () => {
    const offenders: string[] = [];
    for (const file of sourceFilesIn(migrated)) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, index) => {
        for (const hit of [...oldThemeNamesIn(line), ...radiiOffTheScaleIn(line)]) {
          offenders.push(`${relative(sourceRoot, file).split(sep).join("/")}:${index + 1} ${hit}`);
        }
      });
    }
    expect(offenders).toEqual([]);
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

describe("the icon sprite", () => {
  const src = fileURLToPath(new URL("../../", import.meta.url));
  const icons = fileURLToPath(new URL("../../../public/assets/matchbook/icons/", import.meta.url));
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
    /* The id of an icon tag, under either name of the component. */
    /<(?:Mb)?Icon\b[^>]*?\sid=(?:"([^"]*)"|\{([^}]*)\})/g,
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
    expect(iconIdsIn('<MbIcon id="chevron-left" size={20} />')).toEqual(["chevron-left"]);
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
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const file = join(dir, entry.name);
        if (entry.isDirectory()) return walk(file);
        return /\.tsx?$/.test(entry.name) ? [file] : [];
      });
    /* This file spells out ids no sprite has. */
    const guard = join("__tests__", "design") + sep;

    const offenders: string[] = [];
    for (const file of walk(src)) {
      const path = relative(src, file);
      if (path.startsWith(guard)) continue;
      const asked = iconIdsIn(readFileSync(file, "utf8"));
      for (const id of missingFrom(sprite, asked)) {
        offenders.push(`${path.split(sep).join("/")} ${id}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
