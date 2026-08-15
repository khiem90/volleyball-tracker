"use client";

import { useCallback, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { MbButton } from "@/components/matchbook/Button";
import {
  MbDialog,
  MbDialogBody,
  MbDialogFooter,
} from "@/components/matchbook/Dialog";
import { MbNotice } from "@/components/matchbook/Notice";
import { MbSegmented } from "@/components/matchbook/Segmented";
import { MbCheckMark } from "@/components/matchbook/SelectList";
import { TeamMark } from "@/components/matchbook/Panel";
import {
  MbField,
  MbNumberStepper,
  MbSwatchPicker,
  MbTextArea,
  MB_FIELD_LABEL,
} from "@/components/matchbook/form";
import { crestForTeam } from "@/components/matchbook/types";
import { TEAM_BULK_ADD_LABEL } from "@/components/dialogs/team-form/labels";
import { crestNameFor } from "@/components/dialogs/team-form/crest";
import { TEAM_NAME_MAX } from "@/components/dialogs/team-form/useTeamForm";
import {
  DEFAULT_TEAM_COLOR,
  normalizeTeamColor,
  teamColorCss,
  teamColorName,
  TEAM_COLOR_IDS,
} from "@/lib/teamColor";

/* ===========================================================================
   BULK TEAM CREATION

   ------------------------------------------------------- the promise (D1)

   `/teams` advertises this sheet as "Type a list and add a whole roster in one
   go." It could not take a list. It generated "Team 2, Team 3, Team 4" from a
   counter, so a club organiser holding eleven real names was sent to New Team
   eleven times — the single capability the walkers kept asking for, described
   on the page and absent from the dialog.

   It takes a list now, and the list is the DEFAULT mode: a numbered block is
   the special case (a draw with no names yet), not the other way round. The
   counter survives intact beside it because that case is real — five courts,
   no roster — and because deleting it would have broken the wizard's own
   entry point.

   What the parser has to survive, because it is what a paste actually
   contains: blank lines, a trailing comma, tabs out of a spreadsheet, `- `
   bullets, `1.` numbering, wrapping quotes out of a CSV, the same team twice,
   a team the roster already has, and a name longer than the field allows. Each
   one is dropped or repaired and then COUNTED, and the count is printed under
   the box — a silent drop is the one behaviour a bulk importer must not have.
   See `parseTeamList`.

   ------------------------------------------------------- the four old defects

   1. `startNumber` was STATE seeded once by a `useState(() => …)` used as an
      effect. `/teams` mounts this dialog permanently, so the initialiser ran
      on page mount and never again: bulk-add twice and the second batch
      restarted at 1, producing duplicate names. It is derived now.
   2. The preview avatar printed `name.charAt(name.length - 1)` — the LAST
      character, so "Team 12" previewed as "2". The preview is the real crest
      the app will draw.
   3. Group / Side lettering was `String.fromCharCode(64 + n)`, which produces
      "[" at 27. It carries past Z now.
   4. A scheme's `colors` were the palette's CSS **expressions**, and
      `onAddTeams` handed them straight to the reducer. Quick-adding five teams
      wrote `Team 3 :: color-mix(in oklab, var(--mb-navy) 55%, var(--mb-green))`
      into localStorage and into every share link made from it. A scheme now
      carries ink **ids** (`"teal"`), which is what `PersistentTeam.color` is
      for; `teamColorCss()` turns one into paint at the two places this file
      paints. See `@/lib/teamColor`.

   The eight colour presets were 64 literal hex values (invariant 10). They are
   re-keyed onto the team palette in `form.tsx` — five named schemes plus a
   single-colour custom, every one of them resolving through `--mb-*`. Those
   schemes used to be sorted by temperature: "Warm" was coral, gold and red,
   which is Draft, Loss and the app's own accent handed out as identity to
   three teams in one click. The palette they draw from no longer contains a
   status colour at all, and the two mixed schemes are now split by weight —
   the darker inks against the lighter ones — a distinction that survives on a
   bracket printed in greyscale.
   =========================================================================== */

const TEAM_COUNT_MIN = 2;
const TEAM_COUNT_MAX = 16;

/**
 * The ceiling on one pasted batch.
 *
 * Higher than the stepper's 16, which is a *typing* limit — nobody thumbs a
 * stepper to 48 — where this is a PASTE limit and 48 is the roster size the
 * charter already stress-tests the wizard's team list at. Anything past it is
 * reported rather than dropped in silence.
 */
export const QUICK_ADD_MAX = 48;

/** The six ink ids, named. Destructured from the tuple so a scheme cannot
 *  name an ink the palette does not have. */
const [NAVY, TEAL, PLUM, ROSE, LILAC, OCHRE] = TEAM_COLOR_IDS;

interface ColourScheme {
  id: string;
  name: string;
  description: string;
  /** Ink ids, in the order teams take them. Never CSS. */
  colors: string[];
}

const COLOUR_SCHEMES: ColourScheme[] = [
  {
    id: "house",
    name: "House",
    description: "Every team ink, in order.",
    colors: [...TEAM_COLOR_IDS],
  },
  {
    id: "deep",
    name: "Deep",
    description: "Navy, teal and plum — the three darkest inks.",
    colors: [NAVY, TEAL, PLUM],
  },
  {
    id: "light",
    name: "Light",
    description: "Rose, lilac and ochre — the three lightest inks.",
    colors: [ROSE, LILAC, OCHRE],
  },
  {
    id: "sides",
    name: "Two sides",
    description: "Alternating navy and rose, for head-to-head draws.",
    colors: [NAVY, ROSE],
  },
  {
    id: "mono",
    name: "Uniform",
    description: "Every team the same navy.",
    colors: [NAVY],
  },
];

const NAMING_STYLES = [
  { id: "team", prefix: "Team", letters: false },
  { id: "squad", prefix: "Squad", letters: false },
  { id: "group", prefix: "Group", letters: true },
  { id: "court", prefix: "Court", letters: false },
  { id: "side", prefix: "Side", letters: true },
] as const;

/** 1 → A, 26 → Z, 27 → AA. The old `fromCharCode(64 + n)` printed "[" at 27. */
export const columnLetters = (n: number): string => {
  let value = Math.max(1, Math.floor(n));
  let out = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    out = String.fromCharCode(65 + remainder) + out;
    value = Math.floor((value - 1) / 26);
  }
  return out;
};

