import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Session, SessionRole, SessionSummary, SessionStats } from "@/types/session";
import type { Competition, PersistentTeam, Match } from "@/types/game";

// ============================================
// Constants
// ============================================
const SESSIONS_COLLECTION = "sessions";
const SUMMARIES_COLLECTION = "summaries";

// Generate a random share code (6 alphanumeric characters)
const generateShareCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars (0, O, 1, I)
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Generate a secure admin token (32 characters)
const generateAdminToken = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

// Generate a unique session ID
const generateSessionId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

const sanitizeForFirestore = <T>(value: T): T => {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    const cleaned = value
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined);
    return cleaned as T;
  }

  if (typeof value === "object") {
    if (value instanceof Date) {
      return value;
    }

    const cleanedEntries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, sanitizeForFirestore(entryValue)]);
    return Object.fromEntries(cleanedEntries) as T;
  }

  return value;
};

// ============================================
// Session CRUD Operations
// ============================================

/**
 * Create a new session in Firestore
 */
export const createSession = async (
  name: string,
  creatorId: string | null,
  competition: Competition | null = null,
  teams: PersistentTeam[] = [],
  matches: Match[] = []
): Promise<{ session: Session; adminToken: string }> => {
  if (!db) {
    throw new Error("Firebase is not configured");
  }

  const sessionId = generateSessionId();
  const shareCode = generateShareCode();
  const adminToken = generateAdminToken();

  const session: Session = {
    id: sessionId,
    name,
    creatorId,
    adminToken, // Store the plain token - in production, you'd want to hash this
    adminIds: creatorId ? [creatorId] : [],
    shareCode,
    competition,
    teams,
    matches,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const sanitizedSession = sanitizeForFirestore(session);
  await setDoc(doc(db, SESSIONS_COLLECTION, sessionId), sanitizedSession);

  return { session, adminToken };
};

/**
 * Get a session by ID
 */
export const getSessionById = async (sessionId: string): Promise<Session | null> => {
  if (!db) return null;
  
  const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as Session;
  }
  return null;
};

/**
 * Get a session by share code
 */
export const getSessionByShareCode = async (shareCode: string): Promise<Session | null> => {
  if (!db) return null;
  
  const q = query(
    collection(db, SESSIONS_COLLECTION),
    where("shareCode", "==", shareCode.toUpperCase())
  );
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].data() as Session;
  }
  return null;
};

/**
 * Update session data
 */
export const updateSession = async (
  sessionId: string,
  updates: Partial<Omit<Session, "id" | "shareCode" | "adminToken" | "createdAt">>
): Promise<void> => {
  if (!db) {
    throw new Error("Firebase is not configured");
  }
  
  const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
  const sanitizedUpdates = sanitizeForFirestore({
    ...updates,
    updatedAt: Date.now(),
  });
  await updateDoc(docRef, sanitizedUpdates);
};

/**
 * Update session competition
 */
export const updateSessionCompetition = async (
  sessionId: string,
  competition: Competition
): Promise<void> => {
  await updateSession(sessionId, { competition });
};

/**
 * Update session teams
 */
export const updateSessionTeams = async (
  sessionId: string,
  teams: PersistentTeam[]
): Promise<void> => {
  await updateSession(sessionId, { teams });
};

/**
 * Update session matches
 */
export const updateSessionMatches = async (
  sessionId: string,
  matches: Match[]
): Promise<void> => {
  await updateSession(sessionId, { matches });
};

/**
 * Update all session data at once (for batch updates)
 */
export const updateSessionData = async (
  sessionId: string,
  data: {
    competition?: Competition | null;
    teams?: PersistentTeam[];
    matches?: Match[];
  }
): Promise<void> => {
  await updateSession(sessionId, data);
};

/**
 * Delete a session
 */
export const deleteSession = async (sessionId: string): Promise<void> => {
  if (!db) {
    throw new Error("Firebase is not configured");
  }
  
  const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await deleteDoc(docRef);
};

/**
 * Grant admin access to a user
 */
export const grantAdminAccess = async (
  sessionId: string,
  userId: string
): Promise<void> => {
  if (!db) {
    throw new Error("Firebase is not configured");
  }
  
  const session = await getSessionById(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  if (!session.adminIds.includes(userId)) {
    await updateDoc(doc(db, SESSIONS_COLLECTION, sessionId), {
      adminIds: [...session.adminIds, userId],
      updatedAt: Date.now(),
    });
  }
};

/**
 * Revoke admin access from a user
 */
export const revokeAdminAccess = async (
  sessionId: string,
  userId: string
): Promise<void> => {
  if (!db) {
    throw new Error("Firebase is not configured");
  }
  
  const session = await getSessionById(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  // Can't revoke creator's access
  if (session.creatorId === userId) {
    throw new Error("Cannot revoke creator's admin access");
  }

  await updateDoc(doc(db, SESSIONS_COLLECTION, sessionId), {
    adminIds: session.adminIds.filter((id) => id !== userId),
    updatedAt: Date.now(),
  });
};

// ============================================
// Real-time Subscriptions
// ============================================

/**
 * Subscribe to real-time session updates
 */
export const subscribeToSession = (
  sessionId: string,
  callback: (session: Session | null) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  if (!db) {
    // Return a no-op unsubscribe function
    callback(null);
    return () => {};
  }
  
  const docRef = doc(db, SESSIONS_COLLECTION, sessionId);

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as Session);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error("Error subscribing to session:", error);
      if (onError) {
        onError(error);
      }
    }
  );
};

/**
 * Subscribe to session by share code
 */
