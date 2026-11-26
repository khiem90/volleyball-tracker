"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Card, CardError, DeleteConfirmDialog, Icon, InlineSpinner } from "@/components/shared";
import type { ListWording } from "@/lib/rsvpList";
import type { ListOwnerControls } from "./useListOwnerControls";

/** One action in the card: its button, with what it does written under it. */
const ActionRow = ({ note, children }: { note: string; children: ReactNode }) => (
  <div className="flex flex-col gap-2 px-4 py-3.5 sm:items-start">
    {children}
    <p className="text-caption text-ink-soft">{note}</p>
  </div>
);

/** A button that acts on the list in place. Delete is the quiet red one, and its dialog confirms in filled red. */
const Action = ({
  icon,
  label,
  note,
  onClick,
  isBusy = false,
  tone = "fill",
}: {
  icon: string;
  label: string;
  note: string;
  onClick: () => void;
  isBusy?: boolean;
  tone?: "fill" | "danger";
}) => (
  <ActionRow note={note}>
    <button
      type="button"
      onClick={onClick}
      disabled={isBusy}
      className={`btn ${tone === "danger" ? "btn-danger-quiet" : "btn-fill"}`}
    >
      {isBusy ? <InlineSpinner /> : <Icon id={icon} size={14} />}
      {label}
    </button>
  </ActionRow>
);

/**
 * The owner's controls for the whole list: Close or Reopen until the
 * scheduled time, then Create tournament, Duplicate, and Delete, which
 * stay once the list is over. Create tournament opens the creation page
 * with this list chosen, on a list import takes. Delete asks first and
 * names how many RSVPs go with the list.
 * `wording` says who can still withdraw from a closed list: people, or
 * teams.
 */
export const ListOwnerPanel = ({
  controls,
  wording,
}: {
  controls: ListOwnerControls;
  wording: Pick<ListWording, "closeNote" | "closedNote">;
}) => {
  const { deletion } = controls;

  return (
    <Card title="Manage" icon="clipboard">
      {controls.error && <CardError message={controls.error} className="mx-4 mt-4" />}

      <div className="flex flex-col divide-y divide-line">
        {controls.canChange ? (
          <Action
            icon={controls.isClosed ? "undo" : "lock"}
            label={controls.isClosed ? "Reopen" : "Close"}
            note={controls.isClosed ? wording.closedNote : wording.closeNote}
            onClick={controls.toggleClosed}
            isBusy={controls.isClosing}
          />
        ) : (
          <p className="px-4 py-3.5 text-label text-ink-soft">
            This list is over, so nothing on it changes. Duplicate it for next time.
          </p>
        )}

        {controls.importHref && (
          <ActionRow note="Opens a new tournament with this list chosen. Import takes the confirmed RSVPs, leaves the waitlist out, and asks to close the list first if it is still open.">
            <Link href={controls.importHref} className="btn btn-ink">
              <Icon id="compete" size={14} />
              Create tournament
            </Link>
          </ActionRow>
        )}

        <Action
          icon="clipboard"
          label="Duplicate"
          note="Makes a new list with the same capacity and the same by-person or by-team choice, and opens it. It has no times, nobody on it, and its link off."
          onClick={controls.duplicate}
          isBusy={controls.isDuplicating}
        />

        <Action
          icon="trash"
          tone="danger"
          label="Delete list"
          note="Removes the list and every RSVP on it. This cannot be undone."
          onClick={deletion.open}
        />
      </div>

      <DeleteConfirmDialog
        open={deletion.isOpen}
        onOpenChange={deletion.setOpen}
        title={deletion.title}
        description={deletion.description}
        onConfirm={deletion.confirm}
        isDeleting={deletion.isDeleting}
        canConfirm={deletion.canConfirm}
      />
    </Card>
  );
};
