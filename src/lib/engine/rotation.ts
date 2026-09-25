import type {
  Match,
  MatchProgress,
  RotationUndoRecord,
  TwoMatchRotationState,
  Win2OutState,
} from "@/types/game";

/**
 * The rotation formats' shared shape. Win 2 & Out and Two Match Rotation
 * keep different team statuses and court records, but both move teams
 * between one shared queue and numbered courts, and that is all undo and
 * the management commands need to know. The helpers here work on that
 * common shape and leave the format libraries untouched.
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
  /** How many courts the tournament runs. Courts in play never exceed it. */
  numberOfCourts: number;
  undoRecords?: RotationUndoRecord<TeamStatus, Court>[];
}

type StatusOf<State extends RotationStateLike> = State["teamStatuses"][number];
type CourtOf<State extends RotationStateLike> = State["courts"][number];

// ============================================
// Format rules
// ============================================

/**
 * What each format knows about its own statuses and courts, so the helpers
 * below can work on either format's state.
 */
export interface RotationRules<State extends RotationStateLike> {
  /** The status of a team that has just entered and not played. */
  newTeamStatus: (teamId: string) => StatusOf<State>;
  /** A team's status as it leaves a court for the queue: its run there is over. */
  queued: (status: StatusOf<State>) => StatusOf<State>;
  onCourt: (status: StatusOf<State>, court: number) => StatusOf<State>;
  /** A court opening with two teams from the queue and nothing played on it yet. */
  openCourt: (courtNumber: number, teamIds: [string, string]) => CourtOf<State>;
  /**
   * A court after a swap or a withdrawal changed who is on it. `statuses`
   * are the statuses of the two teams now on it, in `teamIds` order.
   */
  withTeams: (
    court: CourtOf<State>,
    teamIds: [string, string],
    statuses: [StatusOf<State>, StatusOf<State>],
  ) => CourtOf<State>;
}

/**
 * Win 2 & Out: a streak ends when a team leaves the court, and a court's
 * champion is whoever still holds one there.
 */
export const WIN2OUT_RULES: RotationRules<Win2OutState> = {
  newTeamStatus: (teamId) => ({ teamId, winStreak: 0, isEliminated: false, matchesPlayed: 0 }),
  queued: (status) => ({ ...status, winStreak: 0, currentCourt: undefined }),
  onCourt: (status, court) => ({ ...status, currentCourt: court }),
  openCourt: (courtNumber, teamIds) => ({ courtNumber, teamIds }),
  withTeams: (court, teamIds) => ({
    ...court,
    teamIds,
    currentChampionId:
      court.currentChampionId !== undefined && teamIds.includes(court.currentChampionId)
        ? court.currentChampionId
        : undefined,
  }),
};

/** Two Match Rotation: a team's two-match run resets when it leaves the court. */
export const TWO_MATCH_RULES: RotationRules<TwoMatchRotationState> = {
  newTeamStatus: (teamId) => ({
    teamId,
    sessionMatches: 0,
    totalMatches: 0,
    totalWins: 0,
    totalLosses: 0,
  }),
  queued: (status) => ({ ...status, sessionMatches: 0, currentCourt: undefined }),
  onCourt: (status, court) => ({ ...status, currentCourt: court }),
  openCourt: (courtNumber, teamIds) => ({ courtNumber, teamIds, isFirstMatch: true }),
  // A court's first match is the one whose winner stays no matter what. A
  // team arriving mid-run has had its first match elsewhere, so the court
  // moves on, and the team goes to the queue after its second as usual.
  withTeams: (court, teamIds, statuses) => ({
    ...court,
    teamIds,
    isFirstMatch: court.isFirstMatch && statuses.every((status) => status.sessionMatches === 0),
  }),
};

// ============================================
// Managing the queue and the courts
// ============================================

/** What a change to the courts means for the matches on them. */
export interface CourtEdits<Court extends CourtLike = CourtLike> {
  /** Courts that just opened with a fresh pairing and need a match. */
  opened: Court[];
  /** Courts whose pairing changed: their open match takes the new teams. */
  reteamed: Court[];
  /** Courts no longer in play: their open match goes. */
  closed: number[];
}

export interface RotationEdit<State extends RotationStateLike>
  extends CourtEdits<CourtOf<State>> {
  state: State;
}

const NO_EDITS: CourtEdits<never> = { opened: [], reteamed: [], closed: [] };

const byCourtNumber = (a: CourtLike, b: CourtLike) => a.courtNumber - b.courtNumber;

