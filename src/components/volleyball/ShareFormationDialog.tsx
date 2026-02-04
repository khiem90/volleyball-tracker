"use client";

import { memo, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { UserFormation } from "@/lib/volleyball/types";
import { getFormationShareUrl } from "@/lib/volleyball/userFormations";

type ShareFormationDialogProps = {
  isOpen: boolean;
  onClose: () => void;
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
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);

    // Update share URL when formation changes
    useEffect(() => {
      if (formation?.shareId) {
        setShareUrl(getFormationShareUrl(formation.shareId));
      } else {
        setShareUrl(null);
      }
    }, [formation?.shareId]);

    const handleEnableSharing = useCallback(async () => {
      if (!formation) return;

      setIsLoading(true);
      setError(null);

      try {
        const shareId = await onEnableSharing(formation.id);
        setShareUrl(getFormationShareUrl(shareId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to enable sharing");
      } finally {
        setIsLoading(false);
      }
    }, [formation, onEnableSharing]);

    const handleDisableSharing = useCallback(async () => {
      if (!formation) return;

      setIsLoading(true);
      setError(null);

      try {
        await onDisableSharing(formation.id);
        setShareUrl(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to disable sharing");
      } finally {
        setIsLoading(false);
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

    if (!isOpen || !formation) return null;

    const isShared = formation.visibility === "unlisted" && !!formation.shareId;

    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-background rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-lg font-bold">Share Formation</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-accent transition-colors"
                  aria-label="Close dialog"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Formation Info */}
                <div>
                  <h3 className="font-semibold text-foreground">{formation.name}</h3>
                  {formation.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {formation.description}
                    </p>
                  )}
                </div>

                {/* Sharing Status */}
                <div className="p-4 rounded-lg bg-accent/50">
                  {isShared ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">
                          Sharing enabled
                        </span>
                      </div>

                      {/* Share URL */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={shareUrl || ""}
                          readOnly
                          className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            copied
                              ? "bg-green-500 text-white"
                              : "bg-primary text-primary-foreground hover:bg-primary/90"
                          }`}
                        >
                          {copied ? "Copied!" : "Copy"}
                        </button>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Anyone with this link can view your formation
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-sm text-muted-foreground mb-3">
                        This formation is private. Enable sharing to generate a link.
                      </p>
                      <button
                        type="button"
                        onClick={handleEnableSharing}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {isLoading ? "Enabling..." : "Enable Sharing"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}

                {/* Disable Sharing */}
                {isShared && (
                  <div className="pt-2 border-t border-border">
                    <button
                      type="button"
                      onClick={handleDisableSharing}
                      disabled={isLoading}
                      className="text-sm text-red-500 hover:text-red-600 disabled:opacity-50"
                    >
                      {isLoading ? "Disabling..." : "Make Private"}
                    </button>
                    <p className="text-xs text-muted-foreground mt-1">
                      This will revoke access for anyone with the share link
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border bg-accent/30 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);
ShareFormationDialog.displayName = "ShareFormationDialog";
