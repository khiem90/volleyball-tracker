import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { buildTeamsData } from "@/lib/teamsData";
import type { TeamsData } from "@/lib/teamShapes";

/** What the Teams tab shows, rebuilt when the roster, a tournament, or a match changes. */
export const useTeamsData = (): TeamsData => {
  const { roster, tournaments, matches } = useApp();
  return useMemo(
    () => buildTeamsData(tournaments, matches, roster),
    [tournaments, matches, roster]
  );
};
