"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  Loader2,
  Check,
  ArrowLeft,
  Share2,
  Home,
  Trash2,
} from "lucide-react";
import { DeleteConfirmDialog } from "@/components/shared";
import { useSummaryPage } from "@/hooks/useSummaryPage";
import { SummaryOverviewCards } from "./SummaryOverviewCards";
import { SummaryWinnerDisplay } from "./SummaryWinnerDisplay";
import { SummaryStandings } from "./SummaryStandings";
import { SummaryMatchHistory } from "./SummaryMatchHistory";

export default function SummaryPage() {
  const {
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
  } = useSummaryPage();

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
        <SummaryOverviewCards
          stats={summary.stats}
          endedAt={summary.endedAt}
          formatDuration={formatDuration}
        />

        {summary.stats.winner && (
          <SummaryWinnerDisplay winner={summary.stats.winner} />
        )}

        <SummaryStandings teamStats={teamStats} />

        <SummaryMatchHistory
          completedMatches={completedMatches}
          teamsMap={teamsMap}
        />

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

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Summary?"
        description="This will permanently delete this session summary and cannot be undone."
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
