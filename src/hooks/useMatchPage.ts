import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { roleFor } from "@/lib/console";
import { entryTeams } from "@/lib/entries";
import {
  afterSnapshot,
  backHref,
  backLabel,
  blockMessage,
  latestScore,
  matchKind,
  NO_SCORE,
  sameScore,
  scoringAccess,
  seriesInfo,
  tapped,
  winnerSide,
  type Score,
  type ScoringAccess,
  type Side,
} from "@/lib/scoring";
import { messageOf } from "@/lib/utils";

const NOT_SCORING: ScoringAccess = { canScore: false, reason: "watch_only" };

/**
 * Everything the scoring page needs for one match: the match and its
 * tournament from the provider, the two teams, what the visitor may do and
 * why not, the point-by-point handlers with their undo history, and the
 * confirm that records the result through the engine.
 */
export const useMatchPage = () => {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;

  const { user } = useAuth();
  const {
    state,
    getMatchById,
    getTournamentById,
    updateMatchScore,
    startMatch,
    completeMatch,
    isTournamentsLoading,
  } = useApp();

  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [history, setHistory] = useState<Score[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  const match = getMatchById(matchId);
  const tournament = (match?.tournamentId && getTournamentById(match.tournamentId)) || null;

  // A tournament match shows its entries; a quick match shows roster teams.
  const teams = useMemo(
    () => (tournament ? entryTeams(tournament, state.teams) : state.teams),
    [tournament, state.teams],
  );
  const homeTeam = teams.find((t) => t.id === match?.homeTeamId);
  const awayTeam = teams.find((t) => t.id === match?.awayTeamId);

  const role = roleFor(tournament?.ownerId ?? match?.ownerId, user?.uid);
  const access = match ? scoringAccess(role, match, tournament) : NOT_SCORING;
  const canScore = access.canScore;
  const notice = match && !access.canScore ? blockMessage(access.reason, matchKind(match)) : null;

  // Opening a match a scorer may play starts it.
  const matchStatus = match?.status;
  useEffect(() => {
    if (matchStatus === "pending" && canScore) startMatch(matchId);
  }, [matchStatus, canScore, matchId, startMatch]);

  // Scores this page has written that the subscription has not shown yet.
  // Two taps in quick succession both count because the second builds on
  // the first's write rather than on the last snapshot.
  const pending = useRef<Score[]>([]);
  const shownHome = match?.homeScore;
  const shownAway = match?.awayScore;
  useEffect(() => {
    if (shownHome === undefined || shownAway === undefined) return;
    pending.current = afterSnapshot(pending.current, { home: shownHome, away: shownAway });
  }, [shownHome, shownAway]);

  /** The score as the scorer last left it, whether or not it has come back yet. */
  const current = useCallback(
    (): Score | null =>
      shownHome === undefined || shownAway === undefined
        ? null
        : latestScore(pending.current, { home: shownHome, away: shownAway }),
    [shownHome, shownAway],
  );

  const writeScore = useCallback(
    (next: (score: Score) => Score) => {
      const before = current();
      if (!before) return;
      const written = next(before);
      if (sameScore(written, before)) return;
      pending.current = [...pending.current, written];
      setHistory((prev) => [...(prev.length === 0 ? [before] : prev), written]);
      updateMatchScore(matchId, written.home, written.away);
    },
    [current, matchId, updateMatchScore],
  );

  const handleAddPoint = useCallback(
    (side: Side) => {
      if (canScore) writeScore((score) => tapped(score, side, 1));
    },
    [canScore, writeScore],
  );

  const handleDeductPoint = useCallback(
    (side: Side) => {
      if (canScore) writeScore((score) => tapped(score, side, -1));
    },
    [canScore, writeScore],
  );

  const handleUndo = useCallback(() => {
    if (!canScore || history.length < 2) return;
    const previous = history[history.length - 2];
    setHistory((prev) => prev.slice(0, -1));
    pending.current = [...pending.current, previous];
    updateMatchScore(matchId, previous.home, previous.away);
  }, [canScore, matchId, history, updateMatchScore]);

  const handleOpenCompleteDialog = useCallback(() => {
    const score = current();
    if (!canScore || !score || score.home === score.away) return;
    setCompleteError(null);
    setShowCompleteDialog(true);
  }, [canScore, current]);

  // The engine decides what a result means: the next game of a series, the
  // next match on a court, a slot in the bracket, or the end of the
  // tournament. Once the match is over the page goes back where it came from.
  const handleCompleteMatch = useCallback(async () => {
    const score = current();
    if (!match || !canScore || !score || isCompleting) return;
    setIsCompleting(true);
    setCompleteError(null);
    try {
      const outcome = await completeMatch(matchId, {
        homeScore: score.home,
        awayScore: score.away,
      });
      setShowCompleteDialog(false);
      if (!outcome.completed) {
        // On to the next game of the series, on the same page. The engine
        // has written a clean board, which counts as the last write here
        // until the subscription shows it.
        setHistory([]);
        pending.current = [NO_SCORE];
        return;
      }
      router.push(backHref(match));
    } catch (error) {
      console.error("Failed to complete the match:", error);
      setCompleteError(messageOf(error, "The result could not be saved."));
    } finally {
      setIsCompleting(false);
    }
  }, [match, canScore, current, matchId, completeMatch, isCompleting, router]);

  return {
    match,
    tournament,
    homeTeam,
    awayTeam,
    access,
    notice,
    series: match ? seriesInfo(match) : null,
    winner: match ? winnerSide(match) : null,
    backHref: match ? backHref(match) : "/",
    backLabel: match ? backLabel(match) : "Home",
    canUndo: history.length >= 2,
    isLoading: isTournamentsLoading,
    handleAddPoint,
    handleDeductPoint,
    handleUndo,
    handleOpenCompleteDialog,
    handleCompleteMatch,
    showCompleteDialog,
    setShowCompleteDialog,
    isCompleting,
    completeError,
  };
};
