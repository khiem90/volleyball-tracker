"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  type TeamRow,
} from "@/lib/console";
import { entryTeams } from "@/lib/entries";
import { isBracketFormat, isRotationFormat, minimumTeams } from "@/lib/formats";
import { messageOf } from "@/lib/utils";
import type { Match, PersistentTeam } from "@/types/game";
import { consoleTabs, type ConsoleTab } from "./ConsoleTabs";
import { teamLookup } from "./teamRefs";

// "Aces" and "aces" name the same roster team.
const nameKey = (name: string) => name.trim().toLowerCase();

/** A court count waiting for the owner to confirm it, because a court with a match in play would close. */
export interface CourtsToClose {
  count: number;
  /** The court whose match is in play. */
  inPlay: number;
}

/**
 * Everything the console page needs for one tournament: the tournament and
 * its matches from the provider, the viewer's role and what it allows, the
 * five views, the actions on the shell and in Settings, and the court,
 * queue, and team edits of a live rotation tournament.
 */
export const useConsole = (tournamentId: string) => {
  const router = useRouter();
  const { user } = useAuth();
  const {
    state,
    getTournamentById,
    getMatchesByTournament,
    addTeamsFromText,
    startTournament,
    endTournament,
    renameTournament,
    duplicateTournament,
    deleteTournament,
    addTeamToTournament,
    withdrawTeam,
    changeCourts: changeTournamentCourts,
    swapTeams,
    reorderQueue,
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

  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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

  // The new name shows everywhere as soon as the local write lands, so
  // nothing waits on the server; a refused write is reported when it comes.
  const rename = useCallback(
    (name: string) => {
      if (!tournament || !access.canRename) return;
      setActionError(null);
      renameTournament(tournament.id, name).catch((error: unknown) => {
        console.error("Failed to rename the tournament:", error);
        setActionError(messageOf(error, "The tournament could not be renamed."));
      });
    },
    [tournament, access.canRename, renameTournament],
  );

  // The draft's id is known at once, so the console opens it straight away.
  // The page for the new id mounts fresh, which is what clears the busy flag.
  const duplicate = useCallback(async () => {
    if (!tournament || isDuplicating || !access.canDuplicate) return;
    setIsDuplicating(true);
    setActionError(null);
    try {
      const id = await duplicateTournament(tournament.id);
      router.push(`/competitions/${id}`);
    } catch (error) {
      console.error("Failed to duplicate the tournament:", error);
      setActionError(messageOf(error, "The tournament could not be duplicated."));
      setIsDuplicating(false);
    }
  }, [tournament, isDuplicating, access.canDuplicate, duplicateTournament, router]);

  // Stays "deleting" after success so the page shows a spinner, not "not
  // found", in the moment before the Tournaments tab opens.
  const remove = useCallback(async () => {
    if (!tournament || isDeleting || !access.canDelete) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await deleteTournament(tournament.id);
      router.push("/competitions");
    } catch (error) {
      console.error("Failed to delete the tournament:", error);
      setActionError(messageOf(error, "The tournament could not be deleted."));
      setDeleteOpen(false);
      setIsDeleting(false);
    }
  }, [tournament, isDeleting, access.canDelete, deleteTournament, router]);

  // ============================================
  // Teams, courts, and the queue
  // ============================================

  // Court, queue, and team edits share one busy flag, so a second tap while
  // the first is saving does nothing, and one error line. Each resolves
  // with whether the edit went through.
  const [isApplying, setIsApplying] = useState(false);
  const apply = useCallback(
    async (what: string, action: () => Promise<void>): Promise<boolean> => {
      if (isApplying) return false;
      setIsApplying(true);
      setActionError(null);
      try {
        await action();
        return true;
      } catch (error) {
        console.error(`Failed to ${what}:`, error);
        setActionError(messageOf(error, `Could not ${what}.`));
        return false;
      } finally {
        setIsApplying(false);
      }
    },
    [isApplying],
  );

  // A swap is two taps: Swap under a team on a court, then Swap under the
  // team to trade places with. The first tap is dropped if that team has
  // since left the courts.
  const [swapFrom, setSwapFrom] = useState<string | null>(null);
  const swapping = useMemo(() => {
    if (swapFrom === null || !access.canEditCourts || courts?.kind !== "rotation") return null;
    return courts.courts.some((court) => court.teamIds.includes(swapFrom)) ? swapFrom : null;
  }, [swapFrom, access.canEditCourts, courts]);

  const swap = useCallback(
    (teamId: string) => {
      if (!tournament || !access.canEditCourts) return;
      if (swapping === null || swapping === teamId) {
        setSwapFrom(swapping === null ? teamId : null);
        return;
      }
      const from = swapping;
      setSwapFrom(null);
      void apply("swap the teams", () => swapTeams(tournament.id, from, teamId));
    },
    [tournament, access.canEditCourts, swapping, apply, swapTeams],
  );
  const cancelSwap = useCallback(() => setSwapFrom(null), []);

  const move = useCallback(
    (teamId: string, position: number) => {
      if (!tournament || !access.canEditCourts) return;
      void apply("move the team", () => reorderQueue(tournament.id, teamId, position));
    },
    [tournament, access.canEditCourts, apply, reorderQueue],
  );

  const rotation = tournament ? isRotationFormat(tournament.format) : false;
  const activeCount = tournament
    ? tournament.entries.filter((entry) => entry.withdrawnAt === undefined).length
    : 0;
  const courtCount = tournament?.settings.courts ?? 1;
  const canAddCourt =
    rotation &&
    tournament !== undefined &&
    activeCount >= minimumTeams(tournament.format, courtCount + 1);
  const canRemoveCourt = rotation && courtCount > 1;

  const applyCourts = useCallback(
    (count: number): Promise<boolean> => {
      if (!tournament || !access.canManage) return Promise.resolve(false);
      return apply("change the courts", () => changeTournamentCourts(tournament.id, count));
    },
    [tournament, access.canManage, apply, changeTournamentCourts],
  );

  // Closing a court whose match is in play abandons that match, so the
  // owner confirms it first. Opening a court, or closing one that is only
  // waiting, goes through at once.
  const [courtsToClose, setCourtsToClose] = useState<CourtsToClose | null>(null);
  const changeCourts = useCallback(
    (count: number) => {
      if (courts?.kind !== "rotation") return;
      const inPlay = courts.courts.find(
        (court) => court.court > count && court.match?.status === "in_progress",
      );
      if (inPlay) setCourtsToClose({ count, inPlay: inPlay.court });
      else void applyCourts(count);
    },
    [courts, applyCourts],
  );
  const confirmCloseCourts = useCallback(async () => {
    if (!courtsToClose) return;
    await applyCourts(courtsToClose.count);
    setCourtsToClose(null);
  }, [courtsToClose, applyCourts]);

  /** Roster teams not entered, offered while typing a name to add. */
  const suggestions = useMemo(() => {
    const entered = new Set(tournament?.teamIds ?? []);
    return state.teams.filter((roster) => !entered.has(roster.id)).map((roster) => roster.name);
  }, [tournament?.teamIds, state.teams]);

  // A name that matches a roster team, ignoring case, enters that team. Any
  // other name becomes a new roster team first, as on the Teams page; its
  // id is known before its write lands, so the entry need not wait for it.
  // Resolves with the team's name once it is in, or null.
  const addTeam = useCallback(
    async (name: string): Promise<string | null> => {
      if (!tournament || !access.canManage) return null;
      const known = state.teams.find((roster) => nameKey(roster.name) === nameKey(name));
      const added = known ?? addTeamsFromText(name).added[0];
      if (!added) {
        setActionError("Type a team name to add.");
        return null;
      }
      const ok = await apply("add the team", () => addTeamToTournament(tournament.id, added));
      return ok ? added.name : null;
    },
    [tournament, access.canManage, state.teams, addTeamsFromText, apply, addTeamToTournament],
  );

  // A withdrawn team comes back through the same command. Its roster team
  // is normally still there; the entry's own snapshot covers the case where
  // it is not, so the team never comes back as "Unknown".
  const rejoin = useCallback(
    (row: TeamRow) => {
      if (!tournament || !access.canManage) return;
      const roster: PersistentTeam = state.teams.find((t) => t.id === row.teamId) ?? {
        id: row.teamId,
        name: row.name,
        createdAt: tournament.createdAt,
        ...(row.color !== undefined && { color: row.color }),
      };
      void apply("bring the team back", () => addTeamToTournament(tournament.id, roster));
    },
    [tournament, access.canManage, state.teams, apply, addTeamToTournament],
  );

  const [withdrawing, setWithdrawing] = useState<TeamRow | null>(null);
  const withdraw = useCallback(async () => {
    if (!tournament || !withdrawing || !access.canManage) return;
    const { teamId } = withdrawing;
    await apply("withdraw the team", () => withdrawTeam(tournament.id, teamId));
    setWithdrawing(null);
  }, [tournament, withdrawing, access.canManage, apply, withdrawTeam]);

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
    startOpen,
    setStartOpen,
    endOpen,
    setEndOpen,
    deleteOpen,
    setDeleteOpen,
    isStarting,
    isEnding,
    isDuplicating,
    isDeleting,
    actionError,
    instantWin,
    start,
    end,
    rename,
    duplicate,
    remove,
    // Courts and queue
    /** True while a court, queue, or team edit is being saved. */
    isApplying,
    swapping,
    swap,
    cancelSwap,
    move,
    canAddCourt,
    canRemoveCourt,
    changeCourts,
    courtsToClose,
    setCourtsToClose,
    confirmCloseCourts,
    // Teams
    /** Whether teams can be added and withdrawn here: the owner of a live rotation tournament. */
    canEditTeams: access.canManage && rotation,
    suggestions,
    addTeam,
    rejoin,
    withdrawing,
    setWithdrawing,
    withdraw,
  };
};
