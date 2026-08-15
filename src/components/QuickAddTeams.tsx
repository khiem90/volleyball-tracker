"use client";

import { useCallback, useMemo, useState } from "react";
import { MbButton } from "@/components/matchbook/Button";
import {
  MbDialog,
  MbDialogBody,
  MbDialogFooter,
} from "@/components/matchbook/Dialog";
import { MbSegmented } from "@/components/matchbook/Segmented";
import { MbCheckMark } from "@/components/matchbook/SelectList";
import { TeamMark } from "@/components/matchbook/Panel";
import {
  MbNumberStepper,
  MbSwatchPicker,
  MB_FIELD_LABEL,
  MB_SWATCH_PALETTE,
} from "@/components/matchbook/form";
import { crestForTeam } from "@/components/matchbook/types";

/* ===========================================================================
   BULK TEAM CREATION

   Three defects the old dialog shipped, fixed here rather than restyled:

   1. `startNumber` was STATE seeded once by a `useState(() => …)` used as an
      effect. `/teams` mounts this dialog permanently, so the initialiser ran
      on page mount and never again: bulk-add twice and the second batch
      restarted at 1, producing duplicate names. It is derived now.
   2. The preview avatar printed `name.charAt(name.length - 1)` — the LAST
      character, so "Team 12" previewed as "2". The preview is the real crest
      the app will draw.
   3. Group / Side lettering was `String.fromCharCode(64 + n)`, which produces
      "[" at 27. It carries past Z now.

   The eight colour presets were 64 literal hex values (invariant 10). They are
   re-keyed onto the team palette in `form.tsx` — five named schemes plus a
   single-colour custom, every one of them resolving through `--mb-*`.

   Those schemes used to be sorted by temperature: "Warm" was coral, gold and
   red, which is Draft, Loss and the app's own accent handed out as identity to
   three teams in one click. The palette they draw from no longer contains a
   status colour at all (see `MB_SWATCH_PALETTE`), and the two mixed schemes
   are now split by weight — the darker inks against the lighter ones — which
   is a distinction that survives on a bracket printed in greyscale.
   =========================================================================== */

const TEAM_COUNT_MIN = 2;
const TEAM_COUNT_MAX = 16;

const TOKEN = Object.fromEntries(
  MB_SWATCH_PALETTE.map((swatch) => [swatch.label.toLowerCase(), swatch.value])
) as Record<string, string>;

interface ColourScheme {
  id: string;
  name: string;
  description: string;
  colors: string[];
}

