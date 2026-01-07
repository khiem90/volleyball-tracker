import type { Match, TwoMatchRotationState, TwoMatchRotationTeamStatus, TwoMatchRotationCourt } from "@/types/game";

/**
 * Initialize Two Match Rotation state for a competition.
 * Supports multiple courts running simultaneously.
 * ENDLESS MODE - everyone goes back to queue after playing 2 matches (except first match loser per court).
 */
export const initializeTwoMatchRotationState = (
  competitionId: string,
  teamIds: string[],
  numberOfCourts: number = 1
): TwoMatchRotationState => {
  // Need at least 2 teams per court
  const minTeams = numberOfCourts * 2;
  if (teamIds.length < minTeams) {
    throw new Error(`Two Match Rotation with ${numberOfCourts} court(s) requires at least ${minTeams} teams`);
  }

  // Clamp courts to maximum possible
  const maxCourts = Math.floor(teamIds.length / 2);
  const actualCourts = Math.min(numberOfCourts, maxCourts);

  const teamStatuses: TwoMatchRotationTeamStatus[] = teamIds.map((teamId) => ({
    teamId,
    sessionMatches: 0,
    totalMatches: 0,
    totalWins: 0,
    totalLosses: 0,
    currentCourt: undefined,
  }));

  // Assign teams to courts
  const courts: TwoMatchRotationCourt[] = [];
  let teamIndex = 0;

  for (let courtNum = 1; courtNum <= actualCourts; courtNum++) {
    const team1 = teamIds[teamIndex];
    const team2 = teamIds[teamIndex + 1];
    
    courts.push({
      courtNumber: courtNum,
      teamIds: [team1, team2],
      isFirstMatch: true,
    });

    // Update team statuses to track which court they're on
    teamStatuses[teamIndex].currentCourt = courtNum;
    teamStatuses[teamIndex + 1].currentCourt = courtNum;
    
    teamIndex += 2;
  }

  // Remaining teams go to queue
  const queue = teamIds.slice(teamIndex);

  return {
    competitionId,
    teamStatuses,
    queue,
    courts,
    numberOfCourts: actualCourts,
    isComplete: false,
  };
};

/**
 * Generate initial matches for all courts.
 */
export const generateInitialMatches = (
  competitionId: string,
  teamIds: string[],
  numberOfCourts: number = 1
): Omit<Match, "id" | "createdAt">[] => {
  const matches: Omit<Match, "id" | "createdAt">[] = [];
  const maxCourts = Math.min(numberOfCourts, Math.floor(teamIds.length / 2));

  for (let i = 0; i < maxCourts; i++) {
    matches.push({
      competitionId,
      homeTeamId: teamIds[i * 2],
      awayTeamId: teamIds[i * 2 + 1],
      homeScore: 0,
      awayScore: 0,
      status: "pending",
      round: 1,
      position: i + 1, // Position indicates court number
    });
  }

  return matches;
};

/**
 * Legacy function for single court - generates first match only.
 */
export const generateFirstMatch = (
  competitionId: string,
  teamIds: string[]
): Omit<Match, "id" | "createdAt"> => {
  return generateInitialMatches(competitionId, teamIds, 1)[0];
};

/**
 * Process a completed match and update Two Match Rotation state.
 * Handles multi-court rotation independently per court.
 * 
 * RULES:
 * - First match per court: Winner stays (1 match played), loser goes to queue
 * - After first match: After playing 2 matches, team goes to back of queue
 * - Both teams in a match increment their session matches
 * - When going to queue, session matches resets
 */
