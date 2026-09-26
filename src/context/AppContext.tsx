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
  buildRosterTeam,
  deleteRosterTeams,
  parseTeamNames,
  saveRosterTeams,
  subscribeToRoster,
  updateRosterTeam,
  type AddedTeams,
  type DeletedTeams,
  type TeamInput,
} from "@/lib/roster";
import {
  applyTournamentCommand,
  buildTournamentToSave,
  deleteTournament as deleteTournamentDoc,
  duplicateInput,
  renameTournament as renameTournamentDoc,
  saveTournamentAndMatches,
  subscribeToAccountMatches,
  subscribeToTournaments,
  updateMatch as updateTournamentMatch,
  type CreateTournamentOptions,
  type NewTournamentInput,
} from "@/lib/tournaments";
import { buildQuickMatch, saveQuickMatch, updateQuickMatch } from "@/lib/quickMatches";

/**
 * The app-wide provider: a thin layer over three live Firestore subscriptions,
 * roster, tournaments, and matches, plus the domain actions. Format rules live
 * in the engine: every change to a started tournament is an engine command
 * applied in a transaction.
 */

export interface MatchResult {
  homeScore: number;
  awayScore: number;
}

export interface CompleteMatchOutcome {
  /** False when a best-of series moved to its next game instead of ending. */
  completed: boolean;
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
  /**
   * Add teams to the roster in one write. Returns them at once, ids included,
   * while the save goes on in the background; offline it completes on reconnect.
   */
  addTeams: (inputs: TeamInput[]) => PersistentTeam[];
  /**
   * Add one team per line of the text, each with a color the roster uses
   * least, and say which names the roster already had. Saves like addTeams.
   */
  addTeamsFromText: (text: string) => AddedTeams;
  /** Rename or recolor a team; its entries in draft and live tournaments follow. */
  updateTeam: (id: string, name: string, color?: string) => void;
  /**
   * Delete teams. A team in a live tournament is kept and named in the
   * outcome; the others go, and every draft that had one loses that entry.
   */
  deleteTeams: (ids: string[]) => Promise<DeletedTeams>;
  getTeamById: (id: string) => PersistentTeam | undefined;
  // Tournament actions
  /**
   * Create a draft, or with `start` a tournament that is live from the
   * moment it exists. Resolves with the id as soon as the local write is
   * issued; rejects, with nothing written, when the format cannot start
   * with these teams.
   */
  createTournament: (
    input: NewTournamentInput,
    options?: CreateTournamentOptions
  ) => Promise<string>;
  /**
   * Rename a tournament. The new name shows at once from the local cache;
   * the promise settles when the server has the write, and rejects if the
   * server refuses it.
   */
  renameTournament: (id: string, name: string) => Promise<void>;
  /**
   * Make a new draft from a tournament, with the same format, settings, and
   * teams. Resolves with the draft's id as soon as the local write is issued.
   */
  duplicateTournament: (id: string) => Promise<string>;
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
  /** Record a rotation result by naming the winner; the engine scores it. */
  instantWin: (matchId: string, winnerId: string) => Promise<void>;
  /** Take back the last result on a court of a rotation tournament. */
  undoResult: (tournamentId: string, matchId: string) => Promise<void>;
  /** Correct the score of a completed match; the standings follow. */
  correctMatchResult: (
    tournamentId: string,
    matchId: string,
    result: MatchResult,
  ) => Promise<void>;
  getMatchById: (id: string) => Match | undefined;
  // Teams, courts, and the queue of a live tournament
  /** Enter a roster team into a live tournament. In a rotation format it joins the back of the queue. */
  addTeamToTournament: (tournamentId: string, team: PersistentTeam) => Promise<void>;
  /** Withdraw a team from a live tournament. Its played results stay. */
  withdrawTeam: (tournamentId: string, teamId: string) => Promise<void>;
  /** Change how many courts a live rotation tournament runs. */
  changeCourts: (tournamentId: string, courts: number) => Promise<void>;
  /** Swap two teams' places: between courts, or between a court and the queue. */
  swapTeams: (tournamentId: string, teamId: string, withTeamId: string) => Promise<void>;
  /** Move a waiting team to a place in the queue, counted from the front. */
  reorderQueue: (tournamentId: string, teamId: string, position: number) => Promise<void>;
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

  const requireAccount = useCallback(() => {
    if (!uid || !db) throw new Error("Sign in to change your teams and tournaments.");
    return { uid, db };
  }, [uid]);

  // ============================================
  // Teams
  // ============================================

  // The ids are known before the write and the subscription shows the new
  // teams from the local cache at once, so nobody waits for the server.
  const addTeams = useCallback(
    (inputs: TeamInput[]): PersistentTeam[] => {
      const account = requireAccount();
      const teams = inputs.map((input) => buildRosterTeam(account.db, account.uid, input));
      saveRosterTeams(account.db, account.uid, teams).catch(logFailure("add teams"));
      return teams;
    },
    [requireAccount]
  );

  const addTeamsFromText = useCallback(
    (text: string): AddedTeams => {
      const { teams, alreadyOnRoster } = parseTeamNames(text, state.teams);
      const added = teams.length > 0 ? addTeams(teams) : [];
      return { added, alreadyOnRoster };
    },
    [state.teams, addTeams]
  );

