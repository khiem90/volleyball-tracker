"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode, RefObject } from "react";
import { MbIcon } from "./MbIcon";

export type MbDialogTone = "paper" | "navy" | "danger";
export type MbDialogSize = "sm" | "md" | "lg";

/**
 * True when `node` will actually paint something.
 *
 * `MbDialog` must not mount a portal for content that resolved to null —
 * `ShareSession` returns null outside shared mode and would otherwise leave an
 * empty overlay in the tree (charter W1 acceptance 6).
 */
const hasContent = (node: ReactNode): boolean => {
  if (node === null || node === undefined || node === false || node === true) return false;
  if (node === "") return false;
  if (Array.isArray(node)) return node.some(hasContent);
  return true;
};

/** Charter §2.3: sm/md/lg are 26 / 32 / 42rem. */
const SIZE_WIDTH: Record<MbDialogSize, string> = {
  sm: "sm:w-[26rem]",
  md: "sm:w-[32rem]",
  lg: "sm:w-[42rem]",
};

const HEAD_ICON_TONE: Record<MbDialogTone, string> = {
  paper: "",
  navy: "text-mb-gold",
  danger: "text-mb-red",
};

export const MbDialogBody = ({
  children,
  flush = false,
  className = "",
}: {
  children: ReactNode;
  /**
   * Drops the 1rem inset so rows can run edge to edge — ledgers, rosters and
   * any list whose hover tint or rules must reach the frame. Applied inline
   * because `.mb-dialog-body` is unlayered CSS and a `p-0` utility loses to it.
   */
  flush?: boolean;
  className?: string;
}) => (
  <div
    className={`mb-dialog-body ${className}`}
    style={flush ? { padding: 0 } : undefined}
  >
    {children}
  </div>
);

/**
 * Below `sm` a dialog is a bottom sheet, so its buttons stretch to fill the row:
 * the primary action lands in the thumb zone at full width (invariant 35).
 * From `sm` up they shrink back to their labels and sit right-aligned.
 * Only direct `<button>` children are affected — a status label keeps its size.
 */
export const MbDialogFooter = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={`mb-dialog-foot [&>button]:flex-1 sm:[&>button]:flex-none ${className}`}
  >
    {children}
  </div>
);

export const MbDialog = ({
  open,
  onOpenChange,
  title,
  icon,
  kicker,
  description,
  tone = "paper",
  size = "md",
  mobile = "sheet",
  dismissible = true,
  initialFocus,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Sprite icon id shown before the title. */
  icon?: string;
  /** Optional eyebrow above the title. */
  kicker?: string;
  description?: ReactNode;
  tone?: MbDialogTone;
  size?: MbDialogSize;
  /** Presentation below `sm`: a bottom sheet (default) or a centred card. */
  mobile?: "sheet" | "center";
  /** When false the close control, Escape and outside-click are all withheld. */
  dismissible?: boolean;
  /** Focused instead of the first tabbable node when the dialog opens. */
  initialFocus?: RefObject<HTMLElement | null>;
  children: ReactNode;
}) => {
  if (!hasContent(children)) return null;

  const sheet = mobile === "sheet";
  const navy = tone === "navy";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="mb-dialog-overlay z-50" />
        {/* Positioner. Kept free of `.mb-dialog` so its flex centring is not
            outranked by that class's animation fill, and pointer-transparent so
            a click lands on the overlay behind it and dismisses. */}
        <div
          className={`pointer-events-none fixed inset-0 z-50 flex flex-col ${
            sheet
              ? "justify-end sm:items-center sm:justify-center sm:p-4"
              : "items-center justify-center p-4"
          }`}
        >
          <DialogPrimitive.Content
            data-tone={tone}
            /* With no <Description>, Radix logs a dev warning unless
               aria-describedby is explicitly undefined. Spread it only in that
               case — passing the key at all would unwire a real description. */
            {...(description ? null : { "aria-describedby": undefined })}
            onOpenAutoFocus={(event) => {
              if (!initialFocus?.current) return;
              event.preventDefault();
              initialFocus.current.focus();
            }}
            onEscapeKeyDown={(event) => {
              if (!dismissible) event.preventDefault();
            }}
            onInteractOutside={(event) => {
              if (!dismissible) event.preventDefault();
            }}
            className={`mb-dialog pointer-events-auto w-full outline-none ${SIZE_WIDTH[size]} ${
              sheet
                ? // The 6px overhang drops the sheet's bottom border and its 4px
                  // bottom radius below the viewport, so it reads as anchored to
                  // the screen edge; the matching padding keeps the footer clear.
                  "-mb-[6px] pb-[6px] sm:mb-0 sm:max-w-[calc(100vw-2rem)] sm:pb-0"
                : "max-w-[calc(100vw-2rem)]"
            }`}
          >
            <header className="mb-dialog-head">
              <div className="flex min-w-0 flex-col gap-0.5">
                {kicker && (
                  <span
                    className="mb-kicker"
                    /* .mb-kicker is ink-muted, which invariant 11 forbids on navy. */
                    style={navy ? { color: "var(--mb-paper-bright)" } : undefined}
                  >
                    {kicker}
                  </span>
                )}
                <DialogPrimitive.Title className="matchbook-display flex min-w-0 items-center gap-2 text-[0.95rem] font-bold tracking-[0.05em]">
                  {icon && (
                    <MbIcon id={icon} size={16} className={`shrink-0 ${HEAD_ICON_TONE[tone]}`} />
                  )}
                  <span className="truncate">{title}</span>
                </DialogPrimitive.Title>
              </div>
              {dismissible && (
                <DialogPrimitive.Close
                  className={`mb-btn-touch -my-2 -mr-2 inline-flex shrink-0 items-center justify-center rounded-[3px] transition-colors ${
                    navy ? "hover:bg-[var(--mb-tint-on-navy)]" : "hover:bg-[var(--mb-tint-2)]"
                  }`}
                  title="Close"
                  aria-label="Close"
                >
                  <MbIcon id="close" size={18} />
                </DialogPrimitive.Close>
              )}
            </header>

            {description && (
              <DialogPrimitive.Description className="border-b border-mb-rule px-4 py-3 text-[0.85rem] leading-[1.5] text-mb-ink-muted">
                {description}
              </DialogPrimitive.Description>
            )}

            {children}
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
