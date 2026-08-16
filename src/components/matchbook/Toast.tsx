"use client";

/* ===========================================================================
   THE TOAST (charter §2.3, GAP-2, W2 / P2b)

   Three exports, one object:

     MbToast     the paper strip itself — presentational, no state, no timer.
                 Anything that already owns its own lifecycle (the undo stack)
                 renders this directly.
     useToast()  { toast, dismiss, dismissAll } — the imperative API.
     ToastHost   the one fixed stack. Mounted once, app-wide.

   ------------------------------------------------------- why a module store

   The queue lives in a MODULE-level store read through `useSyncExternalStore`,
   not in a React context. Three reasons, in order of how much they cost:

     1. `toast()` has to be callable from places that are not a component —
        a catch block in `src/lib/*`, a Firestore error callback, an event
        handler defined outside the tree. A context hook cannot be called
        there; a module function can.
     2. `useToast()` returns the SAME object on every render (the functions are
        module constants), so it can sit in a dependency array without being
        the reason an effect re-runs. A context value has to be memoised by
        hand and usually is not.
     3. No provider means no provider to forget. `ToastHost` is the only mount,
        and if it is missing the toasts queue silently rather than throwing —
        which is the correct failure mode for a notification, and the opposite
        of what `useUndo()` does deliberately for a data contract.

   The cost is that two `ToastHost`s would render the same queue twice. That is
   why the host is mounted exactly once, from `GlobalUndoToast`.

   --------------------------------------------------------------- the motion

   Entrance is `.mb-toast`'s own `mb-enter` keyframe — opacity + translateY,
   token-timed, and already cancelled under `prefers-reduced-motion` by the
   block at the end of the Matchbook zone in `globals.css`. There is NO exit
   animation and that is deliberate rather than unfinished: an exit needs a
   duration in JS to know when to unmount, `globals.css` is W1-exclusive (H1)
   so a `[data-leaving]` rule cannot be added from here, and invariant 40
   forbids a duration literal in a `.tsx`. A toast that leaves instantly is
   honest; a toast that leaves on a hard-coded 150ms is a token violation that
   would have to be undone later.
   =========================================================================== */

import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import { MbButton } from "./Button";
import { MbIconButton } from "./IconButton";
import { MbIcon } from "./MbIcon";

export type MbToastTone = "info" | "success" | "warning" | "danger";

/**
 * Where the strip lands.
 *
 * `float` — bottom centre, above the bottom bar. The default, and the right
 *   answer for anything the user just caused (a copy, a save, an undo): it
 *   appears where their thumb already is.
 * `rail` — top right, clear of the thumb zone. For events the user did NOT
 *   cause and must not have covering a control: a background sync failure
 *   during live scoring, a session ending under them. On a scoring console the
 *   bottom third is the tap target, so a float toast there is a mis-tap.
 */
export type MbToastSlot = "float" | "rail";

export interface MbToastAction {
  label: string;
  onClick: () => void;
  /** Sprite icon id rendered before the label. */
  icon?: string;
  /** Busy state — keeps the label and the focus, blocks activation. */
  loading?: boolean;
  /** Overrides the accessible name when the visible label is abbreviated. */
  ariaLabel?: string;
}

export interface MbToastOptions {
  tone: MbToastTone;
  /** Sprite icon id. Defaults to the tone's own mark. */
  icon?: string;
  message: string;
  action?: MbToastAction;
  /**
   * Milliseconds before the strip removes itself. `0` pins it until it is
   * dismissed by hand — the right choice for anything carrying an action,
   * because a 5-second window to read a sentence AND press a button is not a
   * window. Not a motion duration, so it is not a §2.1 token: it is how long
   * the message is true for.
   */
  duration?: number;
  slot?: MbToastSlot;
}

interface MbToastEntry extends MbToastOptions {
  id: string;
}

export const MB_TOAST_DEFAULT_DURATION = 5000;

/**
 * How many strips one slot shows at once. Past three the stack is taller than
 * the thumb zone it sits in and the oldest message is unreadable anyway, so
 * the oldest is dropped rather than queued — a notification that arrives after
 * its moment has passed is noise.
 */
const MAX_VISIBLE = 3;

/* --------------------------------------------------------------- tone table */

/**
 * Glyph per tone. `warning` and `danger` MUST NOT share one — that collision
 * is a live hard fail elsewhere in the kit (register D-21, `MbNotice`), and
 * repeating it here would double it.
 *
 * `danger` takes the triangle because the triangle is already the system's
 * failure mark (`MB_STATE_TONES.error` in `Panel.tsx`), so a failed action and
 * a failed page are marked with the same shape. That frees the bell for
 * `warning` — "heads up", not "this broke" — and leaves the two tones
 * different in SHAPE as well as hue, which is what invariant 13 asks for.
 */
