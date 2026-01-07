"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/context/AuthContext";
import { getCreatorSummaries, deleteSummary, getSummaryUrl } from "@/lib/sessions";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  History,
  Trophy,
  Users,
  Clock,
  Share2,
  Trash2,
  MoreVertical,
  ExternalLink,
  Copy,
  Check,
  LogIn,
  Loader2,
} from "lucide-react";
import type { SessionSummary } from "@/types/session";

export default function SummariesPage() {
  const { user, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [summaries, setSummaries] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<SessionSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load summaries when user is available
  useEffect(() => {
    const loadSummaries = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await getCreatorSummaries(user.uid);
        // Sort by endedAt descending (most recent first)
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

  // Not logged in state
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Card className="max-w-md w-full">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <History className="w-8 h-8 text-primary" />
                </div>
                <CardTitle>Session History</CardTitle>
                <CardDescription>
                  Sign in to view your session summaries and match history.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={signInWithGoogle}
                  className="w-full gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  Sign in with Google
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">Session History</h1>
              <Badge variant="secondary" className="text-sm">
                {summaries.length}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              View and share your completed session summaries
            </p>
          </div>
        </div>

        {/* Empty State */}
        {summaries.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <History className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Session History</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                When you end a shared session, a summary will be saved here so you can
                view and share the results later.
              </p>
              <Link href="/competitions/new">
                <Button className="gap-2 cursor-pointer">
                  <Trophy className="w-4 h-4" />
                  Create Competition
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          /* Summaries Grid */
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {summaries.map((summary) => (
              <Card
                key={summary.id}
                className="group hover:shadow-lg transition-all duration-200 cursor-pointer"
                onClick={() => router.push(`/summary/${summary.shareCode}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">
                        {summary.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {getCompetitionTypeLabel(summary.competition?.type)}
                        </Badge>
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/summary/${summary.shareCode}`);
                          }}
                          className="cursor-pointer"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Summary
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyLink(summary);
                          }}
                          className="cursor-pointer"
                        >
                          {copiedId === summary.id ? (
                            <Check className="w-4 h-4 mr-2 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 mr-2" />
                          )}
                          Copy Link
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(summary);
                          }}
                          className="text-destructive cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-muted/50">
                      <div className="text-lg font-bold text-primary">
                        {summary.stats.completedMatches}
                      </div>
                      <div className="text-xs text-muted-foreground">Matches</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <div className="text-lg font-bold">
                        {summary.stats.totalTeams}
                      </div>
                      <div className="text-xs text-muted-foreground">Teams</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <div className="text-lg font-bold text-amber-500">
                        {formatDuration(summary.stats.duration)}
                      </div>
                      <div className="text-xs text-muted-foreground">Duration</div>
                    </div>
                  </div>

                  {/* Winner Badge */}
                  {summary.stats.winner && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium truncate">
                        {summary.stats.winner.teamName}
                      </span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {summary.stats.winner.wins} wins
                      </Badge>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>{formatDate(summary.endedAt)}</span>
                    <div className="flex items-center gap-1">
                      <Share2 className="w-3 h-3" />
                      <span>{summary.shareCode}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete Summary?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{deleteTarget?.name}&quot; and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
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

