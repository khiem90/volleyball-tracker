"use client";

import { Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EndTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEnding: boolean;
  onEnd: () => void;
}

/** The confirm before a live tournament is ended as it stands. */
export const EndTournamentDialog = ({
  open,
  onOpenChange,
  isEnding,
  onEnd,
}: EndTournamentDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-destructive">
          <Square className="h-5 w-5" />
          End the tournament?
        </DialogTitle>
        <DialogDescription>
          This ends it as it stands. Results and standings stay as they are, and no more
          matches can be scored.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="flex-row gap-2 sm:gap-2">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isEnding}
          className="min-h-11 flex-1"
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={onEnd}
          disabled={isEnding}
          className="min-h-11 flex-1 gap-2"
        >
          {isEnding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
          {isEnding ? "Ending..." : "End tournament"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
