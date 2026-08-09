"use client";

import { memo, type ReactNode } from "react";
import { MbConfirm } from "@/components/matchbook/Confirm";

type DeleteConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  onConfirm: () => void;
  isDeleting?: boolean;
  className?: string;
};

/**
 * Thin adapter over `MbConfirm` (charter H8). The public props are unchanged so
 * the five existing call sites keep working untouched.
 *
 * `className` is retained for source compatibility but is no longer read: it
 * only ever carried the shadcn width override (`sm:max-w-md`), which `MbDialog`
 * owns through `size`. No call site passes it.
 */
export const DeleteConfirmDialog = memo(function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isDeleting = false,
}: DeleteConfirmDialogProps) {
  return (
    <MbConfirm
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      verb="Delete"
      body={description}
      loading={isDeleting}
      onConfirm={onConfirm}
    />
  );
});