export const subscribeToSessionByShareCode = (
  shareCode: string,
  callback: (session: Session | null) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  if (!db) {
    // Return a no-op unsubscribe function
    callback(null);
    return () => {};
  }
  
  const q = query(
    collection(db, SESSIONS_COLLECTION),
    where("shareCode", "==", shareCode.toUpperCase())
  );

  return onSnapshot(
    q,
    (querySnapshot) => {
      if (!querySnapshot.empty) {
        callback(querySnapshot.docs[0].data() as Session);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error("Error subscribing to session by share code:", error);
      if (onError) {
        onError(error);
      }
    }
  );
};

// ============================================
// Permission Helpers
// ============================================

/**
 * Check if a user has admin access to a session
 */
export const hasAdminAccess = (
  session: Session,
  userId: string | null,
  adminToken: string | null
): boolean => {
  // Check if user is in admin list
  if (userId && session.adminIds.includes(userId)) {
    return true;
  }

  // Check if user is the creator
  if (userId && session.creatorId === userId) {
    return true;
  }

  // Check admin token for anonymous access
  if (adminToken && session.adminToken === adminToken) {
    return true;
  }

  return false;
};

/**
 * Get user's role in a session
 */
export const getSessionRole = (
  session: Session,
  userId: string | null,
  adminToken: string | null
): SessionRole => {
  // Check if user is the creator
  if (userId && session.creatorId === userId) {
    return "creator";
  }

  // Check if user has admin access
  if (hasAdminAccess(session, userId, adminToken)) {
    return "admin";
  }

  return "viewer";
};

/**
 * Validate admin token
 */
export const validateAdminToken = (session: Session, token: string): boolean => {
  return session.adminToken === token;
};

// ============================================
// Session URL Helpers
// ============================================

/**
 * Get the shareable URL for a session
 */
export const getSessionUrl = (shareCode: string): string => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/session/${shareCode}`;
  }
  return `/session/${shareCode}`;
};

/**
 * Get the admin URL for a session (includes admin token)
 */
export const getAdminUrl = (shareCode: string, adminToken: string): string => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/session/${shareCode}?admin=${adminToken}`;
  }
  return `/session/${shareCode}?admin=${adminToken}`;
};

// ============================================
// Session Summary Functions
// ============================================

/**
 * Compute stats from session data
 */
const computeSessionStats = (
  session: Session
): SessionStats => {
  const matches = session.matches || [];
  const teams = session.teams || [];
  const completedMatches = matches.filter((m) => m.status === "completed");

  // Count wins per team
  const winsPerTeam: Record<string, number> = {};
  completedMatches.forEach((match) => {
    if (match.winnerId) {
      winsPerTeam[match.winnerId] = (winsPerTeam[match.winnerId] || 0) + 1;
    }
  });

  // Find the team with most wins
  let winner: SessionStats["winner"] | undefined;
  let maxWins = 0;
  Object.entries(winsPerTeam).forEach(([teamId, wins]) => {
    if (wins > maxWins) {
      maxWins = wins;
      const team = teams.find((t) => t.id === teamId);
      winner = {
        teamId,
        teamName: team?.name || "Unknown Team",
        wins,
      };
    }
  });

  return {
    totalMatches: matches.length,
    completedMatches: completedMatches.length,
    totalTeams: teams.length,
    duration: Date.now() - session.createdAt,
    winner,
  };
};

/**
 * Create a session summary (called when ending a session)
 */
export const createSessionSummary = async (
  session: Session
): Promise<SessionSummary> => {
  if (!db) {
    throw new Error("Firebase is not configured");
  }

  const summaryId = `summary-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  const shareCode = generateShareCode();
  const stats = computeSessionStats(session);

  const summary: SessionSummary = {
    id: summaryId,
    name: session.name,
    creatorId: session.creatorId,
    shareCode,
    competition: session.competition,
    teams: session.teams,
    matches: session.matches,
    createdAt: session.createdAt,
    endedAt: Date.now(),
    stats,
  };

  const sanitizedSummary = sanitizeForFirestore(summary);
  await setDoc(doc(db, SUMMARIES_COLLECTION, summaryId), sanitizedSummary);

  return summary;
};

/**
 * Get a summary by ID
 */
export const getSummaryById = async (
  summaryId: string
): Promise<SessionSummary | null> => {
  if (!db) return null;

  const docRef = doc(db, SUMMARIES_COLLECTION, summaryId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as SessionSummary;
  }
  return null;
};

/**
 * Get a summary by share code
 */
export const getSummaryByShareCode = async (
  shareCode: string
): Promise<SessionSummary | null> => {
  if (!db) return null;

  const q = query(
    collection(db, SUMMARIES_COLLECTION),
    where("shareCode", "==", shareCode.toUpperCase())
  );
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].data() as SessionSummary;
  }
  return null;
};

/**
 * Get all summaries for a creator
 */
export const getCreatorSummaries = async (
  creatorId: string
): Promise<SessionSummary[]> => {
  if (!db) return [];

  const q = query(
    collection(db, SUMMARIES_COLLECTION),
    where("creatorId", "==", creatorId)
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => doc.data() as SessionSummary);
};

/**
 * Delete a summary (only creator can delete)
 */
export const deleteSummary = async (summaryId: string): Promise<void> => {
  if (!db) {
    throw new Error("Firebase is not configured");
  }

  const docRef = doc(db, SUMMARIES_COLLECTION, summaryId);
  await deleteDoc(docRef);
};

/**
 * Get the shareable URL for a summary
 */
export const getSummaryUrl = (shareCode: string): string => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/summary/${shareCode}`;
  }
  return `/summary/${shareCode}`;
};

