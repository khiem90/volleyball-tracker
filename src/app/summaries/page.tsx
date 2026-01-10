"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Background } from "@/components/Background";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from "@/components/ui/glass-card";
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
  Share2,
  Trash2,
  MoreVertical,
  ExternalLink,
  Copy,
  Check,
  LogIn,
  Loader2,
} from "lucide-react";
import { MotionDiv, StaggerContainer, StaggerItem, slideUp } from "@/components/motion";
import { useSummariesPage } from "@/hooks/useSummariesPage";

export default function SummariesPage() {
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
    signInWithGoogle,
    summaries,
    user,
  } = useSummariesPage();

  // Not logged in state
  if (!user) {
    return (
      <Background variant="default">
        <Navigation />
        <main className="max-w-6xl mx-auto px-4 pb-12">
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center min-h-[60vh]"
          >
            <GlassCard hover={false} className="max-w-md w-full">
              <GlassCardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <History className="w-8 h-8 text-primary" />
                </div>
                <GlassCardTitle className="text-xl">Session History</GlassCardTitle>
                <GlassCardDescription>
                  Sign in to view your session summaries and match history.
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <Button
                  onClick={signInWithGoogle}
                  className="w-full gap-2 cursor-pointer btn-orange-gradient rounded-xl"
                >
                  <LogIn className="w-4 h-4" />
                  Sign in with Google
                </Button>
              </GlassCardContent>
            </GlassCard>
          </MotionDiv>
        </main>
      </Background>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Background variant="default">
        <Navigation />
        <main className="max-w-6xl mx-auto px-4 pb-12">
          <div className="flex items-center justify-center min-h-[60vh]">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-8 h-8 text-primary" />
            </motion.div>
          </div>
        </main>
      </Background>
    );
  }

  return (
    <Background variant="default">
      <Navigation />

      <main className="max-w-6xl mx-auto px-4 pb-12">
        {/* Header */}
        <MotionDiv
          initial="hidden"
          animate="visible"
          variants={slideUp}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">Session History</h1>
              <Badge variant="secondary" className="text-sm bg-primary/20 text-primary">
                {summaries.length}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              View and share your completed session summaries
            </p>
          </div>
        </MotionDiv>

        {/* Empty State */}
        {summaries.length === 0 ? (
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassCard hover={false} className="border-dashed">
              <GlassCardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
                  <History className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Session History</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  When you end a shared session, a summary will be saved here so you can
                  view and share the results later.
                </p>
                <Link href="/competitions/new">
                  <Button className="gap-2 cursor-pointer btn-orange-gradient rounded-xl">
                    <Trophy className="w-4 h-4" />
                    Create Competition
                  </Button>
                </Link>
              </GlassCardContent>
            </GlassCard>
          </MotionDiv>
        ) : (
          /* Summaries Grid */
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
                            <MoreVertical className="w-4 h-4" />
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
                              <Check className="w-4 h-4 mr-2 text-emerald-500" />
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
                  </GlassCardHeader>
                  <GlassCardContent className="space-y-3 pt-0">
                    {/* Stats Row */}
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

                    {/* Winner Badge */}
                    {summary.stats.winner && (
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-medium truncate">
                          {summary.stats.winner.teamName}
                        </span>
                        <Badge variant="secondary" className="ml-auto text-xs bg-amber-500/20 text-amber-400">
                          {summary.stats.winner.wins} wins
                        </Badge>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/20">
                      <span>{formatDate(summary.endedAt)}</span>
                      <div className="flex items-center gap-1">
                        <Share2 className="w-3 h-3" />
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="glass-card border-glass-border">
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
              className="flex-1 cursor-pointer rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 gap-2 cursor-pointer rounded-xl"
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
    </Background>
  );
}
