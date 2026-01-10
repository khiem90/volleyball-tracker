import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSummaryByShareCode, getSummaryUrl, deleteSummary } from "@/lib/sessions";
import { useAuth } from "@/context/AuthContext";
import type { SessionSummary } from "@/types/session";

export const useSummaryPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const shareCode = params.shareCode as string;

  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const data = await getSummaryByShareCode(shareCode);
        if (data) {
          setSummary(data);
        } else {
          setError("Summary not found");
        }
      } catch (err) {
        console.error("Failed to load summary:", err);
        setError("Failed to load summary");
      } finally {
        setIsLoading(false);
      }
    };

    loadSummary();
  }, [shareCode]);

  const isCreator = useMemo(() => {
    return user?.uid === summary?.creatorId;
  }, [user, summary]);

  const handleCopyLink = useCallback(async () => {
    const url = getSummaryUrl(shareCode);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareCode]);

  const handleDelete = useCallback(async () => {
    if (!summary) return;

    setIsDeleting(true);
    try {
      await deleteSummary(summary.id);
      router.push("/summaries");
    } catch (err) {
      console.error("Failed to delete summary:", err);
    } finally {
      setIsDeleting(false);
    }
  }, [summary, router]);

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
      weekday: "long",
      year: "numeric",
      month: "long",
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

  const teamsMap = useMemo(() => {
    if (!summary) return {};
    const map: Record<string, { name: string; color: string }> = {};
    summary.teams.forEach((team) => {
      map[team.id] = { name: team.name, color: team.color || "#6b7280" };
    });
    return map;
  }, [summary]);

  const completedMatches = useMemo(() => {
    if (!summary) return [];
    return summary.matches
      .filter((m) => m.status === "completed")
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  }, [summary]);

  const teamStats = useMemo(() => {
    if (!summary) return [];

    const stats: Record<
      string,
      { wins: number; losses: number; pointsFor: number; pointsAgainst: number }
    > = {};

    summary.teams.forEach((team) => {
      stats[team.id] = { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 };
    });

    completedMatches.forEach((match) => {
      const home = stats[match.homeTeamId];
      const away = stats[match.awayTeamId];

      if (home) {
        home.pointsFor += match.homeScore;
        home.pointsAgainst += match.awayScore;
        if (match.winnerId === match.homeTeamId) {
          home.wins += 1;
        } else {
          home.losses += 1;
        }
      }

      if (away) {
        away.pointsFor += match.awayScore;
        away.pointsAgainst += match.homeScore;
        if (match.winnerId === match.awayTeamId) {
          away.wins += 1;
        } else {
          away.losses += 1;
        }
      }
    });

    return summary.teams
      .map((team) => ({
        team,
        ...stats[team.id],
      }))
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst);
      });
  }, [summary, completedMatches]);

  return {
    completedMatches,
    copied,
    error,
    formatDate,
    formatDuration,
    getCompetitionTypeLabel,
    handleCopyLink,
    handleDelete,
    isCreator,
    isDeleting,
    isLoading,
    setShowDeleteDialog,
    shareCode,
    showDeleteDialog,
    summary,
    teamStats,
    teamsMap,
  };
};
