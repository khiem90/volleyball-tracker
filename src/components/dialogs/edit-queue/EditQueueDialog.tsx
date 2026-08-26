"use client";

import { MbBadge } from "@/components/matchbook/Badge";
import { MbButton } from "@/components/matchbook/Button";
import {
  MbDialog,
  MbDialogBody,
  MbDialogFooter,
} from "@/components/matchbook/Dialog";
import { MbReorderList } from "@/components/matchbook/ReorderList";
import { TeamMark } from "@/components/matchbook/Panel";
import { crestForTeam } from "@/components/matchbook/types";
import type { PersistentTeam, Competition } from "@/types/game";
import { useEditQueueDialog } from "./useEditQueueDialog";

/* ===========================================================================
   EDIT QUEUE ORDER

   Two shipped defects, both structural:

     BUG-4  The footer was `flex-row` with Reset + spacer + Cancel + Save, and
            at 390px the Save button was cut off by the right edge and could not
            be pressed. `MbDialogFooter` stretches its direct buttons to full
            width below `sm`, so the primary action is always reachable.
     BUG-5  Reordering used HTML5 drag-and-drop, which does not fire on touch,
            and the fallback arrows were 28px. `MbReorderList` is pointer-event
            based, has 44px controls, `Alt+Arrow` keys and an `aria-live`
            announcement per move.
   =========================================================================== */

export const EditQueueDialog = ({
  open,
  onOpenChange,
  competition,
  teams,
  venue = "court",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competition: Competition | null;
  teams: PersistentTeam[];
  /** Plural venue word from `useTerminology`. Never a hardcoded "courts". */
  venue?: string;
}) => {
  const {
    queue,
    hasChanges,
    canEdit,
    getTeamName,
    handleReorder,
    handleSave,
    handleReset,
  } = useEditQueueDialog({
    open,
    competition,
    teams,
    onClose: () => onOpenChange(false),
  });

  if (!canEdit) return null;

  return (
    <MbDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Queue order"
      icon="queue"
      size="md"
      description="The team at the top plays next. Teams already on the floor are not listed."
    >
      <MbDialogBody flush>
        <MbReorderList
          items={queue}
          label="Queue order"
          onReorder={handleReorder}
          getKey={(teamId) => teamId}
          getLabel={(teamId) => getTeamName(teamId)}
          emptyMessage={`No teams are waiting yet — every team is on ${venue}.`}
          /* No ordinal here: `MbReorderList` numbers its own rows, and a second
             figure beside it rendered "1 1". */
          renderItem={(teamId, index) => (
            <span className="flex min-w-0 items-center gap-2.5">
              <TeamMark
                team={{ name: getTeamName(teamId), crest: crestForTeam(teamId, getTeamName(teamId)) }}
                size="sm"
              />
              {index === 0 && <MbBadge tone="teal">Next up</MbBadge>}
            </span>
          )}
        />
      </MbDialogBody>

      {/* TWO buttons, not three. Below `sm` `MbDialogFooter` stretches its
          direct children to share the row, so Reset + Cancel + Save left 110px
          each at 390px and the primary action read "Sav…" — BUG-4 in a new
          shape. Cancel is the redundant one: nothing is written until Save, and
          the 44px close key and Escape both discard. */}
      <MbDialogFooter>
        <MbButton
          variant="outline-navy"
          size="lg"
          onClick={handleReset}
          disabled={!hasChanges}
        >
          Reset
        </MbButton>
        <MbButton
          variant="coral"
          size="lg"
          icon="save"
          onClick={handleSave}
          disabled={!hasChanges}
        >
          Save order
        </MbButton>
      </MbDialogFooter>
    </MbDialog>
  );
};
