"use client";

import type { FormEvent } from "react";
import { InlineSpinner } from "@/components/shared";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RSVP_NAME_MAX, RSVP_NOTE_MAX, rsvpEntryProblems, type RsvpEntry } from "@/lib/rsvp";

/**
 * The RSVP dialog: the name everyone on the list sees, prefilled, and an
 * optional short note. The name's problem shows once the person has
 * emptied it or typed past the limit; RSVP stays off until it is fixed.
 */
export const RsvpDialog = ({
  open,
  nightName,
  entry,
  isSending,
  error,
  onChange,
  onSend,
  onClose,
}: {
  open: boolean;
  nightName: string;
  entry: RsvpEntry | null;
  isSending: boolean;
  /** Why the last send failed for a reason other than the rules' refusal. */
  error: string | null;
  onChange: (changes: Partial<RsvpEntry>) => void;
  onSend: () => void;
  onClose: () => void;
}) => {
  const problems = entry ? rsvpEntryProblems(entry) : {};
  const canSend = entry !== null && Object.keys(problems).length === 0 && !isSending;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canSend) onSend();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <MbIcon id="calendar" size={18} className="shrink-0" />
            RSVP
          </DialogTitle>
          <DialogDescription>
            You are telling the owner of {nightName} that you will play. Everyone on the list sees
            your name.
          </DialogDescription>
        </DialogHeader>

        <form id="rsvp-form" onSubmit={submit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rsvp-name" className="mb-kicker">
              Your name
            </label>
            <span className={problems.name ? "mb-input border-mb-red" : "mb-input"}>
              <input
                id="rsvp-name"
                type="text"
                value={entry?.name ?? ""}
                onChange={(event) => onChange({ name: event.target.value })}
                maxLength={RSVP_NAME_MAX + 10}
                autoComplete="nickname"
                autoFocus
                aria-invalid={!!problems.name}
                aria-describedby={problems.name ? "rsvp-name-problem" : undefined}
              />
            </span>
            {problems.name && (
              <p id="rsvp-name-problem" role="alert" className="text-[0.78rem] font-medium text-mb-red">
                {problems.name}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="rsvp-note" className="mb-kicker">
              Note (optional)
            </label>
            <textarea
              id="rsvp-note"
              className={problems.note ? "mb-textarea border-mb-red" : "mb-textarea"}
              rows={2}
              value={entry?.note ?? ""}
              onChange={(event) => onChange({ note: event.target.value })}
              placeholder="Arriving thirty minutes late"
              aria-invalid={!!problems.note}
              aria-describedby="rsvp-note-help"
            />
            <p
              id="rsvp-note-help"
              role={problems.note ? "alert" : undefined}
              className={
                problems.note
                  ? "text-[0.78rem] font-medium text-mb-red"
                  : "text-[0.72rem] text-mb-ink-muted"
              }
            >
              {problems.note ?? `Up to ${RSVP_NOTE_MAX} characters. Everyone on the list sees it.`}
            </p>
          </div>

          {error && (
            <p role="alert" className="text-[0.78rem] font-medium text-mb-red">
              {error}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" className="sm:flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="rsvp-form" className="sm:flex-1" disabled={!canSend}>
            {isSending ? <InlineSpinner /> : <MbIcon id="check" size={14} />}
            RSVP
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