/* ---------------------------------------------------------------------------
   READING A PASTED ROSTER

   Separators: newline, comma, semicolon and TAB — a column copied out of a
   spreadsheet arrives newline-separated, a row arrives tab-separated, and a
   list retyped by hand arrives with commas. The class is greedy, so ",,",
   "\r\n" and a blank line between two names are one separator rather than an
   empty team.

   Two prefixes are stripped, on different rules, and the difference is the
   whole reason this is a function rather than a `.split()`:

     bullets   `- Comets`, `• Comets`, `* Comets` — always. No club is named
               with a leading dash and a space.
     numbering `1. Comets`, `2) Comets` — only when at least two entries carry
               one AND their figures ASCEND. That is what a numbered list is,
               and it is what "1. FC Köln" is not: alone it survives whole, and
               beside "1. FC Nürnberg" the two 1s do not ascend, so both keep
               their names. The first draft of this rule required EVERY entry to
               be numbered, which one pasted line holding two comma-separated
               names was enough to defeat — measured on a seven-line paste, all
               seven teams were created as "1. Coastal Comets", "2. Riverside
               Rockets" and so on, and the duplicate at the end went undetected
               because "1. Coastal Comets" and "7. coastal comets" are not the
               same string.

   Everything dropped is counted and printed. `duplicates` compares
   case-insensitively against earlier lines AND against the roster, which is
   the check the numbered mode gets for free by counting from where the roster
   ends and the paste path has no way to do for itself.
   --------------------------------------------------------------------------- */

