import type { Match, Win2OutState, Win2OutTeamStatus } from "@/types/game";

/**
 * Initialize Win 2 & Out state for a competition.
 * First two teams play, rest wait in queue.
 * TRUE ENDLESS MODE - everyone goes back to queue, champions behind losers.
 */
export const initializeWin2OutState = (
  competitionId: string,
  teamIds: string[]
): Win2OutState => {
  if (teamIds.length < 2) {
    throw new Error("Win 2 & Out requires at least 2 teams");
  }

  const teamStatuses: Win2OutTeamStatus[] = teamIds.map((teamId) => ({
    teamId,
    winStreak: 0,
    isEliminated: false,
    matchesPlayed: 0,
  }));

  // First two teams play, rest in queue
  const queue = teamIds.slice(2);

  return {
    competitionId,
    teamStatuses,
    queue,
    currentChampionId: undefined,
    isComplete: false,
  };
};

/**
 * Generate the first match for Win 2 & Out.
 */
export const generateFirstMatch = (
  competitionId: string,
  teamIds: string[]
): Omit<Match, "id" | "createdAt"> => {
  return {
    competitionId,
    homeTeamId: teamIds[0],
    awayTeamId: teamIds[1],
    homeScore: 0,
    awayScore: 0,
    status: "pending",
    round: 1,
    position: 1,
  };
};

/**
 * Process a completed match and update Win 2 & Out state.
 * TRUE ENDLESS MODE:
 * - Loser always goes to back of queue
 * - Winner stays unless they won 2 in a row
 * - If winner won 2 in a row (champion), they also go to queue BUT behind the loser
 * - Champion's streak resets when they go to queue
 */
export const processMatchResult = (
  state: Win2OutState,
  completedMatch: Match
): {
  updatedState: Win2OutState;
  nextMatch: Omit<Match, "id" | "createdAt"> | null;
  newChampions: string[]; // Team IDs that just won 2 in a row
} => {
  const winnerId = completedMatch.winnerId;
  const loserId =
    completedMatch.homeTeamId === winnerId
      ? completedMatch.awayTeamId
      : completedMatch.homeTeamId;

  if (!winnerId || !loserId) {
    throw new Error("Match must have a winner");
  }

  const newChampions: string[] = [];

  // Check if winner just became a champion (won 2 in a row)
  const winnerPrevStatus = state.teamStatuses.find((s) => s.teamId === winnerId)!;
  const winnerBecameChampion = winnerPrevStatus.winStreak + 1 >= 2;

  if (winnerBecameChampion) {
    newChampions.push(winnerId);
  }

  // Update team statuses
  const updatedStatuses = state.teamStatuses.map((status) => {
    if (status.teamId === winnerId) {
      const newStreak = status.winStreak + 1;
      const championCount = winnerBecameChampion 
        ? (status.eliminatedAt ? 1 : 0) + 1  // Track champion count in a hacky way
        : (status.eliminatedAt ? 1 : 0);

      return {
        ...status,
        winStreak: winnerBecameChampion ? 0 : newStreak, // Reset streak if became champion
        matchesPlayed: status.matchesPlayed + 1,
        // Never truly eliminated in endless mode
        isEliminated: false,
        eliminationReason: undefined,
        // Use eliminatedAt to track total times crowned champion
        eliminatedAt: winnerBecameChampion ? (status.eliminatedAt || 0) + 1 : status.eliminatedAt,
      };
    }

    if (status.teamId === loserId) {
      return {
        ...status,
        winStreak: 0,
        matchesPlayed: status.matchesPlayed + 1,
      };
    }

    return status;
  });

  // Build new queue
  const queue = [...state.queue];
  
  // Loser goes to back of queue first
  queue.push(loserId);
  
  // If winner became champion, they go behind the loser
  if (winnerBecameChampion) {
    queue.push(winnerId);
  }
  
  // Get next two from front of queue for the next match
  const nextChallengerId = queue.shift();

  // Determine the current champion (team on court)
  let currentChampionId: string | undefined;
  let nextMatch: Omit<Match, "id" | "createdAt"> | null = null;

  if (winnerBecameChampion) {
    // Winner went to queue, next two from queue play
    if (nextChallengerId) {
      currentChampionId = nextChallengerId;
      const secondChallengerId = queue.shift();

      if (secondChallengerId) {
        nextMatch = {
          competitionId: state.competitionId,
          homeTeamId: nextChallengerId,
          awayTeamId: secondChallengerId,
          homeScore: 0,
          awayScore: 0,
          status: "pending",
          round: completedMatch.round + 1,
          position: 1,
        };
      }
    }
  } else {
    // Winner stays, faces next challenger
    currentChampionId = winnerId;

    if (nextChallengerId) {
      nextMatch = {
        competitionId: state.competitionId,
        homeTeamId: winnerId,
        awayTeamId: nextChallengerId,
        homeScore: 0,
        awayScore: 0,
        status: "pending",
        round: completedMatch.round + 1,
        position: 1,
      };
    }
  }

  // Never complete in true endless mode
  const isComplete = false;

  return {
    updatedState: {
      ...state,
      teamStatuses: updatedStatuses,
      queue,
      currentChampionId,
      isComplete,
    },
    nextMatch,
    newChampions,
  };
};

/**
 * Get teams grouped by their status.
 */
export const getTeamsByStatus = (state: Win2OutState) => {
  // In endless mode, use eliminatedAt as champion count
  const championsData = state.teamStatuses
    .filter((s) => s.eliminatedAt && s.eliminatedAt > 0)
    .map((s) => ({
      ...s,
      championCount: s.eliminatedAt || 0,
    }))
    .sort((a, b) => b.championCount - a.championCount);

  const inQueue = state.queue.map((teamId) => 
    state.teamStatuses.find((s) => s.teamId === teamId)!
  ).filter(Boolean);

  const onCourt = state.teamStatuses.filter(
    (s) => !state.queue.includes(s.teamId)
  );

  return { championsData, inQueue, onCourt };
};

/**
 * Get the current champion's win streak.
 */
export const getCurrentChampionStreak = (state: Win2OutState): number => {
  if (!state.currentChampionId) return 0;

  const champion = state.teamStatuses.find(
    (s) => s.teamId === state.currentChampionId
  );
  return champion?.winStreak || 0;
};

/**
 * Get total champion crowns for a team.
 */
export const getChampionCount = (state: Win2OutState, teamId: string): number => {
  const status = state.teamStatuses.find((s) => s.teamId === teamId);
  return status?.eliminatedAt || 0;
};
