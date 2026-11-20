"use client";

import { useMemo } from "react";
import { listTournamentRows, type ListTournamentRow } from "@/lib/rsvpList";
import { subscribeToListTournaments } from "@/lib/rsvpListData";
import type { Tournament } from "@/types/game";
import { useSubscription } from "./useSubscription";

/**
 * The rows a list's page shows for the tournaments imported from it, for
 * the signed-in account `uid`: Watch for a live one, See results for a
 * completed one. `tournamentIds` is the list's own record of them. Call it
 * only for a list the viewer can read.
 *
 * A tournament the viewer cannot read gives no row and does not fail the
 * page. That is a draft, for anyone but its owner, and one that was
 * deleted. The read asks again for those on a timer, so Watch shows on a
 * page that was open before the owner started the tournament. A list with
 * no tournament reads nothing.
 */
export const useListTournaments = (
  tournamentIds: string[],
  uid: string | null,
): ListTournamentRow[] => {
  // The ids travel in the key, so an import that lands while the page is
  // open starts the read again with the new tournament in it.
  const key = uid && tournamentIds.length > 0 ? `${uid}/${tournamentIds.join("|")}` : null;
  const { value } = useSubscription<Tournament[]>(key, (db, onChange) =>
    subscribeToListTournaments(db, tournamentIds, onChange),
  );
  return useMemo(() => listTournamentRows(value ?? []), [value]);
};
