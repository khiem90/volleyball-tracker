import type { Match, MatchProgress, RotationUndoRecord } from "@/types/game";

/**
 * Undo for the rotation formats. Win 2 & Out and Two Match Rotation keep
 * different team statuses and court records, but both move teams between one
 * shared queue and numbered courts, and that is all undo needs to know. The
 * helpers here work on that common shape and leave the format libraries
 * untouched.
 */

export interface TeamStatusLike {
  teamId: string;
}

export interface CourtLike {
  courtNumber: number;
  teamIds: [string, string];
}

export interface RotationStateLike<
  TeamStatus extends TeamStatusLike = TeamStatusLike,
  Court extends CourtLike = CourtLike,
> {
  teamStatuses: TeamStatus[];
  queue: string[];
  courts: Court[];
  undoRecords?: RotationUndoRecord<TeamStatus, Court>[];
}

export type UndoRecord = RotationUndoRecord<TeamStatusLike, CourtLike>;

/** How many results per court stay undoable. Matches the depth of the undo toast. */
export const UNDO_DEPTH = 5;

const playedOn = (court: CourtLike, match: Match): boolean =>
  court.teamIds.includes(match.homeTeamId) && court.teamIds.includes(match.awayTeamId);

const latestOnCourt = (
  records: UndoRecord[],
  courtNumber: number,
): UndoRecord | undefined => {
  const onCourt = records.filter((r) => r.court.courtNumber === courtNumber);
  return onCourt[onCourt.length - 1];
};

/**
 * Compare the state before a result with the state after it and keep what
 * moved as the court's newest undo record. Each court keeps its last few
 * records, oldest first, so results can be undone one at a time in reverse.
 */
export const recordResult = <State extends RotationStateLike>(
  before: State,
  after: State,
  completed: Match,
  previous: MatchProgress,
  nextMatch: Match | null,
): State => {
  const court = before.courts.find((c) => playedOn(c, completed));
  if (!court) return after;

  const wasQueued = new Set(before.queue);
  const isQueued = new Set(after.queue);
  const fromQueue = before.queue.filter((teamId) => !isQueued.has(teamId));
  const toQueue = after.queue.filter((teamId) => !wasQueued.has(teamId));
  const touched = new Set([completed.homeTeamId, completed.awayTeamId, ...fromQueue]);

  const record: UndoRecord = {
    matchId: completed.id,
    ...(nextMatch ? { nextMatchId: nextMatch.id } : {}),
    court,
    toQueue,
    fromQueue,
    teamStatuses: before.teamStatuses.filter((s) => touched.has(s.teamId)),
    match: {
      status: previous.status,
      homeScore: previous.homeScore,
      awayScore: previous.awayScore,
    },
  };
  const kept = after.undoRecords ?? [];
  const onThisCourt = kept.filter((r) => r.court.courtNumber === court.courtNumber);
  const dropped = new Set(onThisCourt.slice(0, Math.max(0, onThisCourt.length - (UNDO_DEPTH - 1))));
  return { ...after, undoRecords: [...kept.filter((r) => !dropped.has(r)), record] };
};

/**
 * Whether a recorded result can still be undone: it is the court's latest,
 * the teams it sent to the queue are still waiting there, and the court is
 * still on the match the result scheduled, or still empty when it scheduled
 * none.
 */
export const canUndo = (
  state: RotationStateLike,
  record: UndoRecord,
  nextMatch: Match | undefined,
): boolean => {
  const { courtNumber } = record.court;
  if (latestOnCourt(state.undoRecords ?? [], courtNumber)?.matchId !== record.matchId) return false;
  if (!record.toQueue.every((teamId) => state.queue.includes(teamId))) return false;
  const court = state.courts.find((c) => c.courtNumber === courtNumber);
  if (!nextMatch) return court === undefined;
  return court !== undefined && playedOn(court, nextMatch);
};

/** Put the state back as it stood before the recorded result. */
export const applyUndo = <State extends RotationStateLike>(
  state: State,
  record: UndoRecord,
): State => {
  const leaving = new Set(record.toQueue);
  const queue = [...record.fromQueue, ...state.queue.filter((teamId) => !leaving.has(teamId))];

  const restored = new Map(record.teamStatuses.map((s) => [s.teamId, s]));
  const teamStatuses = state.teamStatuses.map((s) => restored.get(s.teamId) ?? s);

  const { courtNumber } = record.court;
  const courts = state.courts.some((c) => c.courtNumber === courtNumber)
    ? state.courts.map((c) => (c.courtNumber === courtNumber ? record.court : c))
    : [...state.courts, record.court].sort((a, b) => a.courtNumber - b.courtNumber);

  const undoRecords = (state.undoRecords ?? []).filter((r) => r.matchId !== record.matchId);

  return { ...state, queue, teamStatuses, courts, undoRecords };
};
