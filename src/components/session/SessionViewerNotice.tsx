"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Eye } from "lucide-react";
import type { SessionRole, AuthUser } from "@/types/session";

interface SessionViewerNoticeProps {
  role: SessionRole;
  user: AuthUser | null;
  onShowAuth: () => void;
}

export const SessionViewerNotice = ({
  role,
  user,
  onShowAuth,
}: SessionViewerNoticeProps) => {
  if (role !== "viewer") return null;

  return (
    <Card className="border-muted">
      <CardContent className="py-4 text-center text-sm text-muted-foreground">
        <Eye className="w-5 h-5 mx-auto mb-2" />
        You{"'"}re viewing this session in read-only mode.
        {!user && (
          <>
            {" "}
            <button
              type="button"
              className="text-primary hover:underline cursor-pointer"
              onClick={onShowAuth}
            >
              Sign in
            </button>{" "}
            or enter an admin token to edit scores.
          </>
        )}
      </CardContent>
    </Card>
  );
};