const TONE_ICON: Record<MbToastTone, string> = {
  info: "help",
  success: "check",
  warning: "bell",
  danger: "warning",
};

/**
 * Ink for the GLYPH ONLY. The message keeps navy letterforms, because tone
 * colour on small type is the contrast debt GAP-4 was written to stop: on
 * paper-bright, `--mb-green` is 3.93:1, `--mb-red` 4.20:1 and `--mb-gold`
 * 1.97:1, all under the 4.5:1 floor for text below 18.66px. The tone is
 * carried by the 4px left rule (`.mb-toast[data-tone]`), the glyph and the
 * glyph's ink — three channels, none of them the copy.
 */
const TONE_INK: Record<MbToastTone, string> = {
  info: "text-mb-navy",
  success: "text-mb-green-ink",
  warning: "text-mb-gold-ink",
  danger: "text-mb-red",
};

/* ------------------------------------------------------------------ the strip */

/**
 * The paper strip. Presentational and uncontrolled — it renders what it is
 * given and calls back; it owns no timer and no queue position.
 *
 * Layout is `[glyph] [message over action] [dismiss]`, and the action sits on
 * its OWN row rather than beside the dismiss key on purpose: two 44px targets
 * on one line inside a 26rem strip leaves ~9rem for the sentence at 390px, and
 * the pair collides with the 8px separation floor as soon as the label grows
 * past "Undo".
 */
export const MbToast = ({
  tone,
  icon,
  message,
  action,
  onDismiss,
  dismissLabel = "Dismiss notification",
  className = "",
}: {
  tone: MbToastTone;
  icon?: string;
  message: ReactNode;
  action?: MbToastAction;
  /** Omit to render a strip with no dismiss key (auto-dismissing info). */
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
}) => (
  <div
    /* `pointer-events-auto` re-enables the strip inside the host's
       `pointer-events-none` column (see `SLOT_CLASS`). It is inert when the
       strip is rendered anywhere else, so it costs nothing to carry here and
       means a caller cannot forget it. */
    className={`mb-toast pointer-events-auto text-mb-navy ${className}`}
    data-tone={tone}
    /* `alert` is assertive and interrupts whatever the screen reader is
       saying. Only a failure earns that; everything else waits its turn. */
    role={tone === "danger" ? "alert" : "status"}
  >
    <MbIcon
      id={icon ?? TONE_ICON[tone]}
      size={16}
      /* `.mb-toast` is `align-items: flex-start`; the 2px nudge sets the glyph
         on the first line's optical centre rather than its box top. */
      className={`mt-[2px] shrink-0 self-start ${TONE_INK[tone]}`}
    />
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <p className="min-w-0 text-[0.85rem] leading-[1.5]">{message}</p>
      {action && (
        <div className="flex">
          <MbButton
            variant="outline-navy"
            size="sm"
            icon={action.icon}
            loading={action.loading}
            onClick={action.onClick}
            aria-label={action.ariaLabel}
          >
            {action.label}
          </MbButton>
        </div>
      )}
    </div>
    {onDismiss && (
      <MbIconButton
        icon="close"
        label={dismissLabel}
        size="sm"
        variant="plain"
        onClick={onDismiss}
        className="-my-1 shrink-0"
      />
    )}
  </div>
);

/* ------------------------------------------------------------------ the store */

let entries: MbToastEntry[] = [];
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let seq = 0;

const emit = () => {
  for (const listener of listeners) listener();
};

const clearTimer = (id: string) => {
  const handle = timers.get(id);
  if (handle !== undefined) {
    clearTimeout(handle);
    timers.delete(id);
  }
};

/**
 * Queue a toast. Callable from anywhere, including outside React.
 * Returns the id so a long-lived toast can be retracted when its cause clears.
 */
export const toast = (options: MbToastOptions): string => {
  seq += 1;
  const id = `mb-toast-${seq}`;
  const entry: MbToastEntry = { slot: "float", ...options, id };

  /* The cap is per SLOT — a rail toast must not evict a float toast, because
     they are different conversations in different corners of the screen. */
  const slot = entry.slot;
  const sameSlot = entries.filter((e) => e.slot === slot);
  const evicted = sameSlot.slice(0, Math.max(0, sameSlot.length + 1 - MAX_VISIBLE));
  for (const e of evicted) clearTimer(e.id);
  entries = [...entries.filter((e) => !evicted.includes(e)), entry];

  const duration = options.duration ?? MB_TOAST_DEFAULT_DURATION;
  if (duration > 0) {
    timers.set(
      id,
      setTimeout(() => {
        timers.delete(id);
        dismissToast(id);
      }, duration)
    );
  }

  emit();
  return id;
};

/** Remove one toast by id. A no-op for an id that has already gone. */
export const dismissToast = (id: string): void => {
  clearTimer(id);
  const next = entries.filter((e) => e.id !== id);
  if (next.length === entries.length) return;
  entries = next;
  emit();
};

