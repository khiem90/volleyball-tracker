// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CARD_ROW } from "@/components/shared/Card";
import { contrastRatio } from "@/lib/contrast";
import { stylesheet, tokens } from "./stylesheet";

/*
 * The shared classes in src/app/globals.css: the card, the five buttons, the
 * dialog's frame, the menu, the ink bar, the chip, the date tile, and the form
 * controls. This file reads the stylesheet's rules and checks two things. A
 * class's text reaches 4.5 to 1 on the class's own background. And the rules
 * on the forbidden list in docs/design-system.md that a stylesheet can break
 * are kept: 44px to tap, no forced uppercase, no border or shadow on a card,
 * no shadow but the lift, no color of the lift's own, and no red off a
 * destructive class. How a class looks is not pinned here. The owner's eye
 * checks that.
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

/* The selectors of the rules that paint with a custom property: a class that reads var(--danger) writes red. */
function selectorsPaintingWith(rules: CssRule[], property: string): string[] {
  return rules
    .filter((rule) =>
      Object.entries(rule.declarations).some(
        ([name, value]) => !name.startsWith("--") && value.includes(`var(--${property}`),
      ),
    )
    .flatMap((rule) => rule.selectors);
}

const rules = rulesIn(stylesheet);
const lookOf = (selector: string) => declarationsFor(rules, selector);
const classLook = (className: string) => lookOf(`.${className}`);

describe("reading the stylesheet's rules", () => {
  const sample = rulesIn(`
    @theme inline { --color-danger: var(--danger); }
    @layer components {
      /* A comment with a { brace } in it. */
      .btn,
      .button {
        min-height: 2.75rem;
        color: #fff;
      }
      .btn:hover { color: red; }
      .btn-action { min-height: 3.25rem; }
      .btn-danger { background: var(--danger); }
      .btn-danger-quiet:active { background: var(--danger-tint); }
      @media (hover: hover) {
        .card  >  .btn { gap: 1px; }
        .btn-danger:hover { background: color-mix(in srgb, var(--danger) 88%, var(--ink)); }
      }
    }
  `);

  it("lists each rule's selectors and declarations", () => {
    expect(sample.slice(1, 4)).toEqual([
      { selectors: [".btn", ".button"], declarations: { "min-height": "2.75rem", color: "#fff" } },
      { selectors: [".btn:hover"], declarations: { color: "red" } },
      { selectors: [".btn-action"], declarations: { "min-height": "3.25rem" } },
    ]);
    expect(sample.at(-2)).toEqual({ selectors: [".card > .btn"], declarations: { gap: "1px" } });
  });

  it("gathers what one selector sets", () => {
    expect(declarationsFor(sample, ".btn")).toEqual({ "min-height": "2.75rem", color: "#fff" });
    expect(declarationsFor(sample, ".button")).toEqual({ "min-height": "2.75rem", color: "#fff" });
    expect(declarationsFor(sample, ".btn:hover")).toEqual({ color: "red" });
    expect(declarationsFor(sample, ".card > .btn")).toEqual({ gap: "1px" });
    expect(declarationsFor(sample, ".missing")).toEqual({});
  });

  /* The theme block that names a token for a utility paints nothing with it. */
  it("names the selectors that paint with a token, and with its tint", () => {
    expect(selectorsPaintingWith(sample, "danger")).toEqual([
      ".btn-danger",
      ".btn-danger-quiet:active",
      ".btn-danger:hover",
    ]);
    expect(selectorsPaintingWith(sample, "action")).toEqual([]);
  });
});

describe("case", () => {
  /* Headings and labels are written in the JSX as they should read. */
  it("is never forced to uppercase by a class", () => {
    const forcing = rules.filter((rule) => "text-transform" in rule.declarations).flatMap((rule) => rule.selectors);
    expect(forcing).toEqual([]);
  });
});

describe("red", () => {
  /* Live, a loss, and a status are never red, so no class of theirs reads danger or its tint. */
  it("is written only by the destructive button and the destructive menu row", () => {
    const writingRed = selectorsPaintingWith(rules, "danger");
    expect(writingRed).toContain(".btn-danger");
    expect(writingRed).toContain(".menu-item-danger");
    expect(writingRed.filter((selector) => !/^\.(?:btn|menu-item)-danger(?![\w])/.test(selector))).toEqual([]);
  });
});

/* A length in px: "44px" is 44, "2.75rem" is 44. */
const px = (length: string | undefined): number =>
  length === undefined ? NaN : length.endsWith("rem") ? parseFloat(length) * 16 : parseFloat(length);

/* The hex color a declaration paints: white, or a role token whose value is a hex color. */
function hexOf(value: string | undefined): string {
  if (value === "#fff" || value === "#ffffff") return "#ffffff";
  const role = value?.match(/^var\(--([\w-]+)\)$/)?.[1];
  const hex = role ? tokens[role] : undefined;
  return hex && /^#[0-9a-f]{6}$/.test(hex) ? hex : `not a color: ${value}`;
}

/* The text of a class on its own background. */
const labelContrast = (look: Record<string, string>) => contrastRatio(hexOf(look.color), hexOf(look.background));

