"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { MbIcon } from "./MbIcon";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: "overview" },
  { href: "/teams", label: "Teams", icon: "teams" },
  { href: "/quick-match", label: "Quick", icon: "quick" },
  { href: "/competitions", label: "Compete", icon: "compete" },
  { href: "/summaries", label: "History", icon: "history" },
  { href: "/tools", label: "Tools", icon: "tools" },
];

export const MatchbookSidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-[218px] shrink-0 flex-col border-r border-mb-rule min-h-screen sticky top-0 max-h-screen overflow-y-auto scrollbar-thin">
      {/* Brand */}
      <Link href="/" className="flex flex-col items-center gap-2 px-6 pt-7 pb-5">
        <Image
          src="/assets/matchbook/brand/crest.svg"
          alt="Tournament Tracker crest"
          width={64}
          height={72}
          priority
        />
        <span className="matchbook-display text-center leading-[1.05] text-[1.05rem] font-bold">
          <span className="block text-mb-navy">Tournament</span>
          <span className="block text-mb-coral">Tracker</span>
        </span>
      </Link>

      <div className="border-t border-mb-rule mx-5 mb-2" />

      {/* Navigation */}
      <nav className="flex flex-col">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="mb-nav-item"
              data-active={active}
            >
              <MbIcon id={item.icon} size={18} className="shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 pt-5">
        <Link href="/teams" className="mb-btn mb-btn-outline w-full">
          <MbIcon id="plus" size={14} />
          Create Team
        </Link>
      </div>

      <div className="mt-auto px-5 pb-6 pt-8 space-y-1">
        <div className="border-t border-mb-rule mb-3" />
        <Link
          href="/login"
          className="flex items-center gap-2.5 py-1.5 text-[0.8rem] font-medium text-mb-navy hover:text-mb-coral transition-colors"
        >
          <MbIcon id="settings" size={16} />
          Account
        </Link>
      </div>
    </aside>
  );
};
