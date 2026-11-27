import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/*
 * The steps of the type scale and the radius scale in src/app/globals.css.
 * Without them a merge takes text-title for a text color and drops it beside
 * text-ink, and it never sees that rounded-card and rounded-pill conflict.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["page-title", "title", "body", "label", "caption", "tab", "score"],
      radius: ["card", "tile", "chip", "pill"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** The message of an error, or the fallback when it has none. */
export const messageOf = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

/**
 * What two team names are compared by: "Aces" and " aces " are the same
 * team as far as the roster and an import are concerned.
 */
export const nameKey = (name: string): string => name.trim().toLowerCase();

/** "1 team", "3 teams", or with the plural given, "2 quick matches". */
export const plural = (count: number, one: string, many = `${one}s`): string =>
  `${count} ${count === 1 ? one : many}`;

/** "Aces", "Aces and Blockers", "Aces, Blockers and Chasers". */
export const listNames = (names: string[]): string =>
  names.length <= 1
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
