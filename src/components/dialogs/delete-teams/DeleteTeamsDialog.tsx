"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { InlineSpinner } from "@/components/shared/InlineSpinner";
import { listNames } from "@/lib/utils";
import type { Tournament } from "@/types/game";

/** A team a live tournament keeps on the roster, with its name, ready to show. */
export interface KeptTeamRow {
  teamId: string;
  name: string;
  /** The live tournaments the team is entered in. */
  tournaments: Pick<Tournament, "id" | "name">[];
}

/** One line per kept team, each naming the live tournaments holding it. Links are navy, coral on hover. */
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
              className="font-medium text-mb-navy underline-offset-4 transition-colors hover:text-mb-coral hover:underline"
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
        <DialogTitle>
          <MbIcon id="warning" size={18} className="shrink-0" />
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
        <Button onClick={() => onOpenChange(false)}>Close</Button>
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
 * One confirm for one team or many: a navy question, and only the Delete
 * button in red. Teams a live tournament keeps back are named here so nobody
 * is surprised when they are still on the roster after.
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
          <DialogTitle>
            <MbIcon id="trash" size={18} className="shrink-0" />
            {one ? `Delete ${deleting[0]}?` : `Delete ${deleting.length} teams?`}
          </DialogTitle>
          <DialogDescription>
            {one
              ? `This removes ${deleting[0]} from the roster and from any draft tournament it is entered in. It cannot be undone.`
              : `This removes ${listNames(deleting)} from the roster and from any draft tournament they are entered in. It cannot be undone.`}
          </DialogDescription>
        </DialogHeader>
        {kept.length > 0 && (
          <div className="flex flex-col gap-2 rounded-[4px] border border-mb-rule bg-mb-paper-bright p-3">
            <p className="mb-kicker">Kept on the roster</p>
            <KeptTeamsList kept={kept} />
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="sm:flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="sm:flex-1"
          >
            {isDeleting ? <InlineSpinner /> : <MbIcon id="trash" size={14} />}
            {isDeleting ? "Deleting..." : one ? "Delete" : `Delete ${deleting.length} teams`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
