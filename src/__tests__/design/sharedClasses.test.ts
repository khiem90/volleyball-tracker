// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PANEL_ROW } from "@/components/matchbook/Panel";
import { CARD_ROW } from "@/components/shared/Card";
import { contrastRatio } from "@/lib/contrast";

/*
 * The shared classes in src/app/globals.css: the card, the four buttons, the
 * dialog's frame, the menu, the ink bar, the chip, the date tile, the form
 * controls, and the table. This file reads the
 * stylesheet's rules and holds them to the numbers in
 * .scratch/app-redesign/spec.md, which are the ones a thumb or an eye notices:
 * 44px to tap, 52px for the main button, a pill, a 14px card, readable text.
 */

type CssRule = { selectors: string[]; declarations: Record<string, string> };

const oneSpace = (text: string) => text.trim().replace(/\s+/g, " ");

/* Every rule in a piece of CSS, innermost blocks only, comments dropped. */
function rulesIn(css: string): CssRule[] {
  const rules: CssRule[] = [];
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const [, head, body] of bare.matchAll(/([^{};]+)\{([^{}]*)\}/g)) {
    const declarations: Record<string, string> = {};
    for (const [, property, value] of body.matchAll(/([\w-]+)\s*:\s*([^;]+);/g)) {
      declarations[property] = oneSpace(value);
    }
    rules.push({ selectors: head.split(",").map(oneSpace), declarations });
  }
  return rules;
}

/* What one selector sets, later rules over earlier ones. ".btn" leaves out ".btn:hover" and ".card > .btn". */
function declarationsFor(rules: CssRule[], selector: string): Record<string, string> {
  return Object.assign(
    {},
    ...rules.filter((rule) => rule.selectors.includes(selector)).map((rule) => rule.declarations),
  );
}

const stylesheet = readFileSync(fileURLToPath(new URL("../../app/globals.css", import.meta.url)), "utf8");
const rules = rulesIn(stylesheet);
const lookOf = (selector: string) => declarationsFor(rules, selector);
const classLook = (className: string) => lookOf(`.${className}`);

describe("reading the stylesheet's rules", () => {
  const sample = rulesIn(`
    @layer components {
      /* A comment with a { brace } in it. */
      .btn,
      .old-btn {
        min-height: 2.75rem;
        color: #fff;
      }
      .btn:hover { color: red; }
      .btn-action { min-height: 3.25rem; }
      @media (hover: hover) {
        .card  >  .btn { gap: 1px; }
      }
    }
  `);

  it("lists each rule's selectors and declarations", () => {
    expect(sample).toEqual([
      { selectors: [".btn", ".old-btn"], declarations: { "min-height": "2.75rem", color: "#fff" } },
      { selectors: [".btn:hover"], declarations: { color: "red" } },
      { selectors: [".btn-action"], declarations: { "min-height": "3.25rem" } },
      { selectors: [".card > .btn"], declarations: { gap: "1px" } },
    ]);
  });

  it("gathers what one selector sets", () => {
    expect(declarationsFor(sample, ".btn")).toEqual({ "min-height": "2.75rem", color: "#fff" });
    expect(declarationsFor(sample, ".old-btn")).toEqual({ "min-height": "2.75rem", color: "#fff" });
    expect(declarationsFor(sample, ".btn:hover")).toEqual({ color: "red" });
    expect(declarationsFor(sample, ".card > .btn")).toEqual({ gap: "1px" });
    expect(declarationsFor(sample, ".missing")).toEqual({});
  });
});

describe("case", () => {
  /* Headings and labels are written in the JSX as they should read. */
  it("is never forced to uppercase by a class", () => {
    const forcing = rules.filter((rule) => "text-transform" in rule.declarations).flatMap((rule) => rule.selectors);
    expect(forcing).toEqual([]);
  });
});

describe("the live dot", () => {
  /* Live is green. Red is for destructive actions. */
  it("is drawn in action, under its new name and its old one", () => {
    expect(classLook("live-dot").background).toBe("var(--action)");
    expect(classLook("mb-live-dot").background).toBe("var(--action)");
  });
});

