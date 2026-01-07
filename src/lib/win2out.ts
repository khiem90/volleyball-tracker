import type { Match, Win2OutState, Win2OutTeamStatus } from "@/types/game";

/**
 * Initialize Win 2 & Out state for a competition.
 * First two teams play, rest wait in queue.
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
 * Returns updated state and optionally the next match to create.
 */
export const processMatchResult = (
  state: Win2OutState,
  completedMatch: Match
): {
  updatedState: Win2OutState;
  nextMatch: Omit<Match, "id" | "createdAt"> | null;
  champions: string[]; // Team IDs that won 2 and are out
} => {
  const winnerId = completedMatch.winnerId;
  const loserId =
    completedMatch.homeTeamId === winnerId
      ? completedMatch.awayTeamId
      : completedMatch.homeTeamId;

  if (!winnerId || !loserId) {
    throw new Error("Match must have a winner");
  }

  const champions: string[] = [];

  // Update team statuses
  const updatedStatuses = state.teamStatuses.map((status) => {
    if (status.teamId === winnerId) {
      const newStreak = status.winStreak + 1;
      const isChampion = newStreak >= 2;

      if (isChampion) {
        champions.push(status.teamId);
      }

      return {
        ...status,
        winStreak: newStreak,
        matchesPlayed: status.matchesPlayed + 1,
        isEliminated: isChampion,
        eliminationReason: isChampion ? ("champion" as const) : undefined,
        eliminatedAt: isChampion ? Date.now() : undefined,
      };
    }

    if (status.teamId === loserId) {
      return {
        ...status,
        winStreak: 0,
        matchesPlayed: status.matchesPlayed + 1,
        isEliminated: true,
        eliminationReason: "lost" as const,
        eliminatedAt: Date.now(),
      };
    }

    return status;
  });

  // Determine who stays on court
  const winnerStatus = updatedStatuses.find((s) => s.teamId === winnerId)!;
  const winnerIsChampion = winnerStatus.isEliminated;

  // Get next team from queue
  const queue = [...state.queue];
  const nextChallengerId = queue.shift();

  // Determine the current champion (team on court)
  let currentChampionId: string | undefined;
  let nextMatch: Omit<Match, "id" | "createdAt"> | null = null;

  if (winnerIsChampion) {
    // Winner is out (won 2), next two from queue play
    if (queue.length > 0 && nextChallengerId) {
      // Next challenger becomes the "champion" position
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

  // Check if competition is complete
  const remainingTeams = updatedStatuses.filter((s) => !s.isEliminated);
  const isComplete = remainingTeams.length <= 1 && queue.length === 0;

  // If only one team left and no one in queue, they're the final champion
  if (isComplete && remainingTeams.length === 1) {
    const finalChampion = remainingTeams[0];
    const finalIndex = updatedStatuses.findIndex(
      (s) => s.teamId === finalChampion.teamId
    );
    updatedStatuses[finalIndex] = {
      ...finalChampion,
      isEliminated: true,
      eliminationReason: "champion",
      eliminatedAt: Date.now(),
    };
    champions.push(finalChampion.teamId);
  }

  return {
    updatedState: {
      ...state,
      teamStatuses: updatedStatuses,
      queue,
      currentChampionId,
      isComplete,
    },
    nextMatch,
    champions,
  };
};

/**
 * Get teams grouped by their status.
 */
export const getTeamsByStatus = (state: Win2OutState) => {
  const champions = state.teamStatuses.filter(
    (s) => s.isEliminated && s.eliminationReason === "champion"
  );
  const eliminated = state.teamStatuses.filter(
    (s) => s.isEliminated && s.eliminationReason === "lost"
  );
  const inQueue = state.teamStatuses.filter(
    (s) => !s.isEliminated && state.queue.includes(s.teamId)
  );
  const onCourt = state.teamStatuses.filter(
    (s) => !s.isEliminated && !state.queue.includes(s.teamId)
  );

  return { champions, eliminated, inQueue, onCourt };
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

