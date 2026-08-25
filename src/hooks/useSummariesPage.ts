import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/matchbook/Toast";
import { useAuth } from "@/context/AuthContext";
import { getCreatorSummaries, deleteSummary, getSummaryUrl } from "@/lib/sessions";
import type { SessionSummary } from "@/types/session";

/* ===========================================================================
   THE ONE REMOTE FEED ON /summaries (C15)

   Every other panel on the archive derives synchronously from localStorage;
   Shared Reports is the single panel that crosses a network. Its failure mode
   used to be a lie: the `catch` logged to the console and left `summaries` at
   `[]`, so a Firestore outage rendered as "No shared reports exist yet" — a
   failure dressed as an empty account, with no retry and no way to tell the
   two apart. Invariant 28 wants failures visible and recoverable; C15 wants
   them CONTAINED — one panel degraded, five loaded, never a whole dead screen.

   Three additions, no change to the happy path:

     faulted    the last load attempt rejected. The page renders the panel
                stale/failed instead of empty, and the mute-panel index no
                longer counts a failed feed as "nothing to show".
     last-known cache — the most recent GOOD payload, kept per-creator in
                localStorage. A later visit whose fetch fails shows that data
                greyed under a dated band ("Couldn't refresh — showing
                2:14 PM") rather than a blank, which is the same
                keep-the-last-numbers rule the share routes'
                `useLiveConnection` staleness already enforces.
     retry      re-runs the fetch. `isLoading` flips in the same handler
                commit as the attempt counter so there is no one-frame
                failure-under-a-retry render (the bug `useSummaryPage`'s
                docblock names).

   The cache is EVIDENCE, not truth: it is only ever read on a failed fetch,
   is keyed by creator uid so accounts cannot bleed into each other, and is
   overwritten by every successful load (including after a delete, so a
   deleted report cannot resurrect through the stale path).
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
      /* The dialog stays open so the action is still reachable — the same
         surfaced-failure contract `useSummaryPage` fixed for its own delete.
         No provider string is printed (invariant 28). */
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
