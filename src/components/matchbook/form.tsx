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
import {
  TEAM_COLOR_CSS,
  TEAM_COLOR_IDS,
  TEAM_COLOR_LABEL,
} from "@/lib/teamColor";
import {
  MB_CONTROL_CELL,
  MB_CONTROL_HEIGHT,
  type MbCompositeSize,
  type MbControlSize,
} from "./Button";
import { MbIcon } from "./MbIcon";

/* ---------------------------------------------------------------------------
   Matchbook form kit. Every control is a thin typed wrapper over the classes
   already in globals.css — .mb-field, .mb-input, .mb-textarea,
   .mb-select-native, .mb-stepper, .mb-switch, .mb-swatch. Nothing here invents
   styling. Notes that repeat below:

   1. `text-base! md:text-[0.9rem]!` — 16px on mobile stops iOS zooming on
      focus, dropping to `body/md` above `md`. The `!` is load-bearing:
      `.mb-input input`, `.mb-textarea` and `.mb-select-native` are UNLAYERED
      rules, which outrank every Tailwind utility regardless of specificity.
   2. Heights come from the one ladder in `Button.tsx` — `MB_CONTROL_HEIGHT`
      for a plain control, `MB_CONTROL_CELL` for the interior of a framed
      composite. No .mb-* class sets a height.
   3. Hit-target audits measure the *control's own* box, not the label wrapping
      it, so every `<input>` here is stretched to fill its shell. Where that is
      impossible without repainting a recipe (the switch), the real input
      becomes the full-row hit target and the visual track moves to an
      `aria-hidden` sibling.
   4. Border widths are `--mb-rule-edge`, never a literal, set through `style`
      rather than `border-[…]` so there is no arbitrary-value ambiguity
      between a width and a colour.
   --------------------------------------------------------------------------- */

/** Every framed edge in this file. One object, so they cannot drift apart. */
const EDGE_RULE: CSSProperties = { borderWidth: "var(--mb-rule-edge)" };

const mergeIds = (...ids: Array<string | undefined | false>) =>
  ids.filter(Boolean).join(" ") || undefined;

/* -------------------------------------------------------------- form label */

/**
 * The one form-label treatment, shared by `MbField`, `MbCopyField` and
 * `MbToggle` — `display/nav` in navy, sized above its own hint text. The
 * tracking is the class `mb-track-nav`, not inline: `.matchbook-display`'s
 * `letter-spacing` lives in `@layer components`, so the class can win.
 */
