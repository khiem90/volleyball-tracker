"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "@/components/matchbook/Toast";
import { isFirebaseConfigured } from "@/lib/firebase";
import { deleteSummary, getSummaryByShareCode, getSummaryUrl } from "@/lib/sessions";
import { useAuth } from "@/context/AuthContext";
import type { SessionSummary } from "@/types/session";

/* ===========================================================================
   THE SUMMARY STATE MACHINE (charter W6 / P3b)

   This hook owns the fetch, the role and the two mutations. Everything that
   turns a `SessionSummary` into something a screen can draw lives in
   `components/matchbook/useMatchbookSummary.ts`, and the route file draws it.

   Three defects the audit recorded here are fixed rather than preserved:

     §2.4.5  a delete rejected by `firestore.rules` — which is EVERY delete by
             an anonymous creator — used to `console.error` and nothing else.
             The dialog closed, the report stayed, and the user was told
             nothing. It now surfaces as a danger toast and the dialog stays
             open so the action is still reachable.
     §2.4.6  `navigator.clipboard.writeText` was awaited with no `try`, so an
             insecure origin or an in-app WebView produced an unhandled
             rejection and no feedback. The whole copy path is gone from this
             hook: `MbShareAction` / `MbCopyField` are the one implementation
             (charter §2.3), and both already chain clipboard → execCommand →
             select-and-hint and always surface failure.
     S17/S7  "not found" and "we cannot reach the store" and "this deployment
             has no sharing" were one card carrying whatever string the
             provider threw. They are three distinct states now, and none of
             them prints a provider message (invariant 28).

   The status is a UNION, not a pair of booleans. `isLoading=false, summary=null,
   error=null` is exactly the combination that made the live viewer flash its
   not-found card before Firestore had answered (brief S2); a status that starts
   at `"loading"` cannot express it.
   =========================================================================== */

export type MbSummaryStatus =
  | "loading"
  | "ready"
  | "notfound"
  | "error"
  | "unconfigured";

export interface MbSummaryPageState {
  shareCode: string;
  status: MbSummaryStatus;
  summary: SessionSummary | null;
  /** The public URL of this report. Never carries a token of any kind. */
  shareUrl: string;
  isCreator: boolean;
  isDeleting: boolean;
  showDeleteDialog: boolean;
  setShowDeleteDialog: (open: boolean) => void;
  handleDelete: () => void;
  /** Re-runs the fetch for the recoverable failure states. */
  retry: () => void;
}

export const useSummaryPage = (): MbSummaryPageState => {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const shareCode = typeof params.shareCode === "string" ? params.shareCode : "";

  const [attempt, setAttempt] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  /**
   * ONE piece of state for the whole fetch, tagged with the request that
   * produced it — the same shape `tools/.../shared/[shareId]` settled on.
   *
   * The three-`useState` version has a real bug in it beyond the extra
   * renders: pressing Retry sets `isLoading` in a second commit, so for one
   * frame the page still shows the previous FAILURE under a retry that looks
   * like it did nothing.
   */
  const requestKey = `${shareCode}#${attempt}`;
  const [result, setResult] = useState<{
    key: string;
    summary: SessionSummary | null;
    status: Exclude<MbSummaryStatus, "loading">;
  } | null>(null);

  useEffect(() => {
    if (!shareCode) return;
    let cancelled = false;

    if (!isFirebaseConfigured()) {
      setResult({ key: requestKey, summary: null, status: "unconfigured" });
      return;
    }

    getSummaryByShareCode(shareCode)
      .then((data) => {
        if (cancelled) return;
        setResult({
          key: requestKey,
          summary: data,
          status: data ? "ready" : "notfound",
        });
      })
      .catch(() => {
        /* The thrown value is a Firebase error object. Invariant 28 forbids it
           reaching the public UI, and there is nothing in it a stranger who
           was handed a link could act on, so it is dropped rather than
           rendered. The state it produces is recoverable and offers a retry. */
        if (cancelled) return;
        setResult({ key: requestKey, summary: null, status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [shareCode, requestKey]);

  const settled = result?.key === requestKey ? result : null;
  const status: MbSummaryStatus = shareCode
    ? (settled?.status ?? "loading")
    : "notfound";
  const summary = settled?.summary ?? null;

  const isCreator = useMemo(
    () => Boolean(user?.uid && summary?.creatorId && user.uid === summary.creatorId),
    [user, summary]
  );

  const handleDelete = useCallback(async () => {
    if (!summary) return;
    setIsDeleting(true);
    try {
      await deleteSummary(summary.id);
      setShowDeleteDialog(false);
      router.push("/summaries");
    } catch {
      /* The rules require `request.auth.uid == resource.data.creatorId`, so an
         anonymous creator's delete always fails. It used to fail silently. */
      toast({
        tone: "danger",
        message:
          "This report could not be deleted. Sign in with the account that created it and try again.",
        duration: 0,
      });
    } finally {
      setIsDeleting(false);
    }
  }, [summary, router]);

  return {
    shareCode,
    status,
    summary,
    shareUrl: getSummaryUrl(shareCode),
    isCreator,
    isDeleting,
    showDeleteDialog,
    setShowDeleteDialog,
    handleDelete: () => void handleDelete(),
    retry: () => setAttempt((n) => n + 1),
  };
};
