import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useSyncExternalStore,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { useSession } from "@/context/SessionContext";
import { useScoreHistory } from "@/hooks/useScoreHistory";
import { useScoreRollbackToast } from "@/hooks/useScoreRollbackToast";
import { advanceWinner } from "@/lib/singleElimination";
import { calculateStandings } from "@/lib/roundRobin";
import { processMatchResult } from "@/lib/win2out";
import { processMatchResult as processTwoMatchRotationResult } from "@/lib/twoMatchRotation";
import type { Match } from "@/types/game";

/* ===========================================================================
   `handleCompleteMatch` below covers five competition formats, bracket
   advancement, the shared-mode merge and the cascade to `completeCompetition`.
   Treat it as a BLACK BOX: change what calls it, never its internals.
   Fullscreen/orientation live in `useCourtView` (the Fullscreen API needs the
   element, not the route); the score history is `useScoreHistory` — one
   stack, surviving reload.
   =========================================================================== */

/** A store that never emits: the only thing that changes is the environment. */
const NEVER_CHANGES = () => () => {};
const CLIENT = () => true;
const SERVER = () => false;

export const useMatchPage = () => {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;

  const {
    state,
    getMatchById,
    getCompetitionById,
    updateMatchScore,
    updateMatch,
    startMatch,
    completeMatch,
    completeMatchWithNextMatch,
    completeCompetition,
    updateMatchTeams,
    canEdit,
    isSharedMode,
  } = useApp();

  const { updateMatches } = useSession();

  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  const match = useMemo(() => getMatchById(matchId), [getMatchById, matchId]);
  const competition = useMemo(
    () =>
      match?.competitionId ? getCompetitionById(match.competitionId) : null,
    [match, getCompetitionById]
  );

  const homeTeam = useMemo(
    () => state.teams.find((t) => t.id === match?.homeTeamId),
    [state.teams, match?.homeTeamId]
  );
  const awayTeam = useMemo(
    () => state.teams.find((t) => t.id === match?.awayTeamId),
    [state.teams, match?.awayTeamId]
  );

  /* ---------------------------------------------------------- hydration

     `AppContext` loads localStorage inside a mount effect, so `state` is empty
     on the first client render and `!match` is indistinguishable from "this
     match does not exist" until hydration lands — gate on `hydrated` or the
     route flashes "Match not found" on every successful load.

     `useSyncExternalStore` with a store that never changes is the codebase's
     existing idiom for "is this the client yet" (`useOnlineStatus`,
     `useMbReducedMotion`): the server snapshot is `false`, the client snapshot
     is `true`, and React re-renders once hydration finishes. That re-render is
     scheduled in the same pass as `AppContext`'s `LOAD_STATE` — which is
     dispatched from a mount effect on an ancestor — so the two land together
     and `hydrated === true` genuinely means "localStorage has been read". */
  const hydrated = useSyncExternalStore(NEVER_CHANGES, CLIENT, SERVER);

  /* ------------------------------------------------------- score history */

  const history = useScoreHistory({
    seed: { home: match?.homeScore ?? 0, away: match?.awayScore ?? 0 },
    /* Null until the match is real, so the restore runs once against a seed
       that means something rather than against 0–0. */
    storageKey: match ? `mb-score-history:${matchId}` : null,
  });

  /* All four are `useCallback`s with stable dependencies, so they can sit in
     the dependency arrays below without re-creating a single handler. */
  const {
    bump: bumpScore,
    undo: undoScore,
    reset: resetScoreHistory,
    reconcile: reconcileScore,
  } = history;

  /* The context is the single source of truth for the rendered score; the stack
     follows it. This adopts a remote write in a shared session, an edit made on
     the competition screen, and the 0–0 that opens the next game of a series. */
  useEffect(() => {
    if (!match) return;
    reconcileScore({ home: match.homeScore, away: match.awayScore });
  }, [match, reconcileScore]);

  useEffect(() => {
    if (match && match.status === "pending") {
      startMatch(matchId);
    }
  }, [match, matchId, startMatch]);

  /* ------------------------------------------------------------ scoring */

  const handleAddPoint = useCallback(
    (team: "home" | "away") => {
      if (!match || !canEdit || match.status === "completed") return;
      const next = bumpScore(team, 1);
      updateMatchScore(matchId, next.home, next.away);
    },
    [match, matchId, updateMatchScore, canEdit, bumpScore]
  );

  const handleDeductPoint = useCallback(
    (team: "home" | "away") => {
      if (!match || !canEdit || match.status === "completed") return;
      const next = bumpScore(team, -1);
      updateMatchScore(matchId, next.home, next.away);
    },
    [match, matchId, updateMatchScore, canEdit, bumpScore]
  );

  const announceRollback = useScoreRollbackToast();

  const handleUndo = useCallback(() => {
    if (!match || !canEdit || match.status === "completed") return;
    /* The tip BEFORE the undo, read off the context (the rendered truth), so
       the strip can say which way the correction went (C16). */
    const previous = { home: match.homeScore, away: match.awayScore };
    const target = undoScore();
    if (!target) return;
    updateMatchScore(matchId, target.home, target.away);
    announceRollback(previous, target);
  }, [match, matchId, updateMatchScore, canEdit, undoScore, announceRollback]);

  /* --------------------------------------------------------- series info */

  const seriesInfo = useMemo(() => {
    const supportsSeries =
      !!competition &&
      (competition.type === "round_robin" ||
        competition.type === "single_elimination" ||
        competition.type === "double_elimination");
    const seriesLength = supportsSeries
      ? match?.seriesLength ?? competition?.matchSeriesLength ?? 1
      : 1;
    const isSeries = supportsSeries && seriesLength > 1;
    const homeWins = isSeries ? match?.homeWins ?? 0 : 0;
    const awayWins = isSeries ? match?.awayWins ?? 0 : 0;

    const gamesPlayed = homeWins + awayWins;

    /* `Game 0` was reachable: a completed series match whose counters were
       never written reported `gamesPlayed`, which is 0, and the chip printed it
       verbatim. Null means "omit the chip" — better than inventing a number. */
    const gameNumber = !isSeries
      ? 1
      : match?.status === "completed"
        ? gamesPlayed > 0
          ? gamesPlayed
          : null
        : gamesPlayed + 1;

    return {
      isSeries,
      seriesLength,
      homeWins,
      awayWins,
      winsNeeded: isSeries ? Math.ceil(seriesLength / 2) : 1,
      gamesPlayed,
      gameNumber,
    };
  }, [competition, match]);

  /* =========================================================================
     BLACK BOX — do not refactor. See the note at the top of this file.
     ====================================================================== */
  const handleCompleteMatch = useCallback(() => {
    if (!match || match.status === "completed") return;

    const winnerId =
      match.homeScore > match.awayScore ? match.homeTeamId : match.awayTeamId;

    const supportsSeries =
      !!competition &&
      (competition.type === "round_robin" ||
        competition.type === "single_elimination" ||
        competition.type === "double_elimination");
    const seriesLength = supportsSeries
      ? match.seriesLength ?? competition?.matchSeriesLength ?? 1
      : 1;
    const isSeries = supportsSeries && seriesLength > 1;
    const winsNeeded = Math.ceil(seriesLength / 2);
    const homeWins = match.homeWins ?? 0;
    const awayWins = match.awayWins ?? 0;
    const nextHomeWins =
      winnerId === match.homeTeamId ? homeWins + 1 : homeWins;
    const nextAwayWins =
      winnerId === match.awayTeamId ? awayWins + 1 : awayWins;
    const seriesUpdates = isSeries
      ? {
          seriesLength,
          homeWins: nextHomeWins,
          awayWins: nextAwayWins,
          seriesGame: (match.seriesGame ?? 1) + 1,
        }
      : {};

    if (isSeries && nextHomeWins < winsNeeded && nextAwayWins < winsNeeded) {
      updateMatch(matchId, {
        ...seriesUpdates,
        homeScore: 0,
        awayScore: 0,
        status: "in_progress",
        winnerId: undefined,
        completedAt: undefined,
      });
      resetScoreHistory({ home: 0, away: 0 });
      setShowCompleteDialog(false);
      return;
    }

    if (
      competition &&
      competition.type === "win2out" &&
      competition.win2outState
    ) {
      const completedMatch = {
        ...match,
        winnerId,
        status: "completed" as const,
        completedAt: Date.now(),
        ...seriesUpdates,
      };

      const { updatedState, nextMatch } = processMatchResult(
        competition.win2outState,
        completedMatch
      );

      const updatedCompetition = {
        ...competition,
        win2outState: updatedState,
        status: updatedState.isComplete
          ? ("completed" as const)
          : ("in_progress" as const),
      };

      completeMatchWithNextMatch(
        matchId,
        winnerId,
        updatedCompetition,
        nextMatch
      );
      setShowCompleteDialog(false);
      router.push(`/competitions/${competition.id}`);
      return;
    }

    if (
      competition &&
      competition.type === "two_match_rotation" &&
      competition.twoMatchRotationState
    ) {
      const completedMatch = {
        ...match,
        winnerId,
        status: "completed" as const,
        completedAt: Date.now(),
        ...seriesUpdates,
      };

      const { updatedState, nextMatch } = processTwoMatchRotationResult(
        competition.twoMatchRotationState,
        completedMatch
      );

      const updatedCompetition = {
        ...competition,
        twoMatchRotationState: updatedState,
        status: updatedState.isComplete
          ? ("completed" as const)
          : ("in_progress" as const),
      };

      completeMatchWithNextMatch(
        matchId,
        winnerId,
        updatedCompetition,
        nextMatch
      );
      setShowCompleteDialog(false);
      router.push(`/competitions/${competition.id}`);
      return;
    }

    let completionMatches: Match[] | null = null;

    if (
      competition &&
      (competition.type === "single_elimination" ||
        competition.type === "double_elimination")
    ) {
      const completedMatch: Match = {
        ...match,
        winnerId,
        status: "completed",
        completedAt: Date.now(),
        ...seriesUpdates,
      };

      const competitionMatches = state.matches.filter(
        (m) => m.competitionId === competition.id
      );
      const matchesWithCompleted = competitionMatches.map((m) =>
        m.id === match.id ? completedMatch : m
      );
      const updatedMatches = advanceWinner(
        matchesWithCompleted,
        completedMatch,
        winnerId
      );

      if (isSharedMode) {
        const updatedMap = new Map(
          updatedMatches.map((updatedMatch) => [updatedMatch.id, updatedMatch])
        );
        const mergedMatches = state.matches.map((m) =>
          m.competitionId === competition.id
            ? updatedMap.get(m.id) || m
            : m
        );
        void updateMatches(mergedMatches);
      } else {
        if (isSeries) {
          updateMatch(matchId, seriesUpdates);
        }
        completeMatch(matchId, winnerId);
        updatedMatches.forEach((updatedMatch) => {
          if (updatedMatch.id !== match.id) {
            const original = competitionMatches.find(
              (m) => m.id === updatedMatch.id
            );
            if (
              original &&
              (original.homeTeamId !== updatedMatch.homeTeamId ||
                original.awayTeamId !== updatedMatch.awayTeamId)
            ) {
              updateMatchTeams(
                updatedMatch.id,
                updatedMatch.homeTeamId,
                updatedMatch.awayTeamId
              );
            }
          }
        });
      }

      completionMatches = matchesWithCompleted;
    } else {
      const completedMatch: Match = {
        ...match,
        winnerId,
        status: "completed",
        completedAt: Date.now(),
        ...seriesUpdates,
      };

      if (isSharedMode) {
        const mergedMatches = state.matches.map((m) =>
          m.id === match.id ? completedMatch : m
        );
        void updateMatches(mergedMatches);
      } else {
        if (isSeries) {
          updateMatch(matchId, seriesUpdates);
        }
        completeMatch(matchId, winnerId);
      }

      if (competition) {
        completionMatches = state.matches
          .filter((m) => m.competitionId === competition.id)
          .map((m) => (m.id === match.id ? completedMatch : m));
      }
    }

    if (
      competition &&
      competition.status === "in_progress" &&
      (competition.type === "round_robin" ||
        competition.type === "single_elimination" ||
        competition.type === "double_elimination")
    ) {
      const competitionMatches =
        completionMatches ||
        state.matches
          .filter((m) => m.competitionId === competition.id)
          .map((m) =>
            m.id === match.id
              ? { ...m, status: "completed" as const, winnerId }
              : m
          );

      const allMatchesComplete =
        competitionMatches.length > 0 &&
        competitionMatches.every((m) => m.status === "completed");

      if (allMatchesComplete) {
        let competitionWinnerId: string | undefined;

        if (competition.type === "round_robin") {
          const standings = calculateStandings(
            competition.teamIds,
            competitionMatches,
            competition.config
          );
          competitionWinnerId = standings[0]?.teamId;
        } else {
          const finalMatch = competitionMatches.find((m) => {
            if (competition.type === "single_elimination") {
              const totalRounds = Math.log2(competition.teamIds.length);
              return m.round === totalRounds && !m.bracket;
            }
            return m.bracket === "grand_finals";
          });
          competitionWinnerId = finalMatch?.winnerId;
        }

        if (competitionWinnerId) {
          completeCompetition(competition.id, competitionWinnerId);
        }
      }
    }

    setShowCompleteDialog(false);

    if (competition) {
      router.push(`/competitions/${competition.id}`);
    } else {
      router.push("/");
    }
  }, [
    match,
    matchId,
    competition,
    state.matches,
    completeMatch,
    completeMatchWithNextMatch,
    completeCompetition,
    updateMatch,
    updateMatchTeams,
    updateMatches,
    isSharedMode,
    router,
    /* Stable (`useCallback` over a `useCallback(…, [])`), so its presence here
       changes nothing about when this callback is rebuilt. It is listed because
       the series branch calls it, and a dependency array that lies is worse
       than one that is one entry longer. */
    resetScoreHistory,
  ]);
  /* ===================== end of the black box ============================ */

  const handleOpenCompleteDialog = useCallback(() => {
    if (!match || match.status === "completed") return;
    if (match.homeScore === match.awayScore) {
      return;
    }
    setShowCompleteDialog(true);
  }, [match]);

  /* A string, not a handler. The console renders "back" as a real anchor so it
     keeps middle-click, "open in new tab" and the status bar — and so the shell
     draws it with a visible word instead of an unlabelled disc. */
  const backHref = competition ? `/competitions/${competition.id}` : "/";

  const canComplete = !!(
    match &&
    match.status !== "completed" &&
    match.homeScore !== match.awayScore
  );

  const homeLeading = match ? match.homeScore > match.awayScore : false;
  const awayLeading = match ? match.awayScore > match.homeScore : false;

  return {
    awayLeading,
    awayTeam,
    backHref,
    canComplete,
    canEdit,
    canUndo: history.canUndo,
    competition,
    handleAddPoint,
    handleCompleteMatch,
    handleDeductPoint,
    handleOpenCompleteDialog,
    handleUndo,
    homeLeading,
    homeTeam,
    hydrated,
    isSharedMode,
    match,
    seriesInfo,
    setShowCompleteDialog,
    showCompleteDialog,
    undoRestored: history.restored,
  };
};
