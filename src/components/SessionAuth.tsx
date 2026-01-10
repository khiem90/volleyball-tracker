"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { useSession } from "@/context/SessionContext";
import { Mail, Lock, User, KeyRound, LogIn, Eye } from "lucide-react";

interface SessionAuthProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  showViewerOption?: boolean;
}

export const SessionAuth = ({
  open,
  onOpenChange,
  onSuccess,
  showViewerOption = true,
}: SessionAuthProps) => {
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

  const handleGoogleSignIn = useCallback(async () => {
    setError("");
    setIsLoading(true);
    try {
      await signInWithGoogle();
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in with Google");
    } finally {
      setIsLoading(false);
    }
  }, [signInWithGoogle, onOpenChange, resetForm, onSuccess]);

  const handleEmailSignIn = useCallback(async () => {
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await signInWithEmail(email, password);
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  }, [email, password, signInWithEmail, onOpenChange, resetForm, onSuccess]);

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
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  }, [email, password, signUpWithEmail, onOpenChange, resetForm, onSuccess]);

  const handleAdminToken = useCallback(() => {
    if (!adminToken) {
      setError("Please enter an admin token");
      return;
    }
    setError("");
    
    const success = applyAdminToken(adminToken);
    if (success) {
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } else {
      setError("Invalid admin token");
    }
  }, [adminToken, applyAdminToken, onOpenChange, resetForm, onSuccess]);

  const handleContinueAsViewer = useCallback(() => {
    onOpenChange(false);
    resetForm();
    onSuccess?.();
  }, [onOpenChange, resetForm, onSuccess]);

  if (!isConfigured) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Firebase Not Configured</DialogTitle>
            <DialogDescription>
              Firebase is not configured. Please add your Firebase configuration to enable authentication.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="w-5 h-5 text-primary" />
            Sign In
          </DialogTitle>
          <DialogDescription>
            Sign in to get admin access to this session
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
            <TabsTrigger value="admin">Admin Token</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4 mt-4">
            {/* Google Sign In */}
            <Button
              variant="outline"
              className="w-full gap-2 cursor-pointer"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                or
              </span>
            </div>

            {/* Email Sign In */}
            <div className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                className="w-full gap-2 cursor-pointer"
                onClick={handleEmailSignIn}
                disabled={isLoading}
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                className="w-full gap-2 cursor-pointer"
                onClick={handleEmailSignUp}
                disabled={isLoading}
              >
                <User className="w-4 h-4" />
                Create Account
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="admin" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              If you have an admin token, enter it below to get admin access without signing in.
            </p>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter admin token"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                className="pl-10 font-mono"
              />
            </div>
            <Button
              className="w-full gap-2 cursor-pointer"
              onClick={handleAdminToken}
              disabled={isLoading || !adminToken}
            >
              <KeyRound className="w-4 h-4" />
              Apply Admin Token
            </Button>
          </TabsContent>
        </Tabs>

        {error && (
          <p className="text-sm text-destructive text-center mt-2">{error}</p>
        )}

        {showViewerOption && (
          <>
            <Separator />
            <Button
              variant="ghost"
              className="w-full gap-2 cursor-pointer"
              onClick={handleContinueAsViewer}
            >
              <Eye className="w-4 h-4" />
              Continue as Viewer (Read Only)
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

