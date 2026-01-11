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
import { Loader2, Trash2 } from "lucide-react";

interface EndCompetitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEnding: boolean;
  onEndCompetition: () => void;
}

export const EndCompetitionDialog = ({
  open,
  onOpenChange,
  isEnding,
  onEndCompetition,
}: EndCompetitionDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="w-5 h-5" />
          End Competition?
        </DialogTitle>
        <DialogDescription>
          This will end the competition and close the live session for all viewers. A summary will be created.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="flex-row gap-2 sm:gap-2">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isEnding}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={onEndCompetition}
          disabled={isEnding}
          className="flex-1 gap-2"
        >
          {isEnding ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Ending...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              End Competition
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