export const MB_FIELD_LABEL: { className: string } = {
  className: "matchbook-display text-[0.85rem] mb-track-nav font-semibold text-mb-navy",
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
  size = "md",
  disabled = false,
  className = "",
  "aria-describedby": ariaDescribedBy,
  ...input
}: {
  /** Sprite icon id rendered before the field. */
  icon?: string;
  /** Adornment rendered after the field — a unit, a counter, a small button. */
  trailing?: ReactNode;
  /**
   * Ladder rung of the field box: `md` (48px) or `lg` (56px). `sm` is absent:
   * `.mb-input` is a frame around a target, the frame spends `--mb-rule-edge`
   * twice, and a 44px shell would leave the `<input>` itself at 42px — under
   * the hit-target floor.
   */
  size?: MbCompositeSize;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "size">) => {
  const field = useContext(MbFieldContext);
  return (
    <div
      data-size={size}
      style={{ minHeight: MB_CONTROL_HEIGHT[size] }}
      className={`mb-input py-0! ${disabled ? "opacity-60" : ""} ${className}`}
    >
      {icon && (
        <MbIcon id={icon} size={16} className="shrink-0 text-mb-ink-muted" />
      )}
      {/* `py-0!` on the shell + `self-stretch` here hands the whole interior to
          the input, so its own hit box is `MB_CONTROL_CELL[size]`; the shell
          keeps its horizontal padding, so nothing moves optically. */}
      <input
        {...input}
        id={id ?? field?.id}
        disabled={disabled}
        required={input.required ?? field?.required}
        aria-describedby={mergeIds(field?.describedBy, ariaDescribedBy)}
        aria-invalid={field?.invalid || undefined}
        className="self-stretch text-base! md:text-[0.9rem]! disabled:cursor-not-allowed"
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
      /* No size axis, deliberately: a textarea is measured in rows, not rungs —
         the one control in the kit that is honestly off the ladder. */
      className={`mb-textarea text-base! md:text-[0.9rem]! disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
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
  size = "md",
  disabled = false,
  className = "",
  "aria-describedby": ariaDescribedBy,
  ...select
}: {
  options: MbSelectOption[];
  /** Rendered as a leading empty-valued option. */
  placeholder?: string;
  /**
   * Full ladder including `sm`: unlike `.mb-input`, the bordered element *is*
   * the `<select>`, so its box and its hit box are the same 44/48/56.
   */
  size?: MbControlSize;
  className?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "size">) => {
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
        data-size={size}
        style={{ minHeight: MB_CONTROL_HEIGHT[size] }}
        /* `tabular-nums` because select labels routinely carry a measure
           ("Court 2", "Round 11"). `0.95rem` restates `.mb-select-native`'s
           own step at the `md` breakpoint rather than introducing one. */
        className="mb-select-native truncate text-base! tabular-nums disabled:cursor-not-allowed md:text-[0.95rem]!"
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

/**
 * The ± keys. The shell states the rung and the keys take the interior:
 * `min-height` of the FULL rung plus a negative block margin of exactly one
 * edge, so the key's own border box is 48/56 (hit-target audits measure the
 * `button`, not the frame around it) while the flex line still resolves to
 * `rung − 2` and the shell's `overflow: hidden` clips the invisible overlap.
 * `style`, not a class: `.mb-stepper button` sets `width`/`min-height` in
 * unlayered CSS, and an inline declaration outranks it without `!important`.
 */
const stepperKey = (size: MbCompositeSize): CSSProperties => ({
  width: MB_CONTROL_CELL[size],
  minHeight: MB_CONTROL_HEIGHT[size],
  marginBlock: "calc(-1 * var(--mb-rule-edge))",
});

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
  size = "md",
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
  /** Unit word after the figure, e.g. "games". Set at its own type step. */
  suffix?: string;
  /** Accessible name; also builds the −/+ button labels. */
  label: string;
  /**
   * Ladder rung of the **shell**: `md` = 48px, `lg` = 56px. No `sm`: a 44px
   * shell leaves 42px keys, and the keys are the targets.
   */
  size?: MbCompositeSize;
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
  const minusRef = useRef<HTMLButtonElement | null>(null);
  const plusRef = useRef<HTMLButtonElement | null>(null);
  /**
   * `prefix` stays folded into the editable face; `suffix` no longer is.
   *
   * They looked like a pair and are not. A prefix is part of the token — `R1`
   * is one display word, and split into spans the figure centres in its own
   * box and opens a visible gap ("R  1"). A suffix is a **unit**: "3 games" is
   * a figure plus a lowercase word about the figure. Folded into the face it
   * was set in the numeral face — 24px Oswald at `md`, 30px at `lg` — which is
   * a `display/stat` step being asked to carry a lowercase unit word. The type
   * scale has no such step, so the control was inventing one.
   *
   * Split out, the figure keeps the numeral step and the unit takes
   * `display/link` (0.72rem / 600 / 0.04em, muted) — an existing step, ~2.1x
   * smaller than the figure it annotates, and well clear of the 0.6–0.66rem
   * band the design language forbids for information that is not repeated
   * elsewhere.
   *
   * `aria-valuetext` still says "3 games", so the split is visual only.
   */
  const unit = suffix?.trim();
  const face = `${prefix ?? ""}${value}`;
  const spoken = `${face}${suffix ?? ""}`;
  const shown = draft ?? face;
  const chars =
    Math.max(2, String(min).length, String(max).length) + (prefix?.length ?? 0);

  const commit = (next: number) => {
    if (next !== value) onChange(next);
  };

  /**
   * When the pressed key is about to disable itself, focus hands off to the
   * opposite key: a focused disabled button drops focus to `<body>`, which
   * inside a modal silently exits the dialog for a screen reader. The opposite
   * key is guaranteed live the moment its partner dies and is the only control
   * the user can now want. Not the value input — it selects its contents on
   * focus and raises the on-screen keyboard over the sheet. Only when the key
   * is *actually* focused, so a mouse press that never took focus does not
   * move it.
   */
  const handOffFocus = (delta: number, next: number) => {
    if (wrap) return;
    const pressed = delta < 0 ? minusRef.current : plusRef.current;
    if (!pressed || document.activeElement !== pressed) return;
    if (delta < 0 ? next > min : next < max) return;
    const sibling = delta < 0 ? plusRef.current : minusRef.current;
    if (!sibling || sibling.disabled) return;
    sibling.focus();
  };

  const stepBy = (delta: number) => {
    setDraft(null);
    const raw = value + delta;
    const next = wrap ? wrapValue(raw, min, max) : clampValue(raw, min, max);
    commit(next);
    handOffFocus(delta, next);
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
      /* The rung lands on the shell; `data-size` is kept because
         `.mb-stepper[data-size="lg"] .mb-stepper-value` steps the numeral's
         own font size. */
      style={{ minHeight: MB_CONTROL_HEIGHT[size] }}
    >
      <button
        type="button"
        ref={minusRef}
        title={`Decrease ${label}`}
        aria-label={`Decrease ${label}`}
        disabled={disabled || atMin}
        onClick={() => stepBy(-step)}
        style={stepperKey(size)}
      >
        <MbIcon id="minus" size={16} />
      </button>
      <span className="mb-stepper-value gap-2">
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
          aria-valuetext={prefix || suffix ? spoken : undefined}
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
          /* `self-stretch` + `min-w-[44px]` make the editable figure itself a
             legal target — `${chars}ch` only ever widens it. The negative
             `marginBlock` of one edge takes its border box from `rung − 2` to
             the rung itself; the shell's `overflow: hidden` clips the
             invisible overlap. */
          className="min-w-[44px] self-stretch border-0 bg-transparent p-0 text-center disabled:cursor-not-allowed"
          style={{
            width: `${chars}ch`,
            marginBlock: "calc(-1 * var(--mb-rule-edge))",
            font: "inherit",
            fontVariantNumeric: "tabular-nums",
          }}
        />
        {unit && (
          <span
            /* `leading-none` so a one-word unit cannot add a half-line to the
               shell and take it back off the rung; `self-center` so it sits on
               the figure's optical centre rather than stretching. */
            className="matchbook-display shrink-0 self-center text-[0.72rem] mb-track-link font-semibold leading-none text-mb-ink-muted"
          >
            {unit}
          </span>
        )}
      </span>
      <button
        type="button"
        ref={plusRef}
        title={`Increase ${label}`}
        aria-label={`Increase ${label}`}
        disabled={disabled || atMax}
        onClick={() => stepBy(step)}
        style={stepperKey(size)}
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
  size = "md",
  id,
  disabled = false,
  className = "",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
  /** Ladder rung of the row. Full ladder — the row is unframed. */
  size?: MbControlSize;
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
   * Hit-target audits measure the input itself — a 28x16 `.mb-switch` input
   * fails even when a label makes the row clickable. So the real control is
   * stretched invisibly over the row, and the track becomes an `aria-hidden`
   * sibling carrying `.mb-switch` for its geometry. The `:checked` face is
   * restated via `peer-checked` because a sibling cannot read `:checked`; the
   * `!` is the unlayered-vs-layered problem noted at the top of the file.
   * Focus-visible outlines the whole row — an honest picture of what is
   * clickable. The row takes the full ladder: it is unframed, so the stretched
   * input's box and the row's box are the same number.
   */
  return (
    <label
      style={{ minHeight: MB_CONTROL_HEIGHT[size] }}
      data-size={size}
      /* `py-1.5` with the `leading-tight` below, so a hinted toggle still
         resolves inside the rung and `minHeight` governs. */
      className={`mb-row-hover relative flex items-center justify-between gap-3 rounded-[4px] px-1 py-1.5 ${
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
      {/* `leading-tight` here rather than on either child, so the label and the
          hint cannot drift apart (`MB_FIELD_LABEL` declares no line-height). */}
      <span className="pointer-events-none min-w-0 leading-tight">
        {/* The same `MB_FIELD_LABEL` as `MbField` — one string, not two
            treatments that merely agree today. */}
        <span
          id={labelId}
          className={`${MB_FIELD_LABEL.className} block`}
        >
          {label}
        </span>
        {hint && (
          <span id={hintId} className="mt-0.5 block text-[0.72rem] text-mb-ink-muted">
            {hint}
          </span>
        )}
      </span>
      {/* Navy when on, matching `.mb-switch:checked` ("the on state is ink,
          not accent"). The real input is the invisible peer, so `:checked`
          never matches this span — these overrides recreate the checked face. */}
      <span
        aria-hidden="true"
        className="mb-switch pointer-events-none block peer-checked:border-mb-navy! peer-checked:bg-mb-navy! peer-checked:after:bg-mb-paper-bright! peer-checked:after:[transform:translateX(11px)]"
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
  size = "md",
  disabled = false,
  className = "",
}: {
  /** Sprite icon id rendered between the state mark and the label. */
  icon?: string;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  children: ReactNode;
  /**
   * Full ladder — this is a `.mb-btn`, so it takes the same rungs as
   * `MbButton`; `sm` is the rung for a filter chip in a dense toolbar.
   */
  size?: MbControlSize;
  disabled?: boolean;
  className?: string;
}) => (
  <button
    type="button"
    aria-pressed={pressed}
    disabled={disabled}
    onClick={() => onPressedChange(!pressed)}
    data-size={size}
    style={{ minHeight: MB_CONTROL_HEIGHT[size] }}
    /* `opacity-40`, not 60: the whole `.mb-btn` family shares one disabled
       reading. */
    className={`mb-btn mb-btn-touch max-w-full ${
      pressed ? "mb-btn-navy" : "mb-btn-outline-navy"
    } ${disabled ? "cursor-not-allowed opacity-40" : ""} ${className}`}
  >
    {/* Second channel: a ballot box carrying an inset square when pressed —
        the same mark `.mb-radio:checked` draws — so on/off reads in greyscale. */}
    <span
      aria-hidden="true"
      style={EDGE_RULE}
      className="inline-flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-[2px] border-solid border-current"
    >
      {/* `rounded-[2px]` matches the mark radius of `.mb-check`/`.mb-radio`,
          whose interior this is. */}
      {pressed && <span className="block h-[6px] w-[6px] rounded-[2px] bg-current" />}
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
 * The team palette: six inks, none of them a colour the system has already
 * spent on a meaning (win green, live red, Draft gold, rank teal, accent
 * coral), each measurably distinct from the others and from every reserved
 * ink, and all clearing 3:1 non-text contrast — the only role a team colour is
 * ever given is a bounded graphical object, never text. The values stay inside
 * the token system (tokens or `color-mix()` over tokens) so they move with the
 * house palette. The recipes live in `@/lib/teamColor` beside the id each one
 * is STORED as — duplicating them here is how a `color-mix()` once ended up in
 * localStorage. A colour stored under the old palette still paints and reads
 * out under a human name (`swatchName`); it simply no longer shows as selected.
 */
export const MB_SWATCH_PALETTE: readonly MbSwatch[] = TEAM_COLOR_IDS.map((id) => ({
  value: TEAM_COLOR_CSS[id],
  label: TEAM_COLOR_LABEL[id],
}));

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const TOKEN_RE = /^var\(\s*(--mb-[a-z0-9-]+)\s*\)$/i;

/**
 * What a person is told this colour is called — never a CSS custom-property
 * name. A palette entry answers with its own label; an off-palette token is
 * turned back into words (`var(--mb-coral-deep)` → "Coral deep"); only a
 * literal hex is shown verbatim, because a hex is a colour a person chose and
 * can read back.
 */
const swatchName = (value: string, palette: readonly MbSwatch[]): string => {
  const named = palette.find((swatch) => swatch.value === value);
  if (named) return named.label;
  if (HEX_RE.test(value)) return value.toUpperCase();
  const token = TOKEN_RE.exec(value);
  if (!token) return "Custom";
  const words = token[1].replace(/^--mb-/, "").replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
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
      : palette.map((entry) => ({
          value: entry,
          label: swatchName(entry, MB_SWATCH_PALETTE),
        }));

  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = swatches.findIndex((swatch) => swatch.value === value);
  const tabbable = selectedIndex >= 0 ? selectedIndex : 0;
  const isHex = HEX_RE.test(value);
  const readout = isHex ? "Custom" : swatchName(value, swatches);
  const customHex = allowCustom && selectedIndex < 0 && isHex ? value : undefined;

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
      {/* 10px, not 8px: the custom-colour input reaches one edge rule back over
          its own border, and targets need ≥8px of clear water. The swatches are
          `.mb-swatch[data-size="touch"]` = 44px; "touch" is the CSS class's own
          selector, not a ladder name. */}
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
                 explicit `sm`-rung square offset back over the edge rule is the
                 only way its own hit box equals the swatch you can see. */
              className="absolute cursor-pointer opacity-0"
              style={{
                left: "calc(var(--mb-rule-edge) * -1)",
                top: "calc(var(--mb-rule-edge) * -1)",
                height: MB_CONTROL_HEIGHT.sm,
                width: MB_CONTROL_HEIGHT.sm,
              }}
            />
          </label>
        )}
      </div>
      {/* `aria-live` because the options in this radiogroup *are* colour: a
          reader arrowing through them has nothing else to go on, and the
          swatch's `aria-label` only announces while it holds focus. */}
      <p
        aria-live="polite"
        className="flex flex-wrap items-center gap-2 text-[0.78rem] text-mb-ink-muted"
      >
        <span className="mb-kicker">Selected</span>
        <span className="font-semibold text-mb-navy">{readout}</span>
        {isHex && <span className="mb-code-chip">{value.toUpperCase()}</span>}
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
  size = "md",
  id,
  disabled = false,
  className = "",
}: {
  value: string[];
  onChange: (value: string[]) => void;
  max?: number;
  placeholder?: string;
  /** Ladder rung of the shell at rest. Framed composite, so `md` or `lg`. */
  size?: MbCompositeSize;
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
      {/* `py-0!` hands the shell's whole interior to the chip row, so the
          shell's `minHeight` governs when empty or holding one row and only
          genuinely wrapped rows grow it (multi-row is off the ladder for the
          same honest reason a textarea is). The gap overrides must be
          important — `.mb-input` sets `gap` unlayered. Column 16px / row 10px
          and no wider: a larger gap stops two chips fitting per row at 390px;
          grouping is carried by weight instead (see the remove key below). */}
      <div
        data-size={size}
        style={{ minHeight: MB_CONTROL_HEIGHT[size] }}
        className={`mb-input flex-wrap gap-x-4! gap-y-2.5! py-0! ${
          disabled ? "opacity-60" : ""
        }`}
      >
        {value.map((tag, index) => (
          /* Wrapper, not a border: it exists so flex-wrap can never break a tag
             away from its own remove key. */
          <span key={tag} className="inline-flex min-w-0 max-w-full items-stretch gap-2.5">
            <span
              className="matchbook-display flex min-w-0 items-center rounded-[3px] border-solid border-mb-navy bg-mb-paper-bright px-2.5 text-[0.78rem] mb-track-display font-bold"
              style={{ ...EDGE_RULE, minHeight: MB_CONTROL_HEIGHT.sm }}
            >
              {/* Not the flex container itself: `text-overflow` is ignored on
                  one, so a long tag would clip with no ellipsis. As a flex
                  *item* this span is blockified and truncates properly. */}
              <span className="min-w-0 truncate">{tag}</span>
            </span>
            {/* Its own 44px key, drawn as a bare mark rather than a second box:
                exactly one box per tag, and the unboxed × reads as an
                appendage of the box it trails rather than a peer of it (an
                un-undoable delete must not share the tag's pressable box).
                Border and tint arrive on hover/focus so the target confirms
                under a pointer; `:focus-visible` still rings the real 44px
                box. */}
            <button
              type="button"
              title={`Remove ${tag}`}
              aria-label={`Remove ${tag}`}
              disabled={disabled}
              onClick={() => removeAt(index)}
              data-size="sm"
              style={{
                ...EDGE_RULE,
                minHeight: MB_CONTROL_HEIGHT.sm,
                width: MB_CONTROL_HEIGHT.sm,
              }}
              className="flex shrink-0 items-center justify-center rounded-[3px] border-solid border-transparent text-mb-ink-muted transition-colors hover:border-mb-navy hover:bg-[var(--mb-tint-2)] hover:text-mb-coral-deep disabled:cursor-not-allowed"
            >
              <MbIcon id="close" size={16} />
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
               that keeps the entry field a legal target has to be important.
               `sm` rung, like the chips it shares a row with. */
            style={{ minHeight: MB_CONTROL_HEIGHT.sm }}
            className="min-w-[4.5rem]! text-base! md:text-[0.9rem]! disabled:cursor-not-allowed"
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
