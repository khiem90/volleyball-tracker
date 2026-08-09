"use client";

import type { ReactNode } from "react";
import { MbButton } from "./Button";
import { MbDestructiveButton } from "./DangerZone";
import { MbDialog, MbDialogBody, MbDialogFooter } from "./Dialog";

/**
 * The only confirmation surface in the app (charter Appendix B — no
 * `window.confirm`). Destructive by default; `destructive={false}` turns it
 * into a plain navy "are you sure".
 *
 * The two branches are deliberately *not* the same object:
 *
 * | | destructive | benign |
 * | --- | --- | --- |
 * | frame | 4px `--mb-red` anchor top edge | 4px `--mb-navy` anchor top edge |
 * | header glyph | `warning` in `--mb-red` | `help` |
 * | subject rail | 3px `--mb-red` accent | 3px `--mb-navy` accent |
 * | commit | `MbDestructiveButton` — red-inked **outline** + `warning` glyph | `.mb-btn-navy` **fill** |
 *
 * The commit is `MbDestructiveButton` and nothing else — that component owns
 * the whole destructive language and carries the measurements; `MbDangerZone`
 * renders the identical control, so the two surfaces cannot drift. Fill versus
 * outline is the channel that survives desaturation (greyscale ground 0.960
 * against `.mb-btn-navy`'s 0.029 and `.mb-btn-coral`'s 0.151), so the
 * destructive commit is never mistakable for a benign primary and never leans
 * on hue (invariant 13); the `warning` glyph is what separates it from
 * `Cancel`, the other outline in the footer.
 *
 * It is deliberately the quieter control of the two: the cheap action is
 * Cancel, and the expensive one should have to be read. That also removes the
 * collision the earlier build shipped — a `--mb-coral-deep` fill sitting ΔE76
 * 7.45 from the `--mb-red` rule directly above it in the same 416px frame,
 * which design language §2.2 forbids outright ("coral and red ... must never
 * sit adjacent").
 */
export const MbConfirm = ({
  open,
  onOpenChange,
  title,
  verb,
  subject,
  body,
  destructive = true,
  confirmLabel,
  loading = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** The action, e.g. "Delete". Doubles as the confirm label when none is given. */
  verb: string;
  /** What the verb acts on, e.g. a team name. Rendered as the named subject. */
  subject?: string;
  /** Consequence copy. Defaults to the plain irreversibility sentence. */
  body?: ReactNode;
  destructive?: boolean;
  confirmLabel?: string;
  /** Keeps the dialog open and un-dismissable while the action is in flight. */
  loading?: boolean;
  onConfirm: () => void;
}) => (
  <MbDialog
    open={open}
    onOpenChange={onOpenChange}
    title={title}
    icon={destructive ? "warning" : "help"}
    tone={destructive ? "danger" : "paper"}
    size="sm"
    dismissible={!loading}
  >
    <MbDialogBody className="flex flex-col gap-3">
      {subject && (
        <div
          className={`flex flex-col gap-1 border-l-[3px] pl-3 ${
            destructive ? "border-mb-red" : "border-mb-navy"
          }`}
        >
          <span className="mb-kicker">{verb}</span>
          <span className="matchbook-display min-w-0 text-[1.2rem] font-bold leading-tight break-words">
            {subject}
          </span>
        </div>
      )}
      <div className="text-[0.85rem] leading-[1.5] text-mb-ink-muted">
        {body ?? "This cannot be undone."}
      </div>
    </MbDialogBody>
    <MbDialogFooter>
      <MbButton
        variant="outline-navy"
        size="lg"
        onClick={() => onOpenChange(false)}
        disabled={loading}
      >
        Cancel
      </MbButton>
      {destructive ? (
        <MbDestructiveButton
          size="lg"
          label={confirmLabel ?? verb}
          loading={loading}
          onClick={onConfirm}
        />
      ) : (
        <MbButton variant="navy" size="lg" loading={loading} onClick={onConfirm}>
          {confirmLabel ?? verb}
        </MbButton>
      )}
    </MbDialogFooter>
  </MbDialog>
);
