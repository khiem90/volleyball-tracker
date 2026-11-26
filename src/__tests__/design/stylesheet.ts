import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/*
 * The app's stylesheet as the design tests read it: the text, and the custom
 * properties it defines. Every test that measures a token reads it from
 * here, so the tests and the app cannot hold two values for one token.
 */

/** src/app/globals.css, as text. */
export const stylesheet = readFileSync(
  fileURLToPath(new URL("../../app/globals.css", import.meta.url)),
  "utf8",
);

/** Every custom property in a piece of CSS with its value: "--ink: #15181b;" gives ink. */
export function customProperties(css: string): Record<string, string> {
  const found: Record<string, string> = {};
  for (const [, name, value] of css.matchAll(/--([\w-]+):\s*([^;]+);/g)) found[name] = value.trim();
  return found;
}

/** The stylesheet's own custom properties: the role tokens, the two scales, and the rest. */
export const tokens = customProperties(stylesheet);

/**
 * One token's value: token("ink") is "#15181b". It throws on a name the
 * stylesheet does not define, so a misspelled token cannot pass a check as
 * undefined.
 */
export const token = (name: string): string => {
  const value = tokens[name];
  if (value === undefined) throw new Error(`No --${name} in globals.css`);
  return value;
};
