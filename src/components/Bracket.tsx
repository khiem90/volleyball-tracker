"use client";

import { useMemo } from "react";
import { BracketRail } from "@/components/matchbook/BracketRail";
import {
  buildSingleBracket,
  createTeamRef,
} from "@/components/matchbook/useMatchbookCompetitionDetail";
import type { Match, PersistentTeam } from "@/types/game";

/**
 * Single-elimination bracket, as the ONE rail in the system.
 *
 * This file used to own a layout: `flex w-full min-w-max justify-between
 * gap-10` over absolutely-positioned cards inside `140 * 2^(round-1)` px slots.
 * All three of those decisions were defects (BUG-1, BUG-2, BUG-3) and none of
 * them is here any more — `BracketRail` computes the geometry arithmetically
 * and `MbBracketCell` is the only bracket cell in the codebase.
 *
 * It stays a component rather than being inlined into the competition console
 * because `/session/[shareCode]` renders it too (charter H4). Both call sites
 * therefore get one bracket, not two that drift.
 */
export const Bracket = ({
  matches,
  teams,
  totalTeams,
  onMatchClick,
  onEditMatch,
}: {
  matches: Match[];
  teams: PersistentTeam[];
  totalTeams: number;
  onMatchClick?: (match: Match) => void;
  onEditMatch?: (match: Match) => void;
}) => {
  const view = useMemo(
    () => buildSingleBracket(matches, totalTeams, createTeamRef(teams)),
    [matches, totalTeams, teams]
  );

  const byId = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches]);
  const dispatch = (handler?: (match: Match) => void) =>
    handler
      ? (id: string) => {
          const match = byId.get(id);
          if (match) handler(match);
        }
      : undefined;

  return (
    <BracketRail
      sections={view.sections}
      variant="single"
      champion={view.champion}
      onSelect={dispatch(onMatchClick)}
      onEdit={dispatch(onEditMatch)}
    />
  );
};
