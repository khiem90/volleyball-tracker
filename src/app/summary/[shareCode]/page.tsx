"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getSummaryByShareCode, getSummaryUrl, deleteSummary } from "@/lib/sessions";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Trophy,
  Users,
  Clock,
  Share2,
  Home,
  AlertCircle,
  Loader2,
  Check,
  Copy,
  ArrowLeft,
  Calendar,
  Timer,
  Target,
  Medal,
  Trash2,
} from "lucide-react";
import type { SessionSummary } from "@/types/session";
import type { Match } from "@/types/game";

export default function SummaryPage() {
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

  // Load summary
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

    const stats: Record<string, { wins: number; losses: number; pointsFor: number; pointsAgainst: number }> = {};

    // Initialize stats for all teams
    summary.teams.forEach((team) => {
      stats[team.id] = { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 };
    });

    // Calculate stats from completed matches
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

    // Convert to sorted array
    return summary.teams
      .map((team) => ({
        team,
        ...stats[team.id],
      }))
      .sort((a, b) => {
        // Sort by wins, then point differential
        if (b.wins !== a.wins) return b.wins - a.wins;
        return (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst);
      });
  }, [summary, completedMatches]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error/Not found state
  if (error || !summary) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle>Summary Not Found</CardTitle>
            <CardDescription>
              {error || `We couldn't find a summary with code "${shareCode}".`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/">
              <Button className="w-full gap-2 cursor-pointer">
                <Home className="w-4 h-4" />
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass border-b border-border/40 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href={isCreator ? "/summaries" : "/"}>
                <Button variant="ghost" size="icon" className="cursor-pointer">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold">{summary.name}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {getCompetitionTypeLabel(summary.competition?.type)}
                  </Badge>
                  <span>•</span>
                  <span>Session Summary</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="gap-2 cursor-pointer"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{copied ? "Copied!" : "Share"}</span>
              </Button>
              {isCreator && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Overview Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-linear-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Matches</p>
                  <p className="text-2xl font-bold">{summary.stats.completedMatches}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-linear-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Teams</p>
                  <p className="text-2xl font-bold">{summary.stats.totalTeams}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-linear-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Timer className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="text-2xl font-bold">{formatDuration(summary.stats.duration)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-linear-to-br from-green-500/5 to-green-500/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Calendar className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ended</p>
                  <p className="text-lg font-bold">
                    {new Date(summary.endedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Winner Section */}
        {summary.stats.winner && (
          <Card className="bg-linear-to-br from-amber-500/5 via-amber-500/10 to-orange-500/5 border-amber-500/30">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className="p-4 rounded-2xl bg-amber-500/20">
                  <Trophy className="w-10 h-10 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Champion</p>
                  <h2 className="text-2xl font-bold">{summary.stats.winner.teamName}</h2>
                  <p className="text-muted-foreground">
                    {summary.stats.winner.wins} wins
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Standings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Medal className="w-5 h-5 text-primary" />
              Final Standings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {teamStats.map((stat, index) => (
                <div
                  key={stat.team.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <span className="w-6 text-center font-bold text-muted-foreground">
                    {index + 1}
                  </span>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: stat.team.color }}
                  />
                  <span className="flex-1 font-medium">{stat.team.name}</span>
                  <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                    {stat.wins}W
                  </Badge>
                  <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20">
                    {stat.losses}L
                  </Badge>
                  <span className="text-sm text-muted-foreground w-16 text-right">
                    {stat.pointsFor}-{stat.pointsAgainst}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Match History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Match History
            </CardTitle>
            <CardDescription>
              {completedMatches.length} completed matches
            </CardDescription>
          </CardHeader>
          <CardContent>
            {completedMatches.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No completed matches
              </p>
            ) : (
              <div className="space-y-2">
                {completedMatches.map((match, index) => {
                  const homeTeam = teamsMap[match.homeTeamId];
                  const awayTeam = teamsMap[match.awayTeamId];
                  const homeWon = match.winnerId === match.homeTeamId;

                  return (
                    <div
                      key={match.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                    >
                      <span className="w-6 text-center text-xs text-muted-foreground">
                        #{completedMatches.length - index}
                      </span>
                      <div className="flex-1 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: homeTeam?.color }}
                          />
                          <span
                            className={`truncate ${homeWon ? "font-semibold" : "text-muted-foreground"}`}
                          >
                            {homeTeam?.name || "Unknown"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-lg font-mono">
                          <span className={homeWon ? "text-green-500 font-bold" : ""}>
                            {match.homeScore}
                          </span>
                          <span className="text-muted-foreground">-</span>
                          <span className={!homeWon ? "text-green-500 font-bold" : ""}>
                            {match.awayScore}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                          <span
                            className={`truncate ${!homeWon ? "font-semibold" : "text-muted-foreground"}`}
                          >
                            {awayTeam?.name || "Unknown"}
                          </span>
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: awayTeam?.color }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4 text-sm text-muted-foreground">
              <div>
                <span className="font-medium">Started:</span>{" "}
                {formatDate(summary.createdAt)}
              </div>
              <div>
                <span className="font-medium">Ended:</span>{" "}
                {formatDate(summary.endedAt)}
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium">Share Code:</span>{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded">{summary.shareCode}</code>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete Summary?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete this session summary and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
              className="flex-1 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 gap-2 cursor-pointer"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

