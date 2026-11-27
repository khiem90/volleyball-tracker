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
import { InlineSpinner } from "@/components/shared";
import { Icon } from "@/components/shared/Icon";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  /**
   * The confirm button's label, and what it says while the action runs. A
   * label too long for the button is cut short. Pass spans in place of a
   * string to choose which part is cut.
   */
  confirmLabel: ReactNode;
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
    {/* One column that cannot grow past the dialog, so a long label is cut short where it would have widened it. */}
    <DialogContent className="grid-cols-1 sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          <Icon id={icon} size={18} className="shrink-0" />
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
          className="min-w-0 sm:flex-1"
        >
          {isBusy ? <InlineSpinner /> : <Icon id={icon} size={14} />}
          {isBusy ? (
            busyLabel
          ) : typeof confirmLabel === "string" ? (
            <span className="truncate">{confirmLabel}</span>
          ) : (
            confirmLabel
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
