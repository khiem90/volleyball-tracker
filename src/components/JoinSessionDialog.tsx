"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { getSessionByShareCode } from "@/lib/sessions";
import { Link2, Loader2, AlertCircle } from "lucide-react";

interface JoinSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const JoinSessionDialog = ({ open, onOpenChange }: JoinSessionDialogProps) => {
  const router = useRouter();
  const { isConfigured } = useAuth();

  const [shareCode, setShareCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = useCallback(async () => {
    if (!shareCode.trim()) {
      setError("Please enter a share code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const session = await getSessionByShareCode(shareCode.trim().toUpperCase());
      if (session) {
        onOpenChange(false);
        router.push(`/session/${session.shareCode}`);
      } else {
        setError("Session not found. Check the code and try again.");
      }
    } catch {
      setError("Failed to join session. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [shareCode, router, onOpenChange]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setShareCode("");
    setError("");
  }, [onOpenChange]);

  if (!isConfigured) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Firebase Not Configured</DialogTitle>
            <DialogDescription>
              Session sharing requires Firebase to be configured.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} className="cursor-pointer">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Join Session
          </DialogTitle>
          <DialogDescription>
            Enter the share code to join an existing session and view live scores.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Share Code</label>
            <Input
              placeholder="e.g., ABC123"
              value={shareCode}
              onChange={(e) => {
                setShareCode(e.target.value.toUpperCase());
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && shareCode.trim()) {
                  handleJoin();
                }
              }}
              className="font-mono text-lg text-center tracking-widest uppercase"
              maxLength={6}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleJoin}
            disabled={!shareCode.trim() || isLoading}
            className="flex-1 gap-2 cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
            Join Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

