"use client";

import { useState, useCallback, memo, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Trash2, Users, Calendar, ChevronRight, RefreshCw, Brackets, Layers, Crown, RotateCw, Play } from "lucide-react";
import type { Competition, CompetitionStatus, CompetitionType } from "@/types/game";

interface CompetitionCardProps {
  competition: Competition;
  teamCount: number;
  matchCount: number;
  completedMatchCount: number;
  onDelete: (id: string) => void;
}

const statusConfig: Record<CompetitionStatus, { label: string; className: string; icon?: React.ReactNode }> = {
  draft: {
    label: "Draft",
    className: "status-draft",
  },
  in_progress: {
    label: "Live",
    className: "status-live",
    icon: <Play className="w-3 h-3" />,
  },
  completed: {
    label: "Done",
    className: "status-complete",
  },
};

const typeConfig: Record<CompetitionType, { label: string; icon: React.ElementType; gradient: string }> = {
  round_robin: {
    label: "Round Robin",
    icon: RefreshCw,
    gradient: "from-emerald-500 to-teal-600",
  },
  single_elimination: {
    label: "Single Elimination",
    icon: Brackets,
    gradient: "from-violet-500 to-purple-600",
  },
  double_elimination: {
    label: "Double Elimination",
    icon: Layers,
    gradient: "from-blue-500 to-indigo-600",
  },
  win2out: {
    label: "Win 2 & Out",
    icon: Crown,
    gradient: "from-primary to-amber-500",
  },
  two_match_rotation: {
    label: "2 Match Rotation",
    icon: RotateCw,
    gradient: "from-rose-500 to-pink-600",
  },
};

export const CompetitionCard = memo(({
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

  // Memoize computed values
  const status = statusConfig[competition.status];
  const typeInfo = typeConfig[competition.type] || typeConfig.round_robin;
  const TypeIcon = typeInfo.icon;
  
  const createdDate = useMemo(
    () => new Date(competition.createdAt).toLocaleDateString(),
    [competition.createdAt]
  );
  
  const progress = useMemo(
    () => matchCount > 0 ? Math.round((completedMatchCount / matchCount) * 100) : 0,
    [matchCount, completedMatchCount]
  );

  return (
    <TooltipProvider>
      <>
        <Link href={`/competitions/${competition.id}`} className="block group">
          {/* Using CSS hover instead of framer-motion */}
          <div className="glass-card glass-card-hover rounded-2xl overflow-hidden">
            <div className="flex">
              {/* Type Icon Section */}
              <div className={`w-20 shrink-0 bg-linear-to-br ${typeInfo.gradient} flex items-center justify-center relative overflow-hidden`}>
                <TypeIcon className="w-8 h-8 text-white relative z-10" />
                <div className="absolute inset-0 bg-white/10" />
              </div>
              
              {/* Content Section */}
              <div className="flex-1 p-5 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                        {competition.name}
                      </h3>
                      <Badge className={`${status.className} gap-1`}>
                        {status.icon}
                        {status.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {typeInfo.label}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-primary/70" />
                        {teamCount} teams
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-primary/70" />
                        {createdDate}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleDeleteClick}
                          aria-label={`Delete ${competition.name}`}
                          className="h-9 w-9 rounded-xl hover:bg-destructive/20 text-destructive hover:text-destructive opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete competition</TooltipContent>
                    </Tooltip>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>

                {/* Progress bar for in-progress competitions */}
                {competition.status === "in_progress" && matchCount > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/20">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium text-primary">{completedMatchCount}/{matchCount} matches</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </Link>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="sm:max-w-md glass-card border-glass-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-destructive" />
                Delete Competition?
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong className="text-foreground">{competition.name}</strong>? This will also delete all associated matches. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-row gap-2 sm:gap-2">
              <Button variant="outline" onClick={handleCancelDelete} className="flex-1 rounded-xl">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete} className="flex-1 gap-2 rounded-xl">
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    </TooltipProvider>
  );
});
CompetitionCard.displayName = "CompetitionCard";