/** Remove every toast. For a route change that invalidates all of them. */
export const dismissAllToasts = (): void => {
  for (const id of [...timers.keys()]) clearTimer(id);
  if (entries.length === 0) return;
  entries = [];
  emit();
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/* Identity-stable: `entries` is only ever REPLACED, never mutated, so
   useSyncExternalStore's equality check is a pointer compare and a toast in a
   far corner of the app does not re-render the host on every tick. */
const getSnapshot = (): MbToastEntry[] => entries;

/** The server has no queue, and this constant keeps the reference stable. */
const EMPTY: MbToastEntry[] = [];
const getServerSnapshot = (): MbToastEntry[] => EMPTY;

export interface MbToastApi {
  toast: (options: MbToastOptions) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

/* Frozen module constant, so `useToast()` is referentially stable forever and
   is safe in a dependency array. */
const API: MbToastApi = {
  toast,
  dismiss: dismissToast,
  dismissAll: dismissAllToasts,
};

/** The hook form. Identical to importing `toast` directly; use whichever reads. */
export const useToast = (): MbToastApi => API;

/* ------------------------------------------------------------------- the host */

/**
 * The custom property a fixed bottom bar sets to lift the float stack clear of
 * itself. `MatchbookBottomBar` (W2/P2a) is expected to set it on `:root`; until
 * it exists the fallback is `0px` and the stack sits on the safe-area inset.
 * Declared here so the two sides of the contract are written down in one file.
 */
export const MB_TOAST_OFFSET_VAR = "--mb-toast-offset";

/**
 * `pointer-events-none` on the column, re-enabled per strip below.
 *
 * Without it the invisible 26rem-wide fixed column swallows every press along
 * the bottom of the page for as long as one toast is up — which on a scoring
 * console is the whole interface, and which is invisible in a screenshot.
 */
const SLOT_CLASS: Record<MbToastSlot, string> = {
  /* Bottom centre. `max-w` before `w-full` so the strip is 26rem on a desktop
     and gutter-to-gutter on a phone without a media query. */
  float:
    "pointer-events-none fixed inset-x-0 bottom-0 z-[60] mx-auto flex w-full max-w-[26rem] flex-col gap-2 px-4",
  /* Top right, and `ml-auto` rather than `right-0` so it still respects the
     left gutter on a narrow screen instead of hanging off it. */
  rail: "pointer-events-none fixed inset-x-0 top-0 z-[60] ml-auto flex w-full max-w-[24rem] flex-col gap-2 px-4",
};

const SLOT_STYLE: Record<MbToastSlot, React.CSSProperties> = {
  float: {
    paddingBottom: `calc(1rem + var(--mb-safe-bottom) + var(${MB_TOAST_OFFSET_VAR}, 0px))`,
  },
  rail: { paddingTop: "calc(1rem + var(--mb-safe-top))" },
};

const Stack = ({
  slot,
  children,
}: {
  slot: MbToastSlot;
  children: ReactNode;
}) => (
  <div className={SLOT_CLASS[slot]} style={SLOT_STYLE[slot]}>
    {children}
  </div>
);

/**
 * The one mount. Renders `null` — not an empty box — when there is nothing to
 * show, so a route that never toasts pays nothing and no invisible fixed layer
 * sits over the page.
 *
 * `pinned` is the slot for a toast whose lifecycle somebody else owns: today
 * that is the undo strip, which is driven by the undo stack rather than by a
 * timer. It renders at the BOTTOM of the float column — nearest the thumb —
 * because it is the only one of them carrying an action the user is likely to
 * want.
 */
export const ToastHost = ({ pinned }: { pinned?: ReactNode }) => {
  const queue = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const dismiss = useCallback((id: string) => dismissToast(id), []);

  const float = queue.filter((e) => (e.slot ?? "float") === "float");
  const rail = queue.filter((e) => e.slot === "rail");

  if (float.length === 0 && rail.length === 0 && !pinned) return null;

  return (
    <>
      {(float.length > 0 || pinned) && (
        <Stack slot="float">
          {float.map((entry) => (
            <MbToast
              key={entry.id}
              tone={entry.tone}
              icon={entry.icon}
              message={entry.message}
              action={entry.action}
              onDismiss={() => dismiss(entry.id)}
            />
          ))}
          {pinned}
        </Stack>
      )}
      {rail.length > 0 && (
        <Stack slot="rail">
          {rail.map((entry) => (
            <MbToast
              key={entry.id}
              tone={entry.tone}
              icon={entry.icon}
              message={entry.message}
              action={entry.action}
              onDismiss={() => dismiss(entry.id)}
            />
          ))}
        </Stack>
      )}
    </>
  );
};