  // The tournaments go along so the write can reach the team's entries in
  // the ones that are a draft or live.
  const updateTeam = useCallback(
    (id: string, name: string, color?: string) => {
      if (!uid || !db) return;
      updateRosterTeam(db, uid, id, { name, color }, state.tournaments).catch(
        logFailure("update team")
      );
    },
    [uid, state.tournaments]
  );

  const deleteTeams = useCallback(
    async (ids: string[]) => {
      const account = requireAccount();
      return deleteRosterTeams(account.db, account.uid, ids, state.tournaments);
    },
    [requireAccount, state.tournaments]
  );

  const getTeamById = useCallback(
    (id: string) => state.teams.find((team) => team.id === id),
    [state.teams]
  );

  // ============================================
  // Tournaments
  // ============================================

  // The id is known before the write, and the subscription shows the new
  // tournament from the local cache at once, so nobody waits for the server.
  // A phone with no signal can still set up a tournament, and start it: the
  // engine runs here on the draft, so there is nothing to read back.
  const createTournament = useCallback(
    async (input: NewTournamentInput, options?: CreateTournamentOptions) => {
      const account = requireAccount();
      const built = buildTournamentToSave(account.db, account.uid, input, options);
      saveTournamentAndMatches(account.db, built).catch(logFailure("save tournament"));
      return built.tournament.id;
    },
    [requireAccount]
  );

  // A field write, so a rename can never paper over a result a court just
  // saved. The local cache shows the new name before the server answers;
  // a refused write comes back to the caller as the rejection.
  const renameTournament = useCallback(
    async (id: string, name: string) => {
      await renameTournamentDoc(requireAccount().db, id, name);
    },
    [requireAccount]
  );

  // A duplicate is created like any other draft, so the console can open
  // it as soon as the id is known.
  const duplicateTournament = useCallback(
    async (id: string) => {
      const source = tournamentsById.get(id);
      if (!source) throw new Error("That tournament no longer exists.");
      return createTournament(duplicateInput(source, state.teams));
    },
    [createTournament, tournamentsById, state.teams]
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
        return { completed: true };
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
      return { completed };
    },
    [requireAccount, matchesById]
  );

  const instantWin = useCallback(
    async (matchId: string, winnerId: string) => {
      const account = requireAccount();
      const match = matchesById.get(matchId);
      if (!match?.tournamentId) throw new Error("Instant win is for tournament matches.");
      await applyTournamentCommand(account.db, match.tournamentId, {
        type: "instant_win",
        matchId,
        winnerId,
      });
    },
    [requireAccount, matchesById]
  );

  // Applied through the engine in a transaction, so an undo on one court can
  // never paper over a result another court saved in the meantime.
  const undoResult = useCallback(
    async (tournamentId: string, matchId: string) => {
      await applyTournamentCommand(requireAccount().db, tournamentId, {
        type: "undo_result",
        matchId,
      });
    },
    [requireAccount]
  );

  // Also through the engine in a transaction: a correction never lands on
  // top of a result a court saved in the meantime.
  const correctMatchResult = useCallback(
    async (tournamentId: string, matchId: string, result: MatchResult) => {
      await applyTournamentCommand(requireAccount().db, tournamentId, {
        type: "correct_result",
        matchId,
        ...result,
      });
    },
    [requireAccount]
  );

  const getMatchById = useCallback((id: string) => matchesById.get(id), [matchesById]);

  // ============================================
  // Teams, courts, and the queue (live tournaments)
  // ============================================

  // Each of these is an engine command applied in a transaction, so an edit
  // built on a stale copy is applied again on the fresh one rather than
  // papering over a result a court saved in the meantime.
  const addTeamToTournament = useCallback(
    async (tournamentId: string, team: PersistentTeam) => {
      await applyTournamentCommand(requireAccount().db, tournamentId, {
        type: "add_team",
        teamId: team.id,
        name: team.name,
        ...(team.color !== undefined && { color: team.color }),
      });
    },
    [requireAccount]
  );

  const withdrawTeam = useCallback(
    async (tournamentId: string, teamId: string) => {
      await applyTournamentCommand(requireAccount().db, tournamentId, { type: "withdraw", teamId });
    },
    [requireAccount]
  );

  const changeCourts = useCallback(
    async (tournamentId: string, courts: number) => {
      await applyTournamentCommand(requireAccount().db, tournamentId, {
        type: "change_courts",
        courts,
      });
    },
    [requireAccount]
  );

  const swapTeams = useCallback(
    async (tournamentId: string, teamId: string, withTeamId: string) => {
      await applyTournamentCommand(requireAccount().db, tournamentId, {
        type: "swap_teams",
        teamId,
        withTeamId,
      });
    },
    [requireAccount]
  );

  const reorderQueue = useCallback(
    async (tournamentId: string, teamId: string, position: number) => {
      await applyTournamentCommand(requireAccount().db, tournamentId, {
        type: "reorder_queue",
        teamId,
        position,
      });
    },
    [requireAccount]
  );

  const value: AppContextValue = {
    state,
    canEdit: Boolean(uid),
    isRosterLoading,
    rosterError,
    isTournamentsLoading: tournaments === null || matches === null,
    tournamentsError,
    addTeams,
    addTeamsFromText,
    updateTeam,
    deleteTeams,
    getTeamById,
    createTournament,
    renameTournament,
    duplicateTournament,
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
    instantWin,
    undoResult,
    correctMatchResult,
    getMatchById,
    addTeamToTournament,
    withdrawTeam,
    changeCourts,
    swapTeams,
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
