"use client";

import { MbButton } from "@/components/matchbook/Button";
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

/* ===========================================================================
   ADVANCED SETTINGS

   Three changes of substance from the panel this replaces:

   1. It renders for ALL FIVE formats. It used to gate on three, so a bracket
      competition could never rename its venue even though `terminology`
      applies to every format (brief §2.4 defect 6).
   2. `venuePlural` is a real, editable field seeded from `pluralise()`. It was
      `venueName + "s"`, which produced "pitchs" and "boxs".
   3. Nothing is behind a disclosure. The panel is five controls; the commit
      bar is sticky, so hiding them buys no reach and costs a state where the
      user cannot see what they configured (invariant 36).

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

  return (
    <Panel
      title="Advanced Settings"
      tone="navy"
      icon="settings"
      meta={
        <span className="matchbook-display text-[0.66rem] font-bold tracking-[0.16em] text-mb-paper-bright">
          {customised ? "Customised" : "Defaults"}
        </span>
      }
    >
      {standingsPoints ? (
        <>
          <div className="border-b border-mb-rule px-4 py-3">
            <span
              className={MB_FIELD_LABEL.className}
              style={MB_FIELD_LABEL.style}
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
        <p className="border-b border-mb-rule px-4 py-3 text-[0.78rem] leading-snug text-mb-ink-muted">
          {FORMAT_META[format].label} does not keep a standings table, so points
          per result do not apply to it.
        </p>
      )}

      <div className="flex flex-col gap-4 px-4 py-4">
        <div>
          <span className={MB_FIELD_LABEL.className} style={MB_FIELD_LABEL.style}>
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
          className="self-start"
        >
          Reset to defaults
        </MbButton>
      </div>
    </Panel>
  );
};