const COLOUR_SCHEMES: ColourScheme[] = [
  {
    id: "house",
    name: "House",
    description: "All six team inks, in order.",
    colors: MB_SWATCH_PALETTE.map((swatch) => swatch.value),
  },
  {
    id: "deep",
    name: "Deep",
    description: "Navy, teal and plum — the three darkest inks.",
    colors: [TOKEN.navy, TOKEN.teal, TOKEN.plum],
  },
  {
    id: "light",
    name: "Light",
    description: "Rose, lilac and ochre — the three lightest inks.",
    colors: [TOKEN.rose, TOKEN.lilac, TOKEN.ochre],
  },
  {
    id: "sides",
    name: "Two sides",
    description: "Alternating navy and rose, for head-to-head draws.",
    colors: [TOKEN.navy, TOKEN.rose],
  },
  {
    id: "mono",
    name: "Uniform",
    description: "Every team the same navy.",
    colors: [TOKEN.navy],
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

export interface QuickAddPlan {
  name: string;
  color: string;
}

/**
 * Pure, and exported so the numbering rule can be pinned by a test: the
 * regression this dialog shipped was entirely in how `start` was obtained.
 */
export const buildQuickAddPlan = (options: {
  count: number;
  start: number;
  naming: string;
  colors: string[];
}): QuickAddPlan[] => {
  const style =
    NAMING_STYLES.find((entry) => entry.id === options.naming) ?? NAMING_STYLES[0];
  const palette = options.colors.length > 0 ? options.colors : [TOKEN.navy];

  return Array.from({ length: Math.max(0, options.count) }, (_, index) => {
    const ordinal = options.start + index;
    return {
      name: `${style.prefix} ${style.letters ? columnLetters(ordinal) : ordinal}`,
      color: palette[index % palette.length],
    };
  });
};

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
  const [teamCount, setTeamCount] = useState(4);
  const [scheme, setScheme] = useState(COLOUR_SCHEMES[0].id);
  const [naming, setNaming] = useState<string>(NAMING_STYLES[0].id);
  const [customColor, setCustomColor] = useState(TOKEN.navy);

  /* Derived, never stored — see the note at the top of the file. */
  const start = existingTeamCount + 1;

  const colors = useMemo(() => {
    if (scheme === "custom") return [customColor];
    return (
      COLOUR_SCHEMES.find((entry) => entry.id === scheme) ?? COLOUR_SCHEMES[0]
    ).colors;
  }, [scheme, customColor]);

  const plan = useMemo(
    () => buildQuickAddPlan({ count: teamCount, start, naming, colors }),
    [teamCount, start, naming, colors]
  );

  const handleCreate = useCallback(() => {
    onAddTeams(plan);
    onOpenChange(false);
    setTeamCount(4);
  }, [plan, onAddTeams, onOpenChange]);

  return (
    <MbDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Quick add teams"
      icon="import"
      kicker="Team directory"
      size="lg"
      description="Create a numbered block of teams in one go. Numbering continues from the teams you already have."
    >
      <MbDialogBody className="flex flex-col gap-5">
        <div className="flex flex-col gap-2.5">
          <span className={MB_FIELD_LABEL.className} style={MB_FIELD_LABEL.style}>
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
            style={MB_FIELD_LABEL.style}
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

        <div className="flex flex-col gap-2.5">
          <span className={MB_FIELD_LABEL.className} style={MB_FIELD_LABEL.style}>
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
                      className={`mb-row-hover flex min-h-[52px] w-full items-center gap-3 px-2 py-2 text-left ${
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
                      <span aria-hidden="true" className="flex shrink-0 items-center gap-[3px]">
                        {entry.colors.slice(0, 4).map((color, index) => (
                          <span
                            key={`${entry.id}-${index}`}
                            className="block h-4 w-4 rounded-[2px]"
                            style={{ background: color }}
                          />
                        ))}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="matchbook-display truncate text-[0.85rem] font-bold tracking-[0.05em]">
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
              value={customColor}
              onChange={setCustomColor}
              allowCustom
              label="Team colour"
            />
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <span
              className={MB_FIELD_LABEL.className}
              style={MB_FIELD_LABEL.style}
            >
              Preview
            </span>
            <span className="mb-kicker tabular-nums">
              {teamCount} to create
            </span>
          </div>
          {/* No nested scroller: the dialog body is the only one. */}
          <ul className="divide-y divide-mb-rule border-y border-mb-rule">
            {plan.map((entry) => (
              <li
                key={entry.name}
                className="flex min-h-[40px] items-center gap-3 py-1.5"
              >
                <TeamMark
                  team={{ name: entry.name, crest: crestForTeam(entry.name, entry.name) }}
                  accent={entry.color}
                  size="sm"
                  className="min-w-0 flex-1"
                />
              </li>
            ))}
          </ul>
        </div>
      </MbDialogBody>

      {/* The footer stacks below `sm`. Sharing a 390px row, "Create 4 teams"
          had 89px of text box and rendered "Create 4 tea…" — and the commit
          verb is the one label in a dialog that must never be clipped. Wrapped,
          the primary takes a full-width row nearest the thumb. */}
      <MbDialogFooter className="max-sm:flex-wrap">
        <MbButton
          variant="outline-navy"
          size="lg"
          onClick={() => onOpenChange(false)}
          className="max-sm:basis-full!"
        >
          Cancel
        </MbButton>
        <MbButton
          variant="coral"
          size="lg"
          icon="check"
          onClick={handleCreate}
          className="max-sm:basis-full!"
        >
          Create {teamCount} teams
        </MbButton>
      </MbDialogFooter>
    </MbDialog>
  );
};
