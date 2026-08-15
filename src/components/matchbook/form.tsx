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
   Matchbook form kit (charter §2.3 "Controls", GAP-6).

   Every control is a thin typed wrapper over the classes already in
   globals.css — .mb-field, .mb-input, .mb-textarea, .mb-select-native,
   .mb-stepper, .mb-switch, .mb-swatch. Nothing here invents styling.

   Four implementation notes that repeat below:

   1. `text-base! md:text-[0.9rem]!` — the 16px-on-mobile idiom that stops iOS
      from zooming on focus, dropping to `body/md` above `md`. The `!` is
      load-bearing: `.mb-input input`, `.mb-textarea` and `.mb-select-native`
      live outside any cascade layer, and unlayered rules outrank every
      Tailwind utility (which ship inside `@layer utilities`) no matter the
      specificity or source order.

      It was `md:text-sm!` = 14px, against the 14.4px `body/md` that
      `.mb-input input` itself declares and that every field NOT wrapped by
      this file therefore rendered. Two field text sizes coexisted 0.4px
      apart, which is too close to read as a distinction and too far to be
      one size. `0.9rem` is the named step; `text-sm` is a Tailwind default
      that happens to be nearby.
   2. Heights come from the one ladder in `Button.tsx` — `MB_CONTROL_HEIGHT`
      for a plain control, `MB_CONTROL_CELL` for the interior of a framed
      composite. None of the .mb-* classes set a height, so the component is
      the only place a rung can live.
   3. Charter §4.33 is a hard fail measured by a scripted `getBoundingClientRect`
      sweep over `button,a,input,select,textarea,[role=button],[tabindex]`. That
      sweep reads the *control's own* box, not the box of the label wrapping it,
      so every `<input>` here is stretched to fill its shell rather than left at
      its ~19px line box. Where that is impossible without repainting a .mb-*
      recipe (the switch), the real input becomes the full-row hit target and
      the visual track moves to an `aria-hidden` sibling.
   4. Border widths are `--mb-rule-edge`, never a `1.5px` literal. The literal
      renders 1px anyway (design language §3.3 measured it), so writing the
      token loses nothing and stops the kit carrying a number that does not
      exist. Set through `style` rather than `border-[…]` so there is no
      arbitrary-value type ambiguity between a width and a colour.
   --------------------------------------------------------------------------- */

/** Every framed edge in this file. One object, so they cannot drift apart. */
const EDGE_RULE: CSSProperties = { borderWidth: "var(--mb-rule-edge)" };

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
 * The rung is the class `mb-track-nav`, not an inline `letterSpacing`. It used
 * to have to be inline: `.matchbook-display` set `letter-spacing: 0.02em` from
 * an UNLAYERED rule, and every Tailwind `tracking-*` utility ships inside
 * `@layer utilities`, which loses to unlayered CSS regardless of specificity.
 * That declaration now lives in `@layer components` (globals.css), so both the
 * utility and the rung win and the workaround is gone.
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
   * Ladder rung of the field box: `md` (48px, the default and what every
   * shipped field already was) or `lg` (56px) beside a commit control.
   *
   * `sm` is absent for the same reason it is absent from `MbSegmented` and
   * `MbNumberStepper`: `.mb-input` is a frame around a target, the frame
   * spends `--mb-rule-edge` twice, and a 44px shell would leave the `<input>`
   * itself at 42px — under the floor the §4.33 sweep measures. The field had
   * no size axis at all before, which is half of why a wizard row could not be
   * made to line up.
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
          the input, so its own hit box is `MB_CONTROL_CELL[size]` — 46px at
          `md`, 54px at `lg`, both clear of the 44px floor. The shell keeps its
          0.8rem horizontal padding, so nothing moves optically. */}
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
      /* No size axis, and deliberately so: a textarea is measured in rows, not
         in rungs. Its `min-height: 5rem` is two lines plus the frame, which is
         a different unit of meaning to "the height a control has to be so a
         thumb can hit it". It is the one control in the kit that is honestly
         off the ladder. */
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
   * Ladder rung, and here it is the **full** ladder including `sm`: unlike
   * `.mb-input`, `.mb-select-native` is not a frame around a target — the
   * bordered element *is* the `<select>`, so its box and its hit box are the
   * same 44/48/56.
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
        /* `tabular-nums` because select labels routinely carry a measure —
           "Court 2", "Round 11", "21 points" — and §4.9 wants those figures on
           the same rhythm as every other numeral.

           `0.95rem` is `display/panel-title`, which is also what
           `.mb-select-native` itself declares — this restates the step at the
           `md` breakpoint rather than introducing one. */
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
 * The ± keys, sized off the ladder rather than off `.mb-stepper button`'s own
 * 44/56px.
 *
 * This is the whole 46/58 fix. `.mb-stepper` is `align-items: stretch`, so the
 * shell used to be "whatever the keys are, plus my two edge rules" — 44+2 = 46
 * and 56+2 = 58, two numbers on nobody's ladder. Now the shell states the rung
 * and the keys take the interior, so the outer box is 48/56 and the keys are
 * 46/54 — still comfortably over the floor.
 *
 * `style`, not a class: `.mb-stepper button` and
 * `.mb-stepper[data-size="lg"] button` both set `width`/`min-height` from
 * outside every cascade layer, so a Tailwind utility would need an
 * `!important` and a pair of hand-written literals to beat them. An inline
 * declaration outranks any author rule that is not `!important`, which lets
 * the number come from `MB_CONTROL_CELL` and stay there.
 */
