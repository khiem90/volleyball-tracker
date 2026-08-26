"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSession } from "@/context/SessionContext";

/* ===========================================================================
   SIGN-IN STATE, WITH NO OPINION ABOUT WHERE IT IS DRAWN

   `onDone`, not `onClose`: the hook is mounted inside a dialog *and* inside a
   step of another dialog (`CreateSessionDialog`), and only the caller knows
   which of those means "close". A step does not close; it advances.

   Provider messages are mapped to product sentences: `signInWithEmail`
   rejects with strings like `Firebase: Error (auth/invalid-credential).`,
   which names the backend to the public and tells the reader nothing.
   =========================================================================== */

export type SessionAuthMode = "signin" | "signup" | "token";

/**
 * Provider codes worth distinguishing, in the order a person would ask.
 * Anything unmatched gets the generic sentence — never the raw string.
 */
const messageFor = (error: unknown, fallback: string): string => {
  const raw = error instanceof Error ? error.message : "";
  const code = /\(([a-z-]+\/[a-z-]+)\)/.exec(raw)?.[1] ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email and password do not match an account.";
    case "auth/invalid-email":
      return "That does not look like an email address.";
    case "auth/email-already-in-use":
      return "There is already an account with that email. Sign in instead.";
    case "auth/weak-password":
      return "Pick a password of at least six characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a minute and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "The Google window closed before sign-in finished.";
    case "auth/network-request-failed":
      return "No connection. Check your network and try again.";
    default:
      return fallback;
  }
};

export const useSessionAuth = ({ onDone }: { onDone?: () => void }) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, isConfigured } = useAuth();
  const { applyAdminToken } = useSession();

  const [mode, setMode] = useState<SessionAuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const succeed = useCallback(() => {
    setEmail("");
    setPassword("");
    setAdminToken("");
    setError("");
    onDone?.();
  }, [onDone]);

  const run = useCallback(
    async (action: () => Promise<void>, fallback: string) => {
      setError("");
      setIsLoading(true);
      try {
        await action();
        succeed();
      } catch (err) {
        setError(messageFor(err, fallback));
      } finally {
        setIsLoading(false);
      }
    },
    [succeed]
  );

  const handleGoogleSignIn = useCallback(
    () => run(() => signInWithGoogle(), "Google sign-in did not finish. Try again."),
    [run, signInWithGoogle]
  );

  const handleEmailSignIn = useCallback(() => {
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    return run(
      () => signInWithEmail(email, password),
      "That sign-in did not work. Check the details and try again."
    );
  }, [email, password, run, signInWithEmail]);

  const handleEmailSignUp = useCallback(() => {
    if (!email || !password) {
      setError("Enter an email and a password.");
      return;
    }
    if (password.length < 6) {
      setError("Pick a password of at least six characters.");
      return;
    }
    return run(
      () => signUpWithEmail(email, password),
      "The account could not be created. Try again."
    );
  }, [email, password, run, signUpWithEmail]);

  const handleAdminToken = useCallback(() => {
    if (!adminToken.trim()) {
      setError("Paste the admin token first.");
      return;
    }
    setError("");
    if (applyAdminToken(adminToken.trim())) {
      succeed();
    } else {
      setError("That token does not match this event.");
    }
  }, [adminToken, applyAdminToken, succeed]);

  return {
    mode,
    setMode,
    email,
    setEmail,
    password,
    setPassword,
    adminToken,
    setAdminToken,
    error,
    isLoading,
    isConfigured,
    handleGoogleSignIn,
    handleEmailSignIn,
    handleEmailSignUp,
    handleAdminToken,
  };
};
