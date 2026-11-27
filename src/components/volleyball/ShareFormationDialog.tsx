"use client";

import { memo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/shared/Icon";
import type { UserFormation } from "@/lib/volleyball/types";
import { formationShareLink } from "@/lib/volleyball/formationLinks";
import { useOrigin } from "@/hooks/useOrigin";

type ShareFormationDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  /** The live formation from the account's subscription, not a snapshot */
  formation: UserFormation | null;
  onEnableSharing: (formationId: string) => Promise<string>;
  onDisableSharing: (formationId: string) => Promise<void>;
};

export const ShareFormationDialog = memo(
  ({
    isOpen,
    onClose,
    formation,
    onEnableSharing,
    onDisableSharing,
  }: ShareFormationDialogProps) => {
    const [pending, setPending] = useState<"enable" | "disable" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const origin = useOrigin();

    // The subscription applies local writes at once, so the link appears or
    // goes away as soon as sharing changes, before the server confirms it.
    const shareUrl = formation ? formationShareLink(origin, formation) : null;

    const handleEnableSharing = useCallback(async () => {
      if (!formation) return;

      setPending("enable");
      setError(null);

      try {
        await onEnableSharing(formation.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to enable sharing");
      } finally {
        setPending(null);
      }
    }, [formation, onEnableSharing]);

    const handleDisableSharing = useCallback(async () => {
      if (!formation) return;

      setPending("disable");
      setError(null);

      try {
        await onDisableSharing(formation.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to disable sharing");
      } finally {
        setPending(null);
      }
    }, [formation, onDisableSharing]);

    const handleCopyLink = useCallback(async () => {
      if (!shareUrl) return;

      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback for browsers that don't support clipboard API
        const input = document.createElement("input");
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }, [shareUrl]);

    if (!formation) return null;

    return (
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        {/* With no description to point at, the dialog is told it has none. */}
        <DialogContent
          className="sm:max-w-md"
          {...(formation.description ? {} : { "aria-describedby": undefined })}
        >
          <DialogHeader>
            <DialogTitle>
              <Icon id="share" size={18} className="shrink-0" />
              Share Formation
            </DialogTitle>
          </DialogHeader>

          {/* Formation Info */}
          <div className="flex flex-col gap-1">
            <h3 className="text-title font-semibold wrap-anywhere">{formation.name}</h3>
            {formation.description && (
              <DialogDescription className="text-label">
                {formation.description}
              </DialogDescription>
            )}
          </div>

          {/* Sharing Status */}
          <div className="rounded-tile bg-fill p-4">
            {shareUrl ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-action" aria-hidden="true" />
                  <span className="text-label font-semibold text-action">
                    Sharing enabled
                  </span>
                </div>

                {/* Share URL */}
                <div className="flex items-center gap-2">
                  <span className="field min-w-0 flex-1">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      aria-label="Share link"
                      className="truncate"
                    />
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="btn btn-ink shrink-0 px-4"
                  >
                    {copied && <Icon id="check" size={14} />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>

                <p className="text-caption text-ink-soft">
                  Anyone with this link can view your formation
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <p className="text-label text-ink-soft">
                  This formation is private. Enable sharing to generate a link.
                </p>
                <button
                  type="button"
                  onClick={handleEnableSharing}
                  disabled={pending !== null}
                  className="btn btn-ink"
                >
                  {pending === "enable" ? "Enabling..." : "Enable Sharing"}
                </button>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <p role="alert" className="text-label font-medium text-danger">
              {error}
            </p>
          )}

          {/* Disable Sharing */}
          {shareUrl && (
            <div className="flex flex-col items-start gap-2 border-t border-line pt-4">
              <button
                type="button"
                onClick={handleDisableSharing}
                disabled={pending !== null}
                className="btn btn-danger-quiet px-4"
              >
                {pending === "disable" ? "Disabling..." : "Make Private"}
              </button>
              <p className="text-caption text-ink-soft">
                This will revoke access for anyone with the share link
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);
ShareFormationDialog.displayName = "ShareFormationDialog";
