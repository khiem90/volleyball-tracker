import type { Match, PersistentTeam, Competition } from "@/types/game";

export interface RotationViewContext {
  getTeamName: (teamId: string) => string;
  getTeamColor: (teamId: string) => string;
  canEdit: boolean;
  canPlayMatch: boolean;
}

export interface ActiveCourtCardProps {
  match: Match;
  courtNumber: number;
  homeStreak?: number;
  awayStreak?: number;
  homeChampionCount?: number;
  awayChampionCount?: number;
  getTeamName: (teamId: string) => string;
  getTeamColor: (teamId: string) => string;
  canEdit: boolean;
  canPlayMatch: boolean;
  instantWinEnabled?: boolean;
  onMatchClick?: (match: Match) => void;
  onEditMatch?: (match: Match) => void;
  onInstantWin?: (winnerId: string) => void;
}

export interface TeamQueueSectionProps {
  queue: Array<{ teamId: string; championCount?: number }>;
  getTeamName: (teamId: string) => string;
  getTeamColor: (teamId: string) => string;
  canEdit: boolean;
  onEditQueue?: () => void;
}

export interface TeamLeaderboardProps {
  leaderboard: Array<{
    teamId: string;
    championCount: number;
    matchesPlayed: number;
  }>;
  getTeamName: (teamId: string) => string;
  getTeamColor: (teamId: string) => string;
  isTeamOnCourt: (teamId: string) => boolean;
}

export interface MatchHistorySectionProps {
  matches: Match[];
  getTeamName: (teamId: string) => string;
  getTeamColor: (teamId: string) => string;
}
