import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type AuthMode = "signin" | "signup";

export const useLoginPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectPath = searchParams.get("redirect") || "/";

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !isLoading) {
      router.push(redirectPath);
    }
  }, [user, isLoading, router, redirectPath]);

  const handleGoogleSignIn = useCallback(async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      // Redirect happens via useEffect when user state updates
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in with Google");
    } finally {
      setIsSubmitting(false);
    }
  }, [signInWithGoogle]);

  const handleEmailSubmit = useCallback(async () => {
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    if (mode === "signup" && password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "signin") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      // Redirect happens via useEffect when user state updates
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      // Simplify Firebase error messages
      if (message.includes("auth/invalid-credential") || message.includes("auth/wrong-password")) {
        setError("Invalid email or password");
      } else if (message.includes("auth/email-already-in-use")) {
        setError("Email already in use. Try signing in instead.");
      } else if (message.includes("auth/user-not-found")) {
        setError("No account found with this email");
      } else if (message.includes("auth/weak-password")) {
        setError("Password is too weak");
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, mode, signInWithEmail, signUpWithEmail]);

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === "signin" ? "signup" : "signin"));
    setError(null);
  }, []);

  const handleContinueAsGuest = useCallback(() => {
    router.push("/quick-match");
  }, [router]);

  return {
    mode,
    email,
    password,
    error,
    isLoading,
    isSubmitting,
    isAuthenticated: !!user,
    setEmail,
    setPassword,
    handleGoogleSignIn,
    handleEmailSubmit,
    toggleMode,
    handleContinueAsGuest,
  };
};
