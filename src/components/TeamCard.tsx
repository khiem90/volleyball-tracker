"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Pencil, Trash2, Users, Calendar } from "lucide-react";
import type { PersistentTeam } from "@/types/game";

interface TeamCardProps {
  team: PersistentTeam;
  onEdit: (team: PersistentTeam) => void;
  onDelete: (id: string) => void;
}

export const TeamCard = ({ team, onEdit, onDelete }: TeamCardProps) => {
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

  const teamColor = team.color || "#3b82f6";
  const createdDate = new Date(team.createdAt).toLocaleDateString();
  const initial = team.name.charAt(0).toUpperCase();

  return (
    <TooltipProvider>
      <>
        <Card className="group border-border/40 bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-300 card-lift overflow-hidden">
          <CardContent className="p-0">
            {/* Color accent bar */}
            <div 
              className="h-1 w-full"
              style={{ backgroundColor: teamColor }}
            />
            
            <div className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-lg relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${teamColor}, ${teamColor}cc)`,
                    }}
                  >
                    <span className="text-xl font-bold text-white relative z-10">
                      {initial}
                    </span>
                    <div className="absolute inset-0 bg-white/10" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-lg truncate mb-1">{team.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{createdDate}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleEditClick}
                        aria-label={`Edit ${team.name}`}
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
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
                        className="h-8 w-8 hover:bg-destructive/10 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete team</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="sm:max-w-md">
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