const stepperKey = (size: MbCompositeSize): CSSProperties => ({
  width: MB_CONTROL_CELL[size],
  minHeight: MB_CONTROL_CELL[size],
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
   * Ladder rung of the **shell**: `md` = 48px, `lg` = 56px. It was `"sm" |
   * "lg"` and measured 46 / 58, because the rung was being applied to the ±
   * keys and the shell then added its own two edge rules on top.
   *
   * No `sm`: see `MbCompositeSize` in `Button.tsx`. A 44px shell leaves 42px
   * keys, and the keys are the targets.
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
   * Where focus goes when the key you are pressing is about to disable itself.
   *
   * Measured in the quick-add sheet at 390px: stepping the count up to its
   * maximum left `document.activeElement` on `<body>` — the pressed key had
   * become `disabled` under the finger, and a focused disabled button drops
   * focus to the document. Inside a modal that is the worst rung on the
   * ladder: the reader is silently outside the dialog they are still looking
   * at, and a screen reader loses the sheet's context mid-task. (Radix's focus
   * scope pulls the next Tab back in, so the trap itself holds — this is the
   * gap between the two keystrokes.)
   *
   * The opposite key takes it. It is 46px away, it is guaranteed live the
   * moment its partner dies, and it is the only control the user can now want:
   * having hit the ceiling, the next press is downward. The value input is the
   * other candidate and is rejected — it selects its own contents on focus and
   * raises the on-screen keyboard over the sheet, which is exactly the
   * disruption `QuickAddTeams` avoids by declining `initialFocus`.
   *
   * Only when the key is *actually* focused, so a mouse press that never took
   * focus does not move it either.
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
      /* The rung lands on the shell — the box a caller lines a text field up
         against — and the keys take the interior via STEPPER_KEY. `data-size`
         is kept because `.mb-stepper[data-size="lg"] .mb-stepper-value` is
         what steps the numeral's own font size. */
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
          /* `self-stretch` takes the full interior height of the shell and
             `min-w-[44px]` the width, so the editable figure is itself a legal
             target — `${chars}ch` only ever widens it for 3+ digit bounds. */
          className="min-w-[44px] self-stretch border-0 bg-transparent p-0 text-center disabled:cursor-not-allowed"
          style={{
            width: `${chars}ch`,
            font: "inherit",
            fontVariantNumeric: "tabular-nums",
          }}
        />
        {unit && (
          <span
            /* `display/link`, rung and all — `mb-track-link` carries the
               0.04em that used to be inline here, for the reason
               `MB_FIELD_LABEL` documents.

               `leading-none` so a one-word unit cannot add a half-line to the
               shell and take it back off the rung, and `self-center` so it
               sits on the figure's optical centre rather than stretching. */
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
   * The charter asks for the whole row to be the hit target, and the §4.33
   * sweep measures the input itself — a 28x16 `.mb-switch` input fails it
   * even when a label makes the row clickable. So the real control is stretched
   * over the row and made invisible, and the track becomes an `aria-hidden`
   * sibling carrying `.mb-switch` for its geometry. Only the three `:checked`
   * declarations are restated here (via `peer-checked`), because a sibling
   * cannot read the input's `:checked`; the `!` is the same unlayered-vs-layered
   * problem noted at the top of the file. Focus-visible now outlines the entire
   * row, which is an honest picture of what is clickable.
   *
   * The row takes the full ladder — it is unframed, so the stretched input's
   * box and the row's box are the same number — and defaults to `md` like
   * every other standalone control. It was pinned at 44px, which put a boolean
   * field 4px shorter than the text field above it in the same column.
   */
  return (
    <label
      style={{ minHeight: MB_CONTROL_HEIGHT[size] }}
      data-size={size}
      /* `py-1.5` with the `leading-tight` below, not `py-2` at the inherited
         1.5: a toggle carrying a hint measured 55.66px — two lines of text at
         1.5 leading plus 16px of padding — so a hinted toggle and a plain one
         were different controls, and 55.66 sits 0.34px off the `lg` rung,
         which reads as a mistake rather than a size. Both variants now resolve
         inside the rung (45.4px of content at most) and `minHeight` governs. */
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
          hint cannot drift apart. It is a leading, not a type step —
          `MB_FIELD_LABEL` declares no line-height, so this adds to the shared
          treatment instead of overriding part of it. */}
      <span className="pointer-events-none min-w-0 leading-tight">
        {/* The same `MB_FIELD_LABEL` as `MbField` and `MbCopyField`, not a
            hand-rolled copy of it. Written out it once *looked* identical and
            measured 0.272px here against 1.088px on a text field's label,
            because a tracking utility was a layered rule and
            `.matchbook-display` set `letter-spacing: 0.02em` unlayered. That
            declaration is in `@layer components` now and the rung is the class
            `mb-track-nav`, so the trap is gone — but the constant stays: a
            switch's label and a text field's label sit in the same column of
            the same form and resolve to one treatment because they are one
            string, not two that agree today. */}
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
   * `MbButton` and its `md` is the same 48px. `sm` is the rung for a filter
   * chip packed into a dense toolbar, which is the case this control was
   * silently pinned to before it had a size axis at all.
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
      style={EDGE_RULE}
      className="inline-flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-[2px] border-solid border-current"
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
 * The team palette — six inks, and the reason there are six rather than eight.
 *
 * The eight it replaces were the house palette handed over whole, which put two
 * defects in front of anyone naming a team.
 *
 * 1. **It sold colours the system had already spent.** Design language §1.2
 *    fixes `--mb-gold` = Draft, `--mb-green` = win / final / active,
 *    `--mb-red` = loss / live, `--mb-ink-muted` = idle, `--mb-teal` = the
 *    rank-1 rail, `--mb-coral` = the app's one accent. Offer those as team
 *    colours and a green accent bar lands beside a green W on the same form
 *    guide: the reader has to work out which green is about the team and which
 *    is about the result. Identity and status were being printed in one ink.
 * 2. **Two of the eight were the same colour.** `--mb-coral` (#ee4b34) and
 *    `--mb-red` (#cf3f32) sat stacked in the grid at ΔE 6.8 in OKLab. §1 of the
 *    design language already says the pair "must never sit adjacent"; a
 *    first-run reader simply could not tell the two swatches apart.
 *
 * So the palette is measured rather than assembled. Every ink is at least
 * **ΔE 11.5** from every reserved meaning and at least **ΔE 12.6** from every
 * other ink — 1.7x and 1.9x the coral/red distance that failed. Resolved
 * against `--mb-paper` (#f7f0e4):
 *
 * | ink   | resolves to | vs paper | vs bright | nearest reserved meaning  |
 * | ----- | ----------- | -------- | --------- | ------------------------- |
 * | Navy  | `#07324d`   | 11.79    | 12.84     | idle grey       ΔE 22.2   |
 * | Teal  | `#095857`   |  7.28    |  7.93     | idle grey       ΔE 11.5   |
 * | Plum  | `#5a347d`   |  8.34    |  9.09     | idle grey       ΔE 16.7   |
 * | Rose  | `#934161`   |  5.85    |  6.37     | CTA coral-deep  ΔE 12.8   |
 * | Lilac | `#9077a7`   |  3.44    |  3.75     | idle grey       ΔE 12.0   |
 * | Ochre | `#9a855e`   |  3.15    |  3.43     | Draft gold-ink  ΔE 12.4   |
 *
 * All six clear the 3:1 that WCAG 2.1 §1.4.11 asks of a bounded graphical
 * object, which is the only role a team colour is ever given: a 3px bar beside
 * the crest (charter D-9) and the 44px chip in this picker. None of them is
 * ever text, so 4.5:1 is not the applicable floor.
 *
 * The values stay inside the token system — a literal hex would freeze the ink
 * against a future paper stock (charter §4 invariant 10). Three are tokens
 * outright; three are `color-mix()` over tokens, so they still move when the
 * house palette moves. `allowCustom` remains the escape hatch for a club that
 * owns its own colour.
 *
 * A stored colour from the old eight still paints, and still reads out under a
 * human name (see `swatchName`) — it simply no longer shows as selected here.
 *
 * The six recipes themselves now live in `@/lib/teamColor`, beside the id each
 * one is STORED as. They were duplicated here and in `QuickAddTeams`, and a
 * team's saved colour was one of these expressions verbatim — which is how a
 * `color-mix()` ended up in localStorage and, uppercased, on a team's profile.
 * The picker offers what storage can name, and cannot drift from it.
 */
export const MB_SWATCH_PALETTE: readonly MbSwatch[] = TEAM_COLOR_IDS.map((id) => ({
  value: TEAM_COLOR_CSS[id],
  label: TEAM_COLOR_LABEL[id],
}));

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const TOKEN_RE = /^var\(\s*(--mb-[a-z0-9-]+)\s*\)$/i;

/**
 * What a person is told this colour is called.
 *
 * The row under the swatches used to print the **CSS custom property** —
 * `--MB-GREEN`, uppercased by `.mb-code-chip`, to someone naming a volleyball
 * team. A token name is an implementation detail: it is not a colour, it is not
 * English, and it is the one string on that screen the reader cannot act on.
 *
 * So a palette entry answers with its own name; an off-palette token is turned
 * back into words (`var(--mb-coral-deep)` → "Coral deep"), which covers both a
 * caller passing its own token list and a team saved under the old palette; and
 * only a literal hex is shown verbatim, because a hex is a colour a person
 * chose and can read back.
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
          its own border, and §4.33 wants ≥8px of clear water between targets.

          The swatches themselves are `.mb-swatch[data-size="touch"]` = 44px =
          the ladder's `sm` rung, which is the right rung for a target that
          only ever appears inside a group of its own kind. `data-size="touch"`
          is the CSS class's own selector, not a ladder name — it stays as it
          is until globals.css renames it. */}
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
      {/* The one line under the grid, and it now names a colour.
          `aria-live` because the options in this radiogroup *are* colour: a
          reader moving through them with the arrow keys has nothing else to
          go on, and the swatch's `aria-label` is only announced while it holds
          focus. The hex is kept in a `.mb-code-chip` — a hex is a reference
          value a person typed and can read back, which is exactly what that
          chip is for; a token name never was. */}
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
      {/* `py-0!` hands the shell's whole interior to the chip row.

          It was `py-[2px]!`, which measured 50px with one row of chips —
          44px chip + 4px padding + 2 edge rules — so a tag field sat 2px
          proud of every other field on the page the moment it held a tag, and
          landed on no rung at all. At `py-0!` the shell's `minHeight` governs
          when it is empty or holds one row (48px, with the 44px chips centred
          in the 46px interior), and only genuinely wrapped rows grow it. A
          multi-row field is off the ladder for the same honest reason a
          textarea is.

          The gaps are overridden because the chip is now two keys, not one
          box (see below). `.mb-input` sets `gap: 0.6rem` (9.6px) unlayered, so
          the override has to be important.

          Column 16px / row 10px against the 10px *inside* a chip. 24px was
          tried, to buy a 2.4x proximity ratio, and rejected on measurement: at
          390px it stops two chips fitting on one row, so a 2-tag field grew
          from 60px to 114px. Grouping is carried by weight instead of by
          distance — see the remove key below — which costs no height. */}
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
            {/* Its own 44px key, 10px of paper in front of it, but drawn as a
                bare mark rather than a second box.

                Sharing the tag's box put an unconfirmed, un-undoable delete
                0px from the word and inside the same border, so the whole
                100–130px chip read as one pressable object of which 44px
                destroyed it. Splitting it out fixed that but, given a border,
                introduced a second problem: a two-tag row became four outlined
                boxes at 10/16/10px, and 1.6x is not enough distance for
                proximity alone to say which × belongs to which tag.

                So the pair is grouped by weight, not distance. Exactly one box
                per tag — the navy-edged face — and the remove key is an
                unboxed mark at rest, which reads as an appendage of the box it
                trails rather than a peer of it. The 44px target and the 8px
                floor are untouched; only the paint changed. The border and
                tint arrive on hover/focus, so the target is confirmed the
                moment a pointer is on it, and `:focus-visible` still puts the
                house ring around the real 44px box for keyboard users. */}
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
