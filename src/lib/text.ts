// Small, dependency-free text helpers shared across Matchbook screens.
//
// `pluralise` exists to kill `venueName + "s"` (useNewCompetitionPage.tsx:231),
// which produces "pitchs", "boxs" and "penaltys" for perfectly ordinary venue
// words the user is invited to type in Advanced Settings.

/** Words whose plural is not formed by suffixing. */
const IRREGULAR_PLURALS: Record<string, string> = {
  child: "children",
  foot: "feet",
  goose: "geese",
  half: "halves",
  knife: "knives",
  leaf: "leaves",
  life: "lives",
  man: "men",
  person: "people",
  tooth: "teeth",
  woman: "women",
};

/** Words that are already their own plural. */
const UNCHANGED_PLURALS = new Set([
  "equipment",
  "gear",
  "innings",
  "kit",
  "offside",
  "series",
  "species",
]);

/** Sibilant endings that take "-es": bus, box, quiz, pitch, dish. */
const SIBILANT = /(s|x|z|ch|sh)$/i;

/** Consonant + y takes "-ies": city -> cities. Vowel + y does not: alley -> alleys. */
const CONSONANT_Y = /[^aeiou]y$/i;

const matchCase = (source: string, result: string): string =>
  source.length > 1 && source === source.toUpperCase()
    ? result.toUpperCase()
    : result;

/** Pluralise a single word, preserving all-caps casing. */
const pluraliseWord = (word: string): string => {
  const lower = word.toLowerCase();
  if (UNCHANGED_PLURALS.has(lower)) return word;
  const irregular = IRREGULAR_PLURALS[lower];
  if (irregular) return matchCase(word, irregular);
  if (SIBILANT.test(word)) return matchCase(word, `${word}es`);
  if (CONSONANT_Y.test(word)) return matchCase(word, `${word.slice(0, -1)}ies`);
  return matchCase(word, `${word}s`);
};

/**
 * The correct form of `word` for `count`.
 *
 * - `pluralise("pitch")` -> `"pitches"`   (no count: always the plural)
 * - `pluralise("court", 1)` -> `"court"`
 * - `pluralise("court", 0)` -> `"courts"` (English pluralises zero)
 * - `pluralise("box", 3, "boxen")` -> `"boxen"` (explicit override wins)
 *
 * Multi-word phrases pluralise their last word only ("practice court" ->
 * "practice courts"). Empty or whitespace-only input is returned untouched.
 */
export const pluralise = (
  word: string,
  count?: number,
  plural?: string
): string => {
  const trimmed = word.trim();
  if (trimmed === "") return word;
  if (count === 1) return trimmed;
  if (plural !== undefined) return plural;

  const split = trimmed.lastIndexOf(" ");
  if (split === -1) return pluraliseWord(trimmed);
  return `${trimmed.slice(0, split + 1)}${pluraliseWord(trimmed.slice(split + 1))}`;
};

/**
 * `"1 court"` / `"3 courts"` / `"0 courts"`.
 * The numeral still needs `tabular-nums` at the call site.
 */
export const countOf = (count: number, word: string, plural?: string): string =>
  `${count} ${pluralise(word, count, plural)}`;
