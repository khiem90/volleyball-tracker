"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRef, type ReactNode, type RefObject } from "react";
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

/**
 * Gives a controlled Radix overlay the focus restoration it silently loses
 * (rubric HF-15, charter invariant 46).
 *
 * `DialogContentModal` composes its own close handler *after* whatever the
 * caller passes:
 *
 * ```js
 * onCloseAutoFocus: composeEventHandlers(props.onCloseAutoFocus, (event) => {
 *   event.preventDefault();
 *   context.triggerRef.current?.focus();
 * })
 * ```
 *
 * `triggerRef` is populated by `<Dialog.Trigger>` and by nothing else.
 * `MbDialog` and `MbSheet` are driven by an `open` prop and render no Trigger,
 * so `triggerRef.current` is `null`: the `?.focus()` is a no-op **and** the
 * `preventDefault()` also cancels `FocusScope`'s own
 * `focus(previouslyFocusedElement ?? document.body)` fallback. Focus therefore
 * landed on `<body>` on every close — Escape, outside-click and the close
 * button alike.
 *
 * So own both halves. `capture` runs from `onOpenAutoFocus`, which `FocusScope`
 * dispatches *after* reading `document.activeElement` and *before* moving
 * focus, so the opener is still the active element. `onCloseAutoFocus` calls
 * `preventDefault` first — which is what skips Radix's null-trigger handler —
 * and then restores the opener itself.
 *
 * ### Why the opener's parent is recorded too
 *
 * The commonest destructive confirm destroys the very row that opened it, so
 * "focus the opener" has no opener to focus — and `<body>` is precisely the
 * failure HF-15 names. The parent is captured while the opener is still
 * attached (after `remove()` its own `parentElement` is already `null`), which
 * gives the ladder below a rung that keeps the user *in the region they were
 * working in*: the list that used to hold the row, not the top of the
 * document.
 *
 * The ladder, first rung that actually takes focus wins:
 * opener → nearest surviving ancestor of the opener → `#mb-main` (invariant 3)
 * or a `<main>` → `<body>`. Each rung is verified against
 * `document.activeElement` rather than assumed, because `focus()` on a hidden
 * or `inert` node silently does nothing.
 */
export const useMbFocusRestore = () => {
  const openerRef = useRef<{ el: HTMLElement; parent: HTMLElement | null } | null>(null);

  const capture = () => {
    const active = document.activeElement;
    openerRef.current =
      active instanceof HTMLElement && active !== document.body
        ? { el: active, parent: active.parentElement }
        : null;
  };

  const restore = (event: Event) => {
    event.preventDefault();
    const opener = openerRef.current;
    openerRef.current = null;

    /** Focuses `node`, making it programmatically focusable first if it is not
     *  already, and reports whether focus actually moved there.
     *
     *  A borrowed `tabindex` is handed back on blur. It never joins the tab
     *  order at -1, but leaving it behind would put a permanent phantom in
     *  every "interactive elements" sweep — `audit.mjs`'s included — on a node
     *  this hook does not own. */
    const land = (node: HTMLElement | null | undefined): boolean => {
      if (!node?.isConnected) return false;
      if (!node.hasAttribute("tabindex") && node.tabIndex < 0) {
        node.setAttribute("tabindex", "-1");
        node.addEventListener("blur", () => node.removeAttribute("tabindex"), { once: true });
      }
      node.focus({ preventScroll: true });
      return document.activeElement === node;
    };

    if (land(opener?.el)) return;

    let ancestor = opener?.parent ?? null;
    while (ancestor && !ancestor.isConnected) ancestor = ancestor.parentElement;
    if (land(ancestor)) return;

    if (land(document.getElementById("mb-main"))) return;
    if (land(document.querySelector<HTMLElement>("main"))) return;
    land(document.body);
  };

  return { capture, restore };
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
  /* Ahead of the null-content bail-out: a hook may not sit behind a return. */
  const focus = useMbFocusRestore();

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
              focus.capture();
              if (!initialFocus?.current) return;
              event.preventDefault();
              initialFocus.current.focus();
            }}
            onCloseAutoFocus={focus.restore}
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
                {/* The title wraps and is never clipped. A truncated title is
                    a rubric hard fail (HF-14) on any dialog and an outright
                    trap on a destructive one — "Reset the Saturday evening
                    double-elimination consolation br…" does not tell you what
                    you are about to destroy. `break-words` also catches a
                    single unbroken token wider than the frame. */}
                <DialogPrimitive.Title className="matchbook-display flex min-w-0 items-start gap-2 text-[0.95rem] font-bold tracking-[0.05em]">
                  {icon && (
                    <MbIcon
                      id={icon}
                      size={16}
                      /* Optically centres a 16px glyph on the 23px first line;
                         with `items-start` it must not ride the whole block. */
                      className={`mt-[3px] shrink-0 ${HEAD_ICON_TONE[tone]}`}
                    />
                  )}
                  <span className="min-w-0 break-words">{title}</span>
                </DialogPrimitive.Title>
              </div>
              {dismissible && (
                <DialogPrimitive.Close
                  /* `self-start` pins the 44px target to the corner. Without it
                     `.mb-dialog-head`'s `align-items: center` walks it down the
                     block as soon as the title takes a second or third line —
                     and the 12px header gap is what keeps it clear of the text
                     (invariant 33's 8px separation floor). */
                  className={`mb-btn-touch -my-2 -mr-2 inline-flex shrink-0 items-center justify-center self-start rounded-[3px] transition-colors ${
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
