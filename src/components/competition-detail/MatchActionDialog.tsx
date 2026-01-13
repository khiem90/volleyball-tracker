"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApp } from "@/context/AppContext";
import { Play, Swords } from "lucide-react";
import type { Match, PersistentTeam } from "@/types/game";

interface MatchActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: Match | null;
  teams: PersistentTeam[];
  onPlayMatch: () => void;
}

export const MatchActionDialog = ({
  open,
  onOpenChange,
  match,
  teams,
  onPlayMatch,
}: MatchActionDialogProps) => {
  const { canEdit } = useApp();

  if (!match) {
    return null;
  }

  const homeTeam = teams.find((team) => team.id === match.homeTeamId);
  const awayTeam = teams.find((team) => team.id === match.awayTeamId);
  const title = match.status === "in_progress" ? "Continue Match" : "Start Match";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {homeTeam?.name} vs {awayTeam?.name}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          {canEdit && (
            <Button
              onClick={onPlayMatch}
              className="flex-1 gap-2 shadow-lg shadow-primary/20"
            >
              <Play className="w-4 h-4" />
              {match.status === "in_progress" ? "Continue" : "Play Match"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
