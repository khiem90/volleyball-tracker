"use client";

import { useEffect, useRef, useState } from "react";
import { MbButton, type MbButtonSize } from "./Button";
import { MbIconButton, type MbIconButtonTone } from "./IconButton";
import { MbDialog, MbDialogBody } from "./Dialog";
import { MbCopyField, copyToClipboard } from "./CopyField";
import { MbNotice } from "./Notice";

/**
 * How a share attempt ended.
 *
 * `dismissed` is the user closing the OS share sheet — a decision, not a
 * failure, so it produces no confirmation and no fallback. `manual` means every
 * programmatic path was refused and the link has to be handed to the user to
 * copy by hand.
 */
export type MbShareOutcome = "shared" | "copied" | "dismissed" | "manual";

/**
 * The one share implementation in the app: native share sheet -> clipboard ->
 * manual. Never throws.
 *
 * `navigator.share` exists only on secure origins, needs a user gesture, and is
 * absent on every desktop browser except Safari and Edge; the clipboard leg
 * carries those. Callers must handle `"manual"` visibly — `MbShareAction` does
 * it by opening the fallback dialog below.
 */
export const shareLink = async ({
  url,
  title,
  text,
}: {
  url: string;
  title: string;
  text: string;
}): Promise<MbShareOutcome> => {
  const data: ShareData = { title, text, url };

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    const shareable =
      typeof navigator.canShare === "function" ? navigator.canShare(data) : true;
    if (shareable) {
      try {
        await navigator.share(data);
        return "shared";
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return "dismissed";
        /* refused by policy or the WebView — fall through to the clipboard */
      }
    }
  }

  return (await copyToClipboard(url)) === "manual" ? "manual" : "copied";
};

/** How long the inline confirmation stays up before the control returns to rest. */
const CONFIRM_MS = 2400;

type ShareStatus = "idle" | "copied" | "shared";

/** Every state the button label can hold, so the widest one can reserve the box. */
const STATUS_ORDER: ShareStatus[] = ["idle", "copied", "shared"];

const ANNOUNCEMENT: Record<ShareStatus, string> = {
  idle: "",
  copied: "Link copied to clipboard.",
  shared: "Link shared.",
};

export const MbShareAction = ({
  url,
  title,
  text,
  variant,
  label = "Share",
  tone,
  size = "md",
  disabled = false,
  onResult,
  className = "",
}: {
  url: string;
  /** Share-sheet heading. Also names the link in the manual fallback. */
  title: string;
  /** Share-sheet body. */
  text: string;
  variant: "button" | "icon";
  /** Resting verb. Must contain the visible word when a caller restyles it. */
  label?: string;
  /** `.mb-btn` variant. Defaults to `navy` for `button`, `plain` for `icon`. */
  tone?: MbIconButtonTone;
  /** Button variant only. */
  size?: MbButtonSize;
  disabled?: boolean;
  /**
   * Fires on every attempt, including `dismissed`. W2 wires this to `toast()`
   * in P2b; until then the control carries its own confirmation, so a share is
   * never silent either way.
   */
  onResult?: (outcome: MbShareOutcome) => void;
  className?: string;
}) => {
  const [status, setStatus] = useState<ShareStatus>("idle");
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const handleShare = async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const outcome = await shareLink({ url, title, text });
    onResult?.(outcome);

    if (outcome === "manual") {
      setStatus("idle");
      setFallbackOpen(true);
      return;
    }
    if (outcome === "dismissed") {
      setStatus("idle");
      return;
    }
    setStatus(outcome);
    timerRef.current = setTimeout(() => setStatus("idle"), CONFIRM_MS);
  };

  const LABEL: Record<ShareStatus, string> = {
    idle: label,
    copied: "Copied",
    shared: "Shared",
  };

  return (
    <span className={`inline-flex items-center ${className}`}>
      {variant === "icon" ? (
        <MbIconButton
          icon={status === "idle" ? "share" : "check"}
          /* The name never changes: the icon carries the visual confirmation
             and the live region carries the spoken one, so the control keeps
             one stable accessible name (WCAG 2.5.3). */
          label={label}
          tone={tone ?? "plain"}
          disabled={disabled}
          onClick={handleShare}
        />
      ) : (
        <MbButton
          variant={tone && tone !== "plain" ? tone : "navy"}
          size={size}
          icon={status === "idle" ? "share" : "check"}
          disabled={disabled}
          onClick={handleShare}
        >
          {/* All three labels share one grid cell, so the button is always as
              wide as its widest state and the confirmation cross-fades in place
              instead of reflowing the action row. */}
          <span className="grid justify-items-center">
            {STATUS_ORDER.map((state) => (
              <span
                key={state}
                aria-hidden={state !== status}
                className={`col-start-1 row-start-1 transition-opacity duration-[var(--mb-dur-base)] ease-[var(--mb-ease-out)] ${
                  state === status ? "opacity-100" : "opacity-0"
                }`}
              >
                {LABEL[state]}
              </span>
            ))}
          </span>
        </MbButton>
      )}

      <span role="status" aria-live="polite" className="sr-only">
        {ANNOUNCEMENT[status]}
      </span>

      {/* Total refusal is never silent: the link comes back on screen, already
          selected, with the keyboard instruction (charter Appendix A, D-8). */}
      {fallbackOpen && (
        <MbDialog
          open
          onOpenChange={setFallbackOpen}
          title="Copy this link"
          icon="link"
          size="sm"
          initialFocus={valueRef}
        >
          <MbDialogBody className="flex flex-col gap-3">
            <MbNotice tone="warn" title="Your browser blocked sharing">
              Neither the share sheet nor the clipboard was available. The link is selected below —
              press Ctrl+C (Cmd+C on Mac) to copy it.
            </MbNotice>
            <MbCopyField
              label={title}
              value={url}
              inputRef={valueRef}
              help="Selected and ready — press Ctrl+C (Cmd+C on Mac)."
            />
          </MbDialogBody>
        </MbDialog>
      )}
    </span>
  );
};
