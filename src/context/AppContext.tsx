"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AppState,
  PersistentTeam,
  Competition,
  Match,
  CompetitionType,
  MatchStatus,
} from "@/types/game";
// Note: PersistentTeam, CompetitionType, MatchStatus are used in callback signatures
import { useSession } from "./SessionContext";
import {
  appReducer,
  initialState,
  generateId,
  STORAGE_KEY,
  OLD_STORAGE_KEY,
} from "./appReducer";
import { normalizeTeamColor } from "@/lib/teamColor";

/* ---------------------------------------------------------------------------
   TEAM COLOURS, MIGRATED ON READ

   Saved accounts hold what the app used to write: `var(--mb-navy)` from the
   team sheet and, from Quick Add, whole CSS functions —

     Team 3 :: color-mix(in oklab, var(--mb-navy) 55%, var(--mb-green))

   `normalizeTeamColor` turns each of those into the ink it always meant
   ("teal"), leaves a hand-mixed hex alone, and passes anything it does not
   recognise through untouched — losing a colour would be worse than storing an
   odd one. It runs once, here, on the way out of localStorage, and the save
   effect below writes the migrated shape back on the next state change.

   Nothing downstream depends on this having run: `teamColorCss` resolves a
   legacy value too. This is what stops the old strings accumulating, not what
   makes them safe.
   --------------------------------------------------------------------------- */
const migrateTeamColors = (parsed: AppState): AppState => {
  const teams = parsed.teams ?? [];
  let changed = false;
  const migrated = teams.map((team) => {
    const ink = normalizeTeamColor(team.color) || undefined;
    if (ink === team.color) return team;
    changed = true;
    return { ...team, color: ink };
  });
  return changed ? { ...parsed, teams: migrated } : parsed;
};

// ============================================
// Context
// ============================================
interface AppContextValue {
  state: AppState;
  /**
   * True once the localStorage blob has been read into `state` (or found
   * absent). Until then `state` is `initialState` on EVERY account — an empty
   * archive and a 47-match archive render identically for one commit — so a
   * screen that swaps its composition on emptiness must not decide before this
   * flips. `/summaries` reads it to hold its first-paint reservation (HF-3):
   * deciding off `state` alone painted the empty composition on populated
   * accounts, then pushed the whole ledger grid 111px when the data landed.
   */
  localReady: boolean;
  // Session info
  isSharedMode: boolean;
  canEdit: boolean;
  // Team actions
  addTeam: (name: string, color?: string) => void;
  updateTeam: (id: string, name: string, color?: string) => void;
  deleteTeam: (id: string) => void;
  getTeamById: (id: string) => PersistentTeam | undefined;
  // Competition actions
  createCompetition: (
    name: string,
    type: CompetitionType,
    teamIds: string[],
    numberOfCourts?: number,
    matchSeriesLength?: number,
    instantWinEnabled?: boolean,
    config?: Competition["config"]
  ) => string;
  updateCompetition: (competition: Competition) => void;
  deleteCompetition: (id: string) => void;
  startCompetition: (id: string) => void;
  startCompetitionWithMatches: (
    competition: Competition,
    matches: Omit<Match, "id" | "createdAt">[]
  ) => void;
  completeCompetition: (id: string, winnerId?: string) => void;
  removeCompetitionLocal: (id: string) => void;
  getCompetitionById: (id: string) => Competition | undefined;
  // Match actions
  addMatch: (match: Omit<Match, "id" | "createdAt">) => string;
  addMatches: (matches: Omit<Match, "id" | "createdAt">[]) => void;
  updateMatchScore: (
    matchId: string,
    homeScore: number,
    awayScore: number
  ) => void;
  updateMatch: (matchId: string, updates: Partial<Match>) => void;
  startMatch: (matchId: string) => void;
  completeMatch: (matchId: string, winnerId: string) => void;
  completeMatchWithNextMatch: (
    matchId: string,
    winnerId: string,
    updatedCompetition: Competition,
    nextMatch: Omit<Match, "id" | "createdAt"> | null
  ) => string | null;
  deleteMatch: (matchId: string) => void;
  getMatchById: (id: string) => Match | undefined;
  getMatchesByCompetition: (competitionId: string) => Match[];
  // Admin match management actions
  updateMatchTeams: (
    matchId: string,
    homeTeamId: string,
    awayTeamId: string
  ) => void;
  swapMatchTeams: (
    updates: { matchId: string; homeTeamId: string; awayTeamId: string }[]
  ) => void;
  updateMatchCourt: (matchId: string, courtNumber: number) => void;
  swapCourtTeams: (
    competitionId: string,
    court1: number,
    court2: number
  ) => void;
  reorderQueue: (competitionId: string, newQueue: string[]) => void;
  // Utility
  resetState: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// ============================================
// Provider
// ============================================
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  const [localState, dispatch] = useReducer(appReducer, initialState);
  const { session, isSharedMode, canEdit, syncAllData } = useSession();

