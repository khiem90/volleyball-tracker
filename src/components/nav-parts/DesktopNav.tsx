"use client";

import { memo } from "react";
import Link from "next/link";
import {
  WrenchScrewdriverIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItemDef = {
  href: string;
  label: string;
};

type DesktopNavProps = {
  navItems: NavItemDef[];
  pathname: string;
};

const NavItem = memo(function NavItem({
  href,
  label,
  isActive,
}: {
  href: string;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={`
        relative px-4 py-2 uppercase tracking-wider text-sm font-bold transition-colors duration-200
        ${isActive ? "text-primary" : "text-foreground hover:text-primary"}
      `}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
    >
      {label}
      {isActive && (
        <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full" />
      )}
    </Link>
  );
});

export const DesktopNav = memo(function DesktopNav({
  navItems,
  pathname,
}: DesktopNavProps) {
  return (
    <div className="hidden md:flex items-center gap-2">
      {navItems.map((item) => (
        <NavItem
          key={item.href}
          href={item.href}
          label={item.label}
          isActive={pathname === item.href}
        />
      ))}

      {/* Tools Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className={`
            relative px-4 py-2 uppercase tracking-wider text-sm font-bold transition-colors duration-200
            flex items-center gap-1 cursor-pointer
            ${pathname.startsWith("/tools") ? "text-primary" : "text-foreground hover:text-primary"}
            focus:outline-none
          `}
        >
          Tools
          <ChevronDownIcon className="w-3.5 h-3.5" />
          {pathname.startsWith("/tools") && (
            <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-50">
          <DropdownMenuItem asChild>
            <Link
              href="/tools/volleyball-rotations"
              className="flex items-center gap-2 cursor-pointer"
            >
              <WrenchScrewdriverIcon className="w-4 h-4" />
              <span>5-1 Rotations</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});
