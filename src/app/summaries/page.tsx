"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from "@/components/ui/glass-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TrophyIcon,
  ShareIcon,
  TrashIcon,
  EllipsisVerticalIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardIcon,
  CheckIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { EmptyHistory } from "@/components/illustrations";
import { PageLoadingSpinner, EmptyState, DeleteConfirmDialog, DecorativeBackground, PageHeader } from "@/components/shared";
import { useSummariesPage } from "@/hooks/useSummariesPage";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function SummariesPage() {
  const { isLoading: authLoading, isAuthenticated } = useRequireAuth();
  const {
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
    summaries,
  } = useSummariesPage();

  if (authLoading || !isAuthenticated) {
    return <PageLoadingSpinner />;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-6xl mx-auto px-4 pb-12">
          <div className="flex items-center justify-center min-h-[60vh]">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <ArrowPathIcon className="w-8 h-8 text-primary" />
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DecorativeBackground />
      <Navigation />

      <main className="relative max-w-6xl mx-auto px-4 pt-8 pb-12">
        <PageHeader
          title="Session History"
          count={summaries.length}
          description="View and share your completed session summaries"
        />

        {summaries.length === 0 ? (
          <EmptyState
            illustration={<EmptyHistory className="w-48 h-48 mx-auto mb-6" />}
            title="No Session History"
            description="When you end a shared session, a summary will be saved here so you can view and share the results later."
            actions={
              <Link href="/competitions/new">
                <Button className="gap-2 cursor-pointer btn-teal-gradient rounded-xl" size="lg">
                  <TrophyIcon className="w-5 h-5" />
                  Create Competition
                </Button>
              </Link>
            }
          />
        ) : (
          <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {summaries.map((summary) => (
              <StaggerItem key={summary.id}>
                <GlassCard
                  className="group cursor-pointer"
                  onClick={() => handleOpenSummary(summary.shareCode)}
                >
                  <GlassCardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <GlassCardTitle className="text-lg truncate group-hover:text-primary transition-colors">
                          {summary.name}
                        </GlassCardTitle>
                        <GlassCardDescription className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs bg-accent/30">
                            {getCompetitionTypeLabel(summary.competition?.type)}
                          </Badge>
                        </GlassCardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <EllipsisVerticalIcon className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-card border-glass-border">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenSummary(summary.shareCode);
                            }}
                            className="cursor-pointer"
                          >
                            <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-2" />
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
                              <CheckIcon className="w-4 h-4 mr-2 text-emerald-500" />
                            ) : (
                              <ClipboardIcon className="w-4 h-4 mr-2" />
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
                            <TrashIcon className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </GlassCardHeader>
                  <GlassCardContent className="space-y-3 pt-0">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-accent/20">
                        <div className="text-lg font-bold text-primary">
                          {summary.stats.completedMatches}
                        </div>
                        <div className="text-xs text-muted-foreground">Matches</div>
                      </div>
                      <div className="p-2 rounded-xl bg-accent/20">
                        <div className="text-lg font-bold">
                          {summary.stats.totalTeams}
                        </div>
                        <div className="text-xs text-muted-foreground">Teams</div>
                      </div>
                      <div className="p-2 rounded-xl bg-accent/20">
                        <div className="text-lg font-bold text-amber-400">
                          {formatDuration(summary.stats.duration)}
                        </div>
                        <div className="text-xs text-muted-foreground">Duration</div>
                      </div>
                    </div>

                    {summary.stats.winner && (
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <TrophyIcon className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-medium truncate">
                          {summary.stats.winner.teamName}
                        </span>
                        <Badge variant="secondary" className="ml-auto text-xs bg-amber-500/20 text-amber-400">
                          {summary.stats.winner.wins} wins
                        </Badge>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/20">
                      <span>{formatDate(summary.endedAt)}</span>
                      <div className="flex items-center gap-1">
                        <ShareIcon className="w-3 h-3" />
                        <span>{summary.shareCode}</span>
                      </div>
                    </div>
                  </GlassCardContent>
                </GlassCard>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </main>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Delete Summary?"
        description={<>This will permanently delete &quot;{deleteTarget?.name}&quot; and cannot be undone.</>}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        className="glass-card border-glass-border"
      />
    </div>
  );
}
