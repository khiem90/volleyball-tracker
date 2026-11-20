"use client";

/** A row of choices, one of them chosen. Each is thumb-sized. */
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
