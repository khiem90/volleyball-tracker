"use client";

import type { ReactNode } from "react";
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

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  /** The confirm button's label, and what it says while the action runs. */
  confirmLabel: string;
  busyLabel: string;
  isBusy: boolean;
  onConfirm: () => void;
  /** A sprite glyph id, shown before the title and on the confirm button. */
  icon?: string;
}

/**
 * The confirm before an action that cannot be taken back with a tap:
 * withdrawing a team, closing a court whose match is in play, or discarding
 * a quick match left mid-way. A navy question, and only the confirm in red.
 */
export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  busyLabel,
  isBusy,
  onConfirm,
  icon = "warning",
}: ConfirmDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          <MbIcon id={icon} size={18} className="shrink-0" />
          {title}
        </DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isBusy}
          className="sm:flex-1"
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={onConfirm}
          disabled={isBusy}
          className="sm:flex-1"
        >
          {isBusy ? <InlineSpinner /> : <MbIcon id={icon} size={14} />}
          {isBusy ? busyLabel : confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
