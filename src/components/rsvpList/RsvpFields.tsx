"use client";

import { StepButtons } from "@/components/shared";
import { epochToWallClock, timeLabel, wallClockToEpoch } from "@/lib/rsvp";

const MAX_CAPACITY = 999;

const Problem = ({ id, problem }: { id: string; problem?: string }) =>
  problem ? (
    <p id={id} role="alert" className="text-[0.78rem] font-medium text-mb-red">
      {problem}
    </p>
  ) : null;

/**
 * A date and time on the browser's own date-time field, entered as the wall
 * clock in `zone`. When the time was set in another zone whose clock reads
 * differently, the owner's wall clock and zone show under the field.
 */
export const DateTimeField = ({
  id,
  label,
  value,
  zone,
  setZone,
  note,
  problem,
  disabled = false,
  onChange,
}: {
  id: string;
  label: string;
  /** Epoch milliseconds, or null while unset. */
  value: number | null;
  /** The zone the field reads and writes: this phone's. */
  zone: string;
  /** The zone the stored time was set in, if it is known. */
  setZone?: string;
  note?: string;
  problem?: string;
  disabled?: boolean;
  onChange: (value: number | null) => void;
}) => {
  const owner = value !== null && setZone ? timeLabel(value, setZone, zone).owner : null;
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="mb-kicker">{label}</span>
      <span className={`mb-input ${problem ? "border-mb-red" : ""}`}>
        <input
          id={id}
          type="datetime-local"
          value={value === null ? "" : epochToWallClock(value, zone)}
          onChange={(event) => onChange(wallClockToEpoch(event.target.value, zone))}
          disabled={disabled}
          aria-invalid={problem ? true : undefined}
          aria-describedby={problem ? `${id}-problem` : undefined}
        />
      </span>
      {owner && (
        <span className="text-[0.72rem] text-mb-ink-muted">{owner} where it was set.</span>
      )}
      {note && <span className="text-[0.72rem] text-mb-ink-muted">{note}</span>}
      <Problem id={`${id}-problem`} problem={problem} />
    </label>
  );
};

/** The number of confirmed RSVPs, typed or stepped one at a time. */
export const CapacityField = ({
  id,
  value,
  note,
  problem,
  onChange,
}: {
  id: string;
  value: number;
  /** What the capacity counts, said under the field, from listWording. */
  note: string;
  problem?: string;
  onChange: (value: number) => void;
}) => {
  const clamp = (n: number) => Math.max(0, Math.min(MAX_CAPACITY, n));
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="mb-kicker">
        Capacity
      </label>
      <div className="flex gap-1">
        <span className={`mb-input min-w-0 flex-1 ${problem ? "border-mb-red" : ""}`}>
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_CAPACITY}
            value={value}
            onChange={(event) => onChange(clamp(Math.floor(Number(event.target.value) || 0)))}
            aria-invalid={problem ? true : undefined}
            aria-describedby={problem ? `${id}-problem` : undefined}
          />
        </span>
        <StepButtons
          what="capacity"
          value={value}
          min={1}
          max={MAX_CAPACITY}
          onChange={(next) => onChange(clamp(next))}
        />
      </div>
      <span className="text-[0.72rem] text-mb-ink-muted">{note}</span>
      <Problem id={`${id}-problem`} problem={problem} />
    </div>
  );
};