const LIST_SPLIT = /[\n\r,;\t]+/;
const BULLET = /^[-–—•*]+\s+/;
const NUMBERED_ITEM = /^(\d{1,3})[.)]\s+/;
const WRAPPING_QUOTES = /^["'“‘](.*)["'”’]$/;

const nameKey = (value: string) => value.trim().toLowerCase();

/** True when these entries read as an ordered list rather than as names. */
const isNumberedList = (entries: readonly string[]): boolean => {
  const figures = entries
    .map((entry) => NUMBERED_ITEM.exec(entry))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => Number(match[1]));
  if (figures.length < 2) return false;
  return figures.every((value, index) => index === 0 || value > figures[index - 1]);
};

export interface QuickAddParse {
  /** Accepted, in the order they were typed. */
  names: string[];
  /** Dropped: a repeat of an earlier line, or of a team that already exists. */
  duplicates: string[];
  /** Dropped: empty entries — a trailing comma, a stray bullet, a blank line. */
  blanks: number;
  /** Cut to `TEAM_NAME_MAX`, which is what the single-team sheet allows. */
  shortened: number;
  /** Dropped: past `max`. */
  overflow: number;
}

export const parseTeamList = (
  raw: string,
  options: { existing?: readonly string[]; max?: number } = {}
): QuickAddParse => {
  const max = options.max ?? QUICK_ADD_MAX;
  const empty: QuickAddParse = {
    names: [],
    duplicates: [],
    blanks: 0,
    shortened: 0,
    overflow: 0,
  };
  if (!raw.trim()) return empty;

  const parts = raw.split(LIST_SPLIT).map((part) => part.trim());
  const entries = parts.filter((part) => part.length > 0);

  const numbered = isNumberedList(entries);

  const seen = new Set((options.existing ?? []).map(nameKey));
  const result: QuickAddParse = {
    names: [],
    duplicates: [],
    blanks: parts.length - entries.length,
    shortened: 0,
    overflow: 0,
  };

  for (const entry of entries) {
    let name = entry.replace(BULLET, "");
    if (numbered) name = name.replace(NUMBERED_ITEM, "");
    const unquoted = WRAPPING_QUOTES.exec(name.trim());
    if (unquoted) name = unquoted[1];
    name = name.replace(/\s+/g, " ").trim();

    if (!name) {
      result.blanks += 1;
      continue;
    }
    if (name.length > TEAM_NAME_MAX) {
      name = name.slice(0, TEAM_NAME_MAX).trim();
      result.shortened += 1;
    }
    const key = nameKey(name);
    if (seen.has(key)) {
      result.duplicates.push(name);
      continue;
    }
    if (result.names.length >= max) {
      result.overflow += 1;
      continue;
    }
    seen.add(key);
    result.names.push(name);
  }
  return result;
};

export interface QuickAddPlan {
  name: string;
  color: string;
}

/** The mark a reader actually sees: which crest, in which ink. */
export const teamMarkKey = (name: string, color: string) =>
  `${crestForTeam(name, name)}|${normalizeTeamColor(color)}`;

/* ---------------------------------------------------------------------------
   WHICH INK EACH TEAM TAKES

   The rule is the ORDINAL, not the index within this batch: the sheet promises
   "numbering continues from the teams you already have", and the colour cycle
   has to continue with it or a second quick-add of four starts the House
   scheme over and Team 5 comes out navy beside Team 1. With `start` at 1 this
   is exactly the old `index % length`.

   ONE deviation, and only where there is room for it (D2). The pack holds
   eight crests and `crestForTeam` picks by name, so a numbered run gets eight
   different crests but a PASTED roster of real names does not — measured, five
   arbitrary names repeat a crest 78.4% of the time, which is the birthday
   bound over eight designs and not a fixable hash. What can be made distinct
   is the MARK: crest plus ink. When the ordinal's ink would reproduce a mark
   this batch or the roster already carries, the next ink in the same scheme is
   taken instead.

   It fires only for schemes of three inks or more, because in a two-ink or
   one-ink scheme the sequence IS the information — "alternating navy and rose,
   for head-to-head draws" is a promise about which side a team is on, and no
   duplicate mark is worth breaking it. Those schemes surface the collision in
   the preview instead.

   Measured: zero deviations across every numbered batch of 8 at starts 1–60
   for all five naming styles (the crest already rotates with the ordinal
   there), so the numbered path is bit-for-bit what it was.
   --------------------------------------------------------------------------- */
