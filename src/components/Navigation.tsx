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
  Bars3Icon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { TrophyIcon as TrophySolid } from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { SessionAuth } from "@/components/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const navItems = [
  { href: "/", label: "Home", icon: HomeIcon, description: "Overview & stats" },
  { href: "/teams", label: "Teams", icon: UserGroupIcon, description: "Manage your teams" },
  { href: "/quick-match", label: "Quick", icon: BoltIcon, description: "Start a fast game" },
  { href: "/competitions", label: "Compete", icon: TrophyIcon, description: "Tournaments & leagues" },
  { href: "/summaries", label: "History", icon: ClockIcon, description: "Session history" },
];

// Memoized nav item component - Flat uppercase style
const NavItem = memo(({
  href,
  label,
  isActive
}: {
  href: string;
  label: string;
  isActive: boolean;
}) => (
  <Link
    href={href}
    className={`
      relative px-4 py-2 uppercase tracking-wider text-sm font-bold transition-colors duration-200
      ${isActive
        ? "text-primary"
        : "text-foreground hover:text-primary"
      }
    `}
    aria-label={label}
    aria-current={isActive ? "page" : undefined}
  >
    {label}
    {/* Active underline indicator */}
    {isActive && (
      <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full" />
    )}
  </Link>
));
NavItem.displayName = "NavItem";

// Memoized mobile nav item - More rounded and playful
const MobileNavItem = memo(({
  href,
  label,
  description,
  icon: Icon,
  isActive
}: {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
}) => (
  <SheetClose asChild>
    <Link
      href={href}
      className={`
        flex items-center gap-4 px-4 py-3 rounded-2xl
        transition-all duration-200
        ${isActive
          ? "bg-primary text-primary-foreground shadow-soft"
          : "hover:bg-accent hover:scale-[1.01]"
        }
      `}
      aria-current={isActive ? "page" : undefined}
    >
      <div className={`
        w-10 h-10 rounded-xl flex items-center justify-center
        ${isActive
          ? "bg-primary-foreground/20"
          : "bg-accent"
        }
      `}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex flex-col">
        <span className="font-semibold">{label}</span>
        <span className={`text-xs ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          {description}
        </span>
      </div>
    </Link>
  </SheetClose>
));
MobileNavItem.displayName = "MobileNavItem";

export const Navigation = memo(() => {
  const pathname = usePathname();
  const { user, signOut, isConfigured, isGuest } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  // Memoize whether to show nav
  const shouldHideNav = useMemo(
    () => pathname.startsWith("/session/") || pathname.startsWith("/summary/"),
    [pathname]
  );

  // Don't show nav on session/summary pages (they have their own header)
  if (shouldHideNav) {
    return null;
  }

  return (
    <>
      {/* Flat Full-Width Navigation Bar */}
      <nav className="sticky top-0 z-50 w-full bg-background border-b border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo - Left */}
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

            {/* Desktop Navigation - Center */}
            <div className="hidden md:flex items-center gap-2">
              {navItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  isActive={pathname === item.href}
                />
              ))}
            </div>

            {/* Right side - CTA, Theme toggle & User actions */}
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
                          onClick={() => signOut()}
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

            {/* Mobile Menu Button */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" aria-label="Open menu" className="rounded-lg h-10 w-10">
                  <Bars3Icon className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0 bg-card border-l border-border">
                <SheetHeader className="p-6 pb-4">
                  <SheetTitle className="flex items-center gap-3">
                    <TrophySolid className="w-8 h-8 text-primary" />
                    <div>
                      <span className="font-black text-foreground uppercase">Tournament<span className="text-primary">Tracker</span></span>
                    </div>
                  </SheetTitle>
                </SheetHeader>

                {/* User info in mobile */}
                {isConfigured && user && (
                  <>
                    <div className="px-6 py-3 flex items-center gap-3 bg-accent/50">
                      <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                        <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-foreground">{user.displayName || "User"}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    <Separator className="bg-border" />
                  </>
                )}

                <Separator className="bg-border" />

                <div className="p-4 space-y-2">
                  {navItems.map((item) => (
                    <MobileNavItem
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      description={item.description}
                      icon={item.icon}
                      isActive={pathname === item.href}
                    />
                  ))}

                  {/* Quick Match CTA in mobile */}
                  <Separator className="my-4 bg-border" />
                  <SheetClose asChild>
                    <Link href="/quick-match" className="block">
                      <Button
                        variant="default"
                        className="w-full uppercase tracking-wider font-bold text-sm rounded-xl shadow-lg"
                      >
                        <BoltIcon className="w-5 h-5 mr-2" />
                        Quick Match
                      </Button>
                    </Link>
                  </SheetClose>

                  {/* Theme toggle in mobile menu */}
                  <Separator className="my-4 bg-border" />
                  <div className="flex items-center justify-between px-4 py-2">
                    <span className="text-sm font-medium text-muted-foreground">Theme</span>
                    <ThemeToggle />
                  </div>

                  {isConfigured && (
                    <>
                      <Separator className="my-4 bg-border" />

                      {user ? (
                        <SheetClose asChild>
                          <button
                            type="button"
                            onClick={() => signOut()}
                            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-destructive/10 text-destructive transition-all duration-200 cursor-pointer"
                          >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-destructive/10">
                              <ArrowLeftOnRectangleIcon className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="font-medium">Sign Out</span>
                              <span className="text-xs opacity-70">Log out of your account</span>
                            </div>
                          </button>
                        </SheetClose>
                      ) : (
                        <>
                          <SheetClose asChild>
                            <Link
                              href="/login"
                              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-accent transition-all duration-200 cursor-pointer"
                            >
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent">
                                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                              </div>
                              <div className="flex flex-col text-left">
                                <span className="font-medium text-foreground">Sign In</span>
                                <span className="text-xs text-muted-foreground">Unlock all features</span>
                              </div>
                            </Link>
                          </SheetClose>
                        </>
                      )}
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* Dialogs */}
      <SessionAuth open={showAuth} onOpenChange={setShowAuth} showViewerOption={false} />
    </>
  );
});
Navigation.displayName = "Navigation";
