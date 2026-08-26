import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/matchbook/Toast";
import { useAuth } from "@/context/AuthContext";
import { getCreatorSummaries, deleteSummary, getSummaryUrl } from "@/lib/sessions";
import type { SessionSummary } from "@/types/session";

/* ===========================================================================
   THE ONE REMOTE FEED ON /summaries

   Shared Reports is the only panel that crosses a network, so its failure
   must render as a failure, never as an empty account:

     faulted    the last load attempt rejected — the panel renders
                stale/failed, and the mute-panel index does not count a failed
                feed as "nothing to show".
     last-known cache — the most recent GOOD payload, per-creator in
                localStorage; a failed refresh shows it greyed under a dated
                band rather than a blank.
     retry      re-runs the fetch. `isLoading` flips in the same handler
                commit as the attempt counter so there is no one-frame
                failure-under-a-retry render.

   The cache is EVIDENCE, not truth: read only on a failed fetch, keyed by
   creator uid, overwritten by every successful load (including after a
   delete, so a deleted report cannot resurrect through the stale path).
   =========================================================================== */

const CACHE_PREFIX = "mb-shared-reports:";

interface SummariesCache {
  at: number;
  rows: SessionSummary[];
}

const readCache = (uid: string): SummariesCache | null => {
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + uid);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { at, rows } = parsed as Partial<SummariesCache>;
    if (!Number.isFinite(at) || !Array.isArray(rows)) return null;
    return { at: at as number, rows };
  } catch {
    return null;
  }
};

const writeCache = (uid: string, rows: SessionSummary[]): void => {
  try {
    window.localStorage.setItem(
      CACHE_PREFIX + uid,
      JSON.stringify({ at: Date.now(), rows })
    );
  } catch {
    /* Quota or private mode. The cache is a courtesy; losing it only means a
       future failure shows the failed-empty state instead of stale data. */
  }
};

export const useSummariesPage = () => {
  const { user, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [summaries, setSummaries] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  /** The last attempt rejected; what is rendered is cache or nothing. */
  const [faulted, setFaulted] = useState(false);
  /** Epoch millis the rendered rows were FETCHED (cache time when faulted). */
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<SessionSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSummaries = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await getCreatorSummaries(user.uid);
        if (cancelled) return;
        data.sort((a, b) => b.endedAt - a.endedAt);
        setSummaries(data);
        setFetchedAt(Date.now());
        setFaulted(false);
        writeCache(user.uid, data);
      } catch (err) {
        console.error("Failed to load summaries:", err);
        if (cancelled) return;
        const cached = readCache(user.uid);
        if (cached) {
          setSummaries(cached.rows);
          setFetchedAt(cached.at);
        }
        setFaulted(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadSummaries();
    return () => {
      cancelled = true;
    };
  }, [user, attempt]);

  /** Re-runs the fetch. One commit: the loading strip replaces the failure. */
  const retry = useCallback(() => {
    setIsLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await deleteSummary(deleteTarget.id);
      setSummaries((prev) => {
        const next = prev.filter((s) => s.id !== deleteTarget.id);
        /* Keep the last-known cache honest, or a stale render after a later
           failed fetch would resurrect the report that was just deleted. */
        if (user) writeCache(user.uid, next);
        return next;
      });
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete summary:", err);
      /* The dialog stays open so the action is still reachable. No provider
         string is printed. */
      toast({
        tone: "danger",
        message: "The report could not be deleted right now — try again in a moment.",
        duration: 0,
      });
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, user]);

  const handleCopyLink = useCallback(async (summary: SessionSummary) => {
    const url = getSummaryUrl(summary.shareCode);
    await navigator.clipboard.writeText(url);
    setCopiedId(summary.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const formatDuration = useCallback((ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  }, []);

  const formatDate = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const getCompetitionTypeLabel = useCallback((type?: string) => {
    switch (type) {
      case "round_robin":
        return "Round Robin";
      case "bracket":
        return "Bracket";
      case "win2out":
        return "Win 2 & Out";
      case "two_match_rotation":
        return "2 Match Rotation";
      default:
        return "Session";
    }
  }, []);

  const handleOpenSummary = useCallback(
    (shareCode: string) => {
      router.push(`/summary/${shareCode}`);
    },
    [router]
  );

  return {
    copiedId,
    deleteTarget,
    faulted,
    fetchedAt,
    formatDate,
    formatDuration,
    getCompetitionTypeLabel,
    handleCopyLink,
    handleDelete,
    handleOpenSummary,
    isDeleting,
    isLoading,
    retry,
    setDeleteTarget,
    signInWithGoogle,
    summaries,
    user,
  };
};
