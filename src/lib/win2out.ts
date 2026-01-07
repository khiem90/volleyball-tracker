import type { Match, Win2OutState, Win2OutTeamStatus, Win2OutCourt } from "@/types/game";

/**
 * Initialize Win 2 & Out state for a competition.
 * Supports multiple courts running simultaneously.
 * TRUE ENDLESS MODE - everyone goes back to queue, champions behind losers.
 */
export const initializeWin2OutState = (
  competitionId: string,
  teamIds: string[],
  numberOfCourts: number = 1
): Win2OutState => {
  // Need at least 2 teams per court
  const minTeams = numberOfCourts * 2;
  if (teamIds.length < minTeams) {
    throw new Error(`Win 2 & Out with ${numberOfCourts} court(s) requires at least ${minTeams} teams`);
  }

  // Clamp courts to maximum possible
  const maxCourts = Math.floor(teamIds.length / 2);
  const actualCourts = Math.min(numberOfCourts, maxCourts);

  const teamStatuses: Win2OutTeamStatus[] = teamIds.map((teamId) => ({
    teamId,
    winStreak: 0,
    isEliminated: false,
    matchesPlayed: 0,
    currentCourt: undefined,
  }));

  // Assign teams to courts
  const courts: Win2OutCourt[] = [];
  let teamIndex = 0;

  for (let courtNum = 1; courtNum <= actualCourts; courtNum++) {
    const team1 = teamIds[teamIndex];
    const team2 = teamIds[teamIndex + 1];
    
    courts.push({
      courtNumber: courtNum,
      teamIds: [team1, team2],
      currentChampionId: undefined, // No champion yet on first match
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
    currentChampionId: undefined, // Legacy field
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
 * Process a completed match and update Win 2 & Out state.
 * Handles multi-court games independently per court.
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

  // Find which court this match was on
  const courtIndex = state.courts.findIndex(
    (c) => c.teamIds.includes(winnerId) && c.teamIds.includes(loserId)
  );

  if (courtIndex === -1) {
    throw new Error("Could not find court for this match");
  }

  const court = state.courts[courtIndex];
  const newChampions: string[] = [];

  // Check if winner just became a champion (won 2 in a row)
  const winnerPrevStatus = state.teamStatuses.find((s) => s.teamId === winnerId)!;
  const winnerBecameChampion = winnerPrevStatus.winStreak + 1 >= 2;

  if (winnerBecameChampion) {
    newChampions.push(winnerId);
  }

  // Update team statuses
  let updatedStatuses = state.teamStatuses.map((status) => {
    if (status.teamId === winnerId) {
      const newStreak = status.winStreak + 1;

      return {
        ...status,
        winStreak: winnerBecameChampion ? 0 : newStreak, // Reset streak if became champion
        matchesPlayed: status.matchesPlayed + 1,
        isEliminated: false,
        eliminationReason: undefined,
        // Use eliminatedAt to track total times crowned champion
        eliminatedAt: winnerBecameChampion ? (status.eliminatedAt || 0) + 1 : status.eliminatedAt,
        currentCourt: winnerBecameChampion ? undefined : status.currentCourt, // Goes to queue if champion
      };
    }

    if (status.teamId === loserId) {
      return {
        ...status,
        winStreak: 0,
        matchesPlayed: status.matchesPlayed + 1,
        currentCourt: undefined, // Loser goes to queue
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

  // Determine next match for this court
  let nextMatch: Omit<Match, "id" | "createdAt"> | null = null;
  let updatedCourts = [...state.courts];
  let newCourtTeamIds: [string, string] | null = null;
  let newCourtChampionId: string | undefined;

  if (winnerBecameChampion) {
    // Winner went to queue, pull two from queue
    const nextTeam1 = queue.shift();
    const nextTeam2 = queue.shift();

    if (nextTeam1 && nextTeam2) {
      newCourtTeamIds = [nextTeam1, nextTeam2];
      newCourtChampionId = undefined; // Fresh start, no champion

      // Update court assignments
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
      // Not enough teams in queue
      if (nextTeam1) queue.unshift(nextTeam1);
    }
  } else {
    // Winner stays, pull one challenger from queue
    const nextChallenger = queue.shift();

    if (nextChallenger) {
      newCourtTeamIds = [winnerId, nextChallenger];
      newCourtChampionId = winnerId; // Winner is the current champion on this court

      // Update court assignment for new challenger
      updatedStatuses = updatedStatuses.map((status) => {
        if (status.teamId === nextChallenger) {
          return { ...status, currentCourt: court.courtNumber };
        }
        return status;
      });

      nextMatch = {
        competitionId: state.competitionId,
        homeTeamId: winnerId,
        awayTeamId: nextChallenger,
        homeScore: 0,
        awayScore: 0,
        status: "pending",
        round: completedMatch.round + 1,
        position: court.courtNumber,
      };
    }
  }

  // Update the court
  if (newCourtTeamIds) {
    updatedCourts[courtIndex] = {
      ...court,
      teamIds: newCourtTeamIds,
      currentChampionId: newCourtChampionId,
    };
  } else {
    // Remove court if no teams available
    updatedCourts = updatedCourts.filter((_, i) => i !== courtIndex);
  }

  return {
    updatedState: {
      ...state,
      teamStatuses: updatedStatuses,
      queue,
      courts: updatedCourts,
      currentChampionId: newCourtChampionId, // Legacy field
      isComplete: false, // Never complete in endless mode
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

  // Teams on courts (not in queue)
  const onCourt = state.courts.flatMap((court) =>
    court.teamIds.map((teamId) => ({
      ...state.teamStatuses.find((s) => s.teamId === teamId)!,
      courtNumber: court.courtNumber,
      isChampionOnCourt: court.currentChampionId === teamId,
    }))
  ).filter(Boolean);

  return { championsData, inQueue, onCourt };
};

/**
 * Get the current champion's win streak on a specific court.
 */
export const getCurrentChampionStreak = (state: Win2OutState, courtNumber?: number): number => {
  if (courtNumber) {
    const court = state.courts.find((c) => c.courtNumber === courtNumber);
    if (!court?.currentChampionId) return 0;

    const champion = state.teamStatuses.find(
      (s) => s.teamId === court.currentChampionId
    );
    return champion?.winStreak || 0;
  }

  // Legacy: use first court or currentChampionId
  if (!state.currentChampionId && state.courts.length === 0) return 0;
  
  const championId = state.currentChampionId || state.courts[0]?.currentChampionId;
  if (!championId) return 0;

  const champion = state.teamStatuses.find((s) => s.teamId === championId);
  return champion?.winStreak || 0;
};

/**
 * Get total champion crowns for a team.
 */
export const getChampionCount = (state: Win2OutState, teamId: string): number => {
  const status = state.teamStatuses.find((s) => s.teamId === teamId);
  return status?.eliminatedAt || 0;
};

/**
 * Get court info for a specific team.
 */
export const getTeamCourt = (
  state: Win2OutState,
  teamId: string
): Win2OutCourt | null => {
  return state.courts.find((c) => c.teamIds.includes(teamId)) || null;
};
