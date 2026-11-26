"use client";

import { Choice, Icon } from "@/components/shared";
import {
  ALL_SETTINGS,
  courtTerminology,
  settingsUsedBy,
  type TournamentSetup,
} from "@/lib/creation";

const COURT_CHOICES = [1, 2, 3, 4];
const SERIES_CHOICES = [1, 3, 5, 7];

/** The label above a control. */
const LABEL = "text-caption font-medium text-ink-soft";

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
    <span className={LABEL}>{label}</span>
    <span className="field">
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
 * The settings most tournaments never touch, in one card whose head opens
 * and closes it. Only the ones the chosen format uses are shown; with no
 * format chosen yet, all of them are.
 */
export const AdvancedSettings = ({
  setup,
  open,
  onToggle,
  onChange,
}: {
  setup: TournamentSetup;
  open: boolean;
  onToggle: () => void;
  onChange: (changes: Partial<TournamentSetup>) => void;
}) => {
  const used = setup.format ? settingsUsedBy(setup.format) : ALL_SETTINGS;
  const { venue: courtWord, venuePlural: courtWords } = courtTerminology(setup.courtWord);

  return (
    <section className="card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="advanced-settings"
        className={`card-head w-full cursor-pointer text-left transition-colors hover:bg-ink/4 focus-visible:-outline-offset-2 ${
          open ? "" : "border-b-0"
        }`}
      >
        <span className="card-title">
          <span className="card-icon">
            <Icon id="settings" size={14} />
          </span>
          Advanced settings
        </span>
        <Icon
          id="chevron-down"
          size={16}
          className={`shrink-0 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`}
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
              <span className={LABEL}>Standings points</span>
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
            <span className={LABEL}>Call a court a</span>
            <span className="field">
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
            <span className="text-caption text-ink-soft">
              Field or table, if that fits your sport.
            </span>
          </label>
        </div>
      )}
    </section>
  );
};
