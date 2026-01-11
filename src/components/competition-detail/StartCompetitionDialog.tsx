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
import { Play } from "lucide-react";

interface StartCompetitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  typeLabel: string;
  teamCount: number;
  onStart: () => void;
}

export const StartCompetitionDialog = ({
  open,
  onOpenChange,
  typeLabel,
  teamCount,
  onStart,
}: StartCompetitionDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Play className="w-5 h-5 text-primary" />
          Start Competition?
        </DialogTitle>
        <DialogDescription>
          This will generate the {typeLabel.toLowerCase()} schedule for{" "}
          {teamCount} teams. You won&apos;t be able to add or remove teams after
          starting.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="flex-row gap-2 sm:gap-2">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button onClick={onStart} className="flex-1 gap-2 shadow-lg shadow-primary/20">
          <Play className="w-4 h-4" />
          Start
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