/* A length in px: "44px" is 44, "2.75rem" is 44. */
const px = (length: string | undefined): number =>
  length === undefined ? NaN : length.endsWith("rem") ? parseFloat(length) * 16 : parseFloat(length);

/* The role tokens' values, read from the stylesheet. */
const tokens: Record<string, string> = {};
for (const [, name, value] of stylesheet.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/g)) tokens[name] = value;

/* The hex color a declaration paints: white, or a role token. */
function hexOf(value: string | undefined): string {
  if (value === "#fff" || value === "#ffffff") return "#ffffff";
  const role = value?.match(/^var\(--([\w-]+)\)$/)?.[1];
  return (role && tokens[role]) || `not a color: ${value}`;
}

/* The text of a class on its own background. */
const labelContrast = (look: Record<string, string>) => contrastRatio(hexOf(look.color), hexOf(look.background));

describe("reading a class's colors", () => {
  it("resolves white and the role tokens to hex", () => {
    expect(hexOf("#fff")).toBe("#ffffff");
    expect(hexOf("var(--action)")).toBe("#087a4d");
    expect(hexOf("var(--ink)")).toBe("#15181b");
    expect(hexOf("blue")).toBe("not a color: blue");
    expect(hexOf(undefined)).toBe("not a color: undefined");
  });

  it("measures a label on its background", () => {
    expect(labelContrast({ color: "#fff", background: "var(--action)" })).toBeGreaterThanOrEqual(4.5);
    /* Red text on the grey button is the pair that does not work. */
    expect(labelContrast({ color: "var(--danger)", background: "var(--fill)" })).toBeLessThan(4.5);
  });
});

describe("the buttons", () => {
  /*
   * The green main button, the black pill, the grey button, the red button,
   * and the quiet red one for a destructive action that repeats down a list.
   */
  const kinds = ["action", "ink", "fill", "danger", "danger-quiet"];
  const look = (kind: string) => ({ ...classLook("btn"), ...classLook(`btn-${kind}`) });

  it.each(kinds)("btn-%s is a pill at least 44px tall", (kind) => {
    expect(look(kind)["border-radius"]).toBe("var(--radius-pill)");
    expect(px(look(kind)["min-height"])).toBeGreaterThanOrEqual(44);
  });

  it("the main button is 52px tall", () => {
    expect(px(look("action")["min-height"])).toBe(52);
  });

  it.each([
    ["action", "#fff", "var(--action)"],
    ["ink", "#fff", "var(--ink)"],
    ["fill", "var(--ink)", "var(--fill)"],
    ["danger", "#fff", "var(--danger)"],
    ["danger-quiet", "var(--danger)", "var(--surface)"],
  ])("btn-%s writes %s on %s", (kind, color, background) => {
    expect(look(kind).color).toBe(color);
    expect(look(kind).background).toBe(background);
  });

  it.each(kinds)("btn-%s has a label that reaches 4.5 to 1", (kind) => {
    expect(labelContrast(look(kind))).toBeGreaterThanOrEqual(4.5);
  });

  /* White on a white card, so the control edge is what gives the quiet red button its shape. */
  it("the quiet red button is edged like a form control and filled like none", () => {
    expect(look("danger-quiet").border).toBe("1px solid var(--control-line)");
    expect(look("danger").border).toBeUndefined();
  });

  /* Hover and pressed keep red text on a ground where it still reaches 4.5 to 1. */
  it.each(["hover:not(:disabled)", "active:not(:disabled)"])("the quiet red button stays readable on :%s", (state) => {
    const stated = { ...look("danger-quiet"), ...lookOf(`.btn-danger-quiet:${state}`) };
    expect(lookOf(`.btn-danger-quiet:${state}`)).not.toEqual({});
    expect(labelContrast(stated)).toBeGreaterThanOrEqual(4.5);
  });

  const states = ["hover", "active", "focus-visible", "disabled"];
  const cases = kinds.flatMap((kind) => states.map((state) => [kind, state]));

  it.each(cases)("btn-%s has a rule for :%s", (kind, state) => {
    const stated = new RegExp(`^\\.btn(?:-${kind})?:${state}(?![\\w-])`);
    const found = rules.filter((rule) => rule.selectors.some((selector) => stated.test(selector)));
    expect(found.length).toBeGreaterThan(0);
    expect(Object.keys(found[0].declarations).length).toBeGreaterThan(0);
  });

  /* The old variants on the new buttons. The red outline is the quiet red button. */
  it.each([
    ["mb-btn-coral", "action"],
    ["mb-btn-navy", "ink"],
    ["mb-btn-outline-navy", "fill"],
    ["mb-btn-outline", "fill"],
    ["mb-btn-outline-red", "danger-quiet"],
  ])("the old %s draws btn-%s", (old, kind) => {
    expect(classLook("mb-btn")).toEqual(classLook("btn"));
    expect(classLook(old).background).toBe(classLook(`btn-${kind}`).background);
    expect(classLook(`btn-${kind}`)).toMatchObject(classLook(old));
  });

  /* An unmigrated bar that holds a green button beside 44px ones keeps its height. */
  it("the old coral button stays at 44px", () => {
    expect(px({ ...classLook("mb-btn"), ...classLook("mb-btn-coral") }["min-height"])).toBe(44);
  });
});

