"use client";

import { useState, memo, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Users, Trophy, Zap, Menu, LogIn, LogOut, History } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { SessionAuth } from "./SessionAuth";

const navItems = [
  { href: "/", label: "Home", icon: Home, description: "Overview & stats" },
  { href: "/teams", label: "Teams", icon: Users, description: "Manage your teams" },
  { href: "/quick-match", label: "Quick", icon: Zap, description: "Start a fast game" },
  { href: "/competitions", label: "Compete", icon: Trophy, description: "Tournaments & leagues" },
  { href: "/summaries", label: "History", icon: History, description: "Session history" },
];

// Memoized nav item component
const NavItem = memo(({ 
  href, 
  label, 
  icon: Icon, 
  isActive 
}: { 
  href: string; 
  label: string; 
  icon: React.ComponentType<{ className?: string }>; 
  isActive: boolean;
}) => (
  <Link
    href={href}
    className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200"
    aria-label={label}
    aria-current={isActive ? "page" : undefined}
  >
    {/* Active indicator with layoutId for smooth animation */}
    {isActive && (
      <motion.span 
        layoutId="nav-active-indicator"
        className="absolute inset-0 bg-primary rounded-xl shadow-lg shadow-primary/30"
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />
    )}
    <Icon className={`w-4 h-4 relative z-10 transition-colors ${
      isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
    }`} />
    <span className={`relative z-10 transition-colors ${
      isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
    }`}>
      {label}
    </span>
  </Link>
));
NavItem.displayName = "NavItem";

// Memoized mobile nav item
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
        w-10 h-10 rounded-xl flex items-center justify-center
        ${isActive 
          ? "bg-primary-foreground/20" 
          : "bg-accent/50"
        }
      `}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex flex-col">
        <span className="font-medium">{label}</span>
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
  const { user, signOut, isConfigured } = useAuth();
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
      {/* Floating Navigation Bar - CSS animation instead of framer-motion */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl animate-fade-in">
        <div className="glass-nav rounded-2xl px-2 py-2">
          <div className="flex items-center justify-between gap-2">
            {/* Logo - visible on mobile and as accent on desktop */}
            <Link 
              href="/" 
              className="flex items-center gap-2 pl-2 md:pl-3 group shrink-0" 
              aria-label="VolleyScore Home"
            >
              <div className="relative">
                <div className="w-9 h-9 bg-linear-to-br from-primary via-primary/90 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-all duration-300 group-hover:scale-105">
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
              </div>
              <span className="hidden lg:block text-sm font-bold tracking-tight">
                Volley<span className="text-primary">Score</span>
              </span>
            </Link>

            {/* Desktop Navigation - Pill Items */}
            <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
              {navItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  isActive={pathname === item.href}
                />
              ))}
            </div>

            {/* Right side - User actions */}
            <div className="hidden md:flex items-center gap-2 pr-2">
              {isConfigured && (
                user ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => signOut()}
                          className="cursor-pointer rounded-xl h-9 w-9 hover:bg-accent/50"
                        >
                          <Avatar className="w-7 h-7 ring-2 ring-primary/20">
                            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
                            <AvatarFallback className="text-xs bg-primary/20 text-primary">
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAuth(true)}
                    className="gap-2 cursor-pointer rounded-xl hover:bg-accent/50"
                  >
                    <LogIn className="w-4 h-4" />
                    <span className="hidden lg:inline">Sign In</span>
                  </Button>
                )
              )}
            </div>

            {/* Mobile Menu Button */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" aria-label="Open menu" className="rounded-xl h-9 w-9">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0 glass-card border-l border-glass-border">
                <SheetHeader className="p-6 pb-4">
                  <SheetTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-linear-to-br from-primary to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
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
                    <div className="px-6 py-3 flex items-center gap-3 bg-accent/30">
                      <Avatar className="w-10 h-10 ring-2 ring-primary/30">
                        <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.displayName || "User"}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    <Separator className="bg-border/30" />
                  </>
                )}
                
                <Separator className="bg-border/30" />
                
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

                  {isConfigured && (
                    <>
                      <Separator className="my-4 bg-border/30" />

                      {user ? (
                        <SheetClose asChild>
                          <button
                            type="button"
                            onClick={() => signOut()}
                            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-destructive/10 text-destructive transition-all duration-200 cursor-pointer"
                          >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-destructive/10">
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
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent/50">
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
        </div>
      </nav>

      {/* Spacer to prevent content from hiding under fixed nav */}
      <div className="h-20" />

      {/* Dialogs */}
      <SessionAuth open={showAuth} onOpenChange={setShowAuth} showViewerOption={false} />
    </>
  );
});
Navigation.displayName = "Navigation";
