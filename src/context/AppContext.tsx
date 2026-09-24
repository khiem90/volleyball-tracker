"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppState, Match, PersistentTeam, Tournament } from "@/types/game";
import { useAuth } from "./AuthContext";
import { db } from "@/lib/firebase";
import {
  addRosterTeam,
  deleteRosterTeam,
  subscribeToRoster,
  updateRosterTeam,
} from "@/lib/roster";
import {
  applyTournamentCommand,
  buildTournament,
  deleteMatch as deleteTournamentMatch,
  deleteTournament as deleteTournamentDoc,
  saveTournament,
  subscribeToAccountMatches,
  subscribeToTournaments,
  updateMatch as updateTournamentMatch,
  updateTournament as updateTournamentDoc,
  type NewTournamentInput,
} from "@/lib/tournaments";
import {
  buildQuickMatch,
  deleteQuickMatch,
  saveQuickMatch,
  updateQuickMatch,
} from "@/lib/quickMatches";

/**
 * The app-wide provider: a thin layer over three live Firestore subscriptions,
 * roster, tournaments, and matches, plus the domain actions. Format rules live
 * in the engine. The court and queue edits at the bottom still shape the
 * tournament document here; tickets 03 and 09 move them into engine commands.
 */

export interface MatchResult {
  homeScore: number;
  awayScore: number;
}

export interface CompleteMatchOutcome {
  /** False when a best-of series moved to its next game instead of ending. */
  completed: boolean;
  /** Matches the engine scheduled as a result, if any. */
  createdMatchIds: string[];
}

interface AppContextValue {
  state: AppState;
  /** Signed-in accounts can change their own data. Guests only watch. */
  canEdit: boolean;
  // True until the signed-in account's roster has arrived from Firestore
  isRosterLoading: boolean;
  // Set when the roster subscription fails, for example when rules deny it
  rosterError: string | null;
  // True until both the tournaments and the matches have arrived
  isTournamentsLoading: boolean;
  tournamentsError: string | null;
  // Team actions
  addTeam: (name: string, color?: string) => void;
  updateTeam: (id: string, name: string, color?: string) => void;
  deleteTeam: (id: string) => void;
  getTeamById: (id: string) => PersistentTeam | undefined;
  // Tournament actions
  createTournament: (input: NewTournamentInput) => Promise<string>;
  updateTournament: (tournament: Tournament) => Promise<void>;
  deleteTournament: (id: string) => Promise<void>;
  startTournament: (id: string, byeTeamIds?: string[]) => Promise<void>;
  endTournament: (id: string) => Promise<void>;
  getTournamentById: (id: string) => Tournament | undefined;
  getMatchesByTournament: (tournamentId: string) => Match[];
  // Match actions
  addQuickMatch: (homeTeamId: string, awayTeamId: string) => Promise<string>;
  updateMatchScore: (matchId: string, homeScore: number, awayScore: number) => void;
  updateMatch: (matchId: string, updates: Partial<Match>) => void;
  startMatch: (matchId: string) => void;
  completeMatch: (matchId: string, result: MatchResult) => Promise<CompleteMatchOutcome>;
  deleteMatch: (matchId: string) => void;
  getMatchById: (id: string) => Match | undefined;
  // Court and queue management for rotation formats
  updateMatchTeams: (matchId: string, homeTeamId: string, awayTeamId: string) => void;
  swapMatchTeams: (
    updates: { matchId: string; homeTeamId: string; awayTeamId: string }[]
  ) => void;
  swapCourtTeams: (tournamentId: string, court1: number, court2: number) => void;
  reorderQueue: (tournamentId: string, newQueue: string[]) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const emptyState: AppState = { teams: [], tournaments: [], matches: [] };

const logFailure = (what: string) => (error: unknown) => {
  console.error(`Failed to ${what}:`, error);
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const uid = user?.uid ?? null;

  const [roster, setRoster] = useState<PersistentTeam[]>([]);
  const [isRosterLoading, setIsRosterLoading] = useState(true);
  const [rosterError, setRosterError] = useState<string | null>(null);

  const [tournaments, setTournaments] = useState<Tournament[] | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [tournamentsError, setTournamentsError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isAuthLoading) return;

    if (!uid || !db) {
      setRoster([]);
      setRosterError(null);
      setIsRosterLoading(false);
      setTournaments([]);
      setMatches([]);
      setTournamentsError(null);
      return;
    }

    setIsRosterLoading(true);
    setRosterError(null);
    setTournaments(null);
    setMatches(null);
    setTournamentsError(null);

    // onSnapshot errors end the subscription, so each one says so rather
    // than presenting an empty list as the truth.
    const unsubscribeRoster = subscribeToRoster(
      db,
      uid,
      (teams) => {
        setRoster(teams);
        setRosterError(null);
        setIsRosterLoading(false);
      },
      (error) => {
        console.error("Failed to load the roster:", error);
        setRosterError(
          "The roster did not load. Check your connection and sign-in, then reload the page."
        );
        setIsRosterLoading(false);
      }
    );
    const failTournaments = (what: string) => (error: Error) => {
      console.error(`Failed to load ${what}:`, error);
      setTournamentsError(
        "Your tournaments did not load. Check your connection and sign-in, then reload the page."
      );
      setTournaments((current) => current ?? []);
      setMatches((current) => current ?? []);
    };
    const unsubscribeTournaments = subscribeToTournaments(
      db,
      uid,
      setTournaments,
      failTournaments("tournaments")
    );
    const unsubscribeMatches = subscribeToAccountMatches(
      db,
      uid,
      setMatches,
      failTournaments("matches")
    );

    return () => {
      unsubscribeRoster();
      unsubscribeTournaments();
      unsubscribeMatches();
    };
  }, [uid, isAuthLoading]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const state = useMemo(
    (): AppState => ({
      teams: roster,
      tournaments: tournaments ?? emptyState.tournaments,
      matches: matches ?? emptyState.matches,
    }),
    [roster, tournaments, matches]
  );