const withStatuses = <Status extends TeamStatusLike>(
  statuses: Status[],
  teamIds: string[],
  change: (status: Status) => Status,
): Status[] =>
  statuses.map((status) => (teamIds.includes(status.teamId) ? change(status) : status));

/** The statuses of a court's two teams, in the court's order. */
const statusesOn = <Status extends TeamStatusLike>(
  statuses: Status[],
  teamIds: [string, string],
): [Status, Status] => {
  const of = (teamId: string) => {
    const status = statuses.find((s) => s.teamId === teamId);
    if (!status) throw new Error(`No status for ${teamId}`);
    return status;
  };
  return [of(teamIds[0]), of(teamIds[1])];
};

/** The court a team is on, if it is on one. */
export const courtWith = <State extends RotationStateLike>(
  state: State,
  teamId: string,
): CourtOf<State> | undefined => state.courts.find((court) => court.teamIds.includes(teamId));

/**
 * Put a team at the back of the queue. A team new to the tournament gets a
 * fresh status; one that had withdrawn keeps its record and starts over.
 */
export const joinQueue = <State extends RotationStateLike>(
  state: State,
  rules: RotationRules<State>,
  teamId: string,
): State => {
  const known = state.teamStatuses.some((status) => status.teamId === teamId);
  return {
    ...state,
    teamStatuses: known
      ? withStatuses(state.teamStatuses, [teamId], rules.queued)
      : [...state.teamStatuses, rules.newTeamStatus(teamId)],
    queue: [...state.queue, teamId],
  };
};

/**
 * Open every court the tournament runs that is not in play, lowest number
 * first, for as long as the queue has two teams to put on it.
 */
export const fillCourts = <State extends RotationStateLike>(
  state: State,
  rules: RotationRules<State>,
): RotationEdit<State> => {
  const queue = [...state.queue];
  const courts = [...state.courts];
  const opened: CourtOf<State>[] = [];
  let teamStatuses = state.teamStatuses;
  for (let number = 1; number <= state.numberOfCourts && queue.length >= 2; number++) {
    if (courts.some((court) => court.courtNumber === number)) continue;
    const teamIds: [string, string] = [queue[0], queue[1]];
    queue.splice(0, 2);
    const court = rules.openCourt(number, teamIds);
    courts.push(court);
    opened.push(court);
    teamStatuses = withStatuses(teamStatuses, teamIds, (status) => rules.onCourt(status, number));
  }
  return {
    ...NO_EDITS,
    state: { ...state, queue, courts: courts.sort(byCourtNumber), teamStatuses },
    opened,
  };
};

/**
 * Withdraw a team from play: off the queue, or off its court. A court that
 * loses a team takes the next team from the queue in its place and its
 * match starts over; with nobody waiting the court closes and the team left
 * on it goes to the front of the queue. Results the team took part in can
 * no longer be undone, nor can the court's.
 */
export const withdrawTeam = <State extends RotationStateLike>(
  state: State,
  rules: RotationRules<State>,
  teamId: string,
): RotationEdit<State> => {
  const court = courtWith(state, teamId);
  const gone: State = {
    ...state,
    queue: state.queue.filter((id) => id !== teamId),
    teamStatuses: withStatuses(state.teamStatuses, [teamId], rules.queued),
    undoRecords: forgetRecords(
      state.undoRecords,
      (record) =>
        mentions(record, teamId) || (court !== undefined && onCourt(record, court.courtNumber)),
    ),
  };
  if (!court) return { ...NO_EDITS, state: gone };

  const other = court.teamIds[0] === teamId ? court.teamIds[1] : court.teamIds[0];
  const [next, ...waiting] = gone.queue;
  if (next === undefined) {
    return {
      ...NO_EDITS,
      state: {
        ...gone,
        courts: gone.courts.filter((c) => c.courtNumber !== court.courtNumber),
        queue: [other],
        teamStatuses: withStatuses(gone.teamStatuses, [other], rules.queued),
      },
      closed: [court.courtNumber],
    };
  }
  const teamIds: [string, string] = court.teamIds[0] === teamId ? [next, other] : [other, next];
  const teamStatuses = withStatuses(gone.teamStatuses, [next], (status) =>
    rules.onCourt(status, court.courtNumber),
  );
  const reteamed = rules.withTeams(court, teamIds, statusesOn(teamStatuses, teamIds));
  return {
    ...NO_EDITS,
    state: {
      ...gone,
      courts: gone.courts.map((c) => (c.courtNumber === court.courtNumber ? reteamed : c)),
      queue: waiting,
      teamStatuses,
    },
    reteamed: [reteamed],
  };
};

