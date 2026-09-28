import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** The message of an error, or the fallback when it has none. */
export const messageOf = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

/** "1 team", "3 teams", or with the plural given, "2 quick matches". */
export const plural = (count: number, one: string, many = `${one}s`): string =>
  `${count} ${count === 1 ? one : many}`;

/** "Aces", "Aces and Blockers", "Aces, Blockers and Chasers". */
export const listNames = (names: string[]): string =>
  names.length <= 1
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
