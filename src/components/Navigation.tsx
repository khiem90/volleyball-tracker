"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Trophy, Zap, Menu, LogIn, LogOut, History } from "lucide-react";
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
import { SessionAuth } from "./SessionAuth";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home, description: "Overview & stats" },
  { href: "/teams", label: "Teams", icon: Users, description: "Manage your teams" },
  { href: "/competitions", label: "Competitions", icon: Trophy, description: "Tournaments & leagues" },
  { href: "/quick-match", label: "Quick Match", icon: Zap, description: "Start a fast game" },
  { href: "/summaries", label: "History", icon: History, description: "Session history" },
];

export const Navigation = () => {
  const pathname = usePathname();
  const { user, signOut, isConfigured } = useAuth();

  const [showAuth, setShowAuth] = useState(false);

  // Don't show nav on session/summary pages (they have their own header)
  if (pathname.startsWith("/session/") || pathname.startsWith("/summary/")) {
    return null;
  }

  return (
    <>
      <nav className="sticky top-0 z-50 glass border-b border-border/40">
        <div className="flex items-center justify-between max-w-6xl mx-auto px-4 h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group" aria-label="VolleyScore Home">
            <div className="relative">
              <div className="w-10 h-10 bg-linear-to-br from-primary via-primary/90 to-primary/70 rounded-xl flex items-center justify-center shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-all duration-300 group-hover:scale-105">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-5 h-5 text-primary-foreground"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 3c0 9 9 9 9 9" strokeWidth="1.5" />
                  <path d="M12 3c0 9-9 9-9 9" strokeWidth="1.5" />
                  <path d="M3 12c9 0 9 9 9 9" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="absolute -inset-1 bg-primary/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold tracking-tight leading-none">
                Volley<span className="text-primary">Score</span>
              </h1>
              <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">
                Track & Compete
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    relative flex items-center gap-2 px-4 py-2 rounded-lg
                    text-sm font-medium transition-all duration-200 color-transition
                    ${isActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    }
                  `}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  {isActive && (
                    <span className="absolute inset-0 bg-primary rounded-lg shadow-lg shadow-primary/25" />
                  )}
                  <Icon className={`w-4 h-4 relative z-10 ${isActive ? "text-primary-foreground" : ""}`} />
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right side actions */}
          <div className="hidden md:flex items-center gap-2">
            {isConfigured && (
              user ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => signOut()}
                        className="cursor-pointer"
                      >
                        <Avatar className="w-7 h-7">
                          <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
                          <AvatarFallback className="text-xs">
                            {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {user.displayName || user.email}
                      <br />
                      <span className="text-xs text-muted-foreground">Click to sign out</span>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAuth(true)}
                  className="gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Button>
              )
            )}
          </div>

          {/* Mobile Navigation */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0">
              <SheetHeader className="p-6 pb-4">
                <SheetTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-linear-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-5 h-5 text-primary-foreground"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 3c0 9 9 9 9 9" strokeWidth="1.5" />
                      <path d="M12 3c0 9-9 9-9 9" strokeWidth="1.5" />
                      <path d="M3 12c9 0 9 9 9 9" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-bold">VolleyScore</span>
                  </div>
                </SheetTitle>
              </SheetHeader>
              
              {/* User info in mobile */}
              {isConfigured && user && (
                <>
                  <div className="px-6 py-3 flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
                      <AvatarFallback>
                        {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.displayName || "User"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  <Separator />
                </>
              )}
              
              <Separator />
              
              <div className="p-4 space-y-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <SheetClose asChild key={item.href}>
                      <Link
                        href={item.href}
                        className={`
                          flex items-center gap-4 px-4 py-3 rounded-xl
                          transition-all duration-200
                          ${isActive
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                            : "hover:bg-accent/50"
                          }
                        `}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <div className={`
                          w-10 h-10 rounded-lg flex items-center justify-center
                          ${isActive 
                            ? "bg-primary-foreground/20" 
                            : "bg-accent"
                          }
                        `}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">{item.label}</span>
                          <span className={`text-xs ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {item.description}
                          </span>
                        </div>
                      </Link>
                    </SheetClose>
                  );
                })}

                {isConfigured && (
                  <>
                    <Separator className="my-4" />

                    {user ? (
                      <SheetClose asChild>
                        <button
                          type="button"
                          onClick={() => signOut()}
                          className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-destructive/10 text-destructive transition-all duration-200 cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-destructive/10">
                            <LogOut className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="font-medium">Sign Out</span>
                            <span className="text-xs opacity-70">Log out of your account</span>
                          </div>
                        </button>
                      </SheetClose>
                    ) : (
                      <SheetClose asChild>
                        <button
                          type="button"
                          onClick={() => setShowAuth(true)}
                          className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-accent/50 transition-all duration-200 cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-accent">
                            <LogIn className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="font-medium">Sign In</span>
                            <span className="text-xs text-muted-foreground">Access your sessions</span>
                          </div>
                        </button>
                      </SheetClose>
                    )}
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Dialogs */}
      <SessionAuth open={showAuth} onOpenChange={setShowAuth} showViewerOption={false} />
    </>
  );
};
