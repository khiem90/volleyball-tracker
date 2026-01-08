"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import {
  createSession,
  getSessionByShareCode,
  updateSessionData,
  subscribeToSession,
  getSessionRole,
  hasAdminAccess,
  validateAdminToken,
  getSessionUrl,
  getAdminUrl,
  deleteSession,
  createSessionSummary,
} from "@/lib/sessions";

// LocalStorage key for persisting session
const SESSION_STORAGE_KEY = "volleyball_tracker_session";
import type { Session, SessionRole, SessionSummary } from "@/types/session";
import type { Competition, PersistentTeam, Match } from "@/types/game";

// ============================================
// Context Types
// ============================================
interface SessionContextValue {
  // Session state
  session: Session | null;
  role: SessionRole;
  isLoading: boolean;
  error: string | null;
  isSharedMode: boolean;
  
  // Session management
  createNewSession: (name: string, data?: { competition?: Competition | null; teams?: PersistentTeam[]; matches?: Match[] }) => Promise<{ shareCode: string; adminToken: string }>;
  joinSession: (shareCode: string) => Promise<boolean>;
  leaveSession: () => void;
  endSession: () => Promise<SessionSummary | null>; // Only creator can end session, returns summary
  
  // Admin token management
  applyAdminToken: (token: string) => boolean;
  
  // Data updates (only work if user has admin access)
  updateCompetition: (competition: Competition) => Promise<void>;
  updateTeams: (teams: PersistentTeam[]) => Promise<void>;
  updateMatches: (matches: Match[]) => Promise<void>;
  syncAllData: (data: { competition?: Competition | null; teams?: PersistentTeam[]; matches?: Match[] }) => Promise<void>;
  
  // URL helpers
  getShareUrl: () => string;
  getAdminShareUrl: () => string | null;
  