  const tournamentsById = useMemo(
    () => new Map(state.tournaments.map((t) => [t.id, t])),
    [state.tournaments]
  );
  const matchesById = useMemo(
    () => new Map(state.matches.map((m) => [m.id, m])),
    [state.matches]
  );

  // ============================================
  // Teams
  // ============================================

  const addTeam = useCallback(
    (name: string, color?: string) => {
      if (!uid || !db) return;
      addRosterTeam(db, uid, { name, color }).catch(logFailure("add team"));
    },
    [uid]
  );

  const updateTeam = useCallback(
    (id: string, name: string, color?: string) => {
      if (!uid || !db) return;
      updateRosterTeam(db, uid, id, { name, color }).catch(logFailure("update team"));
    },
    [uid]
  );

  const deleteTeam = useCallback(
    (id: string) => {
      if (!uid || !db) return;
      deleteRosterTeam(db, uid, id).catch(logFailure("delete team"));
    },
    [uid]
  );

  const getTeamById = useCallback(
    (id: string) => state.teams.find((team) => team.id === id),
    [state.teams]
  );

  // ============================================
  // Tournaments
  // ============================================

  const requireAccount = useCallback(() => {
    if (!uid || !db) throw new Error("Sign in to change tournaments.");
    return { uid, db };
  }, [uid]);

  // The id is known before the write, and the subscription shows the new
  // tournament from the local cache at once, so nobody waits for the server.
  // A phone with no signal can still set up a tournament.
  const createTournament = useCallback(
    async (input: NewTournamentInput) => {
      const account = requireAccount();
      const tournament = buildTournament(account.db, account.uid, input);
      saveTournament(account.db, tournament).catch(logFailure("save tournament"));
      return tournament.id;
    },
    [requireAccount]
  );

  // Guarded on the revision this provider's state was built from, so a queue
  // reorder or an undo can never paper over a result another court just saved.
  const updateTournament = useCallback(
    async (tournament: Tournament) => {
      const current = tournamentsById.get(tournament.id);
      if (!current) throw new Error("That tournament no longer exists.");
      await updateTournamentDoc(requireAccount().db, tournament, current.revision);
    },
    [requireAccount, tournamentsById]
  );

  const deleteTournament = useCallback(
    async (id: string) => {
      await deleteTournamentDoc(requireAccount().db, id);
    },
    [requireAccount]
  );

  const startTournament = useCallback(
    async (id: string, byeTeamIds?: string[]) => {
      await applyTournamentCommand(requireAccount().db, id, { type: "start", byeTeamIds });
    },
    [requireAccount]
  );

  const endTournament = useCallback(
    async (id: string) => {
      await applyTournamentCommand(requireAccount().db, id, { type: "end" });
    },
    [requireAccount]
  );

  const getTournamentById = useCallback(
    (id: string) => tournamentsById.get(id),
    [tournamentsById]
  );

  const getMatchesByTournament = useCallback(
    (tournamentId: string) => state.matches.filter((m) => m.tournamentId === tournamentId),
    [state.matches]
  );

  // ============================================
  // Matches
  // ============================================

  const addQuickMatch = useCallback(
    async (homeTeamId: string, awayTeamId: string) => {
      const account = requireAccount();
      const match = buildQuickMatch(account.db, account.uid, { homeTeamId, awayTeamId });
      saveQuickMatch(account.db, account.uid, match).catch(logFailure("save quick match"));
      return match.id;
    },
    [requireAccount]
  );

