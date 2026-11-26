"use client";

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { Brand, CardError, Icon, InlineSpinner, PageLoadingSpinner } from "@/components/shared";
import { useLoginPage } from "@/hooks/useLoginPage";
import { GOOGLE_MARK_SRC } from "@/lib/assetPaths";
import { LABEL } from "@/components/shared/classes";

/* The words above a field. */
const FIELD_LABEL = `mb-1 block ${LABEL}`;

/** The shared spinner on the page's ground, while the app checks who is signed in. */
const SignInLoading = () => (
  <main className="grid min-h-dvh place-items-center bg-ground">
    <PageLoadingSpinner />
  </main>
);

const LoginPageContent = () => {
  const {
    mode,
    email,
    password,
    error,
    notice,
    isLoading,
    isSubmitting,
    isAuthenticated,
    setEmail,
    setPassword,
    handleGoogleSignIn,
    handleEmailSubmit,
    handleForgotPassword,
    toggleMode,
    handleContinueAsGuest,
  } = useLoginPage();

  if (isLoading || isAuthenticated) {
    return <SignInLoading />;
  }

  const isSignUp = mode === "signup";

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSubmitting) {
      handleEmailSubmit();
    }
  };

  return (
    /* A white page. Its padding keeps clear of the status bar, the notch, and the home indicator under cover fit. */
    <main className="flex min-h-dvh flex-col items-center justify-center bg-surface pt-[max(1.5rem,env(safe-area-inset-top))] pr-[max(1.25rem,env(safe-area-inset-right))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1.25rem,env(safe-area-inset-left))]">
      {/* Full width on a phone, a centered column on anything wider. */}
      <div className="w-full max-w-[25rem]">
        {/* The brand, as a link home. */}
        <Link href="/" className="inline-flex min-h-11 items-center">
          <Brand size="page" />
        </Link>

        <h1 className="mt-6 text-page-title font-bold">
          {isSignUp ? "Join the Club" : "Welcome Back"}
        </h1>
        <p className="mt-2 text-body text-ink-soft">
          {isSignUp
            ? "Sign up to save your teams, tournaments, and match history."
            : "Sign in to manage your teams and tournaments."}
        </p>

        <div className="mt-6 flex flex-col gap-4" onKeyDown={handleKeyDown}>
          {error && <CardError message={error} className="" />}
          {notice && (
            <p
              className="rounded-tile border border-action/40 bg-action-tint px-3 py-2 text-caption font-medium text-action"
              role="status"
            >
              {notice}
            </p>
          )}

          {/* Google's mark keeps its own colors and sits on a plain grey button. */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="btn btn-fill w-full"
          >
            <Image src={GOOGLE_MARK_SRC} alt="" width={18} height={18} />
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-caption font-medium text-ink-soft">Or continue with email</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <label className="block">
            <span className={FIELD_LABEL}>Email</span>
            <span className="field">
              <input
                id="login-email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                autoComplete="email"
              />
              <Icon id="mail" size={16} className="shrink-0 text-ink-soft" />
            </span>
          </label>

          <div>
            <label className="block">
              <span className={FIELD_LABEL}>Password</span>
              <span className="field">
                <input
                  id="login-password"
                  type="password"
                  placeholder={isSignUp ? "Password (min 6 characters)" : "Password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                />
                <Icon id="lock" size={16} className="shrink-0 text-ink-soft" />
              </span>
            </label>
            {!isSignUp && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isSubmitting}
                  className="card-link disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Forgot Password?
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleEmailSubmit}
            disabled={isSubmitting}
            className="btn btn-action w-full"
          >
            {isSubmitting ? <InlineSpinner /> : <Icon id="login" size={16} />}
            {isSubmitting
              ? "Please wait..."
              : isSignUp
                ? "Create Account"
                : "Sign In"}
          </button>

          <p className="text-center text-label text-ink-soft">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={toggleMode}
              className="min-h-11 font-semibold text-ink underline underline-offset-4 hover:text-action"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>

        {/* Guest option */}
        <div className="mt-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={handleContinueAsGuest}
            className="btn btn-fill w-full"
          >
            <Icon id="quick" size={16} />
            <span className="sm:hidden">Continue as Guest</span>
            <span className="hidden sm:inline">
              Continue as Guest — Quick Match Only
            </span>
          </button>
        </div>
      </div>
    </main>
  );
};

// Wrap in Suspense for useSearchParams
export default function LoginPage() {
  return (
    <Suspense fallback={<SignInLoading />}>
      <LoginPageContent />
    </Suspense>
  );
}
