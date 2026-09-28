"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { isLinkPending } from "@/context/useLinkedTournaments";
import { useOrigin } from "@/hooks/useOrigin";
import { useRotationInstantWin } from "@/hooks/useRotationInstantWin";
import {
  bracketView,
  capitalize,
  consoleAccess,
  courtsView,
  isCorrectable,
  roleFor,
  scheduleView,
  standingsView,
  teamsView,
  type TeamRow,
} from "@/lib/console";
import { bracketAddRefusal } from "@/lib/engine";
import { entryTeams } from "@/lib/entries";
import { isBracketFormat, isRotationFormat, minimumTeams } from "@/lib/formats";
import { scorerKeyIn, scorerLink, spectatorLink, STALE_SCORER_LINK } from "@/lib/shareLinks";
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

/** The share links as the owner's Settings tab shows them. */
export interface ShareLinksView {
  spectatorEnabled: boolean;
  spectatorLink: string;
  /** The scorer link, or null while the tournament has no key. */
  scorerLink: string | null;
  /** False until the key has been read, so the tab does not offer to make one that exists. */
  scorerKeyKnown: boolean;
  /** A completed tournament takes no results, so its scorer link is not offered. */
  showsScorerLink: boolean;
}

/** Why the console cannot show the tournament. */
export type NotFoundReason = "not_found" | "stale_link";

/**
 * Everything the console page needs for one tournament: the tournament and
 * its matches from the provider, the visitor's role and what it allows, the
 * five views, the actions on the shell and in Settings, the court, queue,
 * and team edits of a live tournament, the correction of its results, and
 * the share links.
 *
 * The visitor is the owner when the account owns the tournament. Anyone
 * else reached it by link. With a scorer key in the address the phone
 * proves it holds the link and becomes a scorer, and without one it
 * watches as the spectator link allows.
 */