  // Tournament matches and quick matches live in different places; the match
  // itself says which.
  const writeMatch = useCallback(
    (matchId: string, changes: Partial<Match>) => {
      if (!uid || !db) return;
      const match = matchesById.get(matchId);
      if (!match) return;
      const write = match.tournamentId
        ? updateTournamentMatch(db, match.tournamentId, matchId, changes)
        : updateQuickMatch(db, uid, matchId, changes);
      write.catch(logFailure("update match"));
    },
    [uid, matchesById]
  );

  const updateMatchScore = useCallback(
    (matchId: string, homeScore: number, awayScore: number) => {
      writeMatch(matchId, { homeScore, awayScore });
    },
    [writeMatch]
  );

  const updateMatch = useCallback(
    (matchId: string, updates: Partial<Match>) => {
      writeMatch(matchId, updates);
    },
    [writeMatch]
  );

  const startMatch = useCallback(
    (matchId: string) => {
      writeMatch(matchId, { status: "in_progress" });
    },
    [writeMatch]
  );

  const completeMatch = useCallback(
    async (matchId: string, result: MatchResult): Promise<CompleteMatchOutcome> => {
      const account = requireAccount();
      const match = matchesById.get(matchId);
      if (!match) throw new Error("That match no longer exists.");

      if (!match.tournamentId) {
        if (result.homeScore === result.awayScore) {
          throw new Error("A match cannot end in a tie.");
        }
        await updateQuickMatch(account.db, account.uid, matchId, {
          ...result,
          status: "completed",
          winnerId: result.homeScore > result.awayScore ? match.homeTeamId : match.awayTeamId,
          completedAt: Date.now(),
        });
        return { completed: true, createdMatchIds: [] };
      }

      const outcome = await applyTournamentCommand(account.db, match.tournamentId, {
        type: "complete_match",
        matchId,
        ...result,
      });
      const own = outcome.matchWrites.find(
        (w) => w.kind === "update" && w.matchId === matchId
      );
      const completed = own?.kind === "update" && own.changes.status === "completed";
      return { completed, createdMatchIds: outcome.createdMatchIds };
    },
    [requireAccount, matchesById]
  );

  const deleteMatch = useCallback(
    (matchId: string) => {
      if (!uid || !db) return;
      const match = matchesById.get(matchId);
      if (!match) return;
      const remove = match.tournamentId
        ? deleteTournamentMatch(db, match.tournamentId, matchId)
        : deleteQuickMatch(db, uid, matchId);
      remove.catch(logFailure("delete match"));
    },
    [uid, matchesById]
  );

  const getMatchById = useCallback((id: string) => matchesById.get(id), [matchesById]);

  // ============================================
  // Courts and queues (rotation formats)
  // ============================================

  const updateMatchTeams = useCallback(
    (matchId: string, homeTeamId: string, awayTeamId: string) => {
      const match = matchesById.get(matchId);
      if (!match) return;
      writeMatch(matchId, { homeTeamId, awayTeamId });

      const tournament = match.tournamentId ? tournamentsById.get(match.tournamentId) : undefined;
      if (!tournament) return;

      // Swap the incoming and outgoing teams between the court and the queue.
      const oldTeams = [match.homeTeamId, match.awayTeamId];
      const newTeams = [homeTeamId, awayTeamId];
      const removed = oldTeams.filter((t) => !newTeams.includes(t));
      const added = newTeams.filter((t) => !oldTeams.includes(t));
      const swapInQueue = (queue: string[]): string[] => {
        const next = [...queue];
        added.forEach((team, i) => {
          const leaving = removed[i];
          const index = next.indexOf(team);
          if (index !== -1 && leaving) next[index] = leaving;
          else if (index !== -1) next.splice(index, 1);
          else if (leaving && !next.includes(leaving)) next.push(leaving);
        });
        removed.slice(added.length).forEach((team) => {
          if (!next.includes(team)) next.push(team);
        });
        return next;
      };
      const isCourtOfMatch = (court: { teamIds: [string, string] }) =>
        court.teamIds.includes(match.homeTeamId) && court.teamIds.includes(match.awayTeamId);

      let updated = tournament;
      if (tournament.win2outState) {
        const courts = tournament.win2outState.courts.map((court) =>
          isCourtOfMatch(court) ? { ...court, teamIds: [homeTeamId, awayTeamId] as [string, string] } : court
        );
        updated = {
          ...updated,
          win2outState: {
            ...tournament.win2outState,
            courts,
            queue: swapInQueue(tournament.win2outState.queue),
          },
        };
      }
      if (tournament.twoMatchRotationState) {
        const courts = tournament.twoMatchRotationState.courts.map((court) =>
          isCourtOfMatch(court) ? { ...court, teamIds: [homeTeamId, awayTeamId] as [string, string] } : court
        );
        updated = {
          ...updated,
          twoMatchRotationState: {
            ...tournament.twoMatchRotationState,
            courts,
            queue: swapInQueue(tournament.twoMatchRotationState.queue),
          },
        };
      }
      if (updated !== tournament) {
        updateTournament(updated).catch(logFailure("update courts"));
      }
    },
    [matchesById, tournamentsById, writeMatch, updateTournament]
  );

