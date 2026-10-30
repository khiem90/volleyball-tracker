"use client";

import { useState, type FormEvent } from "react";
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
 *
 * Opened on an RSVP already on the list, the same dialog edits its name
 * and note, which keeps the person's place, and has Withdraw in the
 * footer. Withdraw asks once more before it takes the spot away.
 */
export const RsvpDialog = ({
  open,
  tournamentName,
  entry,
  isEditing = false,
  joinsWaitlist = false,
  isSending,
  isWithdrawing = false,
  error,
  onChange,
  onSend,
  onWithdraw,
  onClose,
}: {
  open: boolean;
  tournamentName: string;
  entry: RsvpEntry | null;
  /** True when the dialog edits the person's RSVP rather than making one. */
  isEditing?: boolean;
  /** True when every spot is taken, so a new RSVP lands on the waitlist. */
  joinsWaitlist?: boolean;
  isSending: boolean;
  isWithdrawing?: boolean;
  /** Why the last send failed for a reason other than the rules' refusal. */
  error: string | null;
  onChange: (changes: Partial<RsvpEntry>) => void;
  onSend: () => void;
  onWithdraw?: () => void;
  onClose: () => void;
}) => {
  const problems = entry ? rsvpEntryProblems(entry) : {};
  const canSend = entry !== null && Object.keys(problems).length === 0 && !isSending;

  // Withdraw asks first. The question is forgotten each time the dialog opens.
  const [isConfirming, setConfirming] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setConfirming(false);
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canSend) onSend();
  };

  if (isEditing && isConfirming) {
    return (
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              <MbIcon id="remove-user" size={18} className="shrink-0" />
              Withdraw?
            </DialogTitle>
            <DialogDescription>
              You come off the list for {tournamentName}, and the first person waiting takes your
              place. If you RSVP again, you go to the back of the line.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-[0.78rem] font-medium text-mb-red">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" className="sm:flex-1" onClick={() => setConfirming(false)}>
              Keep my place
            </Button>
            <Button
              variant="destructive"
              className="sm:flex-1"
              onClick={onWithdraw}
              disabled={isWithdrawing}
            >
              {isWithdrawing ? <InlineSpinner /> : <MbIcon id="remove-user" size={14} />}
              Withdraw
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <MbIcon id={isEditing ? "pencil" : "calendar"} size={18} className="shrink-0" />
            {isEditing ? "Your RSVP" : "RSVP"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Change your name or note. You keep your place on the list."
              : joinsWaitlist
                ? `Every spot in ${tournamentName} is taken, so you join the waitlist and move up on your own when a spot frees. Everyone on the list sees your name.`
                : `You are telling the owner of ${tournamentName} that you will play. Everyone on the list sees your name.`}
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
          {isEditing && onWithdraw && (
            <button
              type="button"
              className="mb-btn mb-btn-outline-red sm:flex-1"
              onClick={() => setConfirming(true)}
              disabled={isSending}
            >
              <MbIcon id="remove-user" size={14} />
              Withdraw
            </button>
          )}
          <Button variant="outline" className="sm:flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="rsvp-form" className="sm:flex-1" disabled={!canSend}>
            {isSending ? <InlineSpinner /> : <MbIcon id={isEditing ? "save" : "check"} size={14} />}
            {isEditing ? "Save" : joinsWaitlist ? "Join the waitlist" : "RSVP"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
