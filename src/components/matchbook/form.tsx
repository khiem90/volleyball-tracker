"use client";

import {
  createContext,
  useContext,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { MbIcon } from "./MbIcon";

/* ---------------------------------------------------------------------------
   Matchbook form kit (charter §2.3 "Controls", GAP-6).

   Every control is a thin typed wrapper over the classes already in
   globals.css — .mb-field, .mb-input, .mb-textarea, .mb-select-native,
   .mb-stepper, .mb-switch, .mb-swatch. Nothing here invents styling.

   Two implementation notes that repeat below:

   1. `text-base! md:text-sm!` — the 16px-on-mobile idiom that stops iOS from
      zooming on focus. The `!` is load-bearing: `.mb-input input`,
      `.mb-textarea` and `.mb-select-native` live outside any cascade layer,
      and unlayered rules outrank every Tailwind utility (which ship inside
      `@layer utilities`) no matter the specificity or source order.
   2. `min-h-[48px]` gives the 48px control height the charter asks for; none
      of the .mb-* classes set a height, so a plain utility wins there.
   --------------------------------------------------------------------------- */

const mergeIds = (...ids: Array<string | undefined | false>) =>
  ids.filter(Boolean).join(" ") || undefined;

/* ------------------------------------------------------------------ MbField */

interface MbFieldWiring {
  id: string;
  describedBy?: string;
  invalid: boolean;
  required: boolean;
}

/**
 * Private to this module. MbField publishes the label's id, its hint/error
 * ids and its validity here so every control below inherits
 * `id` / `aria-describedby` / `aria-invalid` / `required` without the caller
 * restating them. A control used outside an MbField simply reads null.
 */
const MbFieldContext = createContext<MbFieldWiring | null>(null);

export const MbField = ({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  children,
  className = "",
}: {
  label: string;
  /** Id of the control being labelled. Wired into that control automatically. */
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) => {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  return (
    <div className={`mb-field ${className}`} data-invalid={Boolean(error)}>
      <label htmlFor={htmlFor} className="mb-kicker">
        {label}
        {required && (
          <>
            <span aria-hidden="true"> *</span>
            <span className="sr-only"> (required)</span>
          </>
        )}
      </label>
      <MbFieldContext.Provider
        value={{
          id: htmlFor,
          describedBy: mergeIds(hintId, errorId),
          invalid: Boolean(error),
          required,
        }}
      >
        {children}
      </MbFieldContext.Provider>
      {hint && (
        <p id={hintId} className="mb-field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mb-field-error flex items-start gap-1.5"
        >
          <MbIcon id="warning" size={13} className="mt-[1px] shrink-0" />
          <span className="min-w-0">{error}</span>
        </p>
      )}
    </div>
  );
};

/* -------------------------------------------------------------- MbTextInput */

export const MbTextInput = ({
  id,
  icon,
  trailing,
  disabled = false,
  className = "",
  "aria-describedby": ariaDescribedBy,
  ...input
}: {
  /** Sprite icon id rendered before the field. */
  icon?: string;
  /** Adornment rendered after the field — a unit, a counter, a small button. */
  trailing?: ReactNode;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "className">) => {
  const field = useContext(MbFieldContext);
  return (
    <div
      className={`mb-input min-h-[48px] ${
        disabled ? "opacity-60" : ""
      } ${className}`}
    >
      {icon && (
        <MbIcon id={icon} size={16} className="shrink-0 text-mb-ink-muted" />
      )}
      <input
        {...input}
        id={id ?? field?.id}
        disabled={disabled}
        required={input.required ?? field?.required}
        aria-describedby={mergeIds(field?.describedBy, ariaDescribedBy)}
        aria-invalid={field?.invalid || undefined}
        className="text-base! md:text-sm! disabled:cursor-not-allowed"
      />
      {trailing}
    </div>
  );
};

/* --------------------------------------------------------------- MbTextArea */

export const MbTextArea = ({
  id,
  disabled = false,
  className = "",
  "aria-describedby": ariaDescribedBy,
  ...textarea
}: {
  className?: string;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">) => {
  const field = useContext(MbFieldContext);
  return (
    <textarea
      {...textarea}
      id={id ?? field?.id}
      disabled={disabled}
      required={textarea.required ?? field?.required}
      aria-describedby={mergeIds(field?.describedBy, ariaDescribedBy)}
      aria-invalid={field?.invalid || undefined}
      className={`mb-textarea text-base! md:text-sm! disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    />
  );
};

/* ----------------------------------------------------------------- MbSelect */

export interface MbSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export const MbSelect = ({
  id,
  options,
  placeholder,
  disabled = false,
  className = "",
  "aria-describedby": ariaDescribedBy,
  ...select
}: {
  options: MbSelectOption[];
  /** Rendered as a leading empty-valued option. */
  placeholder?: string;
  className?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "className">) => {
  const field = useContext(MbFieldContext);
  return (
    <div className={`relative min-w-0 ${disabled ? "opacity-60" : ""} ${className}`}>
      <select
        {...select}
        id={id ?? field?.id}
        disabled={disabled}
        required={select.required ?? field?.required}
        aria-describedby={mergeIds(field?.describedBy, ariaDescribedBy)}
        aria-invalid={field?.invalid || undefined}
        className="mb-select-native min-h-[48px] truncate text-base! disabled:cursor-not-allowed md:text-[0.95rem]!"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <MbIcon
        id="chevron-down"
        size={13}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mb-ink-muted"
      />
    </div>
  );
};

/* --------------------------------------------------------- MbNumberStepper */

const clampValue = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/** Wrap is for bounded cycles (rotation R1–R6) and assumes integer steps. */
const wrapValue = (n: number, min: number, max: number) => {
  const span = max - min + 1;
  if (span <= 0) return min;
  return (((n - min) % span) + span) % span + min;
};

export const MbNumberStepper = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  wrap = false,
  prefix,
  suffix,
  label,
  size = "sm",
  id,
  disabled = false,
  className = "",
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  /** −/+ cycle past the bounds instead of stopping. Typed entry still clamps. */
  wrap?: boolean;
  /** Sits before the figure, e.g. "R" for rotation R1–R6. */
  prefix?: string;
  suffix?: string;
  /** Accessible name; also builds the −/+ button labels. */
  label: string;
  size?: "sm" | "lg";
  id?: string;
  disabled?: boolean;
  className?: string;
}) => {
  const autoId = useId();
  const field = useContext(MbFieldContext);
  const inputId = id ?? field?.id ?? autoId;

  /**
   * `draft` holds the raw text while the field is being edited so the user can
   * clear it. Committing on every keystroke is what turns an emptied field into
   * 0 — `Number("")` is 0 — so an empty or unparseable draft commits nothing and
   * blur snaps the face back to the last clamped value.
   */
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(value);
  const chars = Math.max(2, String(min).length, String(max).length);

  const commit = (next: number) => {
    if (next !== value) onChange(next);
  };

  const stepBy = (delta: number) => {
    setDraft(null);
    const raw = value + delta;
    commit(wrap ? wrapValue(raw, min, max) : clampValue(raw, min, max));
  };

  const atMin = !wrap && value <= min;
  const atMax = !wrap && value >= max;

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      stepBy(step);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      stepBy(-step);
    } else if (event.key === "Home") {
      event.preventDefault();
      setDraft(null);
      commit(min);
    } else if (event.key === "End") {
      event.preventDefault();
      setDraft(null);
      commit(max);
    } else if (event.key === "Enter") {
      event.preventDefault();
      setDraft(null);
      commit(clampValue(value, min, max));
    }
  };

  return (
    <div
      className={`mb-stepper ${disabled ? "opacity-60" : ""} ${className}`}
      data-size={size}
    >
      <button
        type="button"
        title={`Decrease ${label}`}
        aria-label={`Decrease ${label}`}
        disabled={disabled || atMin}
        onClick={() => stepBy(-step)}
      >
        <MbIcon id="minus" size={16} />
      </button>
      <span className="mb-stepper-value">
        {prefix && <span aria-hidden="true">{prefix}</span>}
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          role="spinbutton"
          aria-label={label}
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuetext={
            prefix || suffix ? `${prefix ?? ""}${value}${suffix ?? ""}` : undefined
          }
          aria-describedby={field?.describedBy}
          disabled={disabled}
          value={shown}
          onChange={(event) => {
            const raw = event.target.value;
            setDraft(raw);
            if (raw.trim() === "") return;
            const parsed = Number(raw);
            if (!Number.isFinite(parsed)) return;
            commit(clampValue(parsed, min, max));
          }}
          onBlur={() => {
            setDraft(null);
            commit(clampValue(value, min, max));
          }}
          onKeyDown={handleKeyDown}
          className="self-stretch border-0 bg-transparent p-0 text-center disabled:cursor-not-allowed"
          style={{
            width: `${chars}ch`,
            font: "inherit",
            fontVariantNumeric: "tabular-nums",
          }}
        />
        {suffix && <span aria-hidden="true">{suffix}</span>}
      </span>
      <button
        type="button"
        title={`Increase ${label}`}
        aria-label={`Increase ${label}`}
        disabled={disabled || atMax}
        onClick={() => stepBy(step)}
      >
        <MbIcon id="plus" size={16} />
      </button>
    </div>
  );
};

/* ----------------------------------------------------------------- MbToggle */

export const MbToggle = ({
  checked,
  onChange,
  label,
  hint,
  id,
  disabled = false,
  className = "",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}) => {
  const autoId = useId();
  const field = useContext(MbFieldContext);
  const inputId = id ?? field?.id ?? autoId;
  const hintId = hint ? `${inputId}-toggle-hint` : undefined;
  return (
    <label
      htmlFor={inputId}
      className={`mb-row-hover flex min-h-[44px] items-center justify-between gap-3 rounded-[4px] px-1 py-2 ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      } ${className}`}
    >
      <span className="min-w-0">
        <span className="matchbook-display block text-[0.85rem] font-semibold tracking-[0.08em]">
          {label}
        </span>
        {hint && (
          <span id={hintId} className="mt-0.5 block text-[0.72rem] text-mb-ink-muted">
            {hint}
          </span>
        )}
      </span>
      <input
        id={inputId}
        type="checkbox"
        role="switch"
        className="mb-switch shrink-0"
        checked={checked}
        disabled={disabled}
        aria-describedby={mergeIds(hintId, field?.describedBy)}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
};

/* ------------------------------------------------------------- MbToggleChip */

export const MbToggleChip = ({
  icon,
  pressed,
  onPressedChange,
  children,
  disabled = false,
  className = "",
}: {
  /** Sprite icon id rendered between the state mark and the label. */
  icon?: string;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}) => (
  <button
    type="button"
    aria-pressed={pressed}
    disabled={disabled}
    onClick={() => onPressedChange(!pressed)}
    className={`mb-btn mb-btn-touch max-w-full ${
      pressed ? "mb-btn-navy" : "mb-btn-outline-navy"
    } ${disabled ? "cursor-not-allowed opacity-60" : ""} ${className}`}
  >
    {/* Second channel: the state is a filled ballot box vs an empty one, so
        the chip still reads on/off in greyscale. */}
    <span
      aria-hidden="true"
      className="inline-flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-[2px] border-[1.5px] border-current"
    >
      {pressed && <MbIcon id="check" size={10} />}
    </span>
    {icon && <MbIcon id={icon} size={14} className="shrink-0" />}
    <span className="min-w-0 truncate">{children}</span>
  </button>
);

/* ----------------------------------------------------------- MbSwatchPicker */

export interface MbSwatch {
  value: string;
  label: string;
}

/**
 * The house palette. Values are token references, not literals, so a stored
 * team colour keeps resolving through `--mb-*` wherever it is painted
 * (charter §4 invariant 10). `allowCustom` is the escape hatch that yields a
 * real hex.
 */
export const MB_SWATCH_PALETTE: readonly MbSwatch[] = [
  { value: "var(--mb-coral)", label: "Coral" },
  { value: "var(--mb-navy)", label: "Navy" },
  { value: "var(--mb-teal)", label: "Teal" },
  { value: "var(--mb-gold)", label: "Gold" },
  { value: "var(--mb-plum)", label: "Plum" },
  { value: "var(--mb-green)", label: "Green" },
  { value: "var(--mb-red)", label: "Red" },
  { value: "var(--mb-ink-muted)", label: "Slate" },
];

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const TOKEN_RE = /^var\(\s*(--mb-[a-z0-9-]+)\s*\)$/i;

const swatchReadout = (value: string) => {
  if (HEX_RE.test(value)) return value.toUpperCase();
  const token = TOKEN_RE.exec(value);
  return token ? token[1] : value;
};

export const MbSwatchPicker = ({
  value,
  onChange,
  palette = "matchbook",
  allowCustom = false,
  label = "Color",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  palette?: "matchbook" | string[];
  allowCustom?: boolean;
  /** Accessible name for the radiogroup. */
  label?: string;
  className?: string;
}) => {
  const swatches: readonly MbSwatch[] =
    palette === "matchbook"
      ? MB_SWATCH_PALETTE
      : palette.map((entry) => ({ value: entry, label: swatchReadout(entry) }));

  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = swatches.findIndex((swatch) => swatch.value === value);
  const tabbable = selectedIndex >= 0 ? selectedIndex : 0;
  const selected = selectedIndex >= 0 ? swatches[selectedIndex] : undefined;
  const readout = swatchReadout(value);
  const customHex =
    allowCustom && selectedIndex < 0 && HEX_RE.test(value) ? value : undefined;

  const move = (index: number) => {
    refs.current[index]?.focus();
    onChange(swatches[index].value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = swatches.length - 1;
    let next = -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = index === last ? 0 : index + 1;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = index === 0 ? last : index - 1;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = last;
    } else if (event.key === " ") {
      event.preventDefault();
      onChange(swatches[index].value);
      return;
    }
    if (next < 0) return;
    event.preventDefault();
    move(next);
  };

  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={label}>
        {swatches.map((swatch, index) => {
          const isSelected = index === selectedIndex;
          return (
            <button
              key={swatch.value}
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={swatch.label}
              title={swatch.label}
              tabIndex={index === tabbable ? 0 : -1}
              data-size="touch"
              data-selected={isSelected}
              onClick={() => onChange(swatch.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className="mb-swatch inline-flex items-center justify-center"
              style={{ background: swatch.value }}
            >
              {isSelected && (
                <span className="pointer-events-none inline-flex h-[18px] w-[18px] items-center justify-center rounded-[2px] bg-mb-paper-bright text-mb-navy">
                  <MbIcon id="check" size={12} />
                </span>
              )}
            </button>
          );
        })}
        {allowCustom && (
          <label
            data-size="touch"
            data-selected={Boolean(customHex)}
            title="Custom color"
            className="mb-swatch relative inline-flex cursor-pointer items-center justify-center"
            style={customHex ? { background: customHex } : undefined}
          >
            {!customHex && <MbIcon id="plus" size={16} />}
            <input
              type="color"
              aria-label="Custom color"
              key={customHex ?? "unset"}
              defaultValue={customHex}
              onChange={(event) => onChange(event.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
        )}
      </div>
      <p className="flex flex-wrap items-center gap-2">
        <span className="mb-kicker">Value</span>
        <span className="mb-code-chip">{readout}</span>
        {selected && selected.label !== readout && (
          <span className="text-[0.72rem] text-mb-ink-muted">{selected.label}</span>
        )}
      </p>
    </div>
  );
};

/* --------------------------------------------------------------- MbTagInput */

export const MbTagInput = ({
  value,
  onChange,
  max,
  placeholder,
  id,
  disabled = false,
  className = "",
}: {
  value: string[];
  onChange: (value: string[]) => void;
  max?: number;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}) => {
  const autoId = useId();
  const field = useContext(MbFieldContext);
  const inputId = id ?? field?.id ?? autoId;
  const [draft, setDraft] = useState("");
  const atMax = max !== undefined && value.length >= max;

  const add = (raw: string) => {
    const next = raw.trim();
    setDraft("");
    if (!next || atMax) return;
    if (value.some((tag) => tag.toLowerCase() === next.toLowerCase())) return;
    onChange([...value, next]);
  };

  const removeAt = (index: number) =>
    onChange(value.filter((_, position) => position !== index));

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(draft);
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      event.preventDefault();
      removeAt(value.length - 1);
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div
        className={`mb-input min-h-[48px] flex-wrap ${disabled ? "opacity-60" : ""}`}
      >
        {value.map((tag, index) => (
          <span
            key={tag}
            className="inline-flex min-h-[44px] min-w-0 items-stretch rounded-[3px] border-[1.5px] border-mb-navy bg-mb-paper-bright"
          >
            <span className="matchbook-display flex min-w-0 items-center truncate px-2.5 text-[0.78rem] font-bold tracking-[0.06em]">
              {tag}
            </span>
            <button
              type="button"
              title={`Remove ${tag}`}
              aria-label={`Remove ${tag}`}
              disabled={disabled}
              onClick={() => removeAt(index)}
              className="flex min-h-[44px] w-[44px] shrink-0 items-center justify-center border-l-[1.5px] border-mb-rule text-mb-navy transition-colors hover:text-mb-coral disabled:cursor-not-allowed"
            >
              <MbIcon id="close" size={13} />
            </button>
          </span>
        ))}
        {!atMax && (
          <input
            id={inputId}
            type="text"
            autoComplete="off"
            disabled={disabled}
            placeholder={value.length === 0 ? placeholder : undefined}
            aria-describedby={mergeIds(field?.describedBy, `${inputId}-tag-hint`)}
            aria-invalid={field?.invalid || undefined}
            value={draft}
            onChange={(event) => {
              const raw = event.target.value;
              if (raw.includes(",")) add(raw.replace(/,/g, ""));
              else setDraft(raw);
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => add(draft)}
            className="min-h-[44px] text-base! md:text-sm! disabled:cursor-not-allowed"
          />
        )}
      </div>
      <p
        id={`${inputId}-tag-hint`}
        className="mb-field-hint flex items-center justify-between gap-2"
      >
        <span>
          {atMax ? "Limit reached — remove one to add another." : "Enter or comma adds a tag."}
        </span>
        {max !== undefined && (
          <span className="shrink-0 tabular-nums">
            {value.length}/{max}
          </span>
        )}
      </p>
    </div>
  );
};