/**
 * Set how many courts the tournament runs. Courts above the new number
 * close, their teams going to the front of the queue in court order, their
 * runs over; courts below it that are not in play open from the queue.
 * Results on the closed courts, and results the displaced teams took part
 * in, can no longer be undone.
 */
export const setCourts = <State extends RotationStateLike>(
  state: State,
  rules: RotationRules<State>,
  numberOfCourts: number,
): RotationEdit<State> => {
  const closing = state.courts
    .filter((court) => court.courtNumber > numberOfCourts)
    .sort(byCourtNumber);
  const closed = closing.map((court) => court.courtNumber);
  const displaced = closing.flatMap((court) => court.teamIds);
  const trimmed: State = {
    ...state,
    numberOfCourts,
    courts: state.courts.filter((court) => court.courtNumber <= numberOfCourts),
    queue: [...displaced, ...state.queue],
    teamStatuses: withStatuses(state.teamStatuses, displaced, rules.queued),
    undoRecords: forgetRecords(
      state.undoRecords,
      (record) =>
        closed.includes(record.court.courtNumber) ||
        displaced.some((teamId) => mentions(record, teamId)),
    ),
  };
  return { ...fillCourts(trimmed, rules), closed };
};

/**
 * Swap two teams' places: between two courts, or between a court and the
 * queue. A team keeps its run when it goes to another court, and starts
 * over when it goes to the queue. Results the two teams took part in, and
 * the last result on each court touched, can no longer be undone.
 */
export const swapPlaces = <State extends RotationStateLike>(
  state: State,
  rules: RotationRules<State>,
  teamId: string,
  withTeamId: string,
): RotationEdit<State> => {
  const courtA = courtWith(state, teamId);
  const courtB = courtWith(state, withTeamId);
  const swapped = (id: string) => (id === teamId ? withTeamId : id === withTeamId ? teamId : id);

  // Each team takes the other's place: its court, or the queue.
  const placed = (status: StatusOf<State>, court: CourtLike | undefined) =>
    court ? rules.onCourt(status, court.courtNumber) : rules.queued(status);
  const teamStatuses = state.teamStatuses.map((status) =>
    status.teamId === teamId
      ? placed(status, courtB)
      : status.teamId === withTeamId
        ? placed(status, courtA)
        : status,
  );

  const reteamed: CourtOf<State>[] = [];
  const courts = state.courts.map((court) => {
    if (court !== courtA && court !== courtB) return court;
    const teamIds: [string, string] = [swapped(court.teamIds[0]), swapped(court.teamIds[1])];
    const next = rules.withTeams(court, teamIds, statusesOn(teamStatuses, teamIds));
    reteamed.push(next);
    return next;
  });

  const touched = [courtA, courtB].flatMap((court) => (court ? [court.courtNumber] : []));
  return {
    ...NO_EDITS,
    state: {
      ...state,
      courts,
      queue: state.queue.map(swapped),
      teamStatuses,
      undoRecords: forgetRecords(
        state.undoRecords,
        (record) =>
          touched.includes(record.court.courtNumber) ||
          mentions(record, teamId) ||
          mentions(record, withTeamId),
      ),
    },
    reteamed,
  };
};

/**
 * Move a waiting team to a place in the queue, counted from the front. A
 * place past either end puts the team first or last. Nothing on the courts
 * changes, and the last result on each court stays undoable.
 */
export const moveInQueue = <State extends RotationStateLike>(
  state: State,
  teamId: string,
  position: number,
): RotationEdit<State> => {
  const queue = state.queue.filter((id) => id !== teamId);
  queue.splice(Math.max(0, Math.min(position, queue.length)), 0, teamId);
  return { ...NO_EDITS, state: { ...state, queue } };
};

// ============================================
// Undo
// ============================================

export type UndoRecord = RotationUndoRecord<TeamStatusLike, CourtLike>;

const mentions = (record: UndoRecord, teamId: string): boolean =>
  record.court.teamIds.includes(teamId) ||
  record.toQueue.includes(teamId) ||
  record.fromQueue.includes(teamId) ||
  record.teamStatuses.some((status) => status.teamId === teamId);

const onCourt = (record: UndoRecord, courtNumber: number): boolean =>
  record.court.courtNumber === courtNumber;

/** Drop the undo records a management edit has made unsafe to replay. */
const forgetRecords = <Record extends UndoRecord>(
  records: Record[] | undefined,
  unsafe: (record: Record) => boolean,
): Record[] | undefined => records?.filter((record) => !unsafe(record));

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
