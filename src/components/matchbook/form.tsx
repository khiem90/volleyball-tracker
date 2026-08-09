"use client";

import {
  createContext,
  useContext,
  useId,
  useRef,
  useState,
  type CSSProperties,
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
   3. Charter §4.33 is a hard fail measured by a scripted `getBoundingClientRect`
      sweep over `button,a,input,select,textarea,[role=button],[tabindex]`. That
      sweep reads the *control's own* box, not the box of the label wrapping it,
      so every `<input>` here is stretched to fill its 44/48px shell rather than
      left at its ~19px line box. Where that is impossible without repainting a
      .mb-* recipe (the switch), the real input becomes the full-row hit target
      and the visual track moves to an `aria-hidden` sibling.
   --------------------------------------------------------------------------- */

const mergeIds = (...ids: Array<string | undefined | false>) =>
  ids.filter(Boolean).join(" ") || undefined;

/* -------------------------------------------------------------- form label */

/**
 * The one form-label treatment, shared by `MbField` and `MbCopyField`.
 *
 * It used to be `.mb-kicker` — 0.62rem / 9.92px, 0.16em, `--mb-ink-muted`.
 * Three measured problems with that on a phone:
 *
 * 1. It lost to its own helper text. `.mb-field-hint` is 0.72rem / 11.52px, so
 *    the *name* of the field rendered 1.6px smaller than the sentence
 *    explaining it — the hierarchy was upside down.
 * 2. `layout.tsx` sets `maximumScale: 1, userScalable: false`, so a reader who
 *    cannot make out 9.92px cannot pinch to rescue it. The design language's
 *    own mobile rule (§8, last line) says the 0.6–0.66rem steps "must never
 *    carry information that isn't repeated at a larger size" — a field label is
 *    never repeated.
 * 3. `.mb-kicker` is defined as an *eyebrow* (§2.2: "never a heading"), and it
 *    is what the dev gallery uses for its own annotations. A field's name and a
 *    caption about the field were the same type.
 *
 * The replacement is `display/nav` (§2.1: 0.85rem / 600 / 0.08em) in navy —
 * the step `MbToggle` already uses for its own control label a few lines down,
 * so the two labels in a form now agree. 13.6px navy on paper is 11.79:1 AAA.
 *
 * `letterSpacing` is inline, not `tracking-[0.08em]`: `.matchbook-display` sets
 * `letter-spacing: 0.02em` from an *unlayered* rule and every Tailwind
 * `tracking-*` utility ships inside `@layer utilities`, which loses to it
 * regardless of specificity. (Measured: `MbToggle`'s `tracking-[0.08em]`
 * computes to 0.272px = 0.02em, not 1.088px. Same trap as `CELL_TRACK` in
 * `CopyField.tsx`.)
 */
export const MB_FIELD_LABEL: { className: string; style: CSSProperties } = {
  className: "matchbook-display text-[0.85rem] font-semibold text-mb-navy",
  style: { letterSpacing: "0.08em" },
};

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
      <label
        htmlFor={htmlFor}
        className={MB_FIELD_LABEL.className}
        style={MB_FIELD_LABEL.style}
      >
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
      className={`mb-input min-h-[48px] py-0! ${
        disabled ? "opacity-60" : ""
      } ${className}`}
    >
      {icon && (
        <MbIcon id={icon} size={16} className="shrink-0 text-mb-ink-muted" />
      )}
      {/* `py-0!` on the shell + `self-stretch` here hands the whole 48px to the
          input, so its own hit box clears 44px. The shell keeps its 0.8rem
          horizontal padding, so nothing moves optically. */}
      <input
        {...input}
        id={id ?? field?.id}
        disabled={disabled}
        required={input.required ?? field?.required}
        aria-describedby={mergeIds(field?.describedBy, ariaDescribedBy)}
        aria-invalid={field?.invalid || undefined}
        className="self-stretch text-base! md:text-sm! disabled:cursor-not-allowed"
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
        /* `tabular-nums` because select labels routinely carry a measure —
           "Court 2", "Round 11", "21 points" — and §4.9 wants those figures on
           the same rhythm as every other numeral. */
        className="mb-select-native min-h-[48px] truncate text-base! tabular-nums disabled:cursor-not-allowed md:text-[0.95rem]!"
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
  /**
   * `prefix`/`suffix` live inside the editable face rather than beside it. As
   * separate spans the figure is centred inside its own 44px box, which opens a
   * visible gap ("R  1"); folded in, `R1` reads as the single display token the
   * charter's rotation case wants. Typed input is stripped back to digits, so
   * the affordance is unchanged.
   */
  const face = `${prefix ?? ""}${value}${suffix ?? ""}`;
  const shown = draft ?? face;
  const chars =
    Math.max(2, String(min).length, String(max).length) +
    (prefix?.length ?? 0) +
    (suffix?.length ?? 0);

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
      className={`mb-stepper self-start ${disabled ? "opacity-60" : ""} ${className}`}
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
          aria-valuetext={prefix || suffix ? face : undefined}
          aria-describedby={field?.describedBy}
          disabled={disabled}
          value={shown}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => {
            const raw = event.target.value;
            setDraft(raw);
            const digits = raw.replace(/[^\d-]/g, "");
            if (digits.trim() === "") return;
            const parsed = Number(digits);
            if (!Number.isFinite(parsed)) return;
            commit(clampValue(parsed, min, max));
          }}
          onBlur={() => {
            setDraft(null);
            commit(clampValue(value, min, max));
          }}
          onKeyDown={handleKeyDown}
          /* `self-stretch` takes the full 44/56px height of the shell and
             `min-w-[44px]` the width, so the editable figure is itself a legal
             target — `${chars}ch` only ever widens it for 3+ digit bounds. */
          className="min-w-[44px] self-stretch border-0 bg-transparent p-0 text-center disabled:cursor-not-allowed"
          style={{
            width: `${chars}ch`,
            font: "inherit",
            fontVariantNumeric: "tabular-nums",
          }}
        />
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
  const labelId = `${inputId}-toggle-label`;
  const hintId = hint ? `${inputId}-toggle-hint` : undefined;

  /**
   * The charter asks for the whole 44px row to be the hit target, and the
   * §4.33 sweep measures the input itself — a 28x16 `.mb-switch` input fails it
   * even when a label makes the row clickable. So the real control is stretched
   * over the row and made invisible, and the track becomes an `aria-hidden`
   * sibling carrying `.mb-switch` for its geometry. Only the three `:checked`
   * declarations are restated here (via `peer-checked`), because a sibling
   * cannot read the input's `:checked`; the `!` is the same unlayered-vs-layered
   * problem noted at the top of the file. Focus-visible now outlines the entire
   * row, which is an honest picture of what is clickable.
   */
  return (
    <label
      className={`mb-row-hover relative flex min-h-[44px] items-center justify-between gap-3 rounded-[4px] px-1 py-2 ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      } ${className}`}
    >
      <input
        id={inputId}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        aria-labelledby={labelId}
        aria-describedby={mergeIds(hintId, field?.describedBy)}
        onChange={(event) => onChange(event.target.checked)}
        className="peer absolute inset-0 m-0 h-full w-full cursor-[inherit] appearance-none rounded-[4px] opacity-0"
      />
      <span className="pointer-events-none min-w-0">
        <span
          id={labelId}
          className="matchbook-display block text-[0.85rem] font-semibold tracking-[0.08em]"
        >
          {label}
        </span>
        {hint && (
          <span id={hintId} className="mt-0.5 block text-[0.72rem] text-mb-ink-muted">
            {hint}
          </span>
        )}
      </span>
      <span
        aria-hidden="true"
        className="mb-switch pointer-events-none block peer-checked:border-mb-coral-deep! peer-checked:bg-mb-coral-deep! peer-checked:after:bg-mb-paper-bright! peer-checked:after:[transform:translateX(11px)]"
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
    /* `opacity-40`, not 60: this is a `.mb-btn`, and the whole button family
       shares one disabled reading (design language §4.3, `MbButton`). */
    className={`mb-btn mb-btn-touch max-w-full ${
      pressed ? "mb-btn-navy" : "mb-btn-outline-navy"
    } ${disabled ? "cursor-not-allowed opacity-40" : ""} ${className}`}
  >
    {/* Second channel: a ballot box carrying an inset square when pressed —
        the same mark `.mb-radio:checked` draws, so the chip reads on/off in
        greyscale without nesting a circled glyph inside a 14px box. */}
    <span
      aria-hidden="true"
      className="inline-flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-[2px] border-[1.5px] border-current"
    >
      {pressed && <span className="block h-[6px] w-[6px] rounded-[1px] bg-current" />}
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
      {/* 10px, not 8px: the custom-colour input reaches 1.5px back over its own
          border, and §4.33 wants ≥8px of clear water between targets. */}
      <div
        className="flex flex-wrap items-center gap-2.5"
        role="radiogroup"
        aria-label={label}
      >
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
              /* A colour input is a replaced element: `inset-0` leaves it at its
                 intrinsic 50x27 and `h-full` measures the 41px padding box. An
                 explicit 44x44 offset back over the 1.5px border is the only
                 way its own hit box equals the swatch you can see. */
              className="absolute -left-[1.5px] -top-[1.5px] h-[44px] w-[44px] cursor-pointer opacity-0"
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

/** Same unlayered-`.matchbook-display` trap as `MB_FIELD_LABEL`: the tag face
 *  wants 0.06em and a `tracking-*` utility cannot raise it above 0.02em. */
const TAG_TRACK: CSSProperties = { letterSpacing: "0.06em" };

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
      {/* `py-[2px]!` keeps a 44px chip row inside a shell that still reads as a
          48px field when empty, and gives wrapped rows a hairline of air.

          The gaps are overridden because the chip is now two keys, not one
          box (see below). `.mb-input` sets `gap: 0.6rem` (9.6px) unlayered, so
          the override has to be important. Column 16px / row 10px against the
          10px *inside* a chip: the tag and its own remove key are the closest
          pair on the row by a factor of 1.6, so proximity still groups them
          correctly and no two targets sit under the 8px floor. */}
      <div
        className={`mb-input min-h-[48px] flex-wrap gap-x-4! gap-y-2.5! py-[2px]! ${
          disabled ? "opacity-60" : ""
        }`}
      >
        {value.map((tag, index) => (
          /* Wrapper, not a border: it exists so flex-wrap can never break a tag
             away from its own remove key. */
          <span key={tag} className="inline-flex min-w-0 max-w-full items-stretch gap-2.5">
            <span
              className="matchbook-display flex min-h-[44px] min-w-0 items-center rounded-[3px] border-[1.5px] border-mb-navy bg-mb-paper-bright px-2.5 text-[0.78rem] font-bold"
              style={TAG_TRACK}
            >
              {/* Not the flex container itself: `text-overflow` is ignored on
                  one, so a long tag would clip with no ellipsis. As a flex
                  *item* this span is blockified and truncates properly. */}
              <span className="min-w-0 truncate">{tag}</span>
            </span>
            {/* Its own key with 10px of paper in front of it, and drawn in the
                shell's own rule weight so the eye reads TAG first, control
                second. Sharing the tag's box put an unconfirmed, un-undoable
                delete 0px from the word and inside the same border, so the
                whole 100–130px chip read as one pressable object of which 44px
                destroyed it. */}
            <button
              type="button"
              title={`Remove ${tag}`}
              aria-label={`Remove ${tag}`}
              disabled={disabled}
              onClick={() => removeAt(index)}
              className="flex min-h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[3px] border-[1.5px] border-mb-rule bg-mb-paper-bright text-mb-navy transition-colors hover:border-mb-navy hover:bg-[var(--mb-tint-2)] hover:text-mb-coral-deep disabled:cursor-not-allowed"
            >
              <MbIcon id="close" size={14} />
            </button>
          </span>
        ))}
        {!atMax && (
          <input
            id={inputId}
            type="text"
            autoComplete="off"
            disabled={disabled}
            /* Kept visible even with chips present: once the entry field wraps
               onto its own row it is an unbordered strip of paper, and without
               the prompt that row reads as a rendering fault. */
            placeholder={placeholder}
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
            /* `.mb-input input` sets an unlayered `min-width:0`, so the floor
               that keeps the entry field a legal target has to be important. */
            className="min-h-[44px] min-w-[4.5rem]! text-base! md:text-sm! disabled:cursor-not-allowed"
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
