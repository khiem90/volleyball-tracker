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
  signInAnonymously,
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
  /**
   * The signed-in account, or null for a guest. A phone that opened a
   * scorer link has a silent anonymous identity, which is not an account:
   * it shows here as null and gets only what the link allows.
   */
  user: AuthUser | null;
  /** The uid of whatever identity Firebase holds, the account's or the silent one a scorer link made. */
  identityUid: string | null;
  isLoading: boolean;
  isConfigured: boolean;
  /**
   * True when there is no account and auth has settled. A phone holding a
   * scorer link is still a guest everywhere outside that tournament.
   */
  isGuest: boolean;
  // Auth methods
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * The uid of the current identity, making a silent anonymous one when
   * there is none. What a scorer link needs before it can write its proof.
   */
  ensureIdentity: () => Promise<string>;
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
  const [identityUid, setIdentityUid] = useState<string | null>(null);
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
      setIdentityUid(firebaseUser?.uid ?? null);
      setUser(firebaseUser && !firebaseUser.isAnonymous ? mapFirebaseUser(firebaseUser) : null);
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

  // The account if there is one, else the silent identity, made on the spot
  // if there is none. Silent sign-in needs the Anonymous provider enabled
  // on the Firebase project; the emulator has it on.
  const ensureIdentity = useCallback(async () => {
    if (!isConfigured || !auth) {
      throw new Error("Firebase is not configured");
    }
    if (auth.currentUser) return auth.currentUser.uid;
    const credential = await signInAnonymously(auth);
    return credential.user.uid;
  }, [isConfigured]);

  const value: AuthContextValue = {
    user,
    identityUid,
    isLoading,
    isConfigured,
    isGuest: !user && !isLoading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signOut,
    ensureIdentity,
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
