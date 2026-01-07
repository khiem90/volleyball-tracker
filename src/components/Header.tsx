"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Maximize2, Minimize2, RotateCcw } from "lucide-react";

interface HeaderProps {
  isFullscreen?: boolean;
  onReset: () => void;
  onToggleFullscreen: () => void;
}

export const Header = ({ isFullscreen = false, onReset, onToggleFullscreen }: HeaderProps) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleResetClick = useCallback(() => {
    setShowConfirm(true);
  }, []);

  const handleConfirm = useCallback(() => {
    onReset();
    setShowConfirm(false);
  }, [onReset]);

  const handleCancel = useCallback(() => {
    setShowConfirm(false);
  }, []);

  // In fullscreen mode, show minimal header with just exit button
  if (isFullscreen) {
    return (
      <header className="absolute top-0 left-0 right-0 z-50 p-3">
        <div className="flex items-center justify-end max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleFullscreen}
            aria-label="Exit fullscreen"
            className="bg-black/20 hover:bg-black/40 text-white/70 hover:text-white backdrop-blur-sm"
          >
            <Minimize2 className="h-5 w-5" />
          </Button>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="relative z-50 glass border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-5 h-5 text-primary-foreground"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3c0 9 9 9 9 9" strokeWidth="1.5" />
                <path d="M12 3c0 9-9 9-9 9" strokeWidth="1.5" />
                <path d="M3 12c9 0 9 9 9 9" strokeWidth="1.5" />
              </svg>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              Volley<span className="text-primary">Score</span>
            </h1>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={onToggleFullscreen}
              aria-label="Enter fullscreen"
              className="border-border/50 bg-card/50"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              onClick={handleResetClick}
              aria-label="Reset game"
              className="border-border/50 bg-card/50 gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Game?</DialogTitle>
            <DialogDescription>
              This will reset both scores to 0 and clear the history. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              className="flex-1"
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