export const buildQuickAddPlan = (options: {
  count: number;
  start: number;
  naming: string;
  /** Ink ids. Whatever goes in comes out — the plan is what gets stored. */
  colors: string[];
  /** Explicit names (the paste path). Supersedes `count` and `naming`. */
  names?: readonly string[];
  /** Marks already on the roster, from `teamMarkKey`. */
  taken?: Iterable<string>;
}): QuickAddPlan[] => {
  const style =
    NAMING_STYLES.find((entry) => entry.id === options.naming) ?? NAMING_STYLES[0];
  const palette =
    options.colors.length > 0 ? options.colors : [DEFAULT_TEAM_COLOR];

  const names =
    options.names ??
    Array.from({ length: Math.max(0, options.count) }, (_, index) => {
      const ordinal = options.start + index;
      return `${style.prefix} ${style.letters ? columnLetters(ordinal) : ordinal}`;
    });

  const used = new Set(options.taken ?? []);

  return names.map((name, index) => {
    const ordinal = options.start + index;
    const first = (ordinal - 1) % palette.length;
    let color = palette[first];
    if (palette.length >= 3) {
      for (let step = 0; step < palette.length; step++) {
        const candidate = palette[(first + step) % palette.length];
        if (!used.has(teamMarkKey(name, candidate))) {
          color = candidate;
          break;
        }
      }
    }
    used.add(teamMarkKey(name, color));
    return { name, color };
  });
};

/** The first pair of teams in `plan` that will wear the same crest AND ink. */
export const firstMarkClash = (
  plan: QuickAddPlan[]
): [QuickAddPlan, QuickAddPlan] | null => {
  const seen = new Map<string, QuickAddPlan>();
  for (const entry of plan) {
    const key = teamMarkKey(entry.name, entry.color);
    const prior = seen.get(key);
    if (prior) return [prior, entry];
    seen.set(key, entry);
  }
  return null;
};

type QuickAddMode = "list" | "block";

const MODE_OPTIONS = [
  { value: "list", label: "Paste list" },
  { value: "block", label: "Numbered" },
];

const LIST_PLACEHOLDER = "Coastal Comets\nRiverside Rockets\nHarbour Hawks";

interface QuickAddTeamsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTeams: (teams: QuickAddPlan[]) => void;
  existingTeamCount: number;
}

