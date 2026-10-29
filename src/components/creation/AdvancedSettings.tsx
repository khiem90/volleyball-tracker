"use client";

import { MbIcon } from "@/components/matchbook/MbIcon";
import { CapacityField, DateTimeField } from "@/components/rsvp/RsvpFields";
import {
  ALL_SETTINGS,
  courtTerminology,
  settingsUsedBy,
  type SetupProblems,
  type TournamentSetup,
} from "@/lib/creation";
import type { RsvpSetup } from "@/lib/rsvp";

const COURT_CHOICES = [1, 2, 3, 4];
const SERIES_CHOICES = [1, 3, 5, 7];

/** A row of choices, one of them chosen. Each is thumb-sized. */
const Choice = <T extends string | number | boolean>({
  id,
  label,
  note,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  note?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) => (
  <div className="flex flex-col gap-1.5">
    <span id={`${id}-label`} className="mb-kicker">
      {label}
    </span>
    <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`matchbook-display min-h-11 min-w-11 flex-1 rounded-[4px] border-[1.5px] px-3 text-[0.72rem] font-bold tracking-[0.06em] transition-colors ${
              selected
                ? "border-mb-navy bg-mb-navy text-mb-paper-bright"
                : "border-mb-rule bg-mb-paper-bright text-mb-navy hover:border-mb-navy"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
    {note && <p className="text-[0.72rem] text-mb-ink-muted">{note}</p>}
  </div>
);

const PointsField = ({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) => (
  <label htmlFor={id} className="flex flex-col gap-1.5">
    <span className="mb-kicker">{label}</span>
    <span className="mb-input">
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        max={10}
        value={value}
        onChange={(event) =>
          onChange(Math.max(0, Math.min(10, Number(event.target.value) || 0)))
        }
      />
    </span>
  </label>
);

/**
 * The settings most tournaments never touch, behind one disclosure. Only
 * the ones the chosen format uses are shown; with no format chosen yet,
 * all of them are. The RSVP section closes it: the link, the scheduled
 * time, the open time, and the capacity, with the times entered on this
 * phone's clock.
 */
export const AdvancedSettings = ({
  setup,
  problems,
  open,
  onToggle,
  onChange,
}: {
  setup: TournamentSetup;
  /** The setup's problems, shown under the RSVP fields they concern. */
  problems: SetupProblems;
  open: boolean;
  onToggle: () => void;
  onChange: (changes: Partial<TournamentSetup>) => void;
}) => {
  const used = setup.format ? settingsUsedBy(setup.format) : ALL_SETTINGS;
  const { venue: courtWord, venuePlural: courtWords } = courtTerminology(setup.courtWord);
  const changeRsvp = (changes: Partial<RsvpSetup>) => onChange({ rsvp: { ...setup.rsvp, ...changes } });

  return (
    <section className="mb-panel">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="advanced-settings"
        className={`mb-panel-head min-h-11 w-full text-left ${open ? "" : "border-b-0"}`}
      >
        <span className="matchbook-display flex items-center gap-2 text-[0.95rem] font-bold tracking-[0.05em]">
          <MbIcon id="settings" size={16} />
          Advanced settings
        </span>
        <MbIcon
          id="chevron-down"
          size={13}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div id="advanced-settings" className="flex flex-col gap-5 p-4">
          {used.courts && (
            <Choice
              id="courts"
              label={`${courtWords} in play`}
              note={`Each ${courtWord} needs two teams; the rest wait in the queue.`}
              value={setup.courts}
              options={COURT_CHOICES.map((count) => ({
                value: count,
                label: `${count} ${count === 1 ? courtWord : courtWords}`,
              }))}
              onChange={(courts) => onChange({ courts })}
            />
          )}
          {used.series && (
            <Choice
              id="series"
              label="Each match is"
              value={setup.seriesLength}
              options={SERIES_CHOICES.map((length) => ({
                value: length,
                label: length === 1 ? "One game" : `Best of ${length}`,
              }))}
              onChange={(seriesLength) => onChange({ seriesLength })}
            />
          )}
          {used.instantWin && (
            <Choice
              id="instant-win"
              label="Results"
              note={
                setup.instantWin
                  ? "Tap the winner to record a result, with no points entered. An instant win counts as 25 – 0."
                  : "Score each match point by point. An instant win counts as 25 – 0."
              }
              value={setup.instantWin}
              options={[
                { value: false, label: "Score points" },
                { value: true, label: "Instant win" },
              ]}
              onChange={(instantWin) => onChange({ instantWin })}
            />
          )}
          {used.points && (
            <div className="flex flex-col gap-1.5">
              <span className="mb-kicker">Standings points</span>
              <div className="grid grid-cols-2 gap-3">
                <PointsField
                  id="points-for-win"
                  label="For a win"
                  value={setup.pointsForWin}
                  onChange={(pointsForWin) => onChange({ pointsForWin })}
                />
                <PointsField
                  id="points-for-loss"
                  label="For a loss"
                  value={setup.pointsForLoss}
                  onChange={(pointsForLoss) => onChange({ pointsForLoss })}
                />
              </div>
            </div>
          )}
          <label htmlFor="court-word" className="flex flex-col gap-1.5">
            <span className="mb-kicker">Call a court a</span>
            <span className="mb-input">
              <input
                id="court-word"
                type="text"
                value={setup.courtWord}
                onChange={(event) => onChange({ courtWord: event.target.value })}
                placeholder="court"
                maxLength={20}
                autoComplete="off"
                autoCapitalize="none"
              />
            </span>
            <span className="text-[0.72rem] text-mb-ink-muted">
              Field or table, if that fits your sport.
            </span>
          </label>
          <div className="flex flex-col gap-5 border-t border-mb-rule pt-4">
            <Choice
              id="rsvp-link"
              label="RSVP link"
              note={
                setup.rsvp.enabled
                  ? "Anyone you send the link to can sign in and RSVP from the open time."
                  : "Off keeps the tournament private. You can turn it on later from the RSVP tab."
              }
              value={setup.rsvp.enabled}
              options={[
                { value: false, label: "Off" },
                { value: true, label: "On" },
              ]}
              onChange={(enabled) => changeRsvp({ enabled })}
            />
            <DateTimeField
              id="scheduled-at"
              label="Scheduled for"
              value={setup.rsvp.scheduledAt}
              zone={setup.zone}
              problem={problems.scheduledAt}
              onChange={(scheduledAt) => changeRsvp({ scheduledAt })}
            />
            <DateTimeField
              id="opens-at"
              label="RSVPs open"
              value={setup.rsvp.opensAt}
              zone={setup.zone}
              problem={problems.opensAt}
              onChange={(opensAt) => changeRsvp({ opensAt })}
            />
            <CapacityField
              id="capacity"
              value={setup.rsvp.capacity}
              problem={problems.capacity}
              onChange={(capacity) => changeRsvp({ capacity })}
            />
          </div>
        </div>
      )}
    </section>
  );
};
