"use client";

import { useId, useState } from "react";
import { MbButton } from "@/components/matchbook/Button";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { Panel } from "@/components/matchbook/Panel";
import {
  MbField,
  MbNumberStepper,
  MbTextInput,
  MbToggle,
  MB_FIELD_LABEL,
} from "@/components/matchbook/form";
import { FORMAT_META } from "@/components/matchbook/formatMeta";
import { pluralise } from "@/lib/text";
import {
  POINTS_MAX,
  POINTS_MIN,
  type AdvancedSettings,
} from "@/hooks/useNewCompetitionPage";
import type { CompetitionType } from "@/types/game";
import { MB_DORMANT } from "./dormant";

/* ===========================================================================
   ADVANCED SETTINGS

   Three changes of substance from the panel this replaces:

   1. It renders for ALL FIVE formats. It used to gate on three, so a bracket
      competition could never rename its venue even though `terminology`
      applies to every format (brief §2.4 defect 6).
   2. `venuePlural` is a real, editable field seeded from `pluralise()`. It was
      `venueName + "s"`, which produced "pitchs" and "boxs".
   3. It is CLOSED until asked for.

   ---------------------------------------------------- why 3 reversed itself

   This panel used to argue the opposite, in this comment, and the argument
   was sound in isolation: the commit bar is sticky, so hiding controls buys
   no reach, and a disclosure costs a state in which the user cannot see what
   they configured.

   What it did not account for is what the panel is a member of. Measured at
   390x844 on the fixture library, step 3 of a wizard a user reaches within a
   minute of creating their account was **2145px of form**, of which this panel
   was 796px — expanded, by default, on first arrival, ending in a Singular /
   Plural pair of text fields and the sentence "Reads as 'court 1' and
   '2 courts'". A first-time user was being asked to settle noun pluralisation
   before their first match had been scheduled.

   None of it is defaulted wrongly: `DEFAULT_COMPETITION_CONFIG` already says
   3 / 0 / 0, no ties, court / courts. So the whole panel is a set of answers
   the app has already given correctly, presented at the same volume as the one
   question only the user can answer — the name. Closed, it costs one row and
   states what is inside; the head still reads DEFAULTS or CUSTOMISED, so the
   one thing the old argument was protecting — being able to see that you
   changed something — survives at a glance and without scrolling.

   It opens itself when the settings are customised, which is what makes a
   restored draft honest: a wizard that reloads with "CUSTOMISED" in the head
   and the fields hidden would be asking the reader to take its word for it.

   ------------------------------------------------ why the points are ROWS

   They were a `grid gap-3 sm:grid-cols-3` of three `MbNumberStepper`s, and a
   stepper's intrinsic width is 156px — two 46px keys and a 64px figure box.
   Inside an `xl:col-span-5` panel that grid gets 373px at 1280 and 439px at
   1440, so each cell was 116.2px / 138.4px and each stepper overflowed its cell
   by 39.8px / 17.6px. Measured adjacent-key separation: **−25.84px at 1280,
   −13.89px at 1366, −3.61px at 1440** — the WIN "+" key was physically underneath
   the TIE "−" key at the two most common desktop widths, which is charter §4.33
   (a hard fail), not a cosmetic tightness. The three `.mb-field` boxes were each
   clipping 18–40px of their own content with it.

   A stepper cannot be made narrower without taking its keys under the 44px
   floor, so the LAYOUT gives way instead: label left, control right, one ruled
   row each. The stepper then gets its full 156px at every width from 320px up,
   the row uses the horizontal space the stacked version wasted, and the panel
   reads like the ruled rows in `Format Preview` two panels over.
   =========================================================================== */

export interface AdvancedSettingsPanelProps {
  format: CompetitionType;
  settings: AdvancedSettings;
  onChange: (patch: Partial<AdvancedSettings>) => void;
  onReset: () => void;
  customised: boolean;
}

/**
 * One points row: name on the left, stepper on the right, guidance underneath.
 *
 * `MbField` still owns the wiring — the `<label for>`, the hint id and the
 * `aria-describedby` that carries it onto the spinbutton — so this is a layout
 * override of the primitive, not a second field implementation. `.mb-field` is
 * an unlayered `flex-direction: column`, which is why the row direction and the
 * gaps need `!`; `[&>p]:basis-full` is what drops the hint onto its own line
 * instead of leaving it as a third column.
 */