/* The properties of a look that draw an edge or a lift. */
const edges = (look: Record<string, string>) =>
  Object.keys(look).filter((property) => /^(border(?!-radius)|box-shadow|outline)/.test(property));

describe("the card", () => {
  it("is a surface with a 14px radius, no border, and no shadow", () => {
    const card = classLook("card");
    expect(card.background).toBe("var(--surface)");
    expect(card["border-radius"]).toBe("var(--radius-card)");
    expect(edges(card)).toEqual([]);
  });

  it("rules its head off from the rows with a line", () => {
    expect(classLook("card-head")["border-bottom"]).toBe("1px solid var(--line)");
  });

  it("gives the link in its head or at its foot 44px to tap", () => {
    expect(px(classLook("card-link")["min-height"])).toBeGreaterThanOrEqual(44);
  });

  /* min-h-11 is 44px. The old name hands out the same row. */
  it("gives a tappable row 44px", () => {
    expect(CARD_ROW.split(" ")).toContain("min-h-11");
    expect(PANEL_ROW).toBe(CARD_ROW);
  });

  it.each([
    ["mb-panel", "card"],
    ["mb-panel-head", "card-head"],
    ["mb-panel-link", "card-link"],
  ])("the old %s draws %s", (old, name) => {
    expect(classLook(name)).not.toEqual({});
    expect(classLook(old)).toEqual(classLook(name));
  });
});

describe("the dialog's frame", () => {
  /* The overlay dims the page behind it, so the frame needs no edge and no lift. */
  it("is a surface with a 14px radius, no border, and no shadow", () => {
    const frame = classLook("dialog");
    expect(frame.background).toBe("var(--surface)");
    expect(frame["border-radius"]).toBe("var(--radius-card)");
    expect(edges(frame)).toEqual([]);
  });

  /* A dialog opens in a portal on <body>, so it cannot count on a screen's own text color. */
  it("writes in ink, readable on the frame", () => {
    expect(classLook("dialog").color).toBe("var(--ink)");
    expect(labelContrast(classLook("dialog"))).toBeGreaterThanOrEqual(4.5);
  });

  /* The three volleyball modals write the old name on a frame of their own. */
  it("is drawn the same under its old name", () => {
    expect(classLook("mb-dialog")).toEqual(classLook("dialog"));
  });
});

