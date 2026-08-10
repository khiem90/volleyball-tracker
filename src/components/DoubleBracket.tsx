"use client";

import { useMemo } from "react";
import { BracketRail } from "@/components/matchbook/BracketRail";
import {
  buildDoubleBracket,
  createTeamRef,
} from "@/components/matchbook/useMatchbookCompetitionDetail";
import type { Match, PersistentTeam } from "@/types/game";

/**
 * Double-elimination bracket.
 *
 * The inline match card this file used to declare is **deleted** (charter W4
 * acceptance 2): it was a second bracket cell, 44px narrower than the other
 * one, with different padding, a different font size, a different hover and its
 * own `emerald-500` / `status-live` vocabulary. Winners, losers and the grand
 * final are now three labelled sections of one `BracketRail`, inside one
 * horizontal scroller instead of three (BUG-10).
 *
 * Section identity is carried by a 3px inset rail — teal, gold, coral — never
 * by a tinted heading, so `text-blue-400` and `text-orange-400` are gone too.
 */
export const DoubleBracket = ({
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
    () => buildDoubleBracket(matches, totalTeams, createTeamRef(teams)),
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
      variant="double"
      champion={view.champion}
      onSelect={dispatch(onMatchClick)}
      onEdit={dispatch(onEditMatch)}
    />
  );
};
