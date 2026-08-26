/* A team colour is a name from a closed set, or a hex a person typed — never
   a CSS expression, and `PersistentTeam.color` may not hold one again (stored
   expressions cannot be named, compared, or migrated). Storage holds the id;
   paint resolves it through `TEAM_COLOR_CSS`, the one copy of the recipes.

   The contract: `normalizeTeamColor` on the way IN, `teamColorCss` before any
   `style`, `teamColorName` before any text node. Painting a stored value raw
   shows CSS-keyword `navy` (not this navy) or nothing at all. */

/** The six inks, in palette order. Ids are the labels lowercased. */
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
 * ink that storage cannot name. Every value resolves through `--mb-*`.
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

/** The colour a team gets when nothing else decides — see `nextTeamColor`. */
export const DEFAULT_TEAM_COLOR: TeamColorId = "navy";

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const TOKEN_RE = /^var\(\s*(--mb-[a-z0-9-]+)\s*\)$/i;

/**
 * Every value the app has ever written into `PersistentTeam.color`, mapped to
 * the ink that survives (saved teams still hold these literal strings). A
 * value not in this table is left exactly as found — a hand-mixed colour is
 * the user's data and is never rewritten.
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
 * What gets written to storage. A palette ink becomes its id; a legacy
 * expression the id it meant; a hex is kept lowercased so spellings compare
 * equal; anything else passes through untouched. Empty in, empty out —
 * "no colour" must stay expressible (it renders as no bar, not a default).
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

/** Same, for readers that must always have an ink. */
export const teamColorCssOrDefault = (raw?: string | null): string =>
  teamColorCss(raw) ?? TEAM_COLOR_CSS[DEFAULT_TEAM_COLOR];

/**
 * What a person is told. No branch of this function may emit `var(` or
 * `color-mix(` — an off-palette token is turned back into words.
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
 * The colour a new team is given: the least-used ink, ties broken by palette
 * order — deterministic in the roster (testable), and six teams in no two
 * share a colour.
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
