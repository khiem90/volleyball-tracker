"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
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
import { Trophy, Trash2, Users, Calendar, ChevronRight, RefreshCw, Brackets, Layers, Crown, RotateCw } from "lucide-react";
import type { Competition, CompetitionStatus, CompetitionType } from "@/types/game";

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
    className: "status-draft",
  },
  in_progress: {
    label: "Live",
    className: "status-active",
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
    gradient: "from-amber-500 to-orange-600",
  },
  two_match_rotation: {
    label: "2 Match Rotation",
    icon: RotateCw,
    gradient: "from-rose-500 to-pink-600",
  },
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
  const typeInfo = typeConfig[competition.type] || typeConfig.round_robin;
  const TypeIcon = typeInfo.icon;
  const createdDate = new Date(competition.createdAt).toLocaleDateString();
  const progress = matchCount > 0 ? Math.round((completedMatchCount / matchCount) * 100) : 0;

  return (
    <TooltipProvider>
      <>
        <Link href={`/competitions/${competition.id}`} className="block group">
          <Card className="border-border/40 bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-300 card-lift shine-hover overflow-hidden">
            <CardContent className="p-0">
              <div className="flex">
                {/* Type Icon Section */}
                <div className={`w-20 shrink-0 bg-linear-to-br ${typeInfo.gradient} flex items-center justify-center`}>
                  <TypeIcon className="w-8 h-8 text-white" />
                </div>
                
                {/* Content Section */}
                <div className="flex-1 p-4 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                          {competition.name}
                        </h3>
                        <Badge className={status.className}>
                          {status.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {typeInfo.label}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          {teamCount} teams
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
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
                            className="h-8 w-8 hover:bg-destructive/10 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
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
                    <div className="mt-3 pt-3 border-t border-border/40">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{completedMatchCount}/{matchCount} matches</span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="sm:max-w-md">
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
              <Button variant="outline" onClick={handleCancelDelete} className="flex-1">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete} className="flex-1 gap-2">
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    </TooltipProvider>
  );
};
