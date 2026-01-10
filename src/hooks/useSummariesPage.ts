import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getCreatorSummaries, deleteSummary, getSummaryUrl } from "@/lib/sessions";
import type { SessionSummary } from "@/types/session";

export const useSummariesPage = () => {
  const { user, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [summaries, setSummaries] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<SessionSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const loadSummaries = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await getCreatorSummaries(user.uid);
        data.sort((a, b) => b.endedAt - a.endedAt);
        setSummaries(data);
      } catch (err) {
        console.error("Failed to load summaries:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSummaries();
  }, [user]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await deleteSummary(deleteTarget.id);
      setSummaries((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete summary:", err);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget]);

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
    formatDate,
    formatDuration,
    getCompetitionTypeLabel,
    handleCopyLink,
    handleDelete,
    handleOpenSummary,
    isDeleting,
    isLoading,
    setDeleteTarget,
    signInWithGoogle,
    summaries,
    user,
  };
};
