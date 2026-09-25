"use client";

import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { useRotationInstantWin } from "@/hooks/useRotationInstantWin";
import {
  bracketView,
  capitalize,
  consoleAccess,
  courtsView,
  scheduleView,
  standingsView,
  teamsView,
  type ConsoleRole,
} from "@/lib/console";
import { entryTeams } from "@/lib/entries";
import { isBracketFormat } from "@/lib/formats";
import type { Match } from "@/types/game";
import { consoleTabs, type ConsoleTab } from "./ConsoleTabs";
import { teamLookup } from "./teamRefs";

const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

/**
 * Everything the console page needs for one tournament: the tournament and
 * its matches from the provider, the viewer's role and what it allows, the
 * five views, and the actions that live on the shell.
 */
export const useConsole = (tournamentId: string) => {
  const { user } = useAuth();
  const {
    state,
    getTournamentById,
    getMatchesByTournament,
    startTournament,
    endTournament,
    isTournamentsLoading,
  } = useApp();

  const tournament = getTournamentById(tournamentId);
  const matches = useMemo(
    () => getMatchesByTournament(tournamentId),
    [getMatchesByTournament, tournamentId],
  );
  const teams = useMemo(
    () => (tournament ? entryTeams(tournament, state.teams) : []),
    [tournament, state.teams],
  );
  const team = useMemo(() => teamLookup(teams), [teams]);

  // Scorer detection arrives with the scorer link (ticket 13); until then the
  // role is owner or spectator, and only owners can load a tournament.
  const role: ConsoleRole =
    tournament && user && tournament.ownerId === user.uid ? "owner" : "spectator";
  const access = consoleAccess(role, tournament?.status ?? "draft");

  const courts = useMemo(
    () => (tournament ? courtsView(tournament, matches) : null),
    [tournament, matches],
  );
  const schedule = useMemo(
    () => (tournament ? scheduleView(tournament, matches) : []),
    [tournament, matches],
  );
  const standings = useMemo(
    () => (tournament ? standingsView(tournament, matches) : null),
    [tournament, matches],
  );
  const bracket = useMemo(
    () => (tournament ? bracketView(tournament, matches) : null),
    [tournament, matches],
  );
  const teamRows = useMemo(
    () => (tournament ? teamsView(tournament, matches, teams) : []),
    [tournament, matches, teams],
  );
  const withdrawn = useMemo(
    () => new Set(teamRows.filter((row) => row.withdrawn).map((row) => row.teamId)),
    [teamRows],
  );

  const tabs = useMemo(
    () =>
      consoleTabs({
        hasBracket: tournament ? isBracketFormat(tournament.format) : false,
        courtsLabel: capitalize(tournament?.settings.terminology.venuePlural ?? "courts"),
      }),
    [tournament],
  );
  const [tab, setTab] = useState<ConsoleTab>("courts");

  // Court and queue edits keep their dialogs until ticket 09 gives them tap controls.
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [reorderOpen, setReorderOpen] = useState(false);

  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const getTeamName = useCallback((id: string) => team(id).name, [team]);
  const { handleInstantWin } = useRotationInstantWin({ tournament, getTeamName });
  const instantWin = useCallback(
    (match: Match, winnerId: string) => {
      if (!access.canScore) return;
      void handleInstantWin(winnerId, match);
    },
    [access.canScore, handleInstantWin],
  );

  const start = useCallback(
    async (byeTeamIds?: string[]) => {
      if (!tournament || isStarting || !access.canStart) return;
      setIsStarting(true);
      setActionError(null);
      try {
        await startTournament(tournament.id, byeTeamIds);
        setStartOpen(false);
      } catch (error) {
        console.error("Failed to start the tournament:", error);
        setActionError(messageOf(error, "The tournament could not be started."));
      } finally {
        setIsStarting(false);
      }
    },
    [tournament, isStarting, access.canStart, startTournament],
  );

  const end = useCallback(async () => {
    if (!tournament || isEnding || !access.canManage) return;
    setIsEnding(true);
    setActionError(null);
    try {
      await endTournament(tournament.id);
      setEndOpen(false);
    } catch (error) {
      console.error("Failed to end the tournament:", error);
      setActionError(messageOf(error, "The tournament could not be ended."));
    } finally {
      setIsEnding(false);
    }
  }, [tournament, isEnding, access.canManage, endTournament]);

  return {
    isLoading: isTournamentsLoading,
    tournament,
    matches,
    teams,
    team,
    role,
    access,
    courts,
    schedule,
    standings,
    bracket,
    teamRows,
    withdrawn,
    tabs,
    tab,
    setTab,
    editingMatch,
    setEditingMatch,
    reorderOpen,
    setReorderOpen,
    startOpen,
    setStartOpen,
    endOpen,
    setEndOpen,
    isStarting,
    isEnding,
    actionError,
    instantWin,
    start,
    end,
  };
};
