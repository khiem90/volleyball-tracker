"use client";

import Link from "next/link";
import { ShieldExclamationIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listNames } from "@/lib/utils";
import type { Tournament } from "@/types/game";

/** A team a live tournament keeps on the roster, with its name, ready to show. */
export interface KeptTeamRow {
  teamId: string;
  name: string;
  /** The live tournaments the team is entered in. */
  tournaments: Pick<Tournament, "id" | "name">[];
}

/** One line per kept team, each naming the live tournaments holding it. */
const KeptTeamsList = ({ kept }: { kept: KeptTeamRow[] }) => (
  <ul className="flex flex-col gap-2 text-sm">
    {kept.map((team) => (
      <li key={team.teamId} className="flex flex-col gap-1">
        <span>
          <span className="font-semibold">{team.name}</span> is in{" "}
          {listNames(team.tournaments.map((t) => t.name))}.
        </span>
        <span className="flex flex-wrap gap-2">
          {team.tournaments.map((tournament) => (
            <Link
              key={tournament.id}
              href={`/competitions/${tournament.id}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              Open {tournament.name} to withdraw
            </Link>
          ))}
        </span>
      </li>
    ))}
  </ul>
);

interface TeamInLiveTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kept: KeptTeamRow[];
}

/**
 * The refusal shown when every team chosen for deletion is in a live
 * tournament. Deleting one mid-tournament would leave its matches pointing
 * at a team that no longer exists, so the way out is Withdraw, which lives on
 * the tournament's own page.
 */
export const TeamInLiveTournamentDialog = ({
  open,
  onOpenChange,
  kept,
}: TeamInLiveTournamentDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ShieldExclamationIcon className="h-5 w-5 text-primary" />
          {kept.length === 1
            ? `${kept[0].name} is in a live tournament`
            : "These teams are in live tournaments"}
        </DialogTitle>
        <DialogDescription>
          A team cannot be deleted while a live tournament has it. Withdraw it from the
          tournament instead. Its remaining matches are forfeited and its played results stay.
        </DialogDescription>
      </DialogHeader>
      <KeptTeamsList kept={kept} />
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

interface DeleteTeamsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Names of the teams that will go. */
  deleting: string[];
  /** Teams kept back by a live tournament; they stay on the roster. */
  kept: KeptTeamRow[];
  onConfirm: () => void;
  isDeleting: boolean;
}

/**
 * One confirm for one team or many. Teams a live tournament keeps back are
 * named here so nobody is surprised when they are still on the roster after.
 */
export const DeleteTeamsDialog = ({
  open,
  onOpenChange,
  deleting,
  kept,
  onConfirm,
  isDeleting,
}: DeleteTeamsDialogProps) => {
  const one = deleting.length === 1;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <TrashIcon className="h-5 w-5" />
            {one ? `Delete ${deleting[0]}?` : `Delete ${deleting.length} teams?`}
          </DialogTitle>
          <DialogDescription>
            {one
              ? `This removes ${deleting[0]} from the roster and from any draft tournament it is entered in. It cannot be undone.`
              : `This removes ${listNames(deleting)} from the roster and from any draft tournament they are entered in. It cannot be undone.`}
          </DialogDescription>
        </DialogHeader>
        {kept.length > 0 && (
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-accent/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Kept on the roster
            </p>
            <KeptTeamsList kept={kept} />
          </div>
        )}
        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="flex-1 cursor-pointer rounded-xl"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 gap-2 cursor-pointer rounded-xl"
          >
            <TrashIcon className="h-4 w-4" />
            {isDeleting ? "Deleting..." : one ? "Delete" : `Delete ${deleting.length} teams`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