const PointsRow = ({
  id,
  label,
  spoken,
  hint,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  /** Accessible name of the spinbutton — "Win" alone is ambiguous when read. */
  spoken: string;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) => (
  <MbField
    label={label}
    htmlFor={id}
    hint={hint}
    className="flex-row! flex-wrap items-center justify-between gap-x-4! gap-y-1! border-b border-mb-rule px-4 py-3 [&>p]:basis-full"
  >
    <MbNumberStepper
      id={id}
      label={spoken}
      value={value}
      onChange={onChange}
      min={POINTS_MIN}
      max={POINTS_MAX}
      disabled={disabled}
      className="shrink-0"
    />
  </MbField>
);

export const AdvancedSettingsPanel = ({
  format,
  settings,
  onChange,
  onReset,
  customised,
}: AdvancedSettingsPanelProps) => {
  const { standingsPoints } = FORMAT_META[format].supports;
  const venue = settings.venueName.trim() || "court";
  const bodyId = useId();

  /* Lazy initialiser, not an effect: a restored draft that already carries
     custom settings arrives open on the first paint rather than opening on
     the second. After mount the disclosure is the user's — changing a value
     cannot slam it shut, and reverting to the defaults cannot either. */
  const [open, setOpen] = useState(() => customised);

  /** What the closed row says is inside. Format-aware, and complete: a summary
      that omits a block is a summary the reader cannot use to decide whether
      to open the disclosure. */
  const summary = standingsPoints
    ? `Match scoring, standings points and ${venue} wording`
    : `Match scoring and ${venue} wording`;

  return (
    <Panel
      title="Advanced Settings"
      tone="navy"
      icon="settings"
      meta={
        <span className="matchbook-display text-[0.66rem] mb-track-status font-bold text-mb-paper-bright">
          {customised ? "Customised" : "Defaults"}
        </span>
      }
    >
      {/* The disclosure is a row of the panel, not a control in its head: the
          head is navy and already carries two things, and a 44px target inside
          a 44px navy strip would have made it three. `mb-btn-touch` is the
          floor, `mb-row-hover` the same press the ruled rows below it use. */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="mb-btn-touch mb-row-hover flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        {/* The closed row is an ACTION, not a second title.
            It read "Advanced settings" over "… — left at the defaults", eight
            pixels under a panel head already reading "ADVANCED SETTINGS ·
            DEFAULTS": the title twice and the defaults twice, in one 44px
            strip. The verb pair says the same thing about what the control
            does and cannot be mistaken for the head, and the tail comes off
            because the head owns that word.

            And `truncate` comes off with it. Measured at 390px, the summary
            span was 337px of text in a 300px box, so the line ended
            "left at the defau…" — a disclosure summary that cannot finish its
            own sentence tells the reader less than no summary. Two lines that
            wrap cost 18px and clip nothing at 320px. */}
        <span className="flex min-w-0 flex-col gap-1">
          <span className="mb-kicker">
            {open ? "Hide advanced settings" : "Show advanced settings"}
          </span>
          {!open && (
            <span className="text-[0.78rem] leading-snug text-mb-ink-muted">
              {summary}
            </span>
          )}
        </span>
        <MbIcon id={open ? "collapse" : "expand"} size={12} className="shrink-0" />
      </button>

      <div id={bodyId} hidden={!open}>
        {/* WHERE "POINTS TO WIN" WOULD BE, AND WHY IT IS NOT A FIELD.
            A first-run walkthrough went looking for a target score and found
            no field for one anywhere in the wizard. There is none because the
            app has no such concept to configure: `CompetitionConfig`
            (src/types/competition-config.ts) carries points per RESULT and
            terminology and nothing else, `Match` carries two running scores
            and a status, and `useMatchPage.handleCompleteMatch` decides the
            winner by comparing those two scores at the moment the user
            presses Complete — it never compares either of them against a
            threshold. A "points to win" input here would therefore write a
            number that no code reads, which is worse than the gap: a setting
            that lies. Adding the capability means changing the match model
            and the completion path, and that path is marked BLACK BOX by
            charter W5 acceptance 1.
            So the wizard answers the question in the one place a user hunting
            for a scoring setting will open, in a sentence rather than a
            control. */}
        {/* `border-t`, not `border-y`: every block below opens with its own
            top rule, and two adjacent hairlines draw one 2px line that belongs
            to no tier. */}
        <div className="border-t border-mb-rule px-4 py-3">
          <span className={MB_FIELD_LABEL.className}>
            Match score
          </span>
          <p className="mt-1 text-[0.78rem] leading-snug text-mb-ink-muted">
            There is no target score to set. You keep the score as you play and
            the match ends when you complete it, whatever the score is then.
          </p>
        </div>

        {standingsPoints ? (
          <>
            <div className="border-y border-mb-rule px-4 py-3">
              <span
                className={MB_FIELD_LABEL.className}
              >
                Standings points
              </span>
              <p className="mt-1 text-[0.78rem] leading-snug text-mb-ink-muted">
                Awarded per result when the table is calculated.
              </p>
            </div>

            {/* Each stepper carries a VISIBLE label. `MbNumberStepper`'s own
                `label` is an accessible name only — three bare figures reading
                3 / 0 / 0 tell a sighted user nothing about which is which. */}
            <PointsRow
              id="points-win"
              label="Win"
              spoken="Points for a win"
              value={settings.pointsForWin}
              onChange={(value) => onChange({ pointsForWin: value })}
            />
            <PointsRow
              id="points-tie"
              label="Tie"
              spoken="Points for a tie"
              /* The one place this is said, and it is said beside the disabled
                 control rather than as a fourth notice in the panel. */
              hint={
                settings.allowTies
                  ? undefined
                  : "Turn on Allow ties below to award points for a drawn match."
              }
              value={settings.pointsForTie}
              onChange={(value) => onChange({ pointsForTie: value })}
              disabled={!settings.allowTies}
            />
            <PointsRow
              id="points-loss"
              label="Loss"
              spoken="Points for a loss"
              value={settings.pointsForLoss}
              onChange={(value) => onChange({ pointsForLoss: value })}
            />

            <div className="border-b border-mb-rule px-4 py-3">
              <MbToggle
                checked={settings.allowTies}
                onChange={(checked) => onChange({ allowTies: checked })}
                label="Allow ties"
                hint="Enable if a match can end level."
              />
            </div>
          </>
        ) : (
          <p className="border-y border-mb-rule px-4 py-3 text-[0.78rem] leading-snug text-mb-ink-muted">
            {FORMAT_META[format].label} does not keep a standings table, so points
            per result do not apply to it.
          </p>
        )}

        <div className="flex flex-col gap-4 px-4 py-4">
          <div>
            <span className={MB_FIELD_LABEL.className}>
              Venue wording
            </span>
            <p className="mt-1 text-[0.78rem] leading-snug text-mb-ink-muted">
              Every screen that names a playing surface uses these two words.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <MbField label="Singular" htmlFor="venue-name">
              <MbTextInput
                id="venue-name"
                value={settings.venueName}
                placeholder="court"
                maxLength={24}
                onChange={(event) =>
                  onChange({
                    venueName: event.target.value,
                    venuePlural: pluralise(event.target.value || "court"),
                  })
                }
              />
            </MbField>
            <MbField label="Plural" htmlFor="venue-plural">
              <MbTextInput
                id="venue-plural"
                value={settings.venuePlural}
                placeholder={pluralise(venue)}
                maxLength={28}
                onChange={(event) => onChange({ venuePlural: event.target.value })}
              />
            </MbField>
          </div>
          <p className="text-[0.78rem] text-mb-ink-muted">
            Reads as “{venue} 1” and “2 {settings.venuePlural.trim() || pluralise(venue)}”.
          </p>
          <MbButton
            variant="outline-navy"
            size="sm"
            icon="undo"
            onClick={onReset}
            disabled={!customised}
            className={`self-start ${MB_DORMANT}`}
          >
            Reset to defaults
          </MbButton>
        </div>
      </div>
    </Panel>
  );
};
