"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Trophy, Zap } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/competitions", label: "Competitions", icon: Trophy },
  { href: "/quick-match", label: "Quick Match", icon: Zap },
];

export const Navigation = () => {
  const pathname = usePathname();

  return (
    <nav className="glass border-b border-border/50 px-4 py-3">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
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
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            Volley<span className="text-primary">Score</span>
          </h1>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg
                  text-sm font-medium transition-all duration-200
                  ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/80"
                  }
                `}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

