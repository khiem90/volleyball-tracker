"use client";

import Link from "next/link";
import Image from "next/image";

const MOBILE_NAV = [
  { href: "/", label: "Overview" },
  { href: "/teams", label: "Teams" },
  { href: "/quick-match", label: "Quick" },
  { href: "/competitions", label: "Compete" },
  { href: "/summaries", label: "History" },
  { href: "/tools", label: "Tools" },
];

// Compact brand bar + horizontal nav shown below the lg breakpoint, where the
// matchbook sidebar is hidden.
export const MatchbookMobileBar = ({
  active,
  cta,
}: {
  active: string;
  cta: { href: string; label: string };
}) => (
  <div className="lg:hidden border-b border-mb-rule">
    <div className="flex items-center justify-between px-4 pt-4 pb-2">
      <Link href="/" className="flex items-center gap-2.5">
        <Image
          src="/assets/matchbook/brand/crest.svg"
          alt="Tournament Tracker crest"
          width={34}
          height={40}
          priority
        />
        <span className="matchbook-display text-[0.95rem] font-bold leading-none">
          <span className="text-mb-navy">Tournament </span>
          <span className="text-mb-coral">Tracker</span>
        </span>
      </Link>
      <Link href={cta.href} className="mb-btn mb-btn-coral px-3 py-1.5 text-[0.7rem]">
        {cta.label}
      </Link>
    </div>
    <nav className="flex gap-1 overflow-x-auto px-2 pb-1 scrollbar-thin">
      {MOBILE_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="matchbook-display shrink-0 px-3 py-1.5 text-[0.74rem] font-semibold tracking-[0.08em]"
          style={{
            color: item.href === active ? "var(--mb-coral)" : "var(--mb-navy)",
          }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  </div>
);