  // Permission check
  canEdit: boolean;
  isCreator: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

// ============================================
// Provider
// ============================================
interface SessionProviderProps {
  children: ReactNode;
}

export const SessionProvider = ({ children }: SessionProviderProps) => {
  const { user, getAdminToken, setAdminToken } = useAuth();
  
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<SessionRole>("viewer");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSharedMode, setIsSharedMode] = useState(false);
  const [currentAdminToken, setCurrentAdminToken] = useState<string | null>(null);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (storedSession) {
      try {
        const { shareCode } = JSON.parse(storedSession);
        if (shareCode && !session && !isLoading) {
          // Auto-rejoin the stored session
          joinSession(shareCode);
        }
      } catch (err) {
        // Invalid stored data, clear it
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Persist session to localStorage when it changes
  useEffect(() => {
    if (session && isSharedMode) {
      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ shareCode: session.shareCode, sessionId: session.id })
      );
    }
  }, [session, isSharedMode]);

  // Update role when session or user changes
  useEffect(() => {
    if (session) {
      const token = currentAdminToken || getAdminToken(session.id);
      const newRole = getSessionRole(session, user?.uid || null, token);
      setRole(newRole);
    } else {
      setRole("viewer");
    }
  }, [session, user, currentAdminToken, getAdminToken]);

  // Create a new session
  const createNewSession = useCallback(
    async (
      name: string,
      data?: { competition?: Competition | null; teams?: PersistentTeam[]; matches?: Match[] }
    ): Promise<{ shareCode: string; adminToken: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        const { session: newSession, adminToken } = await createSession(
          name,
          user?.uid || null,
          data?.competition || null,
          data?.teams || [],
          data?.matches || []
        );

        // Store admin token for anonymous access
        setAdminToken(newSession.id, adminToken);
        setCurrentAdminToken(adminToken);

        // Subscribe to session updates
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
        }

        unsubscribeRef.current = subscribeToSession(
          newSession.id,
          (updatedSession) => {
            if (updatedSession === null) {
              // Session was deleted
              setError("This session has been ended.");
              setSession(null);
              setIsSharedMode(false);
              localStorage.removeItem(SESSION_STORAGE_KEY);
            } else {
              setSession(updatedSession);
            }
          },
          (err) => {
            setError(err.message);
          }
        );

        setSession(newSession);
        setIsSharedMode(true);
        setRole("creator");

        return { shareCode: newSession.shareCode, adminToken };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create session";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [user, setAdminToken]
  );

  // Join an existing session by share code
  const joinSession = useCallback(
    async (shareCode: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const foundSession = await getSessionByShareCode(shareCode);

        if (!foundSession) {
          setError("Session not found");
          return false;
        }

        // Clean up previous subscription
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
        }

        // Check for stored admin token
        const storedToken = getAdminToken(foundSession.id);
        if (storedToken) {
          setCurrentAdminToken(storedToken);
        }

        // Subscribe to session updates
        unsubscribeRef.current = subscribeToSession(
          foundSession.id,
          (updatedSession) => {
            if (updatedSession === null) {
              // Session was deleted - notify the user
              setError("This session has been ended by the creator.");
              setSession(null);
              setIsSharedMode(false);
              localStorage.removeItem(SESSION_STORAGE_KEY);
            } else {
              setSession(updatedSession);
            }
          },
          (err) => {
            setError(err.message);
          }
        );

        setSession(foundSession);
        setIsSharedMode(true);

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to join session";
        setError(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [getAdminToken]
  );

  // Leave the current session (but don't delete it)
  const leaveSession = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Clear persisted session
    localStorage.removeItem(SESSION_STORAGE_KEY);

    setSession(null);
    setRole("viewer");
    setIsSharedMode(false);
    setCurrentAdminToken(null);
    setError(null);
  }, []);

  // End the session (save summary and delete from Firestore) - only creator can do this
  const endSession = useCallback(async (): Promise<SessionSummary | null> => {
    if (!session) {
      console.error("endSession: No session to end");
      return null;
    }

    // Only creator can end the session
    const canEnd = user?.uid === session.creatorId || 
      (currentAdminToken && session.adminToken === currentAdminToken && !session.creatorId);
    
    console.log("endSession check:", {
      userId: user?.uid,
      sessionCreatorId: session.creatorId,
      hasAdminToken: !!currentAdminToken,
      tokenMatches: currentAdminToken === session.adminToken,
      canEnd,
    });
    
    if (!canEnd) {
      setError("Only the session creator can end the session");
      return null;
    }

    try {
      // Unsubscribe first
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      // Save summary before deleting
      const summary = await createSessionSummary(session);

      // Delete from Firestore
      await deleteSession(session.id);

      // Clear local state
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setSession(null);
      setRole("viewer");
      setIsSharedMode(false);
      setCurrentAdminToken(null);
      setError(null);

      return summary;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to end session";
      setError(message);
      return null;
    }
  }, [session, user, currentAdminToken]);

  // Apply an admin token to gain admin access
  const applyAdminToken = useCallback(
    (token: string): boolean => {
      if (!session) return false;

      if (validateAdminToken(session, token)) {
        setAdminToken(session.id, token);
        setCurrentAdminToken(token);
        return true;
      }

      return false;
    },
    [session, setAdminToken]
  );

  // Check if user can edit
  const canEdit = role === "creator" || role === "admin";

  // Check if user is the creator
  // isCreator should match the logic in endSession - either:
  // 1. User is signed in and is the session creator, OR
  // 2. User has the admin token AND session was created anonymously (creatorId is null)
  const isCreator = useMemo(() => {
    if (!session) return false;
    // Signed-in user is the creator
    if (user?.uid && session.creatorId === user.uid) return true;
    // Anonymous creator with admin token
    if (currentAdminToken && session.adminToken === currentAdminToken && !session.creatorId) return true;
    return false;
  }, [session, user, currentAdminToken]);

  // Update competition data
  const updateCompetition = useCallback(
    async (competition: Competition): Promise<void> => {
      if (!session || !canEdit) {
        throw new Error("Not authorized to edit this session");
      }

      await updateSessionData(session.id, { competition });
    },
    [session, canEdit]
  );

  // Update teams data
  const updateTeams = useCallback(
    async (teams: PersistentTeam[]): Promise<void> => {
      if (!session || !canEdit) {
        throw new Error("Not authorized to edit this session");
      }

      await updateSessionData(session.id, { teams });
    },
    [session, canEdit]
  );

  // Update matches data
  const updateMatches = useCallback(
    async (matches: Match[]): Promise<void> => {
      if (!session || !canEdit) {
        throw new Error("Not authorized to edit this session");
      }

      await updateSessionData(session.id, { matches });
    },
    [session, canEdit]
  );

  // Sync all data at once
  const syncAllData = useCallback(
    async (data: { competition?: Competition | null; teams?: PersistentTeam[]; matches?: Match[] }): Promise<void> => {
      if (!session || !canEdit) {
        throw new Error("Not authorized to edit this session");
      }

      await updateSessionData(session.id, data);
    },
    [session, canEdit]
  );

  // Get share URL
  const getShareUrl = useCallback((): string => {
    if (!session) return "";
    return getSessionUrl(session.shareCode);
  }, [session]);

  // Get admin share URL (only for creator/admin with token)
  const getAdminShareUrl = useCallback((): string | null => {
    if (!session || !currentAdminToken) return null;
    return getAdminUrl(session.shareCode, currentAdminToken);
  }, [session, currentAdminToken]);

  const value: SessionContextValue = {
    session,
    role,
    isLoading,
    error,
    isSharedMode,
    createNewSession,
    joinSession,
    leaveSession,
    endSession,
    applyAdminToken,
    updateCompetition,
    updateTeams,
    updateMatches,
    syncAllData,
    getShareUrl,
    getAdminShareUrl,
    canEdit,
    isCreator,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
};

// ============================================
// Hook
// ============================================
export const useSession = (): SessionContextValue => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};

