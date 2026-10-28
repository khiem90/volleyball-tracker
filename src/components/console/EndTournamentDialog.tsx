"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { InlineSpinner } from "@/components/shared";

interface EndTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEnding: boolean;
  onEnd: () => void;
}

/**
 * The confirm before a live tournament is ended as it stands. The sprite's
 * trophy stands for the tournament; only the End button is red.
 */
export const EndTournamentDialog = ({
  open,
  onOpenChange,
  isEnding,
  onEnd,
}: EndTournamentDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          <MbIcon id="compete" size={18} className="shrink-0" />
          End the tournament?
        </DialogTitle>
        <DialogDescription>
          This ends it as it stands. Results and standings stay as they are, and no more
          matches can be scored.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isEnding}
          className="sm:flex-1"
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={onEnd}
          disabled={isEnding}
          className="sm:flex-1"
        >
          {isEnding ? <InlineSpinner /> : <MbIcon id="compete" size={14} />}
          {isEnding ? "Ending..." : "End tournament"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
