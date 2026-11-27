"use client";

/** A row of choices, one of them chosen. Each is thumb-sized. The chosen one is filled with ink. */
export const Choice = <T extends string | number | boolean>({
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
    <span id={`${id}-label`} className="text-caption font-medium text-ink-soft">
      {label}
    </span>
    {/* Two to a row on a phone, where four labels at the button's size do not fit on one line. */}
    <div
      role="radiogroup"
      aria-labelledby={`${id}-label`}
      className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`min-h-11 min-w-11 flex-1 rounded-tile border px-3 text-label font-semibold transition-colors ${
              selected
                ? "border-ink bg-ink text-white"
                : "border-ink-soft/75 bg-surface text-ink hover:border-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
    {note && <p className="text-caption text-ink-soft">{note}</p>}
  </div>
);
