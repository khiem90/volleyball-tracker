"use client";

import type { ReactNode } from "react";
import { MbButton } from "./Button";
import { MbDialog, MbDialogBody, MbDialogFooter } from "./Dialog";

/**
 * The only confirmation surface in the app (charter Appendix B — no
 * `window.confirm`). Destructive by default; `destructive={false}` turns it into
 * a plain navy "are you sure".
 *
 * The danger reading is carried by three channels, never colour alone: the red
 * 4px dialog rule, the warning glyph, and the verb spelled out on the button.
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
      <MbButton
        variant={destructive ? "coral" : "navy"}
        size="lg"
        loading={loading}
        onClick={onConfirm}
      >
        {confirmLabel ?? verb}
      </MbButton>
    </MbDialogFooter>
  </MbDialog>
);