export const useConsole = (tournamentId: string) => {
  const router = useRouter();
  const linkKey = scorerKeyIn(useSearchParams());
  const { user, isLoading: isAuthLoading } = useAuth();
  const {
    roster,
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
    correctMatchResult,
    isTournamentsLoading,
    watchTournament,
    openScorerLink,
    linkStatus,
    isStaleLink,
    holdsScorerLink,
    setSpectatorLink,
    regenerateScorerLink,
    subscribeToScorerKey,
  } = useApp();

  const tournament = getTournamentById(tournamentId);
  const matches = useMemo(
    () => getMatchesByTournament(tournamentId),
    [getMatchesByTournament, tournamentId],
  );
  const teams = useMemo(
    () => (tournament ? entryTeams(tournament, roster) : []),
    [tournament, roster],
  );
  const team = useMemo(() => teamLookup(teams), [teams]);

  const role = roleFor(tournament?.ownerId, user?.uid, holdsScorerLink(tournamentId));
  const access = consoleAccess(role, tournament?.status ?? "draft");

  const [actionError, setActionError] = useState<string | null>(null);

  // ============================================
  // Reaching the tournament
  // ============================================

  // The account's own list decides ownership, so nothing is asked of a
  // link until that list is in. A phone with no account has no list.
  const accountLoading = isAuthLoading || (user !== null && isTournamentsLoading);
  const own = user !== null && tournament?.ownerId === user.uid;
  const status = linkStatus(tournamentId);

  useEffect(() => {
    if (accountLoading || own) return;
    if (linkKey) {
      openScorerLink(tournamentId, linkKey).catch((error: unknown) => {
        console.error("Failed to open the scorer link:", error);
        setActionError(messageOf(error, "The scorer link could not be opened."));
      });
    } else {
      watchTournament(tournamentId);
    }
  }, [accountLoading, own, linkKey, tournamentId, openScorerLink, watchTournament]);

  const isLoading = accountLoading || (!own && isLinkPending(status));
  const stale = !own && isStaleLink(tournamentId);
  const notFoundReason: NotFoundReason | null =
    own || tournament ? null : stale ? "stale_link" : "not_found";

  // Every failure lands on the one error line. A scorer whose link the
  // owner has replaced gets a StaleScorerLinkError, whose message says so.
  const reportFailure = useCallback((fallback: string, error: unknown) => {
    setActionError(messageOf(error, fallback));
  }, []);

  // ============================================
  // Views
  // ============================================

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

  // ============================================
  // The shell and Settings
  // ============================================

  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const getTeamName = useCallback((id: string) => team(id).name, [team]);
  const { handleInstantWin } = useRotationInstantWin({ tournament, getTeamName });
  const instantWin = useCallback(
    (match: Match, winnerId: string) => {
      if (!access.canScore) return;
      setActionError(null);
      handleInstantWin(winnerId, match).catch((error: unknown) => {
        console.error("Instant win failed:", error);
        reportFailure("The result could not be recorded.", error);
      });
    },
    [access.canScore, handleInstantWin, reportFailure],
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
        reportFailure("The tournament could not be started.", error);
      } finally {
        setIsStarting(false);
      }
    },
    [tournament, isStarting, access.canStart, startTournament, reportFailure],
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
      reportFailure("The tournament could not be ended.", error);
    } finally {
      setIsEnding(false);
    }
  }, [tournament, isEnding, access.canManage, endTournament, reportFailure]);

  // The new name shows everywhere as soon as the local write lands, so
  // nothing waits on the server; a refused write is reported when it comes.
  const rename = useCallback(
    (name: string) => {
      if (!tournament || !access.canRename) return;
      setActionError(null);
      renameTournament(tournament.id, name).catch((error: unknown) => {
        console.error("Failed to rename the tournament:", error);
        reportFailure("The tournament could not be renamed.", error);
      });
    },
    [tournament, access.canRename, renameTournament, reportFailure],
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
      reportFailure("The tournament could not be duplicated.", error);
      setIsDuplicating(false);
    }
  }, [tournament, isDuplicating, access.canDuplicate, duplicateTournament, router, reportFailure]);

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
      reportFailure("The tournament could not be deleted.", error);
      setDeleteOpen(false);
      setIsDeleting(false);
    }
  }, [tournament, isDeleting, access.canDelete, deleteTournament, router, reportFailure]);

  // ============================================
  // Share links
  // ============================================

  const origin = useOrigin();
  const [scorerKey, setScorerKey] = useState<string | null>(null);
  const [scorerKeyKnown, setScorerKeyKnown] = useState(false);

  // Only the owner can read the key; anyone else is never asked to.
  useEffect(() => {
    if (!access.canShare) return;
    setScorerKey(null);
    setScorerKeyKnown(false);
    return subscribeToScorerKey(
      tournamentId,
      (key) => {
        setScorerKey(key);
        setScorerKeyKnown(true);
      },
      (error) => {
        console.error("Failed to read the scorer key:", error);
        setScorerKeyKnown(true);
      },
    );
  }, [access.canShare, tournamentId, subscribeToScorerKey]);

  const links: ShareLinksView | null =
    tournament && access.canShare
      ? {
          spectatorEnabled: tournament.spectatorEnabled,
          spectatorLink: spectatorLink(origin, tournament.id),
          scorerLink: scorerKey ? scorerLink(origin, tournament.id, scorerKey) : null,
          scorerKeyKnown,
          showsScorerLink: tournament.status !== "completed",
        }
      : null;

  // The flag flips at once from the local cache, like a rename; a refused
  // write is reported when it comes.
  const toggleSpectatorLink = useCallback(() => {
    if (!tournament || !access.canShare) return;
    setActionError(null);
    setSpectatorLink(tournament.id, !tournament.spectatorEnabled).catch((error: unknown) => {
      console.error("Failed to change the spectator link:", error);
      reportFailure("The spectator link could not be changed.", error);
    });
  }, [tournament, access.canShare, setSpectatorLink, reportFailure]);

  // The new link shows as soon as the local write lands. Every phone on
  // the old one is refused at its next write once the server has it.
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const regenerate = useCallback(() => {
    if (!tournament || !access.canShare) return;
    setActionError(null);
    setRegenerateOpen(false);
    regenerateScorerLink(tournament.id).catch((error: unknown) => {
      console.error("Failed to regenerate the scorer link:", error);
      reportFailure("The scorer link could not be regenerated.", error);
    });
  }, [tournament, access.canShare, regenerateScorerLink, reportFailure]);

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
        reportFailure(`Could not ${what}.`, error);
        return false;
      } finally {
        setIsApplying(false);
      }
    },
    [isApplying, reportFailure],
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
  const bracketFormat = tournament ? isBracketFormat(tournament.format) : false;
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
    return roster.filter((t) => !entered.has(t.id)).map((t) => t.name);
  }, [tournament?.teamIds, roster]);

  // A name that matches a roster team, ignoring case, enters that team. Any
  // other name becomes a new roster team first, as on the Teams page; its
  // id is known before its write lands, so the entry need not wait for it.
  // Resolves with the team's name once it is in, or null.
  const addTeam = useCallback(
    async (name: string): Promise<string | null> => {
      if (!tournament || !access.canManage) return null;
      const known = roster.find((t) => nameKey(t.name) === nameKey(name));
      const added = known ?? addTeamsFromText(name).added[0];
      if (!added) {
        setActionError("Type a team name to add.");
        return null;
      }
      const ok = await apply("add the team", () => addTeamToTournament(tournament.id, added));
      return ok ? added.name : null;
    },
    [tournament, access.canManage, roster, addTeamsFromText, apply, addTeamToTournament],
  );

  // A withdrawn team comes back through the same command. Its roster team
  // is normally still there; the entry's own snapshot covers the case where
  // it is not, so the team never comes back as "Unknown".
  const rejoin = useCallback(
    (row: TeamRow) => {
      if (!tournament || !access.canManage) return;
      const rosterTeam: PersistentTeam = roster.find((t) => t.id === row.teamId) ?? {
        id: row.teamId,
        name: row.name,
        createdAt: tournament.createdAt,
        ...(row.color !== undefined && { color: row.color }),
      };
      void apply("bring the team back", () => addTeamToTournament(tournament.id, rosterTeam));
    },
    [tournament, access.canManage, roster, apply, addTeamToTournament],
  );

  const [withdrawing, setWithdrawing] = useState<TeamRow | null>(null);
  const withdraw = useCallback(async () => {
    if (!tournament || !withdrawing || !access.canManage) return;
    const { teamId } = withdrawing;
    await apply("withdraw the team", () => withdrawTeam(tournament.id, teamId));
    setWithdrawing(null);
  }, [tournament, withdrawing, access.canManage, apply, withdrawTeam]);

  // ============================================
  // Results
  // ============================================

  const roundRobin = tournament?.format === "round_robin";
  const canCorrectResults = access.canManage && (roundRobin || bracketFormat);

  // The match being corrected is held by id and read fresh, so the dialog
  // shows the score as it now stands and closes if the match goes away.
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const correcting = useMemo(
    () =>
      correctingId === null ? null : (matches.find((m) => m.id === correctingId) ?? null),
    [correctingId, matches],
  );
  const openCorrection = useCallback(
    (match: Match) => {
      if (!tournament || !canCorrectResults || !isCorrectable(tournament, match)) return;
      setActionError(null);
      setCorrectingId(match.id);
    },
    [tournament, canCorrectResults],
  );
  const closeCorrection = useCallback(() => setCorrectingId(null), []);
  const saveCorrection = useCallback(
    async (homeScore: number, awayScore: number) => {
      if (!tournament || !correcting || !canCorrectResults) return;
      const ok = await apply("save the corrected score", () =>
        correctMatchResult(tournament.id, correcting.id, { homeScore, awayScore }),
      );
      if (ok) setCorrectingId(null);
    },
    [tournament, correcting, canCorrectResults, apply, correctMatchResult],
  );

  return {
    isLoading,
    /** Why there is nothing to show, once loading is over and there is no tournament. */
    notFoundReason,
    /** What a phone whose scorer link was replaced is told while it can still watch. */
    staleNotice: stale && tournament ? STALE_SCORER_LINK : null,
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
    // Share links
    /** The links and their state, for the owner; null for anyone else. */
    links,
    toggleSpectatorLink,
    regenerateOpen,
    setRegenerateOpen,
    regenerate,
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
    /** Whether a team can be added or brought back: the owner of a live rotation or round robin tournament. */
    canAddTeams: access.canManage && (rotation || roundRobin),
    /** Whether a team can be withdrawn: the owner of any live tournament. */
    canWithdrawTeams: access.canManage,
    /** Why a team cannot be added, shown where the add strip would be: a bracket is drawn once. */
    addRefusal: tournament && bracketFormat ? bracketAddRefusal(tournament.format) : null,
    /** What an added team did: joined the queue, or got its matches. */
    joinedNote: rotation ? "joined the queue" : "is on the schedule",
    suggestions,
    addTeam,
    rejoin,
    withdrawing,
    setWithdrawing,
    withdraw,
    // Results
    /** Whether completed results can be corrected: the owner of a live round robin or bracket. */
    canCorrectResults,
    /** The match whose result is being corrected, if one is. */
    correcting,
    openCorrection,
    closeCorrection,
    saveCorrection,
  };
};
