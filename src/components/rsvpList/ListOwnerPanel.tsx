"use client";

import { MbIcon } from "@/components/matchbook/MbIcon";
import { Panel } from "@/components/matchbook/Panel";
import { DeleteConfirmDialog, InlineSpinner } from "@/components/shared";
import type { ListOwnerControls } from "./useListOwnerControls";

const Action = ({
  icon,
  label,
  note,
  onClick,
  isBusy = false,
  tone = "navy",
}: {
  icon: string;
  label: string;
  note: string;
  onClick: () => void;
  isBusy?: boolean;
  tone?: "navy" | "red";
}) => (
  <div className="flex flex-col gap-1.5">
    <button
      type="button"
      onClick={onClick}
      disabled={isBusy}
      className={`mb-btn ${tone === "red" ? "mb-btn-outline-red" : "mb-btn-outline-navy"}`}
    >
      {isBusy ? <InlineSpinner /> : <MbIcon id={icon} size={14} />}
      {label}
    </button>
    <p className="text-[0.72rem] text-mb-ink-muted">{note}</p>
  </div>
);

/**
 * The owner's controls for the whole list: Close or Reopen until the
 * scheduled time, then Duplicate and Delete, which stay once the list is
 * over. Delete asks first and names how many RSVPs go with the list.
 */
export const ListOwnerPanel = ({ controls }: { controls: ListOwnerControls }) => {
  const { deletion } = controls;

  return (
    <Panel title="Manage" icon="clipboard">
      <div className="flex flex-col gap-4 p-4">
        {controls.error && (
          <p
            role="alert"
            className="border-[1.5px] border-mb-red px-3 py-2 text-[0.8rem] font-medium text-mb-red"
          >
            {controls.error}
          </p>
        )}

        {controls.canChange ? (
          <Action
            icon={controls.isClosed ? "undo" : "lock"}
            label={controls.isClosed ? "Reopen" : "Close"}
            note={
              controls.isClosed
                ? "The list is closed. Nobody new can RSVP, and people on it can still withdraw. Reopen it any time before the scheduled time."
                : "Stops new RSVPs. People on the list can still withdraw, and you can reopen it until the scheduled time."
            }
            onClick={controls.toggleClosed}
            isBusy={controls.isClosing}
          />
        ) : (
          <p className="text-[0.85rem] text-mb-ink-muted">
            This list is over, so nothing on it changes. Duplicate it for next time.
          </p>
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
          tone="red"
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
    </Panel>
  );
};
