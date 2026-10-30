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
import type { Unsubscribe } from "firebase/firestore";
import type { Match, PersistentTeam, Tournament } from "@/types/game";
import { useAuth } from "./AuthContext";
import { db } from "@/lib/firebase";
import type { EngineCommand } from "@/lib/engine";
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
  regenerateScorerKey,
  setSpectatorEnabled,
  subscribeToScorerKey as subscribeToScorerKeyDoc,
} from "@/lib/sharing";
import { queueTournamentCommand, type AppliedCommand } from "@/lib/commandQueue";
import { deviceZone, type RsvpSetup } from "@/lib/rsvp";
import {
  saveRsvpSettings as saveRsvpSettingsDoc,
  turnRsvpLinkOff as turnRsvpLinkOffDoc,
} from "@/lib/rsvping";
import {
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
import {
  buildQuickMatch,
  completeQuickMatch,
  discardQuickMatch as discardQuickMatchDoc,
  saveQuickMatch,
  updateQuickMatch,
} from "@/lib/quickMatches";
import { useLinkedTournaments, type LinkStatus } from "./useLinkedTournaments";

/**
 * The app-wide provider: a thin layer over three live Firestore subscriptions,
 * roster, tournaments, and matches, plus the domain actions. Format rules live
 * in the engine: every change to a started tournament is an engine command,
 * applied to the copy this phone shows and written through the command
 * queue (src/lib/commandQueue.ts), so it shows at once and is checked by
 * the rules in the background.
 *
 * A tournament can also be reached by link, by a phone that does not own
 * it. Those are watched by useLinkedTournaments and kept apart from the
 * account's own lists; the getters below answer from either.
 */

export interface MatchResult {
  homeScore: number;
  awayScore: number;
}

export interface CompleteMatchOutcome {
  /** False when a best-of series moved to its next game instead of ending. */
  completed: boolean;
}

/**
 * A command's failure that arrived after its caller had moved on: a result
 * confirmed from the scoring page that the server refused or another phone
 * recorded first. The console puts it on its error line.
 */
export interface LateFailure {
  error: unknown;
}

interface AppContextValue {
  /** The signed-in account's teams; empty for a guest. */
  roster: PersistentTeam[];
  /** The tournaments the account owns. One reached by link is read with getTournamentById. */
  tournaments: Tournament[];
  /** Every match the account owns: its tournaments' and its quick matches. */
  matches: Match[];
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
  /**
   * Start a draft, or end a live tournament. Like every engine command,
   * each resolves as soon as the engine has applied it on this phone, with
   * the server's acknowledgement in `done`, which rejects when the command
   * was refused or taken back.
   */
  startTournament: (id: string, byeTeamIds?: string[]) => Promise<AppliedCommand>;
  endTournament: (id: string) => Promise<AppliedCommand>;
  /** A tournament the account owns, or one this phone reached by link. */
  getTournamentById: (id: string) => Tournament | undefined;
  getMatchesByTournament: (tournamentId: string) => Match[];
  // Match actions
  addQuickMatch: (homeTeamId: string, awayTeamId: string) => Promise<string>;
  /**
   * Throw away a quick match left mid-way. It goes from the local cache at
   * once while the delete reaches the server in the background.
   */
  discardQuickMatch: (matchId: string) => void;
  /** Write the score of a match in play. A field write, not an engine command. */
  updateMatchScore: (matchId: string, homeScore: number, awayScore: number) => void;
  /** Mark a pending match as in play. A field write, not an engine command. */
  startMatch: (matchId: string) => void;
  /**
   * Record a match's result. Resolves as soon as the engine has applied it
   * on this phone, so the scoring page can leave at once; what the server
   * says about a tournament match arrives later, and a refusal or a result
   * another phone recorded first is kept as the tournament's lateFailure.
   * A quick match resolves once it is saved.
   */
  completeMatch: (matchId: string, result: MatchResult) => Promise<CompleteMatchOutcome>;
  /**
   * Record a rotation result by naming the winner; the engine scores it.
   * Resolves as soon as the court has moved on locally, with the server's
   * acknowledgement in `done`, which rejects when the result was taken
   * back or refused.
   */
  instantWin: (matchId: string, winnerId: string) => Promise<AppliedCommand>;
  /** Take back the last result on a court of a rotation tournament, or an instant win in Round Robin. */
  undoResult: (tournamentId: string, matchId: string, winnerId?: string) => Promise<AppliedCommand>;
  /** Correct the score of a completed match; the standings follow. */
  correctMatchResult: (
    tournamentId: string,
    matchId: string,
    result: MatchResult,
  ) => Promise<AppliedCommand>;
  getMatchById: (id: string) => Match | undefined;
  /** The tournament's latest late failure, until the console has shown it. */
  lateFailure: (tournamentId: string) => LateFailure | null;
  /** The console has shown the tournament's late failure. */
  clearLateFailure: (tournamentId: string) => void;
  // Teams, courts, and the queue of a live tournament. Each resolves on the
  // local apply, with the server's acknowledgement in `done`.
  /** Enter a roster team into a live tournament. In a rotation format it joins the back of the queue. */
  addTeamToTournament: (tournamentId: string, team: PersistentTeam) => Promise<AppliedCommand>;
  /** Withdraw a team from a live tournament. Its played results stay. */
  withdrawTeam: (tournamentId: string, teamId: string) => Promise<AppliedCommand>;
  /** Change how many courts a live rotation tournament runs. */
  changeCourts: (tournamentId: string, courts: number) => Promise<AppliedCommand>;
  /** Swap two teams' places: between courts, or between a court and the queue. */
  swapTeams: (tournamentId: string, teamId: string, withTeamId: string) => Promise<AppliedCommand>;
  /** Move a waiting team to a place in the queue, counted from the front. */
  reorderQueue: (tournamentId: string, teamId: string, position: number) => Promise<AppliedCommand>;
  // Share links
  /** Watch a tournament this account does not own, as its spectator link allows. */
  watchTournament: (tournamentId: string) => void;
  /**
   * Open a scorer link: give the phone a silent identity if it has none,
   * write the proof, remember the link, and watch the tournament. A refused
   * proof marks the link stale rather than rejecting.
   */
  openScorerLink: (tournamentId: string, key: string) => Promise<void>;
  linkStatus: (tournamentId: string) => LinkStatus;
  /** Whether the phone opened a scorer link for the tournament that the owner has since replaced. */
  isStaleLink: (tournamentId: string) => boolean;
  /** Whether this phone holds the tournament's scorer link. */
  holdsScorerLink: (tournamentId: string) => boolean;
  /** True while a tournament reached by link is still arriving. */
  isLinkedLoading: boolean;
  /** Turn a tournament's spectator link on or off. Owner only. */
  setSpectatorLink: (tournamentId: string, enabled: boolean) => Promise<void>;
  /**
   * Save a tournament's scheduled time and RSVP settings, entered in this
   * phone's zone. Rejects with the first problem before writing. Owner only.
   */
  saveRsvpSettings: (tournamentId: string, setup: RsvpSetup) => Promise<void>;
  /** Turn a tournament's RSVP link off, writing nothing else. Owner only. */
  turnRsvpLinkOff: (tournamentId: string) => Promise<void>;
  /** Replace a tournament's scorer link; every phone on the old one loses access. Owner only. */
  regenerateScorerLink: (tournamentId: string) => Promise<string>;
  /** The key behind a tournament's scorer link, null while it has none. Owner only. */
  subscribeToScorerKey: (
    tournamentId: string,
    onChange: (key: string | null) => void,
    onError?: (error: Error) => void,
  ) => Unsubscribe;
}

const AppContext = createContext<AppContextValue | null>(null);

// Stable empties for the lists while their subscriptions have not answered.
const NO_TOURNAMENTS: Tournament[] = [];
const NO_MATCHES: Match[] = [];

const logFailure = (what: string) => (error: unknown) => {
  console.error(`Failed to ${what}:`, error);
};

const requireDb = () => {
  if (!db) throw new Error("Firebase is not configured.");
  return db;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  const { user, identityUid, isLoading: isAuthLoading, ensureIdentity } = useAuth();
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

  const ownTournaments = tournaments ?? NO_TOURNAMENTS;
  const ownMatches = matches ?? NO_MATCHES;

  const tournamentsById = useMemo(
    () => new Map(ownTournaments.map((t) => [t.id, t])),
    [ownTournaments]
  );

  // ============================================
  // Tournaments reached by link
  // ============================================

  const {
    watchTournament,
    openScorerLink,
    guardScorerWrite,
    linkStatus,
    isStaleLink,
    holdsScorerLink,
    isLinkedLoading,
    linkedTournaments,
    linkedMatches,
    linkedMatchesOf,
  } = useLinkedTournaments({ identityUid, isAuthLoading, ensureIdentity });

  // The account's own copy wins over a linked one, for an owner who opened
  // their own scorer link.
  const matchesById = useMemo(() => {
    const byId = new Map(linkedMatches.map((m) => [m.id, m]));
    for (const match of ownMatches) byId.set(match.id, match);
    return byId;
  }, [ownMatches, linkedMatches]);

  // Every tournament command runs for whatever identity the phone has. The
  // rules decide whether the owner or a scorer may apply it and refuse the
  // rest, and a scorer whose link was replaced learns so from the error.
  // The command is applied to the copy this phone is showing, so the first
  // tap on a tournament waits for nothing; it resolves once the result is
  // in the local cache and `done` once the server has accepted it.
  const command = useCallback(
    async (tournamentId: string, engineCommand: EngineCommand): Promise<AppliedCommand> => {
      const database = requireDb();
      const tournament = tournamentsById.get(tournamentId) ?? linkedTournaments.get(tournamentId);
      const matches = tournamentsById.has(tournamentId)
        ? ownMatches.filter((m) => m.tournamentId === tournamentId)
        : linkedMatchesOf(tournamentId);
      const applied = await guardScorerWrite(tournamentId, () =>
        queueTournamentCommand(database, tournamentId, engineCommand, {
          basis: tournament ? { tournament, matches } : undefined,
        }),
      );
      return {
        outcome: applied.outcome,
        done: guardScorerWrite(tournamentId, () => applied.done),
      };
    },
    [guardScorerWrite, tournamentsById, linkedTournaments, ownMatches, linkedMatchesOf],
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
      const { teams, alreadyOnRoster } = parseTeamNames(text, roster);
      const added = teams.length > 0 ? addTeams(teams) : [];
      return { added, alreadyOnRoster };
    },
    [roster, addTeams]
  );

  // The tournaments go along so the write can reach the team's entries in
  // the ones that are a draft or live.
  const updateTeam = useCallback(
    (id: string, name: string, color?: string) => {
      if (!uid || !db) return;
      updateRosterTeam(db, uid, id, { name, color }, ownTournaments).catch(
        logFailure("update team")
      );
    },
    [uid, ownTournaments]
  );

  const deleteTeams = useCallback(
    async (ids: string[]) => {
      const account = requireAccount();
      return deleteRosterTeams(account.db, account.uid, ids, ownTournaments);
    },
    [requireAccount, ownTournaments]
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
  const renameTournament = useCallback(async (id: string, name: string) => {
    await renameTournamentDoc(requireDb(), id, name);
  }, []);

  // A duplicate is created like any other draft, so the console can open
  // it as soon as the id is known.
  const duplicateTournament = useCallback(
    async (id: string) => {
      const source = tournamentsById.get(id);
      if (!source) throw new Error("That tournament no longer exists.");
      return createTournament(duplicateInput(source, roster));
    },
    [createTournament, tournamentsById, roster]
  );

  const deleteTournament = useCallback(async (id: string) => {
    await deleteTournamentDoc(requireDb(), id);
  }, []);

  const startTournament = useCallback(
    (id: string, byeTeamIds?: string[]) => command(id, { type: "start", byeTeamIds }),
    [command]
  );

  const endTournament = useCallback((id: string) => command(id, { type: "end" }), [command]);

  const getTournamentById = useCallback(
    (id: string) => tournamentsById.get(id) ?? linkedTournaments.get(id),
    [tournamentsById, linkedTournaments]
  );

  const getMatchesByTournament = useCallback(
    (tournamentId: string) =>
      tournamentsById.has(tournamentId)
        ? ownMatches.filter((m) => m.tournamentId === tournamentId)
        : linkedMatchesOf(tournamentId),
    [tournamentsById, ownMatches, linkedMatchesOf]
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

  const discardQuickMatch = useCallback(
    (matchId: string) => {
      const account = requireAccount();
      discardQuickMatchDoc(account.db, account.uid, matchId).catch(
        logFailure("discard quick match")
      );
    },
    [requireAccount]
  );

  // Tournament matches and quick matches live in different places; the match
  // itself says which. A quick match is the account's own.
  const writeMatch = useCallback(
    (matchId: string, changes: Partial<Match>) => {
      if (!db) return;
      const match = matchesById.get(matchId);
      if (!match) return;
      const database = db;
      const { tournamentId } = match;
      if (tournamentId) {
        guardScorerWrite(tournamentId, () =>
          updateTournamentMatch(database, tournamentId, matchId, changes)
        ).catch(logFailure("update match"));
      } else if (uid) {
        updateQuickMatch(database, uid, matchId, changes).catch(logFailure("update match"));
      }
    },
    [uid, matchesById, guardScorerWrite]
  );

  const updateMatchScore = useCallback(
    (matchId: string, homeScore: number, awayScore: number) => {
      writeMatch(matchId, { homeScore, awayScore });
    },
    [writeMatch]
  );

  const startMatch = useCallback(
    (matchId: string) => {
      writeMatch(matchId, { status: "in_progress" });
    },
    [writeMatch]
  );

  // ============================================
  // Late failures
  // ============================================

  // A command the scoring page confirmed is acknowledged after the page has
  // gone back to the console, so its failure cannot come back through the
  // page's own promise. It is kept per tournament for the console to show.
  const [lateFailures, setLateFailures] = useState<ReadonlyMap<string, LateFailure>>(
    () => new Map(),
  );

  const failLater = useCallback((tournamentId: string, error: unknown) => {
    setLateFailures((current) => new Map(current).set(tournamentId, { error }));
  }, []);

  const lateFailure = useCallback(
    (tournamentId: string) => lateFailures.get(tournamentId) ?? null,
    [lateFailures],
  );

  const clearLateFailure = useCallback((tournamentId: string) => {
    setLateFailures((current) => {
      if (!current.has(tournamentId)) return current;
      const next = new Map(current);
      next.delete(tournamentId);
      return next;
    });
  }, []);

  // The page moves on with the engine's local result, the same as an
  // instant win on the console. The server's answer, a refusal or a result
  // another phone recorded first, arrives after the page has gone and is
  // kept for the console's error line.
  const completeMatch = useCallback(
    async (matchId: string, result: MatchResult): Promise<CompleteMatchOutcome> => {
      const match = matchesById.get(matchId);
      if (!match) throw new Error("That match no longer exists.");

      if (!match.tournamentId) {
        const account = requireAccount();
        await completeQuickMatch(account.db, account.uid, match, result);
        return { completed: true };
      }

      const { tournamentId } = match;
      const applied = await command(tournamentId, {
        type: "complete_match",
        matchId,
        ...result,
      });
      applied.done.catch((error: unknown) => {
        console.error("Failed to save the result:", error);
        failLater(tournamentId, error);
      });
      const own = applied.outcome.matchWrites.find(
        (w) => w.kind === "update" && w.matchId === matchId
      );
      const completed = own?.kind === "update" && own.changes.status === "completed";
      return { completed };
    },
    [requireAccount, matchesById, command, failLater]
  );

  const instantWin = useCallback(
    async (matchId: string, winnerId: string) => {
      const match = matchesById.get(matchId);
      if (!match?.tournamentId) throw new Error("Instant win is for tournament matches.");
      return command(match.tournamentId, { type: "instant_win", matchId, winnerId });
    },
    [matchesById, command]
  );

  // Applied through the engine on this phone's copy and checked by the
  // rules, so an undo on one court can never paper over a result another
  // court saved in the meantime.
  const undoResult = useCallback(
    (tournamentId: string, matchId: string, winnerId?: string) =>
      command(tournamentId, { type: "undo_result", matchId, winnerId }),
    [command]
  );

  // Also through the engine, so a correction never lands on top of a
  // result a court saved in the meantime.
  const correctMatchResult = useCallback(
    (tournamentId: string, matchId: string, result: MatchResult) =>
      command(tournamentId, { type: "correct_result", matchId, ...result }),
    [command]
  );

  const getMatchById = useCallback((id: string) => matchesById.get(id), [matchesById]);

  // ============================================
  // Teams, courts, and the queue (live tournaments)
  // ============================================

  // Each of these is an engine command checked by the rules, so an edit
  // built on a stale copy is applied again on the fresh one rather than
  // papering over a result a court saved in the meantime. Each shows at
  // once, like a result.
  const addTeamToTournament = useCallback(
    (tournamentId: string, team: PersistentTeam) =>
      command(tournamentId, {
        type: "add_team",
        teamId: team.id,
        name: team.name,
        ...(team.color !== undefined && { color: team.color }),
      }),
    [command]
  );

  const withdrawTeam = useCallback(
    (tournamentId: string, teamId: string) => command(tournamentId, { type: "withdraw", teamId }),
    [command]
  );

  const changeCourts = useCallback(
    (tournamentId: string, courts: number) => command(tournamentId, { type: "change_courts", courts }),
    [command]
  );

  const swapTeams = useCallback(
    (tournamentId: string, teamId: string, withTeamId: string) =>
      command(tournamentId, { type: "swap_teams", teamId, withTeamId }),
    [command]
  );

  const reorderQueue = useCallback(
    (tournamentId: string, teamId: string, position: number) =>
      command(tournamentId, { type: "reorder_queue", teamId, position }),
    [command]
  );

  // ============================================
  // Share links (owner)
  // ============================================

  const setSpectatorLink = useCallback(async (tournamentId: string, enabled: boolean) => {
    await setSpectatorEnabled(requireDb(), tournamentId, enabled);
  }, []);

  const regenerateScorerLink = useCallback(
    (tournamentId: string) => regenerateScorerKey(requireDb(), tournamentId),
    []
  );

  // A field write like a rename: the local cache shows it at once and a
  // refusal comes back to the caller as the rejection.
  const saveRsvpSettings = useCallback(
    async (tournamentId: string, setup: RsvpSetup) => {
      const tournament = tournamentsById.get(tournamentId);
      if (!tournament) throw new Error("That tournament no longer exists.");
      await saveRsvpSettingsDoc(requireDb(), tournament, setup, deviceZone());
    },
    [tournamentsById]
  );

  const turnRsvpLinkOff = useCallback(
    (tournamentId: string) => turnRsvpLinkOffDoc(requireDb(), tournamentId),
    []
  );

  const subscribeToScorerKey = useCallback(
    (
      tournamentId: string,
      onChange: (key: string | null) => void,
      onError?: (error: Error) => void,
    ): Unsubscribe => {
      if (!db) {
        onChange(null);
        return () => {};
      }
      return subscribeToScorerKeyDoc(db, tournamentId, onChange, onError);
    },
    []
  );

  const value: AppContextValue = {
    roster,
    tournaments: ownTournaments,
    matches: ownMatches,
    isRosterLoading,
    rosterError,
    isTournamentsLoading: tournaments === null || matches === null,
    tournamentsError,
    addTeams,
    addTeamsFromText,
    updateTeam,
    deleteTeams,
    createTournament,
    renameTournament,
    duplicateTournament,
    deleteTournament,
    startTournament,
    endTournament,
    getTournamentById,
    getMatchesByTournament,
    addQuickMatch,
    discardQuickMatch,
    updateMatchScore,
    startMatch,
    completeMatch,
    instantWin,
    undoResult,
    correctMatchResult,
    getMatchById,
    lateFailure,
    clearLateFailure,
    addTeamToTournament,
    withdrawTeam,
    changeCourts,
    swapTeams,
    reorderQueue,
    watchTournament,
    openScorerLink,
    linkStatus,
    isStaleLink,
    holdsScorerLink,
    isLinkedLoading,
    setSpectatorLink,
    saveRsvpSettings,
    turnRsvpLinkOff,
    regenerateScorerLink,
    subscribeToScorerKey,
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
