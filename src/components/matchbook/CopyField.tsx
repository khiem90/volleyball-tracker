"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import { MbIcon } from "./MbIcon";
import { MB_FIELD_LABEL } from "./form";

/**
 * How a copy attempt ended. `"manual"` means every programmatic path was
 * refused and the caller MUST show the value and the keyboard hint — a copy
 * that fails silently is the one outcome this component may never produce
 * (charter Appendix A, D-8).
 */
export type MbCopyOutcome = "clipboard" | "exec" | "manual";

/**
 * The one copy implementation in the app: async clipboard -> execCommand ->
 * caller-driven manual fallback. Never throws.
 *
 * `navigator.clipboard` is absent on insecure origins and refused inside some
 * in-app WebViews; `execCommand` still works there. When both fail the caller
 * selects the text and tells the user to press Ctrl+C.
 */
export const copyToClipboard = async (value: string): Promise<MbCopyOutcome> => {
  if (!value) return "manual";

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return "clipboard";
    }
  } catch {
    /* insecure origin, denied permission, or a WebView — try execCommand */
  }

  try {
    const carrier = document.createElement("textarea");
    carrier.value = value;
    carrier.setAttribute("readonly", "");
    carrier.setAttribute("aria-hidden", "true");
    carrier.style.position = "fixed";
    carrier.style.top = "0";
    carrier.style.left = "0";
    carrier.style.opacity = "0";
    document.body.appendChild(carrier);
    carrier.select();
    carrier.setSelectionRange(0, value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(carrier);
    if (ok) return "exec";
  } catch {
    /* execCommand removed or blocked — fall through to the manual hint */
  }

  return "manual";
};

/** How long the "Copied" confirmation stays up before the field returns to rest. */
const CONFIRM_MS = 2400;

/**
 * `.matchbook-display` pins letter-spacing to 0.02em from an unlayered rule, so
 * a `tracking-*` utility cannot raise it. Composite cells that are not `.mb-btn`
 * carry the button's 0.06em inline instead.
 */
const CELL_TRACK: CSSProperties = { letterSpacing: "0.06em" };

type CopyStatus = "idle" | "copied" | "manual";

