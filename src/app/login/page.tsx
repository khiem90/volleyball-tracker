"use client";

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { MbButton } from "@/components/matchbook/Button";
import { MbTextInput } from "@/components/matchbook/form";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { crestPath } from "@/components/matchbook/types";
import { useLoginPage } from "@/hooks/useLoginPage";
import { LoginSkeleton } from "./LoginSkeleton";

/* Use `MbButton` / `MbTextInput`, never a hand-written `.mb-btn` or bare
   `.mb-input`: the touch-height ladder (44/48/56) is applied inline by the
   components, and `.mb-btn`'s padding/font-size are unlayered, so Tailwind
   utilities on a hand-rolled copy are inert and the control renders below the
   44px floor. Sign In takes `lg` (56), the rung reserved for targets that end
   a task. */

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
            {/* `--mb-coral-deep`, not `--mb-coral`: the ink twin is the rule
                for text at label sizes — the bright coral fails the 4.5:1
                contrast floor. */}
            <span className="matchbook-display text-[1.2rem] mb-track-display font-bold leading-[1.05]">
              <span className="block text-mb-navy">Tournament</span>
              <span className="block text-mb-coral-deep">Tracker</span>
            </span>
          </Link>

          {/* Masthead */}
          <div className="mb-3 flex items-center gap-3 sm:gap-4">
            {/* Same step `MatchbookMasthead` emits. Must wrap (`min-w-0
                break-words`) — a nowrap h1 at this size pushes horizontal
                scroll on narrow phones. */}
            <h1 className="matchbook-display min-w-0 break-words text-balance text-4xl mb-track-masthead font-bold leading-none sm:text-5xl">
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
            {/* Hand-rolled badge — must stay in step with the navy count badge
                `MatchbookMasthead` draws. Its mark is the 2px border weight,
                the only 2px border in the system. */}
            <div className="flex flex-col items-center border-[2px] border-mb-navy px-2.5 py-1 text-mb-navy">
              <span className="matchbook-display text-[0.8rem] mb-track-button font-bold leading-tight">
                All
              </span>
              <span className="matchbook-display text-[0.8rem] mb-track-button font-bold leading-tight">
                Events
              </span>
            </div>
          </div>
          <p className="matchbook-display mb-5 text-[0.82rem] mb-track-display font-semibold text-mb-navy">
            {isSignUp
              ? "Sign up to save your teams, tournaments, and match history."
              : "Sign in to manage your teams and tournaments."}
          </p>

          {/* Form panel */}
          <div className="mb-panel h-auto!">
            <div className="flex flex-col gap-4 p-5" onKeyDown={handleKeyDown}>
              {error && (
                <p
                  className="border-[1.5px] border-mb-red px-3 py-2 text-[0.85rem] text-mb-red"
                  role="alert"
                >
                  {error}
                </p>
              )}
              {/* Frame in `--mb-green`, text in `--mb-green-ink`: the mark
                  colour fails the 4.5:1 floor at this size, the ink twin
                  passes. */}
              {notice && (
                <p
                  className="border-[1.5px] border-mb-green px-3 py-2 text-[0.85rem] text-mb-green-ink"
                  role="status"
                >
                  {notice}
                </p>
              )}

              <MbButton
                variant="outline-navy"
                fullWidth
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
              >
                {/* `inline-block` is load-bearing: preflight sets
                    `img { display: block }` and `MbButton` wraps children in
                    one label span, so a block image stacks ABOVE the label.
                    The Google mark keeps its own four colours, so it stays an
                    `<Image>` rather than the sprite `icon` prop. */}
                <Image
                  src="/assets/matchbook/auth/google-g.svg"
                  alt=""
                  width={16}
                  height={16}
                  className="mr-2 inline-block align-[-3px]"
                />
                Continue with Google
              </MbButton>

              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-mb-rule" />
                <span className="mb-kicker">Or continue with email</span>
                <span className="h-px flex-1 bg-mb-rule" />
              </div>

              <div>
                <label htmlFor="login-email" className="mb-kicker mb-1 block">
                  Email
                </label>
                <MbTextInput
                  id="login-email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="email"
                  trailing={
                    <MbIcon id="mail" size={16} className="shrink-0 text-mb-navy" />
                  }
                />
              </div>

              <div>
                <label htmlFor="login-password" className="mb-kicker mb-1 block">
                  Password
                </label>
                <MbTextInput
                  id="login-password"
                  type="password"
                  placeholder={isSignUp ? "Password (min 6 characters)" : "Password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  trailing={
                    <MbIcon id="lock" size={16} className="shrink-0 text-mb-navy" />
                  }
                />
                {!isSignUp && (
                  <div className="mt-1 text-right">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={isSubmitting}
                      /* Hover ink is `--mb-coral-deep` — bright coral fails
                         contrast at this size. */
                      className="matchbook-display -my-[13.85px] inline-flex min-h-[44px] items-center text-[0.66rem] mb-track-status font-bold text-mb-navy hover:text-mb-coral-deep"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
              </div>

              <MbButton
                type="button"
                onClick={handleEmailSubmit}
                disabled={isSubmitting}
                variant="coral"
                size="lg"
                icon="login"
                fullWidth
              >
                {/* The glyph must go through `icon`, not `children`: as a
                    child, preflight's `svg { display: block }` stacks it over
                    the words and breaks the button's height rung. */}
                {isSubmitting
                  ? "Please wait..."
                  : isSignUp
                    ? "Create Account"
                    : "Sign In"}
              </MbButton>

              <p className="matchbook-display text-center text-[0.72rem] mb-track-link font-semibold text-mb-navy">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  /* `--mb-coral-deep` for contrast — this is the only way to
                     reach sign-up. */
                  className="-my-[13.36px] inline-flex min-h-[44px] items-center font-bold text-mb-coral-deep hover:underline"
                >
                  {isSignUp ? "Sign In" : "Sign Up"}
                </button>
              </p>
            </div>
          </div>

          {/* Guest option */}
          <div className="mt-5 flex items-center gap-3">
            <MbIcon id="quick" size={22} className="shrink-0 text-mb-navy" />
            <MbButton
              type="button"
              onClick={handleContinueAsGuest}
              variant="outline-navy"
              fullWidth
            >
              <span className="sm:hidden">Continue as Guest</span>
              <span className="hidden sm:inline">
                Continue as Guest — Quick Match Only
              </span>
            </MbButton>
          </div>
        </div>
      </div>

      {/* Promo half */}
      <div className="hidden bg-mb-navy px-10 py-12 text-mb-paper-bright lg:flex lg:min-h-screen lg:flex-col lg:items-center lg:justify-center">
        <div className="w-full max-w-[520px]">
          {/* One size at every width — a larger nowrap headline overflowed the
              promo column at `lg`. */}
          <h2 className="matchbook-display text-center text-[1.875rem] mb-track-display font-bold leading-tight">
            Your Tournaments, <span className="text-mb-coral">Ready.</span>
          </h2>
          <div className="mx-auto mt-5 mb-8 h-px w-full bg-mb-rule-on-navy" />

          {/* Crest showcase */}
          <div className="grid grid-cols-3 gap-x-6 gap-y-4">
            {SHOWCASE_CRESTS.map((crest) => (
              <div key={crest.slug} className="flex flex-col items-center gap-2">
                <Image
                  src={crestPath(crest.slug)}
                  alt=""
                  width={86}
                  height={100}
                />
                <span className="matchbook-display text-[0.9rem] mb-track-display font-bold">
                  {crest.name}
                </span>
              </div>
            ))}
          </div>

          {/* Feature list */}
          <div className="mt-8 border-t border-mb-rule-on-navy">
            {FEATURES.map((feature) => (
              <div
                key={feature.label}
                className="flex items-center gap-3 border-b border-mb-rule-on-navy py-2.5"
              >
                <MbIcon id={feature.icon} size={20} className="text-mb-paper-bright" />
                <span className="matchbook-display text-[0.95rem] mb-track-title font-semibold">
                  {feature.label}
                </span>
              </div>
            ))}
          </div>

          {/* Sample scoreline */}
          <div className="mt-6 flex items-center justify-center gap-3 rounded-[4px] border-[1.5px] border-mb-paper-bright bg-mb-tint-on-navy px-4 py-2.5">
            {/* Fill is `--mb-coral-deep`: white on raw coral fails contrast at
                this size. */}
            <span className="matchbook-display rounded-[2px] bg-mb-coral-deep px-1.5 py-0.5 text-[0.6rem] mb-track-badge font-bold text-white">
              Live
            </span>
            <Image src={crestPath("surge")} alt="" width={26} height={30} />
            <span className="matchbook-display text-[0.85rem] mb-track-display font-bold">
              Surge
            </span>
            <span className="matchbook-display text-2xl mb-track-display font-bold tabular-nums">
              3 <span className="text-mb-coral">—</span> 1
            </span>
            <span className="matchbook-display text-[0.85rem] mb-track-display font-bold">
              Tide
            </span>
            <Image src={crestPath("tide")} alt="" width={26} height={30} />
            {/* NOT `.mb-kicker`: that class bakes an unlayered
                `color: var(--mb-ink-muted)` that beats any colour utility
                beside it and is illegible on navy. The kicker step is composed
                explicitly with the on-navy token instead. */}
            <span className="matchbook-display text-[0.62rem] mb-track-kicker font-semibold text-mb-ink-on-navy-soft">
              • Final
            </span>
          </div>

          {/* Tagline */}
          <div className="mt-8 flex items-center gap-3">
            <span className="h-[2px] flex-1 bg-mb-coral" />
            <MbIcon id="star" size={14} className="text-mb-coral" />
            <span className="h-[2px] flex-1 bg-mb-coral" />
          </div>
          {/* The 1.2rem size is load-bearing: coral on navy only passes WCAG
              via the large-text floor (19.2px/700), and `--mb-coral-deep` is a
              paper ink that cannot substitute here. */}
          <p className="matchbook-display mt-3 text-center text-[1.2rem] mb-track-display font-bold">
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
