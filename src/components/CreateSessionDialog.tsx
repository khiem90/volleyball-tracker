"use client";

import { useState, useCallback } from "react";
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
import { useSession } from "@/context/SessionContext";
import { useAuth } from "@/context/AuthContext";
import { Share2, Globe, Copy, Check, Loader2 } from "lucide-react";
import { SessionAuth } from "./SessionAuth";

interface CreateSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName?: string;
  competitionData?: {
    competition: import("@/types/game").Competition | null;
    teams: import("@/types/game").PersistentTeam[];
    matches: import("@/types/game").Match[];
  };
  onCreated?: (shareCode: string, adminToken: string) => void;
}

export const CreateSessionDialog = ({
  open,
  onOpenChange,
  defaultName = "",
  competitionData,
  onCreated,
}: CreateSessionDialogProps) => {
  const { createNewSession, isLoading, error } = useSession();
  const { user, isConfigured } = useAuth();

  const [sessionName, setSessionName] = useState(defaultName);
  const [step, setStep] = useState<"name" | "created">("name");
  const [createdData, setCreatedData] = useState<{ shareCode: string; adminToken: string } | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const handleCreate = useCallback(async () => {
    if (!sessionName.trim()) return;

    try {
      const result = await createNewSession(sessionName.trim(), competitionData);
      setCreatedData(result);
      setStep("created");
      onCreated?.(result.shareCode, result.adminToken);
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  }, [sessionName, createNewSession, competitionData, onCreated]);

  const handleCopyCode = useCallback(async () => {
    if (!createdData) return;
    try {
      await navigator.clipboard.writeText(createdData.shareCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [createdData]);

  const handleCopyToken = useCallback(async () => {
    if (!createdData) return;
    try {
      await navigator.clipboard.writeText(createdData.adminToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [createdData]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    // Reset state after dialog closes
    setTimeout(() => {
      setStep("name");
      setSessionName(defaultName);
      setCreatedData(null);
    }, 200);
  }, [onOpenChange, defaultName]);

  if (!isConfigured) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Firebase Not Configured</DialogTitle>
            <DialogDescription>
              To enable session sharing, please configure Firebase. Add your Firebase configuration to the environment variables.
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
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          {step === "name" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Create Shareable Session
                </DialogTitle>
                <DialogDescription>
                  Create a session that others can join and view live scores.
                  {!user && " You can sign in to manage your sessions."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Session Name</label>
                  <Input
                    placeholder="e.g., Beach Volleyball Tournament"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && sessionName.trim()) {
                        handleCreate();
                      }
                    }}
                  />
                </div>

                {!user && (
                  <p className="text-sm text-muted-foreground">
                    <button
                      type="button"
                      className="text-primary hover:underline cursor-pointer"
                      onClick={() => setShowAuth(true)}
                    >
                      Sign in
                    </button>
                    {" "}to link this session to your account (optional).
                  </p>
                )}

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
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
                  onClick={handleCreate}
                  disabled={!sessionName.trim() || isLoading}
                  className="flex-1 gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                  Create Session
                </Button>
              </DialogFooter>
            </>
          )}

          {step === "created" && createdData && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-emerald-500">
                  <Check className="w-5 h-5" />
                  Session Created!
                </DialogTitle>
                <DialogDescription>
                  Your session is ready. Share the code with viewers or the admin token with people who should edit scores.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Share Code */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Share Code</label>
                  <p className="text-xs text-muted-foreground">
                    Anyone with this code can view the session.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={createdData.shareCode}
                      readOnly
                      className="font-mono font-bold text-lg text-center tracking-widest"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyCode}
                      className="shrink-0 cursor-pointer"
                    >
                      {copiedCode ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Admin Token */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-amber-500">Admin Token (Secret)</label>
                  <p className="text-xs text-muted-foreground">
                    Share this with trusted people who should be able to edit scores.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={createdData.adminToken}
                      readOnly
                      type="password"
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyToken}
                      className="shrink-0 cursor-pointer"
                    >
                      {copiedToken ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-amber-500/80 p-2 bg-amber-500/10 rounded-lg">
                  ⚠️ Save the admin token somewhere safe. You{"'"}ll need it to regain admin access if you lose it.
                </p>
              </div>

              <DialogFooter>
                <Button onClick={handleClose} className="w-full cursor-pointer">
                  Got it, let{"'"}s go!
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <SessionAuth
        open={showAuth}
        onOpenChange={setShowAuth}
        showViewerOption={false}
      />
    </>
  );
};

