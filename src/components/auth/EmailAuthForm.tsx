"use client";

import { MbButton } from "@/components/matchbook/Button";
import { MbField, MbTextInput } from "@/components/matchbook/form";

/**
 * `<form onSubmit>` rather than a click handler on the button, so Enter in
 * either field commits — the shipped version was two loose inputs and a
 * `<Button onClick>`, which meant pressing Enter in the password box did
 * nothing at all and the reader had to reach for the mouse to sign in.
 */
export const EmailAuthForm = ({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  isLoading,
  mode,
}: {
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  mode: "signin" | "signup";
}) => {
  const signUp = mode === "signup";
  const idBase = signUp ? "session-signup" : "session-signin";

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <MbField label="Email" htmlFor={`${idBase}-email`}>
        <MbTextInput
          id={`${idBase}-email`}
          type="email"
          icon="mail"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          inputMode="email"
        />
      </MbField>

      <MbField
        label="Password"
        htmlFor={`${idBase}-password`}
        hint={signUp ? "At least six characters." : undefined}
      >
        <MbTextInput
          id={`${idBase}-password`}
          type="password"
          icon="lock"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          autoComplete={signUp ? "new-password" : "current-password"}
        />
      </MbField>

      <MbButton
        type="submit"
        variant="navy"
        size="lg"
        fullWidth
        icon={signUp ? "plus" : "login"}
        loading={isLoading}
      >
        {signUp ? "Create account" : "Sign in"}
      </MbButton>
    </form>
  );
};
