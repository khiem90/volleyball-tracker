"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type RotateDeviceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const RotateDeviceDialog = memo(function RotateDeviceDialog({
  open,
  onOpenChange,
}: RotateDeviceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm glass-card border-glass-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowPathIcon className="w-5 h-5 text-primary" />
            Rotate Your Device
          </DialogTitle>
          <DialogDescription>
            Fullscreen mode is only available in landscape orientation
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center py-6">
          <motion.div
            animate={{ rotate: [0, 90, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-24 h-16 border-4 border-primary rounded-xl mb-4"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <ArrowPathIcon className="w-8 h-8 text-primary" />
            </div>
          </motion.div>
          <p className="text-sm text-muted-foreground text-center">
            Please rotate your device to landscape mode, then try again.
          </p>
        </div>
        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full btn-teal-gradient rounded-xl cursor-pointer"
          >
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
