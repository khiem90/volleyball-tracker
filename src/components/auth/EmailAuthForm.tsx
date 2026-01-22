"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, LogIn, User } from "lucide-react";

interface EmailAuthFormProps {
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  mode: "signin" | "signup";
}

export const EmailAuthForm = ({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  isLoading,
  mode,
}: EmailAuthFormProps) => {
  const isSignUp = mode === "signup";
  const Icon = isSignUp ? User : LogIn;
  const buttonText = isSignUp ? "Create Account" : "Sign In";
  const passwordPlaceholder = isSignUp ? "Password (min 6 characters)" : "Password";

  return (
    <div className="space-y-3">
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="password"
          placeholder={passwordPlaceholder}
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <Button
        className="w-full gap-2 cursor-pointer"
        onClick={onSubmit}
        disabled={isLoading}
      >
        <Icon className="w-4 h-4" />
        {buttonText}
      </Button>
    </div>
  );
};