export const QuickAddTeams = ({
  open,
  onOpenChange,
  onAddTeams,
  existingTeamCount,
}: QuickAddTeamsProps) => {
  const { state } = useApp();
  const [mode, setMode] = useState<QuickAddMode>("list");
  const [pasted, setPasted] = useState("");
  const [teamCount, setTeamCount] = useState(4);
  const [scheme, setScheme] = useState(COLOUR_SCHEMES[0].id);
  const [naming, setNaming] = useState<string>(NAMING_STYLES[0].id);
  /* Stored form, like every other colour in the plan: an ink id, or a hex
     once the picker's custom escape hatch is used. */
  const [customColor, setCustomColor] = useState<string>(DEFAULT_TEAM_COLOR);

  /* Derived, never stored — see the note at the top of the file. */
  const start = existingTeamCount + 1;

  /** The roster, as the two things a paste has to be checked against. */
  const existingNames = useMemo(
    () => state.teams.map((team) => team.name),
    [state.teams]
  );
  const existingMarks = useMemo(
    () => state.teams.map((team) => teamMarkKey(team.name, team.color ?? "")),
    [state.teams]
  );

  const colors = useMemo(() => {
    if (scheme === "custom") return [customColor];
    return (
      COLOUR_SCHEMES.find((entry) => entry.id === scheme) ?? COLOUR_SCHEMES[0]
    ).colors;
  }, [scheme, customColor]);

  const parsed = useMemo(
    () => parseTeamList(pasted, { existing: existingNames }),
    [pasted, existingNames]
  );

  const plan = useMemo(
    () =>
      buildQuickAddPlan({
        count: teamCount,
        start,
        naming,
        colors,
        names: mode === "list" ? parsed.names : undefined,
        taken: existingMarks,
      }),
    [mode, parsed.names, teamCount, start, naming, colors, existingMarks]
  );

  const clash = useMemo(() => firstMarkClash(plan), [plan]);

  /** What the paste threw away, in one line, or null when it threw nothing. */
  const dropped = useMemo(() => {
    const parts: string[] = [];
    if (parsed.duplicates.length > 0)
      parts.push(
        `${parsed.duplicates.length} already listed (${parsed.duplicates
          .slice(0, 3)
          .join(", ")}${parsed.duplicates.length > 3 ? "…" : ""})`
      );
    if (parsed.blanks > 0) parts.push(`${parsed.blanks} empty`);
    if (parsed.shortened > 0)
      parts.push(`${parsed.shortened} shortened to ${TEAM_NAME_MAX} characters`);
    if (parsed.overflow > 0)
      parts.push(`${parsed.overflow} past the ${QUICK_ADD_MAX}-team limit`);
    return parts.length > 0 ? parts.join(" · ") : null;
  }, [parsed]);

  const handleCreate = useCallback(() => {
    if (plan.length === 0) return;
    onAddTeams(plan);
    onOpenChange(false);
    setPasted("");
    setTeamCount(4);
  }, [plan, onAddTeams, onOpenChange]);

  return (
    <MbDialog
      open={open}
      onOpenChange={onOpenChange}
      title={TEAM_BULK_ADD_LABEL}
      icon="import"
      kicker="Team directory"
      size="lg"
      description="Add a whole roster in one go — paste the names you already have, or generate a numbered block."
    >
      <MbDialogBody className="flex flex-col gap-5">
        <div className="flex flex-col gap-2.5">
          <span
            className={MB_FIELD_LABEL.className}
            id="quick-add-mode-label"
          >
            How to add them
          </span>
          <MbSegmented
            name="quick-add-mode"
            aria-labelledby="quick-add-mode-label"
            value={mode}
            onChange={(next) => setMode(next as QuickAddMode)}
            options={MODE_OPTIONS}
            columns={{ base: 2, sm: 2 }}
          />
        </div>

        {mode === "list" ? (
          /* No `initialFocus` on the textarea, for the same reason the stepper
             declines it below: below `sm` this dialog is a bottom sheet, and
             opening focus into a text control raises the on-screen keyboard
             over the sheet before the reader has read a word of it. */
          <div className="flex flex-col gap-2.5">
            <MbField
              label="Team names"
              htmlFor="quick-add-names"
              hint="One per line. Commas, tabs, bullets and numbering are all read."
            >
              <MbTextArea
                id="quick-add-names"
                value={pasted}
                onChange={(event) => setPasted(event.target.value)}
                placeholder={LIST_PLACEHOLDER}
                rows={6}
                autoComplete="off"
                spellCheck={false}
              />
            </MbField>
            <p className="text-[0.78rem] text-mb-ink-muted tabular-nums">
              {parsed.names.length === 0
                ? "No names read yet — paste or type one team per line."
                : `${parsed.names.length} ${
                    parsed.names.length === 1 ? "name" : "names"
                  } read.`}
              {dropped && ` Skipped: ${dropped}.`}
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2.5">
              <span className={MB_FIELD_LABEL.className}>
                How many teams
              </span>
              {/* No `initialFocus` here, and that is a decision rather than an
                  omission. The count is the first thing a reader changes, so the
                  stepper looks like the right landing place — but it is a text
                  input that selects its own contents on focus, so aiming the
                  dialog's opening focus at it raises the on-screen keyboard over
                  the sheet before the reader has read a word of it, and paints a
                  selection highlight over the figure. `TeamForm` can afford that
                  because typing the name IS the first action there; here the first
                  action is a ± key or a scheme row, both of which are one Tab
                  away. */}
              <MbNumberStepper
                label="Teams to create"
                value={teamCount}
                onChange={setTeamCount}
                min={TEAM_COUNT_MIN}
                max={TEAM_COUNT_MAX}
                size="lg"
                suffix=" teams"
              />
              <p className="text-[0.78rem] text-mb-ink-muted tabular-nums">
                Numbering starts at {start}.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <span
                className={MB_FIELD_LABEL.className}
                id="quick-add-naming-label"
              >
                Naming style
              </span>
              {/* Five columns at every width — a count that divides the options
                  exactly. `.mb-segmented`'s ground is navy, so `base: 2` or
                  `base: 3` leaves a half-filled row that paints an empty navy cell
                  reading as a sixth, broken option. Measured at 390px: five cells
                  of 71px leave 47px of text box against ~43px for "SQUAD". */}
              <MbSegmented
                name="quick-add-naming"
                aria-labelledby="quick-add-naming-label"
                value={naming}
                onChange={setNaming}
                options={NAMING_STYLES.map((style) => ({
                  value: style.id,
                  label: style.prefix,
                }))}
                columns={{ base: NAMING_STYLES.length, sm: NAMING_STYLES.length }}
              />
              <p className="text-[0.78rem] text-mb-ink-muted tabular-nums">
                First two: {plan[0]?.name ?? "—"}, {plan[1]?.name ?? "—"}.
              </p>
            </div>
          </>
        )}

        <div className="flex flex-col gap-2.5">
          <span className={MB_FIELD_LABEL.className}>
            Colour scheme
          </span>
          {/* One column at every width: the old 2-column grid clipped
              "Monochrome" to "Monochrom" at 390px. */}
          <ul
            role="radiogroup"
            aria-label="Colour scheme"
            className="divide-y divide-mb-rule border-y border-mb-rule"
          >
            {[...COLOUR_SCHEMES, { id: "custom", name: "Single colour", description: "Pick one colour for every team.", colors: [customColor] }].map(
              (entry) => {
                const active = scheme === entry.id;
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setScheme(entry.id)}
                      data-selected={active}
                      /* `min-h-14` (56), not `min-h-[52px]`. 52 is not a rung:
                         `MB_CONTROL_HEIGHT` is {44, 48, 56} and this was the
                         only authored control height in the app that sat
                         between two of them. The row carries a crest and two
                         lines, so it takes the `lg` rung rather than being
                         pulled down to `md`. */
                      className={`mb-row-hover flex min-h-14 w-full items-center gap-3 px-2 py-2 text-left ${
                        active ? "mb-rail" : ""
                      }`}
                      style={
                        active
                          ? ({ "--mb-rail-color": "var(--mb-coral)" } as React.CSSProperties)
                          : undefined
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={`inline-grid h-[18px] w-[18px] shrink-0 place-content-center rounded-[2px] border-[1.5px] ${
                          active
                            ? "border-mb-coral-deep bg-mb-coral-deep text-mb-paper-bright"
                            : "border-mb-navy"
                        }`}
                      >
                        {active && <MbCheckMark />}
                      </span>
                      {/* The whole scheme, not the first four of it. The cap
                          was 4 while the "House" row says it carries every
                          team ink — so the one row whose job is to show the
                          full set showed two thirds of it. Six 16px chips and
                          five 3px gaps are 111px, which the row affords at
                          390px (measured: no name truncates). */}
                      <span aria-hidden="true" className="flex shrink-0 items-center gap-[3px]">
                        {entry.colors.map((color, index) => (
                          <span
                            key={`${entry.id}-${index}`}
                            className="block h-4 w-4 rounded-[2px]"
                            style={{ background: teamColorCss(color) }}
                          />
                        ))}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="matchbook-display truncate text-[0.85rem] mb-track-display font-bold">
                          {entry.name}
                        </span>
                        <span className="text-[0.72rem] leading-snug text-mb-ink-muted">
                          {entry.description}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              }
            )}
          </ul>
          {scheme === "custom" && (
            <MbSwatchPicker
              value={teamColorCss(customColor) ?? ""}
              onChange={(next) => setCustomColor(normalizeTeamColor(next))}
              allowCustom
              label="Team colour"
            />
          )}
        </div>

        {/* The one thing a scheme of one or two inks cannot be saved from: two
            teams whose names happen to draw the same crest, in the same ink.
            Said rather than hidden — the reader can rename one, or take a
            scheme with inks to spare (charter D-10: the pack is eight, and
            identity is crest + name + colour together). */}
        {clash && (
          <MbNotice tone="warn" title="Two teams will look alike">
            {clash[0].name} and {clash[1].name} both draw the{" "}
            {crestNameFor(clash[0].name)} crest in {teamColorName(clash[0].color)}.
            A scheme with more inks, or a different name, separates them.
          </MbNotice>
        )}

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <span
              className={MB_FIELD_LABEL.className}
            >
              Preview
            </span>
            <span className="mb-kicker tabular-nums">
              {plan.length} to create
            </span>
          </div>
          {/* No nested scroller: the dialog body is the only one. */}
          {plan.length === 0 ? (
            <p className="border-y border-mb-rule py-3 text-[0.8rem] text-mb-ink-muted">
              Nothing to create yet — the teams you add will be listed here with
              the crest and the ink each one will wear.
            </p>
          ) : (
            <ul className="divide-y divide-mb-rule border-y border-mb-rule">
              {plan.map((entry) => (
                <li
                  key={entry.name}
                  className="flex min-h-[40px] items-center gap-3 py-1.5"
                >
                  <TeamMark
                    team={{ name: entry.name, crest: crestForTeam(entry.name, entry.name) }}
                    accent={teamColorCss(entry.color)}
                    size="sm"
                    className="min-w-0 flex-1"
                  />
                  {/* The crest and the ink, in words. The row distinguished five
                      teams' colours by a 3px bar and nothing else, which is
                      information carried by hue alone (invariant 13) and
                      unreadable on the scheme the reader just chose. Naming the
                      CREST too is D2: a mark you can name is a mark you can
                      check, and it is the only place the pack is legible before
                      the teams exist. */}
                  <span className="mb-kicker shrink-0 text-right">
                    {crestNameFor(entry.name)} · {teamColorName(entry.color)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </MbDialogBody>

      {/* The bare footer every other sheet in the app uses (D3). It carried
          `max-sm:flex-wrap` + `basis-full` on both buttons, which stacked them
          into a 145px two-row block at 390 while New Team, Delete Team and the
          other sixteen `MbDialogFooter`s all painted one 81px row — three
          arrangements inside one family. The reason it was written that way was
          a clipped commit label ("Create 4 tea…"), and the family already has
          an answer for that: the destructive button lets its label WRAP rather
          than re-laying out the row (see `MbDestructiveButton`). Same here. */}
      <MbDialogFooter>
        <MbButton variant="outline-navy" size="lg" onClick={() => onOpenChange(false)}>
          Cancel
        </MbButton>
        <MbButton
          variant="coral"
          size="lg"
          icon="check"
          onClick={handleCreate}
          disabled={plan.length === 0}
        >
          {/* "Create 0 teams" is a count nobody asked for; with nothing parsed
              the button states the action and stays disabled. */}
          {plan.length === 0
            ? "Create teams"
            : plan.length === 1
              ? "Create 1 team"
              : `Create ${plan.length} teams`}
        </MbButton>
      </MbDialogFooter>
    </MbDialog>
  );
};