export const processMatchResult = (
  state: TwoMatchRotationState,
  completedMatch: Match
): {
  updatedState: TwoMatchRotationState;
  nextMatch: Omit<Match, "id" | "createdAt"> | null;
} => {
  const winnerId = completedMatch.winnerId;
  const loserId =
    completedMatch.homeTeamId === winnerId
      ? completedMatch.awayTeamId
      : completedMatch.homeTeamId;

  if (!winnerId || !loserId) {
    throw new Error("Match must have a winner");
  }

  // Find which court this match was on
  const courtIndex = state.courts.findIndex(
    (c) => c.teamIds.includes(winnerId) && c.teamIds.includes(loserId)
  );

  if (courtIndex === -1) {
    throw new Error("Could not find court for this match");
  }

  const court = state.courts[courtIndex];
  const queue = [...state.queue];
  let updatedStatuses = [...state.teamStatuses];
  let updatedCourts = [...state.courts];

  // Update match counts and stats for both teams
  updatedStatuses = updatedStatuses.map((status) => {
    if (status.teamId === winnerId) {
      return {
        ...status,
        sessionMatches: status.sessionMatches + 1,
        totalMatches: status.totalMatches + 1,
        totalWins: status.totalWins + 1,
      };
    }
    if (status.teamId === loserId) {
      return {
        ...status,
        sessionMatches: status.sessionMatches + 1,
        totalMatches: status.totalMatches + 1,
        totalLosses: status.totalLosses + 1,
      };
    }
    return status;
  });

  const winnerStatus = updatedStatuses.find((s) => s.teamId === winnerId)!;
  const loserStatus = updatedStatuses.find((s) => s.teamId === loserId)!;

  // Determine who stays and who goes to queue
  let stayingTeamId: string | null = null;
  const teamsToQueue: string[] = [];

  if (court.isFirstMatch) {
    // First match on this court: winner stays, loser goes to queue
    stayingTeamId = winnerId;
    teamsToQueue.push(loserId);
    
    // Reset loser's session matches and court
    updatedStatuses = updatedStatuses.map((status) => {
      if (status.teamId === loserId) {
        return { ...status, sessionMatches: 0, currentCourt: undefined };
      }
      return status;
    });
  } else {
    // After first match: 2 matches = go to queue
    const winnerMustRotate = winnerStatus.sessionMatches >= 2;
    const loserMustRotate = loserStatus.sessionMatches >= 2;

    if (winnerMustRotate) {
      teamsToQueue.push(winnerId);
      updatedStatuses = updatedStatuses.map((status) => {
        if (status.teamId === winnerId) {
          return { ...status, sessionMatches: 0, currentCourt: undefined };
        }
        return status;
      });
    } else {
      stayingTeamId = winnerId;
    }

    if (loserMustRotate) {
      teamsToQueue.push(loserId);
      updatedStatuses = updatedStatuses.map((status) => {
        if (status.teamId === loserId) {
          return { ...status, sessionMatches: 0, currentCourt: undefined };
        }
        return status;
      });
    } else if (!winnerMustRotate) {
      // If winner isn't rotating and loser isn't at 2 matches yet,
      // loser still goes to queue (normal flow)
      teamsToQueue.push(loserId);
      updatedStatuses = updatedStatuses.map((status) => {
        if (status.teamId === loserId) {
          return { ...status, sessionMatches: 0, currentCourt: undefined };
        }
        return status;
      });
    } else {
      // Winner is rotating, but loser hasn't played 2 yet - loser stays
      stayingTeamId = loserId;
    }
  }

  // Add teams to queue
  teamsToQueue.forEach((teamId) => queue.push(teamId));

  // Build next match for this court
  let nextMatch: Omit<Match, "id" | "createdAt"> | null = null;
  let newCourtTeamIds: [string, string] | null = null;

  if (stayingTeamId) {
    // One team stays, pull one from queue
    const nextChallenger = queue.shift();
    if (nextChallenger) {
      newCourtTeamIds = [stayingTeamId, nextChallenger];
      
      // Update the new challenger's court assignment
      updatedStatuses = updatedStatuses.map((status) => {
        if (status.teamId === nextChallenger) {
          return { ...status, currentCourt: court.courtNumber };
        }
        return status;
      });

      nextMatch = {
        competitionId: state.competitionId,
        homeTeamId: stayingTeamId,
        awayTeamId: nextChallenger,
        homeScore: 0,
        awayScore: 0,
        status: "pending",
        round: completedMatch.round + 1,
        position: court.courtNumber,
      };
    }
  } else {
    // Both teams rotated, pull two from queue
    const nextTeam1 = queue.shift();
    const nextTeam2 = queue.shift();
    if (nextTeam1 && nextTeam2) {
      newCourtTeamIds = [nextTeam1, nextTeam2];

      // Update court assignments for new teams
      updatedStatuses = updatedStatuses.map((status) => {
        if (status.teamId === nextTeam1 || status.teamId === nextTeam2) {
          return { ...status, currentCourt: court.courtNumber };
        }
        return status;
      });

      nextMatch = {
        competitionId: state.competitionId,
        homeTeamId: nextTeam1,
        awayTeamId: nextTeam2,
        homeScore: 0,
        awayScore: 0,
        status: "pending",
        round: completedMatch.round + 1,
        position: court.courtNumber,
      };
    } else {
      // Not enough teams in queue, put back if any
      if (nextTeam1) queue.unshift(nextTeam1);
    }
  }

  // Update the court
  if (newCourtTeamIds) {
    updatedCourts[courtIndex] = {
      ...court,
      teamIds: newCourtTeamIds,
      isFirstMatch: false, // No longer first match after initial
    };
  } else {
    // Remove court if no teams available (shouldn't happen in endless mode with enough teams)
    updatedCourts = updatedCourts.filter((_, i) => i !== courtIndex);
  }

  return {
    updatedState: {
      ...state,
      teamStatuses: updatedStatuses,
      queue,
      courts: updatedCourts,
      isComplete: false, // Never complete in endless mode
    },
    nextMatch,
  };
};

/**
 * Get teams grouped by their status.
 */
export const getTeamsByStatus = (state: TwoMatchRotationState) => {
  // Teams on courts (grouped by court)
  const onCourt = state.courts.flatMap((court) =>
    court.teamIds.map((teamId) => ({
      ...state.teamStatuses.find((s) => s.teamId === teamId)!,
      courtNumber: court.courtNumber,
      isFirstMatchOnCourt: court.isFirstMatch,
    }))
  ).filter(Boolean);

  const inQueue = state.queue
    .map((teamId) => state.teamStatuses.find((s) => s.teamId === teamId)!)
    .filter(Boolean);

  // Leaderboard sorted by wins, then by win rate
  const leaderboard = [...state.teamStatuses]
    .filter((s) => s.totalMatches > 0)
    .sort((a, b) => {
      if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;
      const aRate = a.totalMatches > 0 ? a.totalWins / a.totalMatches : 0;
      const bRate = b.totalMatches > 0 ? b.totalWins / b.totalMatches : 0;
      return bRate - aRate;
    });

  return { onCourt, inQueue, leaderboard };
};

/**
 * Get session match count for a specific team.
 */
export const getSessionMatchCount = (
  state: TwoMatchRotationState,
  teamId: string
): number => {
  const status = state.teamStatuses.find((s) => s.teamId === teamId);
  return status?.sessionMatches || 0;
};

/**
 * Get court info for a specific team.
 */
export const getTeamCourt = (
  state: TwoMatchRotationState,
  teamId: string
): TwoMatchRotationCourt | null => {
  return state.courts.find((c) => c.teamIds.includes(teamId)) || null;
};
