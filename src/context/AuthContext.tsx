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
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  type User,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import type { AuthUser } from "@/types/auth";

// ============================================
// Context Types
// ============================================
interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isConfigured: boolean;
  isGuest: boolean; // True when not authenticated and not loading
  // Auth methods
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
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

  // Send a password reset email
  const resetPassword = useCallback(
    async (email: string) => {
      if (!isConfigured || !auth) {
        throw new Error("Firebase is not configured");
      }
      await sendPasswordResetEmail(auth, email);
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

  const value: AuthContextValue = {
    user,
    isLoading,
    isConfigured,
    isGuest: !user && !isLoading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signOut,
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

