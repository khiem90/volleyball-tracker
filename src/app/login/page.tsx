"use client";

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { crestPath } from "@/components/matchbook/types";
import { PageLoadingSpinner } from "@/components/shared";
import { useLoginPage } from "@/hooks/useLoginPage";

const SHOWCASE_CRESTS = [
  { slug: "surge", name: "Surge" },
  { slug: "tide", name: "Tide" },
  { slug: "storm", name: "Storm" },
  { slug: "apex", name: "Apex" },
  { slug: "flare", name: "Flare" },
  { slug: "peak", name: "Peak" },
];

const FEATURES = [
  { icon: "teams", label: "Custom Teams" },
  { icon: "compete", label: "Tournaments" },
  { icon: "history", label: "Match History" },
  { icon: "cloud", label: "Cloud Sync" },
];

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
    return <PageLoadingSpinner />;
  }

  const isSignUp = mode === "signup";

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSubmitting) {
      handleEmailSubmit();
    }
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Sign-in half */}
      <div className="matchbook-surface flex min-h-screen flex-col items-center justify-center px-5 py-6 lg:min-h-0">
        <div className="w-full max-w-[460px]">
          {/* Brand lockup */}
          <Link href="/" className="mb-5 flex items-center gap-3">
            <Image
              src="/assets/matchbook/brand/crest.svg"
              alt="Tournament Tracker crest"
              width={52}
              height={60}
              priority
            />
            <span className="matchbook-display text-[1.15rem] font-bold leading-[1.05]">
              <span className="block text-mb-navy">Tournament</span>
              <span className="block text-mb-coral">Tracker</span>
            </span>
          </Link>

          {/* Masthead */}
          <div className="mb-3 flex items-center gap-3 sm:gap-4">
            <h1 className="matchbook-display whitespace-nowrap text-[2rem] font-bold leading-none tracking-[0.01em] sm:text-[2.9rem]">
              {isSignUp ? (
                <>
                  Join <span className="text-mb-coral">the Club</span>
                </>
              ) : (
                <>
                  Welcome <span className="text-mb-coral">Back</span>
                </>
              )}
            </h1>
            <div className="flex flex-col items-center border-[2px] border-mb-coral px-2.5 py-1 text-mb-coral">
              <span className="matchbook-display text-[0.8rem] font-bold leading-tight tracking-[0.1em]">
                All
              </span>
              <span className="matchbook-display text-[0.8rem] font-bold leading-tight tracking-[0.1em]">
                Events
              </span>
            </div>
          </div>
          <p className="matchbook-display mb-5 text-[0.82rem] font-semibold tracking-[0.14em] text-mb-navy">
            {isSignUp
              ? "Sign up to save your teams, tournaments, and match history."
              : "Sign in to manage your teams and tournaments."}
          </p>

          {/* Form panel */}
          <div className="mb-panel h-auto!">
            <div className="flex flex-col gap-4 p-5" onKeyDown={handleKeyDown}>
              {error && (
                <p
                  className="border-[1.5px] border-mb-red px-3 py-2 text-[0.8rem] font-medium text-mb-red"
                  role="alert"
                >
                  {error}
                </p>
              )}
              {notice && (
                <p
                  className="border-[1.5px] border-mb-green px-3 py-2 text-[0.8rem] font-medium text-mb-green"
                  role="status"
                >
                  {notice}
                </p>
              )}

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="mb-btn mb-btn-outline-navy w-full"
              >
                <Image
                  src="/assets/matchbook/auth/google-g.svg"
                  alt=""
                  width={16}
                  height={16}
                />
                Continue with Google
              </button>

              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-mb-rule" />
                <span className="mb-kicker">Or continue with email</span>
                <span className="h-px flex-1 bg-mb-rule" />
              </div>

              <div>
                <label htmlFor="login-email" className="mb-kicker mb-1 block">
                  Email
                </label>
                <div className="mb-input">
                  <input
                    id="login-email"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    autoComplete="email"
                  />
                  <MbIcon id="mail" size={16} className="shrink-0 text-mb-navy" />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="mb-kicker mb-1 block">
                  Password
                </label>
                <div className="mb-input">
                  <input
                    id="login-password"
                    type="password"
                    placeholder={isSignUp ? "Password (min 6 characters)" : "Password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                  />
                  <MbIcon id="lock" size={16} className="shrink-0 text-mb-navy" />
                </div>
                {!isSignUp && (
                  <div className="mt-1 text-right">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={isSubmitting}
                      className="matchbook-display text-[0.68rem] font-bold tracking-[0.1em] text-mb-navy hover:text-mb-coral"
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
                className="mb-btn mb-btn-coral w-full py-3 text-[0.9rem]"
              >
                <MbIcon id="login" size={16} />
                {isSubmitting
                  ? "Please wait..."
                  : isSignUp
                    ? "Create Account"
                    : "Sign In"}
              </button>

              <p className="matchbook-display text-center text-[0.72rem] font-semibold tracking-[0.1em] text-mb-navy">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="font-bold text-mb-coral hover:underline"
                >
                  {isSignUp ? "Sign In" : "Sign Up"}
                </button>
              </p>
            </div>
          </div>

          {/* Guest option */}
          <div className="mt-5 flex items-center gap-3">
            <MbIcon id="quick" size={22} className="shrink-0 text-mb-navy" />
            <button
              type="button"
              onClick={handleContinueAsGuest}
              className="mb-btn mb-btn-outline-navy w-full"
            >
              <span className="sm:hidden">Continue as Guest</span>
              <span className="hidden sm:inline">
                Continue as Guest — Quick Match Only
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Promo half */}
      <div className="hidden bg-mb-navy px-10 py-12 text-mb-paper-bright lg:flex lg:min-h-screen lg:flex-col lg:items-center lg:justify-center">
        <div className="w-full max-w-[520px]">
          <h2 className="matchbook-display whitespace-nowrap text-center text-[2.1rem] font-bold leading-tight xl:text-[2.6rem]">
            Your Tournaments, <span className="text-mb-coral">Ready.</span>
          </h2>
          <div className="mx-auto mt-5 mb-8 h-px w-full bg-[rgba(255,250,241,0.25)]" />

          {/* Crest showcase */}
          <div className="grid grid-cols-3 gap-x-6 gap-y-5">
            {SHOWCASE_CRESTS.map((crest) => (
              <div key={crest.slug} className="flex flex-col items-center gap-2">
                <Image
                  src={crestPath(crest.slug)}
                  alt=""
                  width={86}
                  height={100}
                />
                <span className="matchbook-display text-[0.9rem] font-bold tracking-[0.1em]">
                  {crest.name}
                </span>
              </div>
            ))}
          </div>

          {/* Feature list */}
          <div className="mt-8 border-t border-[rgba(255,250,241,0.25)]">
            {FEATURES.map((feature) => (
              <div
                key={feature.label}
                className="flex items-center gap-3 border-b border-[rgba(255,250,241,0.25)] py-2.5"
              >
                <MbIcon id={feature.icon} size={20} className="text-mb-paper-bright" />
                <span className="matchbook-display text-[0.95rem] font-semibold tracking-[0.1em]">
                  {feature.label}
                </span>
              </div>
            ))}
          </div>

          {/* Sample scoreline */}
          <div className="mt-6 flex items-center justify-center gap-3 rounded-[4px] border-[1.5px] border-mb-paper-bright bg-[rgba(255,250,241,0.06)] px-4 py-2.5">
            <span className="matchbook-display rounded-[2px] bg-mb-coral px-1.5 py-0.5 text-[0.6rem] font-bold tracking-[0.14em] text-white">
              Live
            </span>
            <Image src={crestPath("surge")} alt="" width={26} height={30} />
            <span className="matchbook-display text-[0.85rem] font-bold tracking-[0.08em]">
              Surge
            </span>
            <span className="matchbook-display text-2xl font-bold tabular-nums">
              3 <span className="text-mb-coral">—</span> 1
            </span>
            <span className="matchbook-display text-[0.85rem] font-bold tracking-[0.08em]">
              Tide
            </span>
            <Image src={crestPath("tide")} alt="" width={26} height={30} />
            <span className="mb-kicker text-[rgba(255,250,241,0.7)]">• Final</span>
          </div>

          {/* Tagline */}
          <div className="mt-8 flex items-center gap-3">
            <span className="h-[2px] flex-1 bg-mb-coral" />
            <MbIcon id="star" size={14} className="text-mb-coral" />
            <span className="h-[2px] flex-1 bg-mb-coral" />
          </div>
          <p className="matchbook-display mt-3 text-center text-[1rem] font-bold tracking-[0.12em]">
            Every Team. Every Match.{" "}
            <span className="text-mb-coral">One Record.</span>
          </p>
        </div>
      </div>
    </div>
  );
};

// Wrap in Suspense for useSearchParams
export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <LoginPageContent />
    </Suspense>
  );
}