describe("the lift", () => {
  /* Brown was the old paper's shadow. This one is the ink, thinned. */
  it("is one shadow mixed from ink, with no color of its own", () => {
    const lift = classLook("lift");
    expect(edges(lift)).toEqual(["box-shadow"]);
    expect(lift["box-shadow"]).toContain("var(--ink)");
    expect(lift["box-shadow"]).not.toMatch(/#[0-9a-f]{3}|rgba?\(/i);
  });

  /* The fullscreen bar on the scoring page still writes the old name. */
  it("is drawn the same under its old name", () => {
    expect(classLook("mb-shadow-panel")).toEqual(classLook("lift"));
  });
});

describe("the menu", () => {
  it("is a surface with a 10px radius", () => {
    const menu = classLook("menu");
    expect(menu.background).toBe("var(--surface)");
    expect(menu["border-radius"]).toBe("var(--radius-tile)");
    expect(labelContrast(menu)).toBeGreaterThanOrEqual(4.5);
  });

  it("gives each item 44px to tap", () => {
    expect(px(classLook("menu-item")["min-height"])).toBeGreaterThanOrEqual(44);
  });

  it("washes the item the pointer or the arrow keys are on", () => {
    expect(lookOf(".menu-item:focus").background).toBe("var(--fill)");
  });

  /*
   * Sign out, Delete. Red text on the grey wash gives 4.28 to 1, and the
   * danger tint is too near white to show on a white menu, so the row with
   * the focus fills with danger and writes in white.
   */
  it("writes a destructive item in danger, and in white on danger once it has focus", () => {
    const item = { ...classLook("menu"), ...classLook("menu-item"), ...classLook("menu-item-danger") };
    expect(item.color).toBe("var(--danger)");
    expect(labelContrast(item)).toBeGreaterThanOrEqual(4.5);
    const focused = { ...item, ...lookOf(".menu-item:focus"), ...lookOf(".menu-item-danger:focus") };
    expect(focused.background).toBe("var(--danger)");
    expect(focused.color).toBe("#fff");
    expect(labelContrast(focused)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("the ink bar", () => {
  /* The undo toast and the reload banner. */
  it("writes white on ink", () => {
    const bar = classLook("ink-bar");
    expect(bar.background).toBe("var(--ink)");
    expect(bar.color).toBe("#fff");
    expect(labelContrast(bar)).toBeGreaterThanOrEqual(4.5);
  });

  /*
   * The green button's focus ring is ink, which cannot be seen on ink, and the
   * default green ring gives 3.3 to 1 there. On the bar every ring is white.
   */
  it.each([[".ink-bar :focus-visible"], [".ink-bar .btn:focus-visible"], [".ink-bar .mb-btn:focus-visible"]])(
    "%s draws its ring in white",
    (selector) => {
      expect(lookOf(selector)["outline-color"]).toBe("#fff");
    },
  );
});

describe("the status chip", () => {
  const green = () => ({ ...classLook("chip"), ...classLook("chip-action") });

  it("is a pill in fill with ink text", () => {
    const chip = classLook("chip");
    expect(chip["border-radius"]).toBe("var(--radius-pill)");
    expect(chip.background).toBe("var(--fill)");
    expect(chip.color).toBe("var(--ink)");
  });

  it("is action on action-tint when it marks something live or confirmed", () => {
    expect(green()["border-radius"]).toBe("var(--radius-pill)");
    expect(green().background).toBe("var(--action-tint)");
    expect(green().color).toBe("var(--action)");
  });

  it("is readable in both tones", () => {
    expect(labelContrast(classLook("chip"))).toBeGreaterThanOrEqual(4.5);
    expect(labelContrast(green())).toBeGreaterThanOrEqual(4.5);
  });
});

describe("the date tile", () => {
  it("is a 10px tile in fill with the day in ink", () => {
    const tile = classLook("date-tile");
    expect(tile["border-radius"]).toBe("var(--radius-tile)");
    expect(tile.background).toBe("var(--fill)");
    expect(tile.color).toBe("var(--ink)");
  });

  it("writes the month in soft ink, readable on the tile", () => {
    const month = { ...classLook("date-tile"), ...classLook("date-tile-month") };
    expect(month.color).toBe("var(--ink-soft)");
    expect(labelContrast(month)).toBeGreaterThanOrEqual(4.5);
  });
});

/* A color-mix of a role token with transparent, as the hex it shows over a ground. */
function mixedOver(value: string | undefined, ground: string): string {
  const mix = value?.match(/^color-mix\(in srgb, (#[0-9a-f]{6}|var\(--[\w-]+\)) (\d+)%, transparent\)$/);
  if (!mix) return `not a mix: ${value}`;
  const share = Number(mix[2]) / 100;
  const channels = (hex: string) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
  const top = channels(mix[1].startsWith("#") ? mix[1] : hexOf(mix[1]));
  const under = channels(ground);
  return `#${top.map((c, i) => Math.round(c * share + under[i] * (1 - share)).toString(16).padStart(2, "0")).join("")}`;
}

describe("the form controls", () => {
  it("reads a part-transparent color as it shows over a ground", () => {
    expect(mixedOver("color-mix(in srgb, #000000 50%, transparent)", "#ffffff")).toBe("#808080");
    expect(mixedOver("color-mix(in srgb, var(--ink) 100%, transparent)", "#ffffff")).toBe("#15181b");
    expect(mixedOver("var(--line)", "#ffffff")).toBe("not a mix: var(--line)");
  });

  /*
   * A field's edge is the only thing that marks where to tap, so it has to
   * reach 3 to 1 on the card it sits on. The line token gives 1.16.
   */
  it("have an edge that reaches 3 to 1 on a surface", () => {
    const edge = stylesheet.match(/--control-line:\s*([^;]+);/)?.[1].trim();
    expect(contrastRatio(mixedOver(edge, tokens.surface), tokens.surface)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(tokens.line, tokens.surface)).toBeLessThan(3);
  });

  /* The input's box, the textarea, the native select, the search field. */
  const boxes = ["field", "field-area", "field-select", "field-search"];

  it.each(boxes)("%s is a 10px box on surface with the control edge", (name) => {
    const box = classLook(name);
    expect(box["border-radius"]).toBe("var(--radius-tile)");
    expect(box.background).toBe("var(--surface)");
    expect(box.border).toBe("1px solid var(--control-line)");
  });

  it.each(["field", "field-select", "field-search"])("%s is at least 44px tall", (name) => {
    expect(px(classLook(name)["min-height"])).toBeGreaterThanOrEqual(44);
  });

  it.each([
    [".field:focus-within"],
    [".field-area:focus"],
    [".field-select:focus"],
    [".field-search:focus-within"],
    [".field-check:focus-visible"],
  ])("%s draws a ring in action", (selector) => {
    expect(lookOf(selector).outline).toBe("2px solid var(--action)");
  });

  it("the checkbox takes a radius from the scale and fills with action when checked", () => {
    expect(classLook("field-check")["border-radius"]).toBe("var(--radius-chip)");
    expect(lookOf(".field-check:checked")["background-color"]).toBe("var(--action)");
  });

  it.each([
    [".mb-input", ".field"],
    [".mb-input:focus-within", ".field:focus-within"],
    [".mb-input input", ".field input"],
    [".mb-textarea", ".field-area"],
    [".mb-textarea:focus", ".field-area:focus"],
    [".mb-select-native", ".field-select"],
    [".mb-select-native:focus", ".field-select:focus"],
    [".mb-search", ".field-search"],
    [".mb-search input", ".field-search input"],
    [".mb-checkbox", ".field-check"],
    [".mb-checkbox:checked", ".field-check:checked"],
  ])("the old %s draws %s", (old, name) => {
    expect(lookOf(name)).not.toEqual({});
    expect(lookOf(old)).toEqual(lookOf(name));
  });
});

describe("the table", () => {
  it("heads its columns in soft ink over a line rule", () => {
    const head = lookOf(".data-table th");
    expect(head.color).toBe("var(--ink-soft)");
    expect(head["border-bottom"]).toBe("1px solid var(--line)");
  });

  it("divides its rows with a line rule and holds its digits in place", () => {
    const cell = lookOf(".data-table td");
    expect(cell["border-bottom"]).toBe("1px solid var(--line)");
    expect(cell["font-variant-numeric"]).toBe("tabular-nums");
  });

  it("has a compact size with tighter columns", () => {
    const regular = px(lookOf(".data-table td")["padding-inline"]);
    const compact = px(lookOf(".data-table-compact td")["padding-inline"]);
    expect(compact).toBeLessThan(regular);
  });

  it.each([
    [".mb-table th", ".data-table th"],
    [".mb-table td", ".data-table td"],
    [".mb-table tr:last-child td", ".data-table tr:last-child td"],
    [".mb-table-compact th", ".data-table-compact th"],
    [".mb-table-compact td", ".data-table-compact td"],
  ])("the old %s draws %s", (old, name) => {
    expect(lookOf(name)).not.toEqual({});
    expect(lookOf(old)).toEqual(lookOf(name));
  });
});

describe("the spinner", () => {
  it("is drawn the same under its new name and its old one", () => {
    expect(classLook("spinner")).not.toEqual({});
    expect(classLook("mb-spinner")).toEqual(classLook("spinner"));
  });
});

/*
 * Until the old theme is deleted, a screen that still writes an old class gets
 * the new piece: every rule that names a new class names the old one beside
 * it, states and descendants included. Ticket 20 deletes the old names and
 * this block with them.
 */

/* The selectors a rule would need for `old` to be drawn wherever `name` is, and does not have. */
function missingTwins(rules: CssRule[], old: string, name: string, newOnly: string[] = []): string[] {
  const named = new RegExp(`\\.${name}(?![\\w-])`, "g");
  const missing: string[] = [];
  for (const rule of rules) {
    for (const selector of rule.selectors) {
      if (newOnly.includes(selector) && rule.selectors.length === 1) continue;
      const twin = selector.replace(named, `.${old}`);
      if (twin !== selector && !rule.selectors.includes(twin)) missing.push(twin);
    }
  }
  return missing;
}

describe("the old class names", () => {
  it("are missed where a rule draws only the new name", () => {
    const sample = rulesIn(`
      .btn, .old-btn { gap: 1px; }
      .btn:hover { gap: 2px; }
      .card > .btn, .card > .old-btn { gap: 3px; }
      .btn-action { gap: 4px; }
      .btn { gap: 5px; }
    `);
    expect(missingTwins(sample, "old-btn", "btn")).toEqual([".old-btn:hover", ".old-btn"]);
    expect(missingTwins(sample, "old-btn", "btn", [".btn"])).toEqual([".old-btn:hover"]);
    expect(missingTwins(sample, "old-card", "card")).toEqual([".old-card > .btn", ".old-card > .old-btn"]);
  });

  it.each([
    ["mb-panel", "card"],
    ["mb-panel-head", "card-head"],
    ["mb-panel-link", "card-link"],
    ["mb-btn", "btn"],
    ["mb-btn-coral", "btn-action"],
    ["mb-btn-navy", "btn-ink"],
    ["mb-btn-outline-navy", "btn-fill"],
    ["mb-btn-outline", "btn-fill"],
    ["mb-btn-outline-red", "btn-danger-quiet"],
    ["mb-dialog", "dialog"],
    ["mb-shadow-panel", "lift"],
    ["mb-live-dot", "live-dot"],
    ["mb-spinner", "spinner"],
    ["mb-score-text", "team-panel-score"],
    ["mb-table", "data-table"],
    ["mb-table-compact", "data-table-compact"],
    ["mb-input", "field"],
    ["mb-textarea", "field-area"],
    ["mb-select-native", "field-select"],
    ["mb-search", "field-search"],
    ["mb-checkbox", "field-check"],
  ])("%s is drawn by every rule that draws %s", (old, name) => {
    const named = new RegExp(`\\.${name}(?![\\w-])`);
    expect(rules.some((rule) => rule.selectors.some((selector) => named.test(selector)))).toBe(true);
    /* The main button's 52px is the one thing a new name has that its old name lacks. */
    expect(missingTwins(rules, old, name, [".btn-action"])).toEqual([]);
  });
});