  // Determine which state to use: session data or local data
  const state = useMemo((): AppState => {
    if (isSharedMode && session) {
      return {
        teams: session.teams || [],
        competitions: session.competition ? [session.competition] : [],
        matches: session.matches || [],
      };
    }
    return localState;
  }, [isSharedMode, session, localState]);

  // Memoized maps for O(1) lookups instead of O(n) array finds
  const competitionsMap = useMemo(() => {
    const map = new Map<string, Competition>();
    state.competitions.forEach((comp) => map.set(comp.id, comp));
    return map;
  }, [state.competitions]);

  const matchesMap = useMemo(() => {
    const map = new Map<string, Match>();
    state.matches.forEach((match) => map.set(match.id, match));
    return map;
  }, [state.matches]);

  const hasLoadedLocalState = useRef(false);
  const [localReady, setLocalReady] = useState(false);

  // Load state from localStorage on mount (with migration from old key)
  /* eslint-disable react-hooks/set-state-in-effect -- `localReady` flips once,
     in the same effect (and therefore the same commit) as the LOAD_STATE
     dispatch, so consumers never see loaded data with the flag still false. */
  useEffect(() => {
    if (hasLoadedLocalState.current) return;
    hasLoadedLocalState.current = true;

    try {
      let stored = localStorage.getItem(STORAGE_KEY);

      // Migration: check for old storage key if new key doesn't exist
      if (!stored && OLD_STORAGE_KEY) {
        const oldStored = localStorage.getItem(OLD_STORAGE_KEY);
        if (oldStored) {
          // Migrate data from old key to new key
          localStorage.setItem(STORAGE_KEY, oldStored);
          localStorage.removeItem(OLD_STORAGE_KEY);
          stored = oldStored;
          console.log("Migrated data from old storage key to new storage key");
        }
      }

      if (stored) {
        const parsed = JSON.parse(stored) as AppState;
        dispatch({ type: "LOAD_STATE", state: migrateTeamColors(parsed) });
      }
    } catch (error) {
      console.error("Failed to load state from localStorage:", error);
    }
    setLocalReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Save state to localStorage whenever it changes (only for local mode)
  useEffect(() => {
    if (!isSharedMode) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localState));
      } catch (error) {
        console.error("Failed to save state to localStorage:", error);
      }
    }
  }, [localState, isSharedMode]);

  // Team actions
  const addTeam = useCallback(
    (name: string, color?: string) => {
      if (isSharedMode && !canEdit) return;

      /* The write guard. Every caller of `addTeam` — the team sheet, Quick
         Add, the wizard — is expected to hand over a stored form already, but
         this is the one funnel all of them pass through, so it is where the
         rule is enforced rather than trusted. */
      const ink = normalizeTeamColor(color) || undefined;

      const newTeam: PersistentTeam = {
        id: generateId(),
        name,
        color: ink,
        createdAt: Date.now(),
      };

      if (isSharedMode && session) {
        const newTeams = [...(session.teams || []), newTeam];
        syncAllData({ teams: newTeams });
      } else {
        dispatch({ type: "ADD_TEAM", name, color: ink });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const updateTeam = useCallback(
    (id: string, name: string, color?: string) => {
      if (isSharedMode && !canEdit) return;

      const ink = normalizeTeamColor(color) || undefined;

      if (isSharedMode && session) {
        const newTeams = (session.teams || []).map((team) =>
          team.id === id ? { ...team, name, color: ink } : team
        );
        syncAllData({ teams: newTeams });
      } else {
        dispatch({ type: "UPDATE_TEAM", id, name, color: ink });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const deleteTeam = useCallback(
    (id: string) => {
      if (isSharedMode && !canEdit) return;

      if (isSharedMode && session) {
        const newTeams = (session.teams || []).filter((team) => team.id !== id);
        syncAllData({ teams: newTeams });
      } else {
        dispatch({ type: "DELETE_TEAM", id });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const getTeamById = useCallback(
    (id: string) => state.teams.find((team) => team.id === id),
    [state.teams]
  );

  // Competition actions
  const createCompetition = useCallback(
    (
      name: string,
      type: CompetitionType,
      teamIds: string[],
      numberOfCourts?: number,
      matchSeriesLength?: number,
      instantWinEnabled?: boolean,
      config?: Competition["config"]
    ) => {
      if (isSharedMode && !canEdit) return "";

      const id = generateId();
      const newCompetition: Competition = {
        id,
        name,
        type,
        teamIds,
        matchIds: [],
        status: "draft",
        createdAt: Date.now(),
        numberOfCourts,
        matchSeriesLength,
        instantWinEnabled,
        config,
      };

      if (isSharedMode && session) {
        syncAllData({ competition: newCompetition });
      } else {
        dispatch({
          type: "CREATE_COMPETITION",
          name,
          competitionType: type,
          teamIds,
          numberOfCourts,
          matchSeriesLength,
          instantWinEnabled,
          config,
        });
      }

      return id;
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const updateCompetition = useCallback(
    (competition: Competition) => {
      if (isSharedMode && !canEdit) return;

      if (isSharedMode && session) {
        syncAllData({ competition });
      } else {
        dispatch({ type: "UPDATE_COMPETITION", competition });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const deleteCompetition = useCallback(
    (id: string) => {
      if (isSharedMode && !canEdit) return;

      if (isSharedMode && session) {
        const newMatches = (session.matches || []).filter(
          (m) => m.competitionId !== id
        );
        syncAllData({ competition: null, matches: newMatches });
      } else {
        dispatch({ type: "DELETE_COMPETITION", id });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const startCompetition = useCallback(
    (id: string) => {
      if (isSharedMode && !canEdit) return;

      if (isSharedMode && session && session.competition) {
        syncAllData({
          competition: { ...session.competition, status: "in_progress" },
        });
      } else {
        dispatch({ type: "START_COMPETITION", id });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  // Atomically start competition with matches (fixes race condition in shared mode)
  const startCompetitionWithMatches = useCallback(
    (competition: Competition, matches: Omit<Match, "id" | "createdAt">[]) => {
      if (isSharedMode && !canEdit) return;

      // Generate IDs for new matches
      const newMatches: Match[] = matches.map((match) => ({
        ...match,
        id: generateId(),
        createdAt: Date.now(),
      }));

      // Update competition with match IDs
      const updatedCompetition: Competition = {
        ...competition,
        status: "in_progress",
        matchIds: [
          ...(competition.matchIds || []),
          ...newMatches.map((m) => m.id),
        ],
      };

      if (isSharedMode && session) {
        // Single atomic update for shared mode
        const allMatches = [...(session.matches || []), ...newMatches];
        syncAllData({ competition: updatedCompetition, matches: allMatches });
      } else {
        // For local mode, dispatch both actions
        dispatch({
          type: "UPDATE_COMPETITION",
          competition: updatedCompetition,
        });
        dispatch({ type: "ADD_MATCHES", matches });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const completeCompetition = useCallback(
    (id: string, winnerId?: string) => {
      if (isSharedMode && !canEdit) return;

      if (isSharedMode && session && session.competition) {
        syncAllData({
          competition: {
            ...session.competition,
            status: "completed",
            completedAt: Date.now(),
            winnerId,
          },
        });
      }
      dispatch({ type: "COMPLETE_COMPETITION", id, winnerId });
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const removeCompetitionLocal = useCallback((id: string) => {
    dispatch({ type: "DELETE_COMPETITION", id });
  }, []);

  const getCompetitionById = useCallback(
    (id: string) => competitionsMap.get(id),
    [competitionsMap]
  );

  // Match actions
  const addMatch = useCallback(
    (match: Omit<Match, "id" | "createdAt">): string => {
      if (isSharedMode && !canEdit) return "";

      const newMatch: Match = {
        ...match,
        id: generateId(),
        createdAt: Date.now(),
      };

      if (isSharedMode && session) {
        const newMatches = [...(session.matches || []), newMatch];

        // Update competition matchIds if applicable
        let updatedCompetition = session.competition;
        if (match.competitionId && session.competition) {
          updatedCompetition = {
            ...session.competition,
            matchIds: [...session.competition.matchIds, newMatch.id],
          };
        }

        syncAllData({ matches: newMatches, competition: updatedCompetition });
      } else {
        dispatch({ type: "ADD_MATCH", match: newMatch });
      }
      return newMatch.id;
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const addMatches = useCallback(
    (matches: Omit<Match, "id" | "createdAt">[]) => {
      if (isSharedMode && !canEdit) return;

      const newMatches: Match[] = matches.map((match) => ({
        ...match,
        id: generateId(),
        createdAt: Date.now(),
      }));

      if (isSharedMode && session) {
        const allMatches = [...(session.matches || []), ...newMatches];

        // Update competition matchIds if applicable
        let updatedCompetition = session.competition;
        if (session.competition) {
          const newMatchIds = newMatches
            .filter((m) => m.competitionId === session.competition?.id)
            .map((m) => m.id);
          if (newMatchIds.length > 0) {
            updatedCompetition = {
              ...session.competition,
              matchIds: [...session.competition.matchIds, ...newMatchIds],
            };
          }
        }

        syncAllData({ matches: allMatches, competition: updatedCompetition });
      } else {
        dispatch({ type: "ADD_MATCHES", matches });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const updateMatchScore = useCallback(
    (matchId: string, homeScore: number, awayScore: number) => {
      if (isSharedMode && !canEdit) return;

      if (isSharedMode && session) {
        const newMatches = (session.matches || []).map((match) =>
          match.id === matchId ? { ...match, homeScore, awayScore } : match
        );
        syncAllData({ matches: newMatches });
      } else {
        dispatch({ type: "UPDATE_MATCH_SCORE", matchId, homeScore, awayScore });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const updateMatch = useCallback(
    (matchId: string, updates: Partial<Match>) => {
      if (isSharedMode && !canEdit) return;

      if (isSharedMode && session) {
        const newMatches = (session.matches || []).map((match) =>
          match.id === matchId ? { ...match, ...updates } : match
        );
        syncAllData({ matches: newMatches });
      } else {
        dispatch({ type: "UPDATE_MATCH", matchId, updates });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const startMatch = useCallback(
    (matchId: string) => {
      if (isSharedMode && !canEdit) return;

      if (isSharedMode && session) {
        const newMatches = (session.matches || []).map((match) =>
          match.id === matchId
            ? { ...match, status: "in_progress" as MatchStatus }
            : match
        );
        syncAllData({ matches: newMatches });
      } else {
        dispatch({ type: "START_MATCH", matchId });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const completeMatch = useCallback(
    (matchId: string, winnerId: string) => {
      if (isSharedMode && !canEdit) return;

      if (isSharedMode && session) {
        const newMatches = (session.matches || []).map((match) =>
          match.id === matchId
            ? {
                ...match,
                status: "completed" as MatchStatus,
                completedAt: Date.now(),
                winnerId,
              }
            : match
        );
        syncAllData({ matches: newMatches });
      } else {
        dispatch({ type: "COMPLETE_MATCH", matchId, winnerId });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  // Atomically complete a match, update competition, and add next match (for win2out/two_match_rotation)
  // Returns the new match ID if a next match was created, otherwise null
  const completeMatchWithNextMatch = useCallback(
    (
      matchId: string,
      winnerId: string,
      updatedCompetition: Competition,
      nextMatch: Omit<Match, "id" | "createdAt"> | null
    ): string | null => {
      if (isSharedMode && !canEdit) return null;

      // Generate the new match ID upfront so we can return it
      const newMatchId = nextMatch ? generateId() : null;

      if (isSharedMode && session) {
        // Update the completed match
        let newMatches = (session.matches || []).map((match) =>
          match.id === matchId
            ? {
                ...match,
                status: "completed" as MatchStatus,
                completedAt: Date.now(),
                winnerId,
              }
            : match
        );

        // Add the next match if provided
        if (nextMatch && newMatchId) {
          const newMatch: Match = {
            ...nextMatch,
            id: newMatchId,
            createdAt: Date.now(),
          };
          newMatches = [...newMatches, newMatch];

          // Update competition matchIds
          updatedCompetition = {
            ...updatedCompetition,
            matchIds: [...(updatedCompetition.matchIds || []), newMatch.id],
          };
        }

        // Single atomic update
        syncAllData({ matches: newMatches, competition: updatedCompetition });
      } else {
        // For local mode, dispatch in sequence
        dispatch({ type: "COMPLETE_MATCH", matchId, winnerId });
        dispatch({
          type: "UPDATE_COMPETITION",
          competition: updatedCompetition,
        });
        if (nextMatch && newMatchId) {
          dispatch({ type: "ADD_MATCH", match: { ...nextMatch, id: newMatchId } });
        }
      }

      return newMatchId;
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  const deleteMatch = useCallback(
    (matchId: string) => {
      if (isSharedMode && !canEdit) return;

      if (isSharedMode && session) {
        const match = (session.matches || []).find((m) => m.id === matchId);
        const newMatches = (session.matches || []).filter(
          (m) => m.id !== matchId
        );

        // Remove match ID from competition if applicable
        let updatedCompetition = session.competition;
        if (match?.competitionId && session.competition) {
          updatedCompetition = {
            ...session.competition,
            matchIds: session.competition.matchIds.filter(
              (id) => id !== matchId
            ),
          };
        }

        syncAllData({ matches: newMatches, competition: updatedCompetition });
      } else {
        dispatch({ type: "DELETE_MATCH", matchId });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  // Admin match management - Update teams playing a match
  const updateMatchTeams = useCallback(
    (matchId: string, homeTeamId: string, awayTeamId: string) => {
      if (isSharedMode && !canEdit) return;

      // Find the match to get original team IDs
      const match = isSharedMode
        ? (session?.matches || []).find((m) => m.id === matchId)
        : state.matches.find((m) => m.id === matchId);

      if (!match) return;

      // Find the competition this match belongs to
      const competition = isSharedMode
        ? session?.competition
        : match.competitionId
          ? state.competitions.find((c) => c.id === match.competitionId)
          : null;

      // Calculate which teams are being swapped in/out
      const oldTeams = [match.homeTeamId, match.awayTeamId];
      const newTeams = [homeTeamId, awayTeamId];
      const teamsBeingRemoved = oldTeams.filter((t) => !newTeams.includes(t));
      const teamsBeingAdded = newTeams.filter((t) => !oldTeams.includes(t));

      // Helper to update queue - swap teams in/out
      const updateQueue = (currentQueue: string[]): string[] => {
        const newQueue = [...currentQueue];

        // For each team being added from queue, find its position and replace with removed team
        for (let i = 0; i < teamsBeingAdded.length; i++) {
          const addedTeam = teamsBeingAdded[i];
          const removedTeam = teamsBeingRemoved[i];

          const queueIndex = newQueue.indexOf(addedTeam);
          if (queueIndex !== -1 && removedTeam) {
            // Replace the added team's position with the removed team
            newQueue[queueIndex] = removedTeam;
          } else if (queueIndex !== -1) {
            // Just remove the added team from queue
            newQueue.splice(queueIndex, 1);
          } else if (removedTeam && !newQueue.includes(removedTeam)) {
            // Team being removed wasn't in queue, add it to the end
            newQueue.push(removedTeam);
          }
        }

        // Handle case where there are more removed teams than added teams
        for (let i = teamsBeingAdded.length; i < teamsBeingRemoved.length; i++) {
          const removedTeam = teamsBeingRemoved[i];
          if (removedTeam && !newQueue.includes(removedTeam)) {
            newQueue.push(removedTeam);
          }
        }

        return newQueue;
      };

      if (isSharedMode && session) {
        // Update the match teams
        const newMatches = (session.matches || []).map((m) =>
          m.id === matchId ? { ...m, homeTeamId, awayTeamId } : m
        );

        // For Win2Out/TwoMatchRotation, also update the court state and queue
        let updatedCompetition = session.competition;
        if (updatedCompetition?.win2outState) {
          const courtIndex = updatedCompetition.win2outState.courts.findIndex(
            (c) =>
              c.teamIds.includes(match.homeTeamId) &&
              c.teamIds.includes(match.awayTeamId)
          );
          if (courtIndex !== -1) {
            const newCourts = [...updatedCompetition.win2outState.courts];
            newCourts[courtIndex] = {
              ...newCourts[courtIndex],
              teamIds: [homeTeamId, awayTeamId],
            };
            const newQueue = updateQueue(updatedCompetition.win2outState.queue);
            updatedCompetition = {
              ...updatedCompetition,
              win2outState: {
                ...updatedCompetition.win2outState,
                courts: newCourts,
                queue: newQueue,
              },
            };
          }
        }
        if (updatedCompetition?.twoMatchRotationState) {
          const courtIndex =
            updatedCompetition.twoMatchRotationState.courts.findIndex(
              (c) =>
                c.teamIds.includes(match.homeTeamId) &&
                c.teamIds.includes(match.awayTeamId)
            );
          if (courtIndex !== -1) {
            const newCourts = [
              ...updatedCompetition.twoMatchRotationState.courts,
            ];
            newCourts[courtIndex] = {
              ...newCourts[courtIndex],
              teamIds: [homeTeamId, awayTeamId],
            };
            const newQueue = updateQueue(
              updatedCompetition.twoMatchRotationState.queue
            );
            updatedCompetition = {
              ...updatedCompetition,
              twoMatchRotationState: {
                ...updatedCompetition.twoMatchRotationState,
                courts: newCourts,
                queue: newQueue,
              },
            };
          }
        }

        syncAllData({ matches: newMatches, competition: updatedCompetition });
      } else {
        // Local mode - update match first
        dispatch({
          type: "UPDATE_MATCH_TEAMS",
          matchId,
          homeTeamId,
          awayTeamId,
        });

        // For Win2Out/TwoMatchRotation, also update the competition's court state and queue
        if (competition) {
          let updatedCompetition = { ...competition };

          if (updatedCompetition.win2outState) {
            const courtIndex = updatedCompetition.win2outState.courts.findIndex(
              (c) =>
                c.teamIds.includes(match.homeTeamId) &&
                c.teamIds.includes(match.awayTeamId)
            );
            if (courtIndex !== -1) {
              const newCourts = [...updatedCompetition.win2outState.courts];
              newCourts[courtIndex] = {
                ...newCourts[courtIndex],
                teamIds: [homeTeamId, awayTeamId],
              };
              const newQueue = updateQueue(updatedCompetition.win2outState.queue);
              updatedCompetition = {
                ...updatedCompetition,
                win2outState: {
                  ...updatedCompetition.win2outState,
                  courts: newCourts,
                  queue: newQueue,
                },
              };
              dispatch({
                type: "UPDATE_COMPETITION",
                competition: updatedCompetition,
              });
            }
          }

          if (updatedCompetition.twoMatchRotationState) {
            const courtIndex =
              updatedCompetition.twoMatchRotationState.courts.findIndex(
                (c) =>
                  c.teamIds.includes(match.homeTeamId) &&
                  c.teamIds.includes(match.awayTeamId)
              );
            if (courtIndex !== -1) {
              const newCourts = [
                ...updatedCompetition.twoMatchRotationState.courts,
              ];
              newCourts[courtIndex] = {
                ...newCourts[courtIndex],
                teamIds: [homeTeamId, awayTeamId],
              };
              const newQueue = updateQueue(
                updatedCompetition.twoMatchRotationState.queue
              );
              updatedCompetition = {
                ...updatedCompetition,
                twoMatchRotationState: {
                  ...updatedCompetition.twoMatchRotationState,
                  courts: newCourts,
                  queue: newQueue,
                },
              };
              dispatch({
                type: "UPDATE_COMPETITION",
                competition: updatedCompetition,
              });
            }
          }
        }
      }
    },
    [
      isSharedMode,
      canEdit,
      session,
      state.matches,
      state.competitions,
      syncAllData,
    ]
  );

  // Admin match management - Swap teams between matches (for elimination brackets)
  const swapMatchTeams = useCallback(
    (updates: { matchId: string; homeTeamId: string; awayTeamId: string }[]) => {
      if (isSharedMode && !canEdit) return;

      if (isSharedMode && session) {
        const newMatches = (session.matches || []).map((m) => {
          const update = updates.find((u) => u.matchId === m.id);
          return update
            ? { ...m, homeTeamId: update.homeTeamId, awayTeamId: update.awayTeamId }
            : m;
        });
        syncAllData({ matches: newMatches });
      } else {
        dispatch({ type: "SWAP_MATCH_TEAMS", updates });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  // Admin match management - Update court assignment for a match
  const updateMatchCourt = useCallback(
    (matchId: string, courtNumber: number) => {
      if (isSharedMode && !canEdit) return;

      if (isSharedMode && session) {
        const newMatches = (session.matches || []).map((m) =>
          m.id === matchId ? { ...m, position: courtNumber } : m
        );
        syncAllData({ matches: newMatches });
      } else {
        dispatch({ type: "UPDATE_MATCH_COURT", matchId, courtNumber });
      }
    },
    [isSharedMode, canEdit, session, syncAllData]
  );

  // Admin match management - Swap teams between two courts (for Win2Out/TwoMatchRotation)
  const swapCourtTeams = useCallback(
    (competitionId: string, court1: number, court2: number) => {
      if (isSharedMode && !canEdit) return;

      const competition = isSharedMode
        ? session?.competition
        : state.competitions.find((c) => c.id === competitionId);

      if (!competition) return;

      let updatedCompetition = { ...competition };
      const matchUpdates: { matchId: string; homeTeamId: string; awayTeamId: string }[] = [];
      const currentMatches = isSharedMode
        ? session?.matches || []
        : state.matches;

      // Handle Win2Out
      if (updatedCompetition.win2outState) {
        const courts = [...updatedCompetition.win2outState.courts];
        const courtIndex1 = courts.findIndex((c) => c.courtNumber === court1);
        const courtIndex2 = courts.findIndex((c) => c.courtNumber === court2);

        if (courtIndex1 !== -1 && courtIndex2 !== -1) {
          // Swap the team IDs
          const temp = courts[courtIndex1].teamIds;
          courts[courtIndex1] = {
            ...courts[courtIndex1],
            teamIds: courts[courtIndex2].teamIds,
          };
          courts[courtIndex2] = { ...courts[courtIndex2], teamIds: temp };

          // Find and update the matches for these courts
          const match1 = currentMatches.find(
            (m) =>
              m.competitionId === competitionId &&
              (m.status === "pending" || m.status === "in_progress") &&
              m.position === court1
          );
          const match2 = currentMatches.find(
            (m) =>
              m.competitionId === competitionId &&
              (m.status === "pending" || m.status === "in_progress") &&
              m.position === court2
          );

          if (match1) {
            matchUpdates.push({
              matchId: match1.id,
              homeTeamId: courts[courtIndex1].teamIds[0],
              awayTeamId: courts[courtIndex1].teamIds[1],
            });
          }
          if (match2) {
            matchUpdates.push({
              matchId: match2.id,
              homeTeamId: courts[courtIndex2].teamIds[0],
              awayTeamId: courts[courtIndex2].teamIds[1],
            });
          }

          updatedCompetition = {
            ...updatedCompetition,
            win2outState: {
              ...updatedCompetition.win2outState,
              courts,
            },
          };
        }
      }

      // Handle TwoMatchRotation
      if (updatedCompetition.twoMatchRotationState) {
        const courts = [...updatedCompetition.twoMatchRotationState.courts];
        const courtIndex1 = courts.findIndex((c) => c.courtNumber === court1);
        const courtIndex2 = courts.findIndex((c) => c.courtNumber === court2);

        if (courtIndex1 !== -1 && courtIndex2 !== -1) {
          // Swap the team IDs
          const temp = courts[courtIndex1].teamIds;
          courts[courtIndex1] = {
            ...courts[courtIndex1],
            teamIds: courts[courtIndex2].teamIds,
          };
          courts[courtIndex2] = { ...courts[courtIndex2], teamIds: temp };

          // Find and update the matches for these courts
          const match1 = currentMatches.find(
            (m) =>
              m.competitionId === competitionId &&
              (m.status === "pending" || m.status === "in_progress") &&
              m.position === court1
          );
          const match2 = currentMatches.find(
            (m) =>
              m.competitionId === competitionId &&
              (m.status === "pending" || m.status === "in_progress") &&
              m.position === court2
          );

          if (match1) {
            matchUpdates.push({
              matchId: match1.id,
              homeTeamId: courts[courtIndex1].teamIds[0],
              awayTeamId: courts[courtIndex1].teamIds[1],
            });
          }
          if (match2) {
            matchUpdates.push({
              matchId: match2.id,
              homeTeamId: courts[courtIndex2].teamIds[0],
              awayTeamId: courts[courtIndex2].teamIds[1],
            });
          }

          updatedCompetition = {
            ...updatedCompetition,
            twoMatchRotationState: {
              ...updatedCompetition.twoMatchRotationState,
              courts,
            },
          };
        }
      }

      // Apply updates
      if (isSharedMode && session) {
        let newMatches = [...(session.matches || [])];
        matchUpdates.forEach((update) => {
          newMatches = newMatches.map((m) =>
            m.id === update.matchId
              ? { ...m, homeTeamId: update.homeTeamId, awayTeamId: update.awayTeamId }
              : m
          );
        });
        syncAllData({ matches: newMatches, competition: updatedCompetition });
      } else {
        dispatch({ type: "UPDATE_COMPETITION", competition: updatedCompetition });
        matchUpdates.forEach((update) => {
          dispatch({
            type: "UPDATE_MATCH_TEAMS",
            matchId: update.matchId,
            homeTeamId: update.homeTeamId,
            awayTeamId: update.awayTeamId,
          });
        });
      }
    },
    [isSharedMode, canEdit, session, state.competitions, state.matches, syncAllData]
  );

  // Admin match management - Reorder the queue (for Win2Out/TwoMatchRotation)
  const reorderQueue = useCallback(
    (competitionId: string, newQueue: string[]) => {
      if (isSharedMode && !canEdit) return;

      const competition = isSharedMode
        ? session?.competition
        : state.competitions.find((c) => c.id === competitionId);

      if (!competition) return;

      let updatedCompetition = { ...competition };

      if (updatedCompetition.win2outState) {
        updatedCompetition = {
          ...updatedCompetition,
          win2outState: {
            ...updatedCompetition.win2outState,
            queue: newQueue,
          },
        };
      }

      if (updatedCompetition.twoMatchRotationState) {
        updatedCompetition = {
          ...updatedCompetition,
          twoMatchRotationState: {
            ...updatedCompetition.twoMatchRotationState,
            queue: newQueue,
          },
        };
      }

      if (isSharedMode && session) {
        syncAllData({ competition: updatedCompetition });
      } else {
        dispatch({ type: "UPDATE_COMPETITION", competition: updatedCompetition });
      }
    },
    [isSharedMode, canEdit, session, state.competitions, syncAllData]
  );

  const getMatchById = useCallback(
    (id: string) => matchesMap.get(id),
    [matchesMap]
  );

  const getMatchesByCompetition = useCallback(
    (competitionId: string) =>
      state.matches.filter((match) => match.competitionId === competitionId),
    [state.matches]
  );

  // Utility
  const resetState = useCallback(() => {
    if (!isSharedMode) {
      dispatch({ type: "RESET_STATE" });
    }
  }, [isSharedMode]);

  const value: AppContextValue = {
    state,
    localReady,
    isSharedMode,
    canEdit: isSharedMode ? canEdit : true,
    addTeam,
    updateTeam,
    deleteTeam,
    getTeamById,
    createCompetition,
    updateCompetition,
    deleteCompetition,
    startCompetition,
    startCompetitionWithMatches,
    completeCompetition,
    removeCompetitionLocal,
    getCompetitionById,
    addMatch,
    addMatches,
    updateMatchScore,
    updateMatch,
    startMatch,
    completeMatch,
    completeMatchWithNextMatch,
    deleteMatch,
    getMatchById,
    getMatchesByCompetition,
    updateMatchTeams,
    swapMatchTeams,
    updateMatchCourt,
    swapCourtTeams,
    reorderQueue,
    resetState,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ============================================
// Hook
// ============================================
export const useApp = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
