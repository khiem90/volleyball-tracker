"use client";

import type { ReactNode } from "react";
import { MbDialog, MbDialogBody, MbDialogFooter } from "./Dialog";

/**
 * The only confirmation surface in the app (charter Appendix B — no
 * `window.confirm`). Destructive by default; `destructive={false}` turns it into
 * a plain navy "are you sure".
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
  /** What the verb acts on, e.g. a team name. Rendered as the quoted subject. */
  subject?: string;
  /** Consequence copy. Defaults to the plain irreversibility sentence. */
  body?: ReactNode;
  destructive?: boolean;
  confirmLabel?: string;
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
          <span className="matchbook-display min-w-0 text-[1.15rem] font-bold leading-[1.1] break-words">
            {subject}
          </span>
        </div>
      )}
      <div className="text-[0.85rem] leading-[1.5] text-mb-ink-muted">
        {body ?? "This cannot be undone."}
      </div>
    </MbDialogBody>
    <MbDialogFooter>
      {loading && (
        <span className="mb-kicker mr-auto" role="status">
          Working…
        </span>
      )}
      <button
        type="button"
        className="mb-btn mb-btn-outline-navy mb-btn-lg flex-1 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
        onClick={() => onOpenChange(false)}
        disabled={loading}
      >
        Cancel
      </button>
      <button
        type="button"
        className={`mb-btn mb-btn-lg flex-1 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none ${
          destructive ? "mb-btn-coral" : "mb-btn-navy"
        }`}
        onClick={onConfirm}
        disabled={loading}
        aria-busy={loading || undefined}
      >
        {confirmLabel ?? verb}
      </button>
    </MbDialogFooter>
  </MbDialog>
);
