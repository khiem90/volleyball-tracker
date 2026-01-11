"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShareButton } from "@/components/ShareSession";
import {
  Crown,
  Eye,
  LogIn,
  LogOut,
  Shield,
  Trophy,
} from "lucide-react";
import type { AuthUser, SessionRole } from "@/types/session";

interface SessionHeaderProps {
  sessionName: string;
  shareCode: string;
  role: SessionRole;
  user: AuthUser | null;
  isCreator: boolean;
  onShowAuth: () => void;
  onLeaveSession: () => void;
}

export const SessionHeader = ({
  sessionName,
  shareCode,
  role,
  user,
  isCreator,
  onShowAuth,
  onLeaveSession,
}: SessionHeaderProps) => {
  const roleIcon = {
    creator: <Crown className="w-3 h-3" />,
    admin: <Shield className="w-3 h-3" />,
    viewer: <Eye className="w-3 h-3" />,
  };

  const roleColor = {
    creator: "bg-amber-500/20 text-amber-500 border-amber-500/30",
    admin: "bg-blue-500/20 text-blue-500 border-blue-500/30",
    viewer: "bg-muted text-muted-foreground",
  };

  return (
    <header className="glass border-b border-border/40 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <Trophy className="w-4 h-4 text-primary" />
              </div>
            </Link>
            <div>
              <h1 className="font-semibold truncate max-w-[200px] sm:max-w-none">
                {sessionName}
              </h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{shareCode}</span>
                <Badge
                  variant="outline"
                  className={`${roleColor[role]} gap-1 text-[10px] px-1.5 py-0`}
                >
                  {roleIcon[role]}
                  {role}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onShowAuth}
                className="gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
              </Button>
            )}
            <ShareButton />
            {!isCreator && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onLeaveSession}
                className="gap-2 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Leave</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
