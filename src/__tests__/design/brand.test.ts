// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { CREST_SRC } from "@/lib/assetPaths";

/*
 * The brand outside the page: what a phone shows when the app is installed
 * and while it opens. These files are read by the browser and the launcher,
 * not by any component, so nothing else fails when one of them falls out of
 * step with the stylesheet.
 */

const pathTo = (fromRoot: string): string =>
  fileURLToPath(new URL(`../../../${fromRoot}`, import.meta.url));
const read = (fromRoot: string): string => readFileSync(pathTo(fromRoot), "utf8");

/* A role token's value in the stylesheet: "--surface: #ffffff;" gives #ffffff. */
const stylesheet = read("src/app/globals.css");
const token = (role: string): string => {
  const value = stylesheet.match(new RegExp(`--${role}:\\s*([^;]+);`))?.[1].trim();
  if (!value) throw new Error(`no --${role} in globals.css`);
  return value;
};

const manifest = JSON.parse(read("public/manifest.json")) as {
  theme_color: string;
  background_color: string;
  icons: { src: string; sizes: string; type: string; purpose: string }[];
};

describe("the installed app's colors", () => {
  /* The splash screen is the background color, and the page it opens to sits on the ground. */
  it("opens on the ground color", () => {
    expect(manifest.background_color).toBe(token("ground"));
  });

  /* The bar above the installed app takes the theme color, and the header under it is a surface. */
  it("colors the bar above the app as a surface", () => {
    expect(manifest.theme_color).toBe(token("surface"));
  });

  /* A browser tab reads the page's own tag, so the two must say the same color. */
  it("gives the page's theme-color tag the same color", () => {
    const tag = read("src/app/layout.tsx").match(/themeColor:\s*"([^"]+)"/)?.[1];
    expect(tag).toBe(manifest.theme_color);
  });
});

describe("the crest", () => {
  it("is a file of its own, outside the old theme's folder", () => {
    expect(CREST_SRC).not.toMatch(/matchbook/i);
    expect(existsSync(pathTo(`public${CREST_SRC}`))).toBe(true);
  });

  /* The brand draws it in a square box, so a crest of another shape would be squashed. */
  it("is square", () => {
    const [, , width, height] = read(`public${CREST_SRC}`).match(/viewBox="([^"]+)"/)![1].split(" ");
    expect(width).toBe(height);
  });
});

describe("the home-screen icons", () => {
  /* The color of an icon's top left pixel, as the stylesheet writes a color. */
  const cornerOf = async (src: string): Promise<string> => {
    const pixel = await sharp(pathTo(`public${src}`))
      .extract({ left: 0, top: 0, width: 1, height: 1 })
      .removeAlpha()
      .raw()
      .toBuffer();
    return `#${pixel.toString("hex")}`;
  };
  const iconsFor = (purpose: string) => manifest.icons.filter((icon) => icon.purpose === purpose);

  it.each(manifest.icons)("$src is a PNG of the size the manifest gives it", async ({ src, sizes }) => {
    const { format, width, height } = await sharp(pathTo(`public${src}`)).metadata();
    expect(format).toBe("png");
    expect(`${width}x${height}`).toBe(sizes);
  });

  /* A launcher shows a plain icon whole, so the crest sits on the same white as the header. */
  it.each(iconsFor("any"))("$src has the crest on a surface", async ({ src }) => {
    expect(await cornerOf(src)).toBe(token("surface"));
  });

  /* A launcher cuts a maskable icon to its own shape, so the green has to reach every edge. */
  it.each(iconsFor("maskable"))("$src is the action color to its edges", async ({ src }) => {
    expect(await cornerOf(src)).toBe(token("action"));
  });
});
