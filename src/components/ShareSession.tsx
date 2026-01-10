"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/context/SessionContext";
import {
  Share2,
  Copy,
  Check,
  Link2,
  KeyRound,
  Users,
  Crown,
  Shield,
  Eye,
  Trash2,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface ShareSessionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShareSession = ({ open, onOpenChange }: ShareSessionProps) => {
  const { session, role, getShareUrl, getAdminShareUrl, isSharedMode, endSession, isCreator } = useSession();
  const router = useRouter();

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedAdminLink, setCopiedAdminLink] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const shareUrl = getShareUrl();
  const adminShareUrl = getAdminShareUrl();

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [shareUrl]);

  const handleCopyAdminLink = useCallback(async () => {
    if (!adminShareUrl) return;
    try {
      await navigator.clipboard.writeText(adminShareUrl);
      setCopiedAdminLink(true);
      setTimeout(() => setCopiedAdminLink(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [adminShareUrl]);

  const handleShare = useCallback(async () => {
    if (!shareUrl || !session) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: session.name,
          text: `Watch the live score for ${session.name}`,
          url: shareUrl,
        });
      } catch {
        // User cancelled or error
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  }, [shareUrl, session, handleCopyLink]);

  const handleEndSession = useCallback(async () => {
    setIsEnding(true);
    const summary = await endSession();
    setIsEnding(false);
    onOpenChange(false);
    if (summary) {
      // Redirect creator to their session summary
      router.push(`/summary/${summary.shareCode}`);
    }
  }, [endSession, onOpenChange, router]);

  if (!session || !isSharedMode) {
    return null;
  }

  const roleIcon = {
    creator: <Crown className="w-3 h-3" />,
    admin: <Shield className="w-3 h-3" />,
    viewer: <Eye className="w-3 h-3" />,
  };

  const roleColor = {
    creator: "bg-amber-500/20 text-amber-500 border-amber-500/30",
    admin: "bg-blue-500/20 text-blue-500 border-blue-500/30",
    viewer: "bg-muted text-muted-foreground",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Share Session
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <span>Share this session with others to let them view live scores</span>
            <Badge variant="outline" className={`${roleColor[role]} gap-1`}>
              {roleIcon[role]}
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Session Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{session.name}</p>
              <p className="text-sm text-muted-foreground">
                Share Code: <span className="font-mono font-bold">{session.shareCode}</span>
              </p>
            </div>
          </div>

          {/* Viewer Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Link2 className="w-4 h-4 text-muted-foreground" />
              Viewer Link
            </label>
            <p className="text-xs text-muted-foreground">
              Share this link with anyone who wants to watch the live scores (read-only).
            </p>
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                className="shrink-0 cursor-pointer"
              >
                {copiedLink ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Admin Link - Only show for creator/admin */}
          {(role === "creator" || role === "admin") && adminShareUrl && (
            <>
              <Separator />
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-500" />
                  Admin Link
                  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/30">
                    Secret
                  </Badge>
                </label>
                <p className="text-xs text-muted-foreground">
                  Share this link with trusted people to give them admin access (can edit scores).
                </p>
                <div className="flex gap-2">
                  <Input
                    value={adminShareUrl}
                    readOnly
                    type="password"
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyAdminLink}
                    className="shrink-0 cursor-pointer"
                  >
                    {copiedAdminLink ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-amber-500/80">
                  ⚠️ Only share this link with people you trust. Anyone with this link can edit scores.
                </p>
              </div>
            </>
          )}

          {/* End Session - Only show for creator */}
          {isCreator && (
            <>
              <Separator />
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2 text-destructive">
                  <Trash2 className="w-4 h-4" />
                  End Session
                </label>
                {!showEndConfirm ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Permanently delete this session. All viewers will lose access.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setShowEndConfirm(true)}
                      className="w-full cursor-pointer text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      End Session
                    </Button>
                  </>
                ) : (
                  <div className="space-y-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                    <p className="text-sm font-medium text-destructive">
                      Are you sure? This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowEndConfirm(false)}
                        disabled={isEnding}
                        className="flex-1 cursor-pointer"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleEndSession}
                        disabled={isEnding}
                        className="flex-1 gap-2 cursor-pointer"
                      >
                        {isEnding ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Ending...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            Confirm
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 cursor-pointer"
          >
            Close
          </Button>
          <Button
            onClick={handleShare}
            className="flex-1 gap-2 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Simple button to open share dialog
interface ShareButtonProps {
  className?: string;
}

export const ShareButton = ({ className }: ShareButtonProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const { isSharedMode, session } = useSession();

  if (!isSharedMode || !session) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
        className={`gap-2 cursor-pointer ${className}`}
      >
        <Share2 className="w-4 h-4" />
        Share
      </Button>
      <ShareSession open={showDialog} onOpenChange={setShowDialog} />
    </>
  );
};

