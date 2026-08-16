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

/* ===========================================================================
   THE SIGN-IN SCREEN — it was hand-rolling the kit, and losing

   /login is `blocked` in the screenshot harness (dev-preview auth signs the
   preview user in, so the route redirects to `/` before anything can be
   measured), which means no audit in this programme had ever run on it. With
   the provider pinned to signed-out and the page measured at 1440, every
   control on it was under the floor:

     Continue with Google   418 x 38.78     .mb-btn, hand-written
     Email  / Password      364 x 28.81     <input> inside a bare .mb-input
     Sign In                418 x 38.78     .mb-btn, hand-written
     Continue as Guest      426 x 38.78     .mb-btn, hand-written

   Invariant 33 and rubric HF-2 put the floor at 44. The FIRST screen a new
   user sees was the only screen in the app that failed it, on every control it
   has, because the classes were written by hand rather than taken from the kit:

     - `.mb-btn` carries no `min-height`. The ladder (44/48/56) is applied by
       `MbButton`, INLINE, and Button.tsx says why: `.mb-btn`'s `padding` and
       `.mb-btn-touch`'s `min-height` are UNLAYERED, so a Tailwind utility can
       never outrank them. A hand-written `.mb-btn` therefore renders at its
       type size — 38.78px — and no class the author adds can lift it.
     - the same rule silently voided the `py-3 text-[0.9rem]` on the Sign In
       button: `.mb-btn` sets `padding` and `font-size` unlayered, so both
       utilities were inert and the "bigger" primary measured the same 38.78px
       box as the two secondaries beside it.
     - the fields were a bare `<div class="mb-input">` with a raw `<input>`
       inside, so the input took its own line box (28.81px) and the shell took
       whatever that plus its padding came to. `MbTextInput` is the component
       that hands the whole interior to the input.

   So the screen now uses `MbButton` and `MbTextInput` instead of restating
   them. Sign In takes `lg` (56) — Button.tsx reserves that rung for "one-handed
   thumb-reach targets that end a task", which is exactly what this is — and
   everything else takes the 48 default.
   =========================================================================== */

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
            {/* `display/stat-sm`. It was `text-[1.15rem]`, which is not a step
                — the same 0.05rem drift off 1.2rem that `SummaryStat` already
                closed on /summaries, and the third size this one wordmark was
                drawn at (1.05rem in `Sidebar` and `global-error`, 1.15rem here).

                `--mb-coral-deep` stays whatever the size is. At 1.15rem the
                wordmark computed to 18.4px, 0.26px short of WCAG's 18.66px
                bold large-text threshold, so the 4.5:1 floor applied and
                `--mb-coral` measured 3.26:1 on paper; 1.2rem is 19.2px and
                clears it, but §1.3 makes the ink twin the rule rather than
                "check whether it happens to be big enough", and the twin reads
                as the same colour at label size. */}
            <span className="matchbook-display text-[1.2rem] mb-track-display font-bold leading-[1.05]">
              <span className="block text-mb-navy">Tournament</span>
              <span className="block text-mb-coral-deep">Tracker</span>
            </span>
          </Link>

          {/* Masthead */}
          <div className="mb-3 flex items-center gap-3 sm:gap-4">
            {/* `display/masthead` verbatim — the same string `MatchbookMasthead`
                emits, `text-4xl … sm:text-5xl`. It was `text-[2rem] …
                sm:text-[2.9rem]`, two sizes that exist nowhere else in the app
                and sit 0.25rem and 0.1rem below the step they were imitating.

                `whitespace-nowrap` came with them and had to go with them: at
                the named step "Welcome Back" is 2.25rem at 320px, and a nowrap
                h1 that cannot fit is exactly how a screen starts pushing
                `documentElement.scrollWidth` past the viewport. Every other
                masthead in the app wraps (`min-w-0 break-words`); this one now
                does too. */}
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
            {/* NAVY, frame and captions — reproduced here because this badge
                is hand-rolled rather than drawn by `MatchbookMasthead`, and it
                must match that component's move: the count badge came off
                coral when the census closed at three declared jobs (primary
                action, selection mark, masthead lockup). The badge's mark is
                its 2px border weight — the only 2px border in the system
                (§3.3) — so navy changes nothing in greyscale. The captions
                were already navy (coral measured 3.26:1 at 12.8px/700,
                register D-10). */}
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
              {/* Frame in `--mb-green` (the mark colour), ink in
                  `--mb-green-ink` (the letterform twin). Measured at 12.8px:
                  `--mb-green` is **4.28:1** on `--mb-paper-bright`, under the
                  4.5:1 floor; the twin is 5.13:1 and reads as the same green at
                  label size. The error line above it needs no change —
                  `--mb-red` measures 4.58:1 on bright. */}
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
                {/* `inline-block` is load-bearing. Tailwind preflight sets
                    `img { display: block }`, and `MbButton` puts every child
                    inside ONE label span — so a block child stacks ABOVE the
                    label instead of sitting beside it. Measured at 1440 the
                    button was 54.78px with the G centred over the words: not a
                    rung, and not the row this control is supposed to be. The
                    `icon` prop is the normal route, but it takes a sprite id
                    and the Google mark is a brand asset that has to keep its
                    own four colours, so it stays an `<Image>`. */}
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
                      /* Hover ink is `--mb-coral-deep`: a hover state is still
                         text, and at 10.88px/700 `--mb-coral` measured 3.55:1
                         on paper-bright. The twin is 5.03:1. Same substitution
                         `.mb-panel-link:hover` already made in `globals.css`. */
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
                {/* The glyph goes through `icon`, not through `children`. As a
                    child it landed inside the label span, where preflight's
                    `svg { display: block }` stacked it over the words and made
                    the primary CTA 63.61px instead of the `lg` rung's 56 — and
                    the prop also hands the glyph its ladder size, which the
                    hand-written `size={16}` was overriding. */}
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
                  /* 11.52px/700 — `--mb-coral` measured 3.55:1 here, the twin
                     5.03:1. This is the only way to reach sign-up, so it is
                     the last control on the screen that may be hard to read. */
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
          {/* One step, not two. It was `text-[2.1rem] xl:text-[2.6rem]`: both
              off-scale, and the pair cannot be put on the ladder as a pair —
              1.875rem's rung is 0.02em and 2.25rem's is 0.01em, and one element
              carries one tracking class. `display/stat-lg` at every width is
              the step, and it also retires a `whitespace-nowrap` headline whose
              natural width at 2.6rem exceeded the 432px the promo column
              actually has at `lg`. */}
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
            {/* Fill is `--mb-coral-deep`, not `--mb-coral`: white on raw coral
                measured **3.69:1 at 9.6px/700**, and this is the same pairing
                `.mb-btn-coral` moved off in P0 (charter D-20). White on the
                deep fill is 5.23:1. */}
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
            {/* NOT `.mb-kicker`. That class bakes `color: var(--mb-ink-muted)`
                and is UNLAYERED, so it beats the colour utility written beside
                it — the line rendered in ink-muted at **2.44:1 on navy**, not
                in the paper-bright the author asked for. The kicker step is
                composed explicitly instead, which is what `.mb-kicker` would
                have to be overridden into anyway.

                `text-mb-ink-on-navy-soft` is the token, not the fifth hand-typed
                `rgba(255,250,241,…)` this line used to carry (G20). It composites
                to 7.86:1 on navy, so the tag stays visibly secondary beside the
                opaque paper-bright score without going under the 4.5:1 floor. */}
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
          {/* `1.2rem`, not `1rem` — the `display/stat-sm` step.
              On navy, `--mb-coral` is 3.62:1: AA-LARGE only, which at 16px/700
              is not large and failed the 4.5:1 floor. There is no ink twin
              available here — design language §1.3 records `--mb-coral-deep`
              on navy at 2.55:1, "a paper ink only" — so the remedy is the
              other half of the same rule, the size gate: at **19.2px/700** the
              3:1 large-text floor applies and 3.62:1 clears it. Keeping coral
              also keeps §1's one-accent promise on a poster that already
              carries the coral h2 word, the coral rules and the coral star. */}
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
