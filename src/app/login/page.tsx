"use client";

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { crestPath } from "@/components/matchbook/types";
import { useLoginPage } from "@/hooks/useLoginPage";
import { LoginSkeleton } from "./LoginSkeleton";

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
    return <LoginSkeleton />;
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
            {/* `--mb-coral-deep`. At 1.15rem the wordmark computes to
                **18.4px**, which is 0.26px SHORT of WCAG's 18.66px bold
                large-text threshold — so the 4.5:1 floor applies and
                `--mb-coral` measured 3.26:1 on paper. The ink twin is 4.62:1.
                Same fix as `Sidebar.tsx:86` and `AppShell.tsx`; a size that
                lands within a quarter of a pixel of the threshold is exactly
                why design language §1.3 makes the ink twin the rule rather
                than "check whether it happens to be big enough". */}
            <span className="matchbook-display text-[1.15rem] font-bold leading-[1.05]">
              <span className="block text-mb-navy">Tournament</span>
              <span className="block text-mb-coral-deep">Tracker</span>
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
            {/* The FRAME is coral, the CAPTION is navy — register D-10, already
                settled for `MatchbookMasthead` and reproduced here because this
                badge is hand-rolled rather than drawn by that component. The
                captions measured **3.26:1 at 12.8px/700**; navy is 11.79:1.
                Coral job 3 scopes the accent to "the emphasised title word +
                the 2px badge frame" — the frame, never the caption. */}
            <div className="flex flex-col items-center border-[2px] border-mb-coral px-2.5 py-1 text-mb-navy">
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
              {/* Frame in `--mb-green` (the mark colour), ink in
                  `--mb-green-ink` (the letterform twin). Measured at 12.8px:
                  `--mb-green` is **4.28:1** on `--mb-paper-bright`, under the
                  4.5:1 floor; the twin is 5.13:1 and reads as the same green at
                  label size. The error line above it needs no change —
                  `--mb-red` measures 4.58:1 on bright. */}
              {notice && (
                <p
                  className="border-[1.5px] border-mb-green px-3 py-2 text-[0.8rem] font-medium text-mb-green-ink"
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
                      /* Hover ink is `--mb-coral-deep`: a hover state is still
                         text, and at 10.88px/700 `--mb-coral` measured 3.55:1
                         on paper-bright. The twin is 5.03:1. Same substitution
                         `.mb-panel-link:hover` already made in `globals.css`. */
                      className="matchbook-display text-[0.68rem] font-bold tracking-[0.1em] text-mb-navy hover:text-mb-coral-deep"
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
                  /* 11.52px/700 — `--mb-coral` measured 3.55:1 here, the twin
                     5.03:1. This is the only way to reach sign-up, so it is
                     the last control on the screen that may be hard to read. */
                  className="font-bold text-mb-coral-deep hover:underline"
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
            {/* Fill is `--mb-coral-deep`, not `--mb-coral`: white on raw coral
                measured **3.69:1 at 9.6px/700**, and this is the same pairing
                `.mb-btn-coral` moved off in P0 (charter D-20). White on the
                deep fill is 5.23:1. */}
            <span className="matchbook-display rounded-[2px] bg-mb-coral-deep px-1.5 py-0.5 text-[0.6rem] font-bold tracking-[0.14em] text-white">
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
            {/* NOT `.mb-kicker`. That class bakes `color: var(--mb-ink-muted)`
                and is UNLAYERED, so it beats the `text-[rgba(...)]` utility
                that was written beside it — the line rendered in ink-muted at
                **2.44:1 on navy**, not in the paper-bright the author asked
                for. The kicker step is composed explicitly instead, which is
                what `.mb-kicker` would have to be overridden into anyway. */}
            <span className="matchbook-display text-[0.62rem] font-semibold text-[rgba(255,250,241,0.75)]">
              • Final
            </span>
          </div>

          {/* Tagline */}
          <div className="mt-8 flex items-center gap-3">
            <span className="h-[2px] flex-1 bg-mb-coral" />
            <MbIcon id="star" size={14} className="text-mb-coral" />
            <span className="h-[2px] flex-1 bg-mb-coral" />
          </div>
          {/* `1.2rem`, not `1rem` — the `display/stat-sm` step.
              On navy, `--mb-coral` is 3.62:1: AA-LARGE only, which at 16px/700
              is not large and failed the 4.5:1 floor. There is no ink twin
              available here — design language §1.3 records `--mb-coral-deep`
              on navy at 2.55:1, "a paper ink only" — so the remedy is the
              other half of the same rule, the size gate: at **19.2px/700** the
              3:1 large-text floor applies and 3.62:1 clears it. Keeping coral
              also keeps §1's one-accent promise on a poster that already
              carries the coral h2 word, the coral rules and the coral star. */}
          <p className="matchbook-display mt-3 text-center text-[1.2rem] font-bold tracking-[0.12em]">
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
    <Suspense fallback={<LoginSkeleton />}>
      <LoginPageContent />
    </Suspense>
  );
}
