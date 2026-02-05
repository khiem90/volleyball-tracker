"use client";

import { memo } from "react";
import Link from "next/link";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { AuthUser } from "@/types/session";

type UserMenuProps = {
  user: AuthUser | null;
  isConfigured: boolean;
  onSignOut: () => void;
};

export const UserMenu = memo(function UserMenu({
  user,
  isConfigured,
  onSignOut,
}: UserMenuProps) {
  return (
    <div className="hidden md:flex items-center gap-4 shrink-0">
      <ThemeToggle />

      {isConfigured && (
        user ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onSignOut}
                  className="cursor-pointer rounded-lg h-9 w-9 hover:bg-accent"
                >
                  <Avatar className="w-7 h-7 ring-2 ring-primary/20">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {user.displayName || user.email}
                <br />
                <span className="text-xs text-muted-foreground">Click to sign out</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 cursor-pointer rounded-lg hover:bg-accent"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                <span className="hidden lg:inline">Sign In</span>
              </Button>
            </Link>
          </div>
        )
      )}
    </div>
  );
});
