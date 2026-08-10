"use client";

import type { ReactNode } from "react";
import { MbButton } from "@/components/matchbook/Button";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { MbSegmented } from "@/components/matchbook/Segmented";
import { Panel } from "@/components/matchbook/Panel";
import {
  MbField,
  MbTextInput,
  MB_FIELD_LABEL,
} from "@/components/matchbook/form";
import { FORMAT_META } from "@/components/matchbook/formatMeta";
import type {
  MbPreviewBasis,
  MbPreviewLine,
} from "@/components/matchbook/useMatchbookNewCompetition";
import { pluralise } from "@/lib/text";
import type { AdvancedSettings } from "@/hooks/useNewCompetitionPage";
import type { CompetitionType } from "@/types/game";
import { AdvancedSettingsPanel } from "./AdvancedSettingsPanel";
import { FormatPreviewPanel } from "./FormatPreviewPanel";

/* ===========================================================================
   STEP 3 — DETAILS

   A two-column setup sheet, not a 448px centred stack. The format summary
   carries the FORMAT'S OWN mark: the old sheet rendered a generic trophy, so
   picking "Win 2 & Out" with a crown showed a trophy on the next screen.

   `Format Preview` returns here as a third panel — it is the last chance to
   see what the competition will actually contain before it exists.

   ------------------------------------------------- where the preview sits

   Whichever column is shorter ends in a void, and which column that is depends
   entirely on `standingsPoints`. Measured panel heights at 1440:

     format                Event Details   Advanced Settings   void
     round_robin                 382             672           290px under EVENT DETAILS
     single_elimination          382             369            13px
     two_match_rotation          501             369           132px under ADVANCED

   Only the standings-points formats have a right column tall enough to leave a
   hole beside it, and only they have somewhere to put one: the preview moves
   into the LEFT column under `Event Details` and `Advanced Settings` spans both
   rows, which measures 724 against 672 — a 52px difference instead of 290. For
   every other format the right column is already the short one, so the preview
   stays a full-width third row where it cannot make that worse (moving it into
   the left column unconditionally measured a 355px void on single elimination
   and 521px on two-match rotation — a fixed layout is what produced the defect
   in the first place, at the other end).

   The DOM order is the same either way — details, preview, settings — so the
   reading order runs down the left column and then into the right, and the
   phone stacks name → what it will generate → optional configuration.
   =========================================================================== */

const SCORING_OPTIONS = [
  { value: "points", label: "Score points" },
  { value: "instant", label: "Instant win" },
];

/**
 * The label above a segmented group.
 *
 * `MbField` cannot do this job: it renders `<label htmlFor>`, and a
 * `<label for>` may only point at a labelable element — a radiogroup is not
 * one, so the group has to be named by `aria-labelledby` against a plain span.
 * Written out three times it was three chances to drift; written once it is the
 * same treatment as every `MbField` label on the screen, because both read the
 * same exported `MB_FIELD_LABEL`.
 *
 * HANDOFF (W1): the kit has no `MbFieldGroup` — a field wrapper that names a
 * composite through `aria-labelledby` and still owns the hint and error slots.
 * `MbSegmented`, `MbSwatchPicker` and `MbToggleChip` groups all need it.
 */
const GroupLabel = ({ id, children }: { id: string; children: ReactNode }) => (
  <span id={id} className={MB_FIELD_LABEL.className} style={MB_FIELD_LABEL.style}>
    {children}
  </span>
);

export interface NameStepProps {
  format: CompetitionType;
  competitionName: string;
  nameError: string;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
  onChangeFormat: () => void;
  entryCount: number;

  seriesOptions: { value: string; label: string }[];
  matchSeriesLength: number;
  onSeriesChange: (value: number) => void;

  courtOptionList: { value: string; label: string }[];
  numberOfCourts: number;
  onCourtsChange: (value: number) => void;

  instantWinEnabled: boolean;
  onInstantWinChange: (value: boolean) => void;

  advanced: AdvancedSettings;
  onAdvancedChange: (patch: Partial<AdvancedSettings>) => void;
  onAdvancedReset: () => void;
  advancedCustomised: boolean;

  previewLines: MbPreviewLine[];
  previewBasis: MbPreviewBasis;
}

