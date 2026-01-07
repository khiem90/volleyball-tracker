"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trophy, Trash2, Users, Calendar, ChevronRight } from "lucide-react";
import type { Competition, CompetitionStatus } from "@/types/game";

interface CompetitionCardProps {
  competition: Competition;
  teamCount: number;
  matchCount: number;
  completedMatchCount: number;
  onDelete: (id: string) => void;
}

const statusConfig: Record<CompetitionStatus, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-slate-500/20 text-slate-400",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-amber-500/20 text-amber-500",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-500/20 text-emerald-500",
  },
};

const typeLabels: Record<string, string> = {
  round_robin: "Round Robin",
  single_elimination: "Single Elimination",
  double_elimination: "Double Elimination",
};

export const CompetitionCard = ({
  competition,
  teamCount,
  matchCount,
  completedMatchCount,
  onDelete,
}: CompetitionCardProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    onDelete(competition.id);
    setShowDeleteConfirm(false);
  }, [onDelete, competition.id]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  const status = statusConfig[competition.status];
  const typeLabel = typeLabels[competition.type] || competition.type;
  const createdDate = new Date(competition.createdAt).toLocaleDateString();
  const progress = matchCount > 0 ? Math.round((completedMatchCount / matchCount) * 100) : 0;

  return (
    <>
      <Link href={`/competitions/${competition.id}`} className="block group">
        <Card className="border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg truncate">{competition.name}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {typeLabel}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {teamCount} teams
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {createdDate}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDeleteClick}
                  aria-label={`Delete ${competition.name}`}
                  className="h-8 w-8 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>

            {/* Progress bar for in-progress competitions */}
            {competition.status === "in_progress" && matchCount > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{completedMatchCount}/{matchCount} matches</span>
                </div>
                <div className="h-2 bg-card rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Competition?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{competition.name}</strong>? This will also delete all associated matches. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button variant="outline" onClick={handleCancelDelete} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} className="flex-1">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

