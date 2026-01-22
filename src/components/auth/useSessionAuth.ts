"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSession } from "@/context/SessionContext";

interface UseSessionAuthProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const useSessionAuth = ({ onClose, onSuccess }: UseSessionAuthProps) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, isConfigured } = useAuth();
  const { applyAdminToken } = useSession();

  const [activeTab, setActiveTab] = useState<"signin" | "signup" | "admin">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = useCallback(() => {
    setEmail("");
    setPassword("");
    setAdminToken("");
    setError("");
  }, []);

  const handleSuccess = useCallback(() => {
    onClose();
    resetForm();
    onSuccess?.();
  }, [onClose, resetForm, onSuccess]);

  const handleGoogleSignIn = useCallback(async () => {
    setError("");
    setIsLoading(true);
    try {
      await signInWithGoogle();
      handleSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in with Google");
    } finally {
      setIsLoading(false);
    }
  }, [signInWithGoogle, handleSuccess]);

  const handleEmailSignIn = useCallback(async () => {
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await signInWithEmail(email, password);
      handleSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  }, [email, password, signInWithEmail, handleSuccess]);

  const handleEmailSignUp = useCallback(async () => {
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await signUpWithEmail(email, password);
      handleSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  }, [email, password, signUpWithEmail, handleSuccess]);

  const handleAdminToken = useCallback(() => {
    if (!adminToken) {
      setError("Please enter an admin token");
      return;
    }
    setError("");

    const success = applyAdminToken(adminToken);
    if (success) {
      handleSuccess();
    } else {
      setError("Invalid admin token");
    }
  }, [adminToken, applyAdminToken, handleSuccess]);

  const handleContinueAsViewer = useCallback(() => {
    handleSuccess();
  }, [handleSuccess]);

  return {
    // State
    activeTab,
    setActiveTab,
    email,
    setEmail,
    password,
    setPassword,
    adminToken,
    setAdminToken,
    error,
    isLoading,
    isConfigured,

    // Actions
    handleGoogleSignIn,
    handleEmailSignIn,
    handleEmailSignUp,
    handleAdminToken,
    handleContinueAsViewer,
  };
};
