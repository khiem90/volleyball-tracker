"use client";

import { Suspense } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
} from "@/components/ui/glass-card";
import { MotionDiv, slideUp } from "@/components/motion";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import {
  ArrowRightEndOnRectangleIcon,
  UserPlusIcon,
  BoltIcon,
  EnvelopeIcon,
  LockClosedIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { useLoginPage } from "@/hooks/useLoginPage";

const LoginPageContent = () => {
  const {
    mode,
    email,
    password,
    error,
    isLoading,
    isSubmitting,
    isAuthenticated,
    setEmail,
    setPassword,
    handleGoogleSignIn,
    handleEmailSubmit,
    toggleMode,
    handleContinueAsGuest,
  } = useLoginPage();

  // Show loading while checking auth or redirecting
  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-6xl mx-auto px-4 pb-12">
          <div className="flex items-center justify-center min-h-[60vh]">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
            />
          </div>
        </main>
      </div>
    );
  }

  const isSignUp = mode === "signup";
  const Icon = isSignUp ? UserPlusIcon : ArrowRightEndOnRectangleIcon;
  const title = isSignUp ? "Create Account" : "Welcome Back";
  const description = isSignUp
    ? "Sign up to save your teams, tournaments, and match history."
    : "Sign in to access all your teams and tournaments.";
  const submitText = isSignUp ? "Create Account" : "Sign In";
  const toggleText = isSignUp
    ? "Already have an account?"
    : "Don't have an account?";
  const toggleAction = isSignUp ? "Sign In" : "Sign Up";

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSubmitting) {
      handleEmailSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="decorative-blob w-150 h-150 -top-48 -right-48 opacity-30" />
        <div className="decorative-blob w-100 h-100 bottom-20 -left-32 opacity-20" />
      </div>

      <Navigation />

      <main className="relative max-w-md mx-auto px-4 pb-12">
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center min-h-[70vh]"
        >
          <GlassCard hover={false} className="w-full">
            <GlassCardHeader className="text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-linear-to-br from-primary to-teal-400 flex items-center justify-center shadow-xl"
              >
                <Icon className="w-8 h-8 text-primary-foreground" />
              </motion.div>
              <GlassCardTitle className="text-2xl">{title}</GlassCardTitle>
              <GlassCardDescription>{description}</GlassCardDescription>
            </GlassCardHeader>

            <GlassCardContent className="space-y-6">
              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                >
                  <ExclamationCircleIcon className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Google Sign In */}
              <GoogleSignInButton
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
              />

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    or continue with email
                  </span>
                </div>
              </div>

              {/* Email Form */}
              <div className="space-y-3" onKeyDown={handleKeyDown}>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 glass-input"
                    disabled={isSubmitting}
                    aria-label="Email address"
                  />
                </div>
                <div className="relative">
                  <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder={
                      isSignUp ? "Password (min 6 characters)" : "Password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 glass-input"
                    disabled={isSubmitting}
                    aria-label="Password"
                  />
                </div>
                <Button
                  className="w-full gap-2 cursor-pointer btn-teal-gradient rounded-xl"
                  onClick={handleEmailSubmit}
                  disabled={isSubmitting}
                >
                  <Icon className="w-4 h-4" />
                  {isSubmitting ? "Please wait..." : submitText}
                </Button>
              </div>

              {/* Toggle Mode */}
              <div className="text-center text-sm">
                <span className="text-muted-foreground">{toggleText} </span>
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-primary hover:underline font-medium cursor-pointer"
                  tabIndex={0}
                  aria-label={toggleAction}
                >
                  {toggleAction}
                </button>
              </div>

              {/* Guest Option */}
              <div className="pt-2 border-t border-border/30">
                <Button
                  variant="ghost"
                  className="w-full gap-2 text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={handleContinueAsGuest}
                >
                  <BoltIcon className="w-4 h-4" />
                  Continue as Guest (Quick Match only)
                </Button>
              </div>
            </GlassCardContent>
          </GlassCard>

          {/* Features Preview */}
          <MotionDiv
            initial="hidden"
            animate="visible"
            variants={slideUp}
            className="mt-8 text-center text-sm text-muted-foreground"
          >
            <p className="mb-3 font-medium">Sign in to unlock:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {["Custom Teams", "Tournaments", "Match History", "Cloud Sync"].map(
                (feature) => (
                  <span
                    key={feature}
                    className="px-3 py-1 rounded-full bg-accent/30 text-xs"
                  >
                    {feature}
                  </span>
                )
              )}
            </div>
          </MotionDiv>
        </MotionDiv>
      </main>
    </div>
  );
};

// Wrap in Suspense for useSearchParams
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