describe("reading a class's colors", () => {
  it("resolves white and the role tokens to hex", () => {
    expect(hexOf("#fff")).toBe("#ffffff");
    expect(hexOf("var(--action)")).toBe("#087a4d");
    expect(hexOf("var(--ink)")).toBe("#15181b");
    expect(hexOf("blue")).toBe("not a color: blue");
    /* The control edge is a mix, not a hex color. */
    expect(hexOf("var(--control-line)")).toBe("not a color: var(--control-line)");
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

  it.each(kinds)("btn-%s is at least 44px tall", (kind) => {
    expect(px(look(kind)["min-height"])).toBeGreaterThanOrEqual(44);
  });

  it.each(kinds)("btn-%s has a label that reaches 4.5 to 1", (kind) => {
    expect(labelContrast(look(kind))).toBeGreaterThanOrEqual(4.5);
  });

  /* Hover and pressed keep red text on a ground where it still reaches 4.5 to 1. */
  it.each(["hover:not(:disabled)", "active:not(:disabled)"])("the quiet red button stays readable on :%s", (state) => {
    const stated = { ...look("danger-quiet"), ...lookOf(`.btn-danger-quiet:${state}`) };
    expect(lookOf(`.btn-danger-quiet:${state}`)).not.toEqual({});
    expect(labelContrast(stated)).toBeGreaterThanOrEqual(4.5);
  });
});

/* The properties of a look that draw an edge or a lift. */
const edges = (look: Record<string, string>) =>
  Object.keys(look).filter((property) => /^(border(?!-radius)|box-shadow|outline)/.test(property));

describe("the card", () => {
  /* It separates from the ground by its color alone. */
  it("has no border and no shadow", () => {
    expect(classLook("card")).not.toEqual({});
    expect(edges(classLook("card"))).toEqual([]);
  });

  it("gives the link in its head or at its foot 44px to tap", () => {
    expect(px(classLook("card-link")["min-height"])).toBeGreaterThanOrEqual(44);
  });

  /* min-h-11 is 44px. */
  it("gives a tappable row 44px", () => {
    expect(CARD_ROW.split(" ")).toContain("min-h-11");
  });
});

describe("the dialog's frame", () => {
  /* A dialog opens in a portal on <body>, so it cannot count on a screen's own text color. */
  it("writes text that reaches 4.5 to 1 on the frame", () => {
    expect(labelContrast(classLook("dialog"))).toBeGreaterThanOrEqual(4.5);
  });
});

describe("the lift", () => {
  /* The ink, thinned. A shadow with a hue of its own would be a color outside the role tokens. */
  it("is mixed from ink, with no color of its own", () => {
    const lift = classLook("lift");
    expect(lift["box-shadow"]).toContain("var(--ink)");
    expect(lift["box-shadow"]).not.toMatch(/#[0-9a-f]{3}|rgba?\(/i);
  });

  /* A card has none, and neither has the dialog, which the dimmed page sets apart. */
  it("is the only shadow a class draws", () => {
    const shadowed = rules.filter((rule) => "box-shadow" in rule.declarations).flatMap((rule) => rule.selectors);
    expect(shadowed).toEqual([".lift"]);
  });
});

describe("the menu", () => {
  /* Like a dialog it opens in a portal on <body>, so it sets its own ink. */
  it("writes text that reaches 4.5 to 1 on its own surface", () => {
    expect(labelContrast(classLook("menu"))).toBeGreaterThanOrEqual(4.5);
  });

  it("gives each item 44px to tap", () => {
    expect(px(classLook("menu-item")["min-height"])).toBeGreaterThanOrEqual(44);
  });

  /*
   * Sign out, Delete. Red text on the grey wash gives 4.28 to 1, and the
   * danger tint is too near white to show on a white menu, so the row with
   * the focus fills with danger and writes in white.
   */
  it("keeps a destructive item readable, at rest and once it has the focus", () => {
    const item = { ...classLook("menu"), ...classLook("menu-item"), ...classLook("menu-item-danger") };
    expect(labelContrast(item)).toBeGreaterThanOrEqual(4.5);
    expect(lookOf(".menu-item-danger:focus")).not.toEqual({});
    const focused = { ...item, ...lookOf(".menu-item:focus"), ...lookOf(".menu-item-danger:focus") };
    expect(labelContrast(focused)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("the ink bar", () => {
  /* The undo toast and the reload banner. */
  it("writes text that reaches 4.5 to 1 on the bar", () => {
    expect(labelContrast(classLook("ink-bar"))).toBeGreaterThanOrEqual(4.5);
  });

  /*
   * The green button's focus ring is ink, which cannot be seen on ink, and the
   * default green ring gives 3.3 to 1 there. On the bar every ring takes a
   * color that reaches 4.5 to 1 on it.
   */
  it.each([[".ink-bar :focus-visible"], [".ink-bar .btn:focus-visible"]])("%s draws a ring that shows on the bar", (selector) => {
    const ring = hexOf(lookOf(selector)["outline-color"]);
    expect(contrastRatio(ring, hexOf(classLook("ink-bar").background))).toBeGreaterThanOrEqual(4.5);
  });
});

describe("the status chip", () => {
  const green = () => ({ ...classLook("chip"), ...classLook("chip-action") });

  it("is readable in both tones", () => {
    expect(classLook("chip-action")).not.toEqual({});
    expect(labelContrast(classLook("chip"))).toBeGreaterThanOrEqual(4.5);
    expect(labelContrast(green())).toBeGreaterThanOrEqual(4.5);
  });
});

describe("the date tile", () => {
  it("writes the day and the month so both read on the tile", () => {
    const month = { ...classLook("date-tile"), ...classLook("date-tile-month") };
    expect(classLook("date-tile-month")).not.toEqual({});
    expect(labelContrast(classLook("date-tile"))).toBeGreaterThanOrEqual(4.5);
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
    const edge = tokens["control-line"];
    expect(contrastRatio(mixedOver(edge, tokens.surface), tokens.surface)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(tokens.line, tokens.surface)).toBeLessThan(3);
  });

  /* The input's box, the native select, the search field. A checkbox is 22px, so its row is the target. */
  it.each(["field", "field-select", "field-search"])("%s is at least 44px tall", (name) => {
    expect(px(classLook(name)["min-height"])).toBeGreaterThanOrEqual(44);
  });
});
