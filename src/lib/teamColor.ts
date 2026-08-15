/* ===========================================================================
   WHAT A TEAM COLOUR IS

   It is **a name from a closed set, or a hex a person typed.** It is not a CSS
   expression, and `PersistentTeam.color` may not hold one again.

   The bug this file closes: Quick Add wrote

       Team 3 :: color-mix(in oklab, var(--mb-navy) 55%, var(--mb-green))

   into localStorage, from where it round-trips through share links. A stored
   CSS function cannot be named ("what colour is Team 3?"), cannot be compared
   (two teams are the same colour only if two expressions are byte-identical),
   and cannot be migrated (the string carries no idea of which ink was meant,
   only of how that ink was mixed on the day it was picked). It also freezes a
   recipe: `color-mix(… var(--mb-green))` is a promise about a token that the
   team palette itself no longer offers as an ink.

   So storage holds `"teal"`. Paint resolves it through `TEAM_COLOR_CSS`, which
   is the one place the recipe lives and the only place it can be re-tuned. The
   stored value stays a token *name*, so charter invariant 10 holds — nothing
   here is a hex except a colour a person chose by hand, and that one is their
   data, not the design system's.

   Three functions is the whole contract:

   | `normalizeTeamColor` | on the way IN  — what gets written to storage      |
   | `teamColorCss`       | on the way to PAINT — never used as text          |
   | `teamColorName`      | on the way to a READER — never used as CSS        |

   `PersistentTeam.color` must pass through `teamColorCss()` before it can
   reach a `style`, and through `teamColorName()` before it can reach a text
   node. Painting a stored value raw shows `navy` (a CSS keyword that is not
   this navy) or nothing at all; printing one raw is the defect the team
   profile shipped.
   =========================================================================== */

/**
 * The six inks, in palette order. The ids are the labels lowercased, which is
 * what `QuickAddTeams` was already using as its internal key — this file just
 * makes that key the thing that gets stored.
 */
export const TEAM_COLOR_IDS = [
  "navy",
  "teal",
  "plum",
  "rose",
  "lilac",
  "ochre",
] as const;

export type TeamColorId = (typeof TEAM_COLOR_IDS)[number];

/**
 * The recipes, and the only copy of them. `MB_SWATCH_PALETTE` in
 * `matchbook/form.tsx` is built from this map, so the picker cannot offer an
 * ink that storage cannot name.
 *
 * Every value resolves through `--mb-*` (invariant 10) and every one of them
 * is measured at ≥ΔE 11.5 from every reserved meaning and ≥ΔE 12.6 from every
 * other ink — the table in `form.tsx` documents that work and still governs
 * *why* these six. This map governs *what* they are.
 */
export const TEAM_COLOR_CSS: Record<TeamColorId, string> = {
  navy: "var(--mb-navy)",
  teal: "color-mix(in oklab, var(--mb-navy) 55%, var(--mb-green))",
  plum: "var(--mb-plum)",
  rose: "color-mix(in oklab, var(--mb-plum) 50%, var(--mb-red))",
  lilac: "color-mix(in oklab, var(--mb-plum) 65%, var(--mb-paper-bright))",
  ochre: "color-mix(in oklab, var(--mb-gold) 45%, var(--mb-ink-muted))",
};

/** What a reader is told the ink is called. */
export const TEAM_COLOR_LABEL: Record<TeamColorId, string> = {
  navy: "Navy",
  teal: "Teal",
  plum: "Plum",
  rose: "Rose",
  lilac: "Lilac",
  ochre: "Ochre",
};

/**
 * The first ink of the palette, and the colour a team gets when nothing else
 * decides. Not a random pick — see `nextTeamColor`.
 */
export const DEFAULT_TEAM_COLOR: TeamColorId = "navy";

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const TOKEN_RE = /^var\(\s*(--mb-[a-z0-9-]+)\s*\)$/i;

/**
 * Every value the app has ever written into `PersistentTeam.color`, mapped to
 * the ink that survives.
 *
 * Rows 1–6 are the shipped palette expressions — the literal strings sitting in
 * saved teams right now, including the two Quick Add wrote for Team 3 and
 * Team 5. Rows 7+ are the eight house tokens the palette offered before it was
 * re-measured; each lands on the surviving ink nearest it, so a team saved as
 * coral reads out as Rose rather than as a token name.
 *
 * A value that is not in this table is left exactly as it was found. A hand
 * mixed colour is the user's data and is never rewritten — it simply reads out
 * under its own hex.
 */
