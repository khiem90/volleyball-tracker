"use client";

import { memo } from "react";
import Link from "next/link";
import {
  BoltIcon,
  Bars3Icon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { TrophyIcon as TrophySolid } from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";
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
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { AuthUser } from "@/types/session";

type NavItemDef = {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

type MobileNavProps = {
  navItems: NavItemDef[];
  pathname: string;
  user: AuthUser | null;
  isConfigured: boolean;
  onSignOut: () => void;
};

const MobileNavItem = memo(function MobileNavItem({
  href,
  label,
  description,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
}) {
  return (
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
          ${isActive ? "bg-primary-foreground/20" : "bg-accent"}
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
  );
});

export const MobileNav = memo(function MobileNav({
  navItems,
  pathname,
  user,
  isConfigured,
  onSignOut,
}: MobileNavProps) {
  return (
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
              <span className="font-black text-foreground uppercase">
                Tournament<span className="text-primary">Tracker</span>
              </span>
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

          {/* Tools Section */}
          <Separator className="my-4 bg-border" />
          <div className="px-4 py-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tools
            </span>
          </div>
          <SheetClose asChild>
            <Link
              href="/tools/volleyball-rotations"
              className={`
                flex items-center gap-4 px-4 py-3 rounded-2xl
                transition-all duration-200
                ${pathname.startsWith("/tools/volleyball")
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "hover:bg-accent hover:scale-[1.01]"
                }
              `}
            >
              <div className={`
                w-10 h-10 rounded-xl flex items-center justify-center
                ${pathname.startsWith("/tools/volleyball")
                  ? "bg-primary-foreground/20"
                  : "bg-accent"
                }
              `}>
                <WrenchScrewdriverIcon className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">5-1 Rotations</span>
                <span className={`text-xs ${pathname.startsWith("/tools/volleyball") ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  Volleyball rotation visualizer
                </span>
              </div>
            </Link>
          </SheetClose>

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
                    onClick={onSignOut}
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
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
});