export const NameStep = ({
  format,
  competitionName,
  nameError,
  onNameChange,
  onSubmit,
  onChangeFormat,
  entryCount,
  seriesOptions,
  matchSeriesLength,
  onSeriesChange,
  courtOptionList,
  numberOfCourts,
  onCourtsChange,
  instantWinEnabled,
  onInstantWinChange,
  advanced,
  onAdvancedChange,
  onAdvancedReset,
  advancedCustomised,
  previewLines,
  previewBasis,
}: NameStepProps) => {
  const meta = FORMAT_META[format];
  const { series, courts, scoringMode, standingsPoints } = meta.supports;
  const venue = advanced.venueName.trim() || "court";
  const playing = Math.min(numberOfCourts * 2, entryCount);
  const queued = Math.max(entryCount - playing, 0);

  /* Whole class strings, never interpolated fragments: Tailwind compiles a
     utility only when its literal text appears in a source file. */
  const previewSpan = standingsPoints
    ? "xl:col-span-7 xl:col-start-1 xl:row-start-2"
    : "xl:col-span-12 xl:col-start-1 xl:row-start-2";
  const settingsSpan = standingsPoints
    ? "xl:col-span-5 xl:col-start-8 xl:row-start-1 xl:row-span-2"
    : "xl:col-span-5 xl:col-start-8 xl:row-start-1";

  return (
    <>
      <div className="xl:col-span-7 xl:col-start-1 xl:row-start-1">
        <Panel title="Event Details" icon="clipboard">
          <div className="flex flex-col gap-4 px-4 py-4">
            <MbField
              label="Competition name"
              htmlFor="competition-name"
              hint="Shown on every scoreboard, share link and summary."
              error={nameError || undefined}
              required
            >
              <MbTextInput
                id="competition-name"
                value={competitionName}
                onChange={(event) => onNameChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSubmit();
                  }
                }}
                placeholder="e.g. Summer Tournament 2026"
                maxLength={60}
                autoComplete="off"
                icon="compete"
                /* No `autoFocus`. It was there and it never fired: the route's
                   own step effect focuses the visually-hidden step heading on
                   every advance, it runs after the input mounts, and the
                   measured `document.activeElement` on arriving at step 3 was
                   `H2#wizard-step-heading` every time. Two focus authorities
                   racing is a bug whichever one wins, and the heading is the
                   one that also announces the step; on a phone, autofocusing a
                   text field would open the keyboard over the form as well. */
              />
            </MbField>

            {/* Format summary — the format's own mark, its own name, and the
                way back to change it.

                The disc is styled inline because `.mb-icon-disc` sets
                `border-color` and `color` from UNLAYERED css, which outranks
                every Tailwind colour utility. HANDOFF (W1): there is no
                `MbIconDisc` in the kit, so this shape is authored a third time
                here after `MbChoiceCard` and `MbStat`. */}
            <div className="flex flex-wrap items-center gap-3 border-y border-mb-rule py-3">
              <span
                aria-hidden="true"
                className="mb-icon-disc h-11 w-11 shrink-0"
                style={{ borderColor: "var(--mb-navy)", color: "var(--mb-navy)" }}
              >
                <MbIcon id={meta.icon} size={20} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                {/* `break-words`, never `truncate`: at 320px the truncating
                    version clipped 44px of ink and set "DOUBLE ELIM…" on the
                    one line naming the thing about to be created. */}
                <span className="matchbook-display text-[0.95rem] font-bold tracking-[0.05em] [overflow-wrap:anywhere]">
                  {meta.label}
                </span>
                <span className="mb-kicker tabular-nums">
                  {entryCount} teams entered
                </span>
              </span>
              <MbButton
                variant="outline-navy"
                size="sm"
                icon="undo"
                onClick={onChangeFormat}
                className="shrink-0"
              >
                Change
              </MbButton>
            </div>

            {courts && courtOptionList.length > 1 && (
              <div className="flex flex-col gap-2">
                <GroupLabel id="courts-label">{pluralise(venue)} in play</GroupLabel>
                <MbSegmented
                  name="wizard-courts"
                  aria-labelledby="courts-label"
                  value={String(numberOfCourts)}
                  onChange={(value) => onCourtsChange(Number(value))}
                  options={courtOptionList}
                  columns={{ base: 2, sm: Math.min(courtOptionList.length, 4) }}
                />
                <p className="text-[0.78rem] text-mb-ink-muted tabular-nums">
                  {playing} teams play at once, {queued} in queue.
                </p>
              </div>
            )}

            {scoringMode && (
              <div className="flex flex-col gap-2">
                <GroupLabel id="scoring-label">Scoring mode</GroupLabel>
                <MbSegmented
                  name="wizard-scoring"
                  aria-labelledby="scoring-label"
                  value={instantWinEnabled ? "instant" : "points"}
                  onChange={(value) => onInstantWinChange(value === "instant")}
                  options={SCORING_OPTIONS}
                  columns={{ base: 2, sm: 2 }}
                />
                <p className="text-[0.78rem] text-mb-ink-muted">
                  {instantWinEnabled
                    ? "Tap a team to declare it the winner without keeping score."
                    : "Track points and complete each match manually."}
                </p>
              </div>
            )}

            {series && (
              <div className="flex flex-col gap-2">
                <GroupLabel id="series-label">Matches per matchup</GroupLabel>
                <MbSegmented
                  name="wizard-series"
                  aria-labelledby="series-label"
                  value={String(matchSeriesLength)}
                  onChange={(value) => onSeriesChange(Number(value))}
                  options={seriesOptions}
                  columns={{ base: 2, sm: 4 }}
                />
                <p className="text-[0.78rem] text-mb-ink-muted tabular-nums">
                  {matchSeriesLength === 1
                    ? "One game decides each matchup."
                    : `First to ${Math.ceil(matchSeriesLength / 2)} wins takes the matchup.`}
                </p>
              </div>
            )}
          </div>
        </Panel>
      </div>

      <div className={previewSpan}>
        <FormatPreviewPanel
          format={format}
          lines={previewLines}
          basis={previewBasis}
        />
      </div>

      <div className={settingsSpan}>
        <AdvancedSettingsPanel
          format={format}
          settings={advanced}
          onChange={onAdvancedChange}
          onReset={onAdvancedReset}
          customised={advancedCustomised}
        />
      </div>
    </>
  );
};
