"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
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
import { auth, db, isFirebaseConfigured } from "@/lib/firebase";
import { clearDeviceData, UnsyncedChangesError, writesReachedServer } from "@/lib/deviceData";
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
  /**
   * Sign out, clear the account's data from this device, and open the
   * sign-in page afresh. Rejects with UnsyncedChangesError, leaving the
   * account signed in, while changes made here have not reached the
   * server, unless `discardUnsynced` says to lose them.
   */
  signOut: (options?: { discardUnsynced?: boolean }) => Promise<void>;
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
  const [isSigningOut, setIsSigningOut] = useState(false);
  // The account this page last saw, and whether this page is the one signing it out.
  const accountUid = useRef<string | null>(null);
  const signingOutHere = useRef(false);

  // Listen to auth state changes
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isConfigured || !auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const account = firebaseUser && !firebaseUser.isAnonymous ? mapFirebaseUser(firebaseUser) : null;
      // Signed out in another tab. That tab cleared the offline copy, and
      // Firestore stopped this tab's database with it, so this page loads
      // afresh rather than go on with a database it cannot use.
      if (accountUid.current && !account && !signingOutHere.current) {
        window.location.reload();
        return;
      }
      accountUid.current = account?.uid ?? null;
      setIdentityUid(firebaseUser?.uid ?? null);
      setUser(account);
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

  // Clearing the offline copy would lose writes still queued for the
  // server, so those are waited for, and the account holder is asked when
  // they do not land. A failed sign-out comes back to the caller with the
  // app still up. Once it has gone through, the app below this provider
  // comes down before the database is cleared, taking its listeners with
  // it, so nothing reacting to the signed-out account can use the database
  // after that. The dead database cannot be used again on this page, so it
  // loads afresh, as the sign-in page rather than one that bounces there.
  const signOut = useCallback(
    async ({ discardUnsynced = false }: { discardUnsynced?: boolean } = {}) => {
      if (!isConfigured || !auth) {
        return;
      }
      if (db && !discardUnsynced && !(await writesReachedServer(db))) {
        throw new UnsyncedChangesError();
      }
      signingOutHere.current = true;
      await firebaseSignOut(auth).catch((error: unknown) => {
        signingOutHere.current = false;
        throw error;
      });
      flushSync(() => setIsSigningOut(true));
      // The app is down by now, so a failure here can only be logged.
      await clearDeviceData(db).catch((error) => console.error("Clearing this device failed:", error));
      window.location.replace("/login");
    },
    [isConfigured],
  );

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

  return (
    <AuthContext.Provider value={value}>
      {isSigningOut ? (
        <div className="matchbook-surface flex min-h-dvh items-center justify-center">
          <p role="status" className="matchbook-display text-[0.9rem] font-bold tracking-[0.1em]">
            Signing out...
          </p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
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
