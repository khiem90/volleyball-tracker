import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import {
  openTournaments,
  selectedTournament,
  tournamentRows,
  type SelectedTournament,
  type TournamentRow,
} from "@/lib/tournamentsPage";

export interface TournamentsPage {
  rows: TournamentRow[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  selected: SelectedTournament | null;
  deleteTournament: (id: string) => void;
}

/**
 * The Tournaments page's data: the list of live and draft tournaments and
 * the one that is selected. The first in the list is selected until a row
 * is picked, and again once the picked one leaves the list.
 */
export const useTournamentsPage = (): TournamentsPage => {
  const { roster, tournaments, matches, deleteTournament } = useApp();
  const [pickedId, setPickedId] = useState<string | null>(null);

  return useMemo(() => {
    const open = openTournaments(tournaments);
    const picked = open.find((tournament) => tournament.id === pickedId) ?? open[0];

    return {
      rows: tournamentRows(tournaments, matches),
      selectedId: picked?.id ?? null,
      setSelectedId: setPickedId,
      selected: picked ? selectedTournament(picked, matches, roster) : null,
      deleteTournament: (id: string) => {
        deleteTournament(id).catch((error) => {
          console.error("Failed to delete tournament:", error);
        });
      },
    };
  }, [roster, tournaments, matches, pickedId, deleteTournament]);
};
