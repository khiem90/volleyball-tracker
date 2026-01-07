"use client";

import { useState, useCallback } from "react";
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
import { Pencil, Trash2, Users } from "lucide-react";
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

  return (
    <>
      <Card className="group border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-300">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${teamColor}, ${teamColor}99)`,
                }}
              >
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-lg truncate">{team.name}</h3>
                <p className="text-sm text-muted-foreground">Created {createdDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEditClick}
                aria-label={`Edit ${team.name}`}
                className="h-8 w-8"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDeleteClick}
                aria-label={`Delete ${team.name}`}
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Team?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{team.name}</strong>? This action cannot be undone.
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