const LEGACY_TEAM_COLORS: Record<string, TeamColorId> = {
  [TEAM_COLOR_CSS.navy]: "navy",
  [TEAM_COLOR_CSS.teal]: "teal",
  [TEAM_COLOR_CSS.plum]: "plum",
  [TEAM_COLOR_CSS.rose]: "rose",
  [TEAM_COLOR_CSS.lilac]: "lilac",
  [TEAM_COLOR_CSS.ochre]: "ochre",
  "var(--mb-teal)": "teal",
  "var(--mb-green)": "teal",
  "var(--mb-green-ink)": "teal",
  "var(--mb-coral)": "rose",
  "var(--mb-coral-deep)": "rose",
  "var(--mb-red)": "rose",
  "var(--mb-gold)": "ochre",
  "var(--mb-gold-ink)": "ochre",
  "var(--mb-ink-muted)": "ochre",
};

const isTeamColorId = (value: string): value is TeamColorId =>
  (TEAM_COLOR_IDS as readonly string[]).includes(value);

/**
 * What gets written to storage.
 *
 * A palette ink becomes its id; a legacy expression becomes the id it always
 * meant; a hex is kept, lowercased, so two spellings of one colour compare
 * equal; anything else is passed through untouched rather than discarded,
 * because losing a colour is worse than storing an odd one.
 *
 * Empty in, empty out: `PersistentTeam.color` is optional, and "this team has
 * no colour" has to stay expressible — it is what makes the mark render with
 * no bar instead of with a default one.
 */
export const normalizeTeamColor = (raw?: string | null): string => {
  const value = (raw ?? "").trim();
  if (!value) return "";
  if (isTeamColorId(value.toLowerCase())) return value.toLowerCase();
  if (HEX_RE.test(value)) return value.toLowerCase();
  const legacy = LEGACY_TEAM_COLORS[value] ?? LEGACY_TEAM_COLORS[value.toLowerCase()];
  return legacy ?? value;
};

/**
 * What gets painted. Undefined means "no colour", which every mark already
 * reads as "draw no bar".
 */
export const teamColorCss = (raw?: string | null): string | undefined => {
  const value = normalizeTeamColor(raw);
  if (!value) return undefined;
  return isTeamColorId(value) ? TEAM_COLOR_CSS[value] : value;
};

/**
 * Same, for the two readers that must always have an ink: a fallback that is
 * the palette's first colour rather than an off-palette literal. It replaces
 * the `"#3b82f6"` and `"#666"` defaults that three hooks were carrying.
 */
export const teamColorCssOrDefault = (raw?: string | null): string =>
  teamColorCss(raw) ?? TEAM_COLOR_CSS[DEFAULT_TEAM_COLOR];

/**
 * What a person is told. Never a CSS expression, never a token name.
 *
 * The team profile printed `row.color` directly, so a phone showed
 * `COLOR-MIX(IN OKLAB, VAR(--MB-PLUM) 65%, VAR(--MB-PAPER-BRIGHT))` on two
 * lines where the word "Lilac" belonged. An off-palette token still gets turned
 * back into words — the same treatment `swatchName()` gives it in the picker —
 * so no branch of this function can emit `var(` or `color-mix(`.
 */
export const teamColorName = (raw?: string | null): string => {
  const value = normalizeTeamColor(raw);
  if (!value) return "None";
  if (isTeamColorId(value)) return TEAM_COLOR_LABEL[value];
  if (HEX_RE.test(value)) return "Custom";
  const token = TOKEN_RE.exec(value);
  if (!token) return "Custom";
  const words = token[1].replace(/^--mb-/, "").replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** A colour the palette does not offer, so a screen can show the hex itself. */
export const teamColorHex = (raw?: string | null): string | undefined => {
  const value = normalizeTeamColor(raw);
  return HEX_RE.test(value) ? value.toUpperCase() : undefined;
};

/**
 * The colour a NEW team is given.
 *
 * It was `TEAM_ACCENTS[Math.floor(Math.random() * TEAM_ACCENTS.length)]`:
 * opening the dialog three times offered Rose, then Plum, then Navy, for the
 * same team, before a character had been typed. A dice roll is the wrong shape
 * for an identity — it cannot be predicted, cannot be tested, and gives the
 * second team a 1-in-6 chance of being confusable with the first.
 *
 * The least-used ink wins, ties broken by palette order, so an empty account
 * walks Navy → Teal → Plum → Rose → Lilac → Ochre and only then repeats. Six
 * teams in, no two share a colour; and the answer is a pure function of the
 * roster, which is what makes the dialog testable.
 */
export const nextTeamColor = (
  taken: ReadonlyArray<string | undefined | null>
): TeamColorId => {
  const used = new Map<TeamColorId, number>(TEAM_COLOR_IDS.map((id) => [id, 0]));
  for (const entry of taken) {
    const value = normalizeTeamColor(entry);
    if (isTeamColorId(value)) used.set(value, (used.get(value) ?? 0) + 1);
  }
  let best: TeamColorId = TEAM_COLOR_IDS[0];
  for (const id of TEAM_COLOR_IDS) {
    if ((used.get(id) ?? 0) < (used.get(best) ?? 0)) best = id;
  }
  return best;
};