export const MbCopyField = ({
  label,
  value,
  secret = false,
  revealable = secret,
  help,
  onCopied,
  inputRef: externalRef,
}: {
  /** Field label above the row. Also names the copy and reveal controls. */
  label: string;
  value: string;
  /** Render the value obscured until it is revealed (admin tokens, admin links). */
  secret?: boolean;
  /** Show the reveal toggle. Defaults to `secret`: a hidden value with no way to
   *  read it cannot be copied by hand when the clipboard is refused. */
  revealable?: boolean;
  /** Resting hint under the field. */
  help?: string;
  onCopied?: () => void;
  /**
   * Optional handle on the value input. An overlay that opens *because* the
   * clipboard was refused needs to hand focus — and therefore the selection —
   * straight to the value; `MbShareAction` passes this to `MbDialog`'s
   * `initialFocus`. Not a charter prop; added because the D-8 fallback is only
   * real if the text is selected without a second failed press.
   */
  inputRef?: RefObject<HTMLInputElement | null>;
}) => {
  const uid = useId();
  const inputId = `mb-copy-${uid}`;
  const msgId = `mb-copy-msg-${uid}`;

  const [revealed, setRevealed] = useState(false);
  const [status, setStatus] = useState<CopyStatus>("idle");
  const localRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef ?? localRef;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasValue = value.length > 0;
  const hidden = secret && !revealed;

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  // The fallback is only real if the value is on screen and selected.
  useEffect(() => {
    if (status !== "manual") return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [status, inputRef]);

  const handleCopy = async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const outcome = await copyToClipboard(value);
    if (outcome === "manual") {
      setRevealed(true);
      setStatus("manual");
      return;
    }
    setStatus("copied");
    onCopied?.();
    timerRef.current = setTimeout(() => setStatus("idle"), CONFIRM_MS);
  };

  const failed = status === "manual";

  const message =
    status === "copied"
      ? { icon: "check", ink: "text-mb-green", text: "Copied to clipboard." }
      : failed
        ? {
            icon: "warning",
            ink: "text-mb-red",
            text: "Your browser blocked the copy. The value is selected — press Ctrl+C (Cmd+C on Mac).",
          }
        : { icon: null, ink: "", text: hasValue ? help : (help ?? "Nothing to copy yet.") };

  return (
    <div className="mb-field" data-invalid={failed || undefined}>
      <label
        htmlFor={inputId}
        className={MB_FIELD_LABEL.className}
        style={MB_FIELD_LABEL.style}
      >
        {label}
      </label>

      {/*
        Three separate keys, not one segmented shell.

        Reveal-a-secret and copy-to-clipboard are different outcomes and one of
        them is irreversible in the way that matters: an admin token put on
        screen has been seen. When the eye and Copy shared an edge the measured
        gap between them was 0px, so a thumb aimed at either could land on the
        other (charter §4.33 wants ≥8px of clear water between targets, and the
        §5.3 sweep counted this pair on every route that shares a link).

        10px, not 8px — `gap-2.5`, the same choice and the same reason as
        `MbSwatchPicker`: sub-pixel layout must not be able to round the
        measured gap under the floor.

        Height is 48px so the row matches the `.mb-input` fields it sits beside
        in a form; each key is its own 4px-radius printed box on the 1.5px navy
        edge the design language reserves for a real edge (§3.3).
      */}
      <div className="flex items-stretch gap-2.5">
        <input
          ref={inputRef}
          id={inputId}
          type={hidden ? "password" : "text"}
          value={value}
          readOnly
          spellCheck={false}
          autoComplete="off"
          aria-describedby={msgId}
          onFocus={(e) => e.currentTarget.select()}
          className={`min-h-[48px] min-w-0 flex-1 rounded-[4px] border-[1.5px] bg-mb-paper-bright px-3 text-[0.85rem] tabular-nums text-mb-navy outline-none ${
            failed ? "border-mb-red" : "border-mb-navy"
          }`}
        />

        {revealable && (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            disabled={!hasValue}
            title={hidden ? `Show ${label}` : `Hide ${label}`}
            aria-label={hidden ? `Show ${label}` : `Hide ${label}`}
            className="flex min-h-[48px] w-11 shrink-0 items-center justify-center rounded-[4px] border-[1.5px] border-mb-navy bg-mb-paper-bright text-mb-navy transition-colors hover:bg-[var(--mb-tint-2)] disabled:text-mb-ink-muted"
          >
            <MbIcon id={hidden ? "eye" : "eye-off"} size={17} />
          </button>
        )}

        <button
          type="button"
          onClick={handleCopy}
          disabled={!hasValue}
          aria-label={`Copy ${label}`}
          style={CELL_TRACK}
          className="matchbook-display flex min-h-[48px] shrink-0 items-center gap-1.5 rounded-[4px] border-[1.5px] border-mb-navy bg-mb-navy px-3.5 text-[0.72rem] font-semibold text-mb-paper-bright transition-[filter] hover:brightness-125 disabled:bg-[var(--mb-tint-3)] disabled:text-mb-ink-muted"
        >
          <MbIcon id={status === "copied" ? "check" : "copy"} size={14} />
          Copy
        </button>
      </div>

      {/* Height is reserved so a confirmation never shifts the form. */}
      <p
        id={msgId}
        role="status"
        aria-live="polite"
        className={`flex min-h-[1.05rem] items-start gap-1.5 text-[0.72rem] ${
          failed ? "text-mb-navy" : "text-mb-ink-muted"
        }`}
      >
        {message.icon && (
          <MbIcon id={message.icon} size={12} className={`mt-[2px] shrink-0 ${message.ink}`} />
        )}
        {message.text}
      </p>
    </div>
  );
};
