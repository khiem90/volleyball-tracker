"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound } from "lucide-react";

interface AdminTokenFormProps {
  adminToken: string;
  onAdminTokenChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export const AdminTokenForm = ({
  adminToken,
  onAdminTokenChange,
  onSubmit,
  isLoading,
}: AdminTokenFormProps) => {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        If you have an admin token, enter it below to get admin access without signing in.
      </p>
      <div className="relative">
        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Enter admin token"
          value={adminToken}
          onChange={(e) => onAdminTokenChange(e.target.value)}
          className="pl-10 font-mono"
        />
      </div>
      <Button
        className="w-full gap-2 cursor-pointer"
        onClick={onSubmit}
        disabled={isLoading || !adminToken}
      >
        <KeyRound className="w-4 h-4" />
        Apply Admin Token
      </Button>
    </div>
  );
};
