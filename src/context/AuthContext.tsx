"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  type User,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import type { AuthUser } from "@/types/session";

// ============================================
// Constants
// ============================================
const ADMIN_TOKENS_KEY = "volleyball-admin-tokens";

// ============================================
// Context Types
// ============================================
interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isConfigured: boolean;
  // Auth methods
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  // Admin token management (for anonymous admin access)
  getAdminToken: (sessionId: string) => string | null;
  setAdminToken: (sessionId: string, token: string) => void;
  removeAdminToken: (sessionId: string) => void;
  hasAdminToken: (sessionId: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================
// Helper Functions
// ============================================
const mapFirebaseUser = (user: User): AuthUser => ({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName,
  photoURL: user.photoURL,
  isAnonymous: user.isAnonymous,
});

// ============================================
// Provider
// ============================================
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured] = useState(() => isFirebaseConfigured());

  // Listen to auth state changes
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isConfigured || !auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(mapFirebaseUser(firebaseUser));
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isConfigured]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Sign in with Google
  const signInWithGoogle = useCallback(async () => {
    if (!isConfigured || !auth) {
      throw new Error("Firebase is not configured");
    }
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }, [isConfigured]);

  // Sign in with email/password
  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!isConfigured || !auth) {
        throw new Error("Firebase is not configured");
      }
      await signInWithEmailAndPassword(auth, email, password);
    },
    [isConfigured]
  );

  // Sign up with email/password
  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!isConfigured || !auth) {
        throw new Error("Firebase is not configured");
      }
      await createUserWithEmailAndPassword(auth, email, password);
    },
    [isConfigured]
  );

  // Sign out
  const signOut = useCallback(async () => {
    if (!isConfigured || !auth) {
      return;
    }
    await firebaseSignOut(auth);
  }, [isConfigured]);

  // Admin token management for anonymous admin access
  const getAdminTokens = useCallback((): Record<string, string> => {
    if (typeof window === "undefined") return {};
    try {
      const stored = localStorage.getItem(ADMIN_TOKENS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }, []);

  const saveAdminTokens = useCallback((tokens: Record<string, string>) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(ADMIN_TOKENS_KEY, JSON.stringify(tokens));
    } catch (error) {
      console.error("Failed to save admin tokens:", error);
    }
  }, []);

  const getAdminToken = useCallback(
    (sessionId: string): string | null => {
      const tokens = getAdminTokens();
      return tokens[sessionId] || null;
    },
    [getAdminTokens]
  );

  const setAdminToken = useCallback(
    (sessionId: string, token: string) => {
      const tokens = getAdminTokens();
      tokens[sessionId] = token;
      saveAdminTokens(tokens);
    },
    [getAdminTokens, saveAdminTokens]
  );

  const removeAdminToken = useCallback(
    (sessionId: string) => {
      const tokens = getAdminTokens();
      delete tokens[sessionId];
      saveAdminTokens(tokens);
    },
    [getAdminTokens, saveAdminTokens]
  );

  const hasAdminToken = useCallback(
    (sessionId: string): boolean => {
      return getAdminToken(sessionId) !== null;
    },
    [getAdminToken]
  );

  const value: AuthContextValue = {
    user,
    isLoading,
    isConfigured,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    getAdminToken,
    setAdminToken,
    removeAdminToken,
    hasAdminToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============================================
// Hook
// ============================================
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

