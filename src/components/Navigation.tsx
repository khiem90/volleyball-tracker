"use client";

import { useState, memo, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  UserGroupIcon,
  BoltIcon,
  TrophyIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { TrophyIcon as TrophySolid } from "@heroicons/react/24/solid";
import { useAuth } from "@/context/AuthContext";
import { SessionAuth } from "@/components/auth";
import { DesktopNav, UserMenu, MobileNav } from "@/components/nav-parts";

const navItems = [
  { href: "/", label: "Home", icon: HomeIcon, description: "Overview & stats" },
  { href: "/teams", label: "Teams", icon: UserGroupIcon, description: "Manage your teams" },
  { href: "/quick-match", label: "Quick", icon: BoltIcon, description: "Start a fast game" },
  { href: "/competitions", label: "Compete", icon: TrophyIcon, description: "Tournaments & leagues" },
  { href: "/summaries", label: "History", icon: ClockIcon, description: "Session history" },
];

export const Navigation = memo(() => {
  const pathname = usePathname();
  const { user, signOut, isConfigured } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  const shouldHideNav = useMemo(
    () => pathname.startsWith("/session/") || pathname.startsWith("/summary/"),
    [pathname]
  );

  if (shouldHideNav) return null;

  return (
    <>
      <nav className="sticky top-0 z-50 w-full bg-background border-b border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-3 group shrink-0"
              aria-label="Tournament Tracker Home"
            >
              <div className="relative">
                <TrophySolid className="w-8 h-8 text-primary group-hover:scale-105 transition-transform duration-200" />
              </div>
              <span className="hidden sm:block text-lg font-black tracking-tight text-foreground uppercase">
                Tournament<span className="text-primary">Tracker</span>
              </span>
            </Link>

            <DesktopNav navItems={navItems} pathname={pathname} />

            <UserMenu
              user={user}
              isConfigured={isConfigured}
              onSignOut={() => signOut()}
            />

            <MobileNav
              navItems={navItems}
              pathname={pathname}
              user={user}
              isConfigured={isConfigured}
              onSignOut={() => signOut()}
            />
          </div>
        </div>
      </nav>

      <SessionAuth open={showAuth} onOpenChange={setShowAuth} showViewerOption={false} />
    </>
  );
});
Navigation.displayName = "Navigation";
