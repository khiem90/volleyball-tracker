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
  /**
   * `danger`, the default, confirms in red and is for an action that
   * destroys something. `plain` confirms in the black pill and is for one
   * that destroys nothing, such as regenerating a schedule.
   */
  tone?: "danger" | "plain";
}

/**
 * The confirm before an action that cannot be taken back with a tap:
 * withdrawing a team, closing a court whose match is in play, or discarding
 * a quick match left mid-way. The question is in ink, and only the confirm
 * of a destructive action is red.
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
  tone = "danger",
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
          variant={tone === "danger" ? "destructive" : "default"}
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