  const swapMatchTeams = useCallback(
    (updates: { matchId: string; homeTeamId: string; awayTeamId: string }[]) => {
      updates.forEach(({ matchId, homeTeamId, awayTeamId }) => {
        writeMatch(matchId, { homeTeamId, awayTeamId });
      });
    },
    [writeMatch]
  );

  const swapCourtTeams = useCallback(
    (tournamentId: string, court1: number, court2: number) => {
      const tournament = tournamentsById.get(tournamentId);
      if (!tournament) return;

      const openMatchOnCourt = (courtNumber: number) =>
        state.matches.find(
          (m) =>
            m.tournamentId === tournamentId &&
            m.status !== "completed" &&
            (m.court ?? m.position) === courtNumber
        );

      const swapCourts = <T extends { courtNumber: number; teamIds: [string, string] }>(
        courts: T[]
      ): T[] | null => {
        const first = courts.findIndex((c) => c.courtNumber === court1);
        const second = courts.findIndex((c) => c.courtNumber === court2);
        if (first === -1 || second === -1) return null;
        const swapped = [...courts];
        swapped[first] = { ...courts[first], teamIds: courts[second].teamIds };
        swapped[second] = { ...courts[second], teamIds: courts[first].teamIds };
        return swapped;
      };

      let updated = tournament;
      let courtsAfter: { courtNumber: number; teamIds: [string, string] }[] | null = null;
      if (tournament.win2outState) {
        courtsAfter = swapCourts(tournament.win2outState.courts);
        if (courtsAfter) {
          updated = {
            ...updated,
            win2outState: { ...tournament.win2outState, courts: courtsAfter as typeof tournament.win2outState.courts },
          };
        }
      }
      if (tournament.twoMatchRotationState) {
        courtsAfter = swapCourts(tournament.twoMatchRotationState.courts);
        if (courtsAfter) {
          updated = {
            ...updated,
            twoMatchRotationState: {
              ...tournament.twoMatchRotationState,
              courts: courtsAfter as typeof tournament.twoMatchRotationState.courts,
            },
          };
        }
      }
      if (!courtsAfter) return;

      for (const courtNumber of [court1, court2]) {
        const court = courtsAfter.find((c) => c.courtNumber === courtNumber);
        const match = openMatchOnCourt(courtNumber);
        if (court && match) {
          writeMatch(match.id, { homeTeamId: court.teamIds[0], awayTeamId: court.teamIds[1] });
        }
      }
      updateTournament(updated).catch(logFailure("swap courts"));
    },
    [tournamentsById, state.matches, writeMatch, updateTournament]
  );

  const reorderQueue = useCallback(
    (tournamentId: string, newQueue: string[]) => {
      const tournament = tournamentsById.get(tournamentId);
      if (!tournament) return;
      let updated = tournament;
      if (tournament.win2outState) {
        updated = { ...updated, win2outState: { ...tournament.win2outState, queue: newQueue } };
      }
      if (tournament.twoMatchRotationState) {
        updated = {
          ...updated,
          twoMatchRotationState: { ...tournament.twoMatchRotationState, queue: newQueue },
        };
      }
      updateTournament(updated).catch(logFailure("reorder queue"));
    },
    [tournamentsById, updateTournament]
  );

  const value: AppContextValue = {
    state,
    canEdit: Boolean(uid),
    isRosterLoading,
    rosterError,
    isTournamentsLoading: tournaments === null || matches === null,
    tournamentsError,
    addTeam,
    updateTeam,
    deleteTeam,
    getTeamById,
    createTournament,
    updateTournament,
    deleteTournament,
    startTournament,
    endTournament,
    getTournamentById,
    getMatchesByTournament,
    addQuickMatch,
    updateMatchScore,
    updateMatch,
    startMatch,
    completeMatch,
    deleteMatch,
    getMatchById,
    updateMatchTeams,
    swapMatchTeams,
    swapCourtTeams,
    reorderQueue,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
