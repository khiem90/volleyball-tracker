"use client";

import type { ReactNode } from "react";
import { Loader2, TriangleAlert, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  icon?: LucideIcon;
}

/**
 * The confirm before an action that cannot be taken back with a tap:
 * withdrawing a team, closing a court whose match is in play, or discarding
 * a quick match left mid-way.
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
  icon: Icon = TriangleAlert,
}: ConfirmDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-destructive">
          <Icon className="h-5 w-5" />
          {title}
        </DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter className="flex-row gap-2 sm:gap-2">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isBusy}
          className="min-h-11 flex-1"
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={onConfirm}
          disabled={isBusy}
          className="min-h-11 flex-1 gap-2"
        >
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
          {isBusy ? busyLabel : confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
