"use client";

import { useState, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
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
import { Pencil, Trash2, Calendar } from "lucide-react";
import type { PersistentTeam } from "@/types/game";

interface TeamCardProps {
  team: PersistentTeam;
  onEdit: (team: PersistentTeam) => void;
  onDelete: (id: string) => void;
}

export const TeamCard = memo(({ team, onEdit, onDelete }: TeamCardProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    onDelete(team.id);
    setShowDeleteConfirm(false);
  }, [onDelete, team.id]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  const handleEditClick = useCallback(() => {
    onEdit(team);
  }, [onEdit, team]);

  const teamColor = team.color || "#f97316";
  const createdDate = new Date(team.createdAt).toLocaleDateString();
  const initial = team.name.charAt(0).toUpperCase();

  return (
    <TooltipProvider>
      <>
        {/* Using CSS hover instead of framer-motion */}
        <div className="group glass-card glass-card-hover rounded-2xl overflow-hidden">
          {/* Color accent bar */}
          <div 
            className="h-1.5 w-full"
            style={{ backgroundColor: teamColor }}
          />
          
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Team avatar with gradient */}
                <div className="relative">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-lg relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${teamColor}, ${teamColor}aa)`,
                      boxShadow: `0 8px 24px ${teamColor}40`,
                    }}
                  >
                    <span className="text-xl font-bold text-white relative z-10">
                      {initial}
                    </span>
                    <div className="absolute inset-0 bg-white/10" />
                  </div>
                </div>
                
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-lg truncate mb-1 group-hover:text-primary transition-colors">
                    {team.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{createdDate}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons - visible on hover */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleEditClick}
                      aria-label={`Edit ${team.name}`}
                      className="h-9 w-9 rounded-xl hover:bg-primary/20 hover:text-primary"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit team</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDeleteClick}
                      aria-label={`Delete ${team.name}`}
                      className="h-9 w-9 rounded-xl hover:bg-destructive/20 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete team</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="sm:max-w-md glass-card border-glass-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-destructive" />
                Delete Team?
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong className="text-foreground">{team.name}</strong>? This action cannot be undone.
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
TeamCard.displayName = "TeamCard";
