"use client";

/* ===========================================================================
   THE SIGN-IN PANEL — A FORM, WITH NO DIALOG OF ITS OWN

   Never fold a dialog back into this component: two overlays over a bottom
   sheet fight over the focus trap, the scroll lock and Escape — on a phone
   the inner one opens *behind* the outer one's backdrop.

   The form is here and it renders nothing but the form. Two callers
   compose it:

     `SessionAuth`          wraps it in `MbDialog` for the viewer route
     `CreateSessionDialog`  renders it as its `auth` STEP, inside the dialog
                            it already owns

   `modes` exists because the third option is only meaningful in one of them:
   an admin token is validated against the session you are currently watching
   (`applyAdminToken` returns false with no session), so the create flow asks
   for `["signin", "signup"]` and the viewer asks for all three.
   =========================================================================== */

import { useMemo } from "react";
import { MbNotice } from "@/components/matchbook/Notice";
import { MbSegmented } from "@/components/matchbook/Segmented";
import { AdminTokenForm } from "./AdminTokenForm";
import { EmailAuthForm } from "./EmailAuthForm";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { useSessionAuth, type SessionAuthMode } from "./useSessionAuth";

const LABEL: Record<SessionAuthMode, string> = {
  signin: "Sign in",
  signup: "Join",
  token: "Token",
};

const ICON: Record<SessionAuthMode, string> = {
  signin: "login",
  signup: "plus",
  token: "key",
};

/** What each mode is FOR, in one line, so the three are told apart by words. */
const BLURB: Record<SessionAuthMode, string> = {
  signin: "Sign in to your account to organise and edit events.",
  signup: "New here? Create an account in two fields.",
  token: "Have an admin token for this event? Paste it to edit scores.",
};

export const SessionAuthPanel = ({
  modes = ["signin", "signup", "token"],
  onDone,
}: {
  modes?: SessionAuthMode[];
  /** Fired after any successful sign-in, sign-up or token unlock. */
  onDone?: () => void;
}) => {
  const auth = useSessionAuth({ onDone });

  /* A single-mode panel draws no switcher: a radiogroup with one radio in it
     is a control that cannot be used. */
  const options = useMemo(
    () => modes.map((mode) => ({ value: mode, label: LABEL[mode], icon: ICON[mode] })),
    [modes]
  );

  if (!auth.isConfigured) {
    return (
      <MbNotice tone="info" icon="cloud" title="Accounts are not available here">
        This installation has no accounts backend, so there is nothing to sign
        in to. Everything you score is still saved on this device.
      </MbNotice>
    );
  }

  const mode = modes.includes(auth.mode) ? auth.mode : modes[0];

  return (
    <div className="flex flex-col gap-4">
      {options.length > 1 && (
        <MbSegmented
          name="session-auth-mode"
          aria-label="How to sign in"
          value={mode}
          onChange={(next) => auth.setMode(next as SessionAuthMode)}
          options={options}
          columns={{ base: 3, sm: 3 }}
        />
      )}

      <p className="text-[0.82rem] leading-[1.5] text-mb-ink-muted">{BLURB[mode]}</p>

      {mode === "signin" && (
        <>
          <GoogleSignInButton
            onClick={auth.handleGoogleSignIn}
            disabled={auth.isLoading}
          />
          {/* A ruled "or", not a floating chip on a hairline: the shipped one
              was a `<Separator>` with an absolutely positioned label that
              carried its own `bg-background` to punch a hole in the rule, and
              the hole was the wrong colour on paper. */}
          <div aria-hidden="true" className="flex items-center gap-3">
            <span className="h-px flex-1 bg-mb-rule" />
            <span className="mb-kicker">or</span>
            <span className="h-px flex-1 bg-mb-rule" />
          </div>
          <EmailAuthForm
            mode="signin"
            email={auth.email}
            password={auth.password}
            onEmailChange={auth.setEmail}
            onPasswordChange={auth.setPassword}
            onSubmit={auth.handleEmailSignIn}
            isLoading={auth.isLoading}
          />
        </>
      )}

      {mode === "signup" && (
        <EmailAuthForm
          mode="signup"
          email={auth.email}
          password={auth.password}
          onEmailChange={auth.setEmail}
          onPasswordChange={auth.setPassword}
          onSubmit={auth.handleEmailSignUp}
          isLoading={auth.isLoading}
        />
      )}

      {mode === "token" && (
        <AdminTokenForm
          adminToken={auth.adminToken}
          onAdminTokenChange={auth.setAdminToken}
          onSubmit={auth.handleAdminToken}
          isLoading={auth.isLoading}
        />
      )}

      {auth.error && (
        <MbNotice tone="danger" title="That did not work">
          {auth.error}
        </MbNotice>
      )}
    </div>
  );
};
