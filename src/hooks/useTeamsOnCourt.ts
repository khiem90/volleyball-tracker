"use client";

import { useMemo } from "react";
import type { Competition } from "@/types/game";

export const useTeamsOnCourt = (competition: Competition | null): Set<string> => {
  return useMemo(() => {
    if (!competition) return new Set<string>();
    const onCourt = new Set<string>();

    if (competition.win2outState) {
      competition.win2outState.courts.forEach((court) => {
        court.teamIds.forEach((id) => onCourt.add(id));
      });
    }
    if (competition.twoMatchRotationState) {
      competition.twoMatchRotationState.courts.forEach((court) => {
        court.teamIds.forEach((id) => onCourt.add(id));
      });
    }
    return onCourt;
  }, [competition]);
};
