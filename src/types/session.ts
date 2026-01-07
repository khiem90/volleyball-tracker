import type { Competition, PersistentTeam, Match } from "./game";

// Session stored in Firestore
export interface Session {
  id: string;
  name: string;
  creatorId: string | null;      // null for anonymous creators
  adminToken: string;            // Secret token for admin access (hashed)
  adminIds: string[];            // User IDs with admin rights
  shareCode: string;             // Public share code (e.g., "ABC123")
  competition: Competition | null;
  teams: PersistentTeam[];
  matches: Match[];
  createdAt: number;
  updatedAt: number;
}

// User role in a session
export type SessionRole = "viewer" | "admin" | "creator";

// Session context for UI
export interface SessionContext {
  session: Session | null;
  role: SessionRole;
  isLoading: boolean;
  error: string | null;
}

// Auth state
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

// Admin token stored in localStorage for anonymous admin access
export interface StoredAdminToken {
  sessionId: string;
  token: string;
}

// Session summary saved after session ends (only creator can access)
export interface SessionSummary {
  id: string;
  name: string;
  creatorId: string | null;
  shareCode: string;              // For sharing the summary
  competition: Competition | null;
  teams: PersistentTeam[];
  matches: Match[];               // All matches (completed history)
  createdAt: number;              // When original session was created
  endedAt: number;                // When session was ended
  stats: SessionStats;            // Computed summary stats
}

// Summary statistics
export interface SessionStats {
  totalMatches: number;
  completedMatches: number;
  totalTeams: number;
  duration: number;               // Session duration in ms
  winner?: {
    teamId: string;
    teamName: string;
    wins: number;
  };
}

