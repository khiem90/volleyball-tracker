"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { SHELL_TABS, tabFor, tabHref, type ShellTab } from "@/lib/shell";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { AccountMenu } from "./AccountMenu";

// Side padding that clears a landscape phone's notch and rounded corners.
const GUTTER =
  "pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] lg:px-8";

/** One tab, as a column in the phone tab bar or as a row in the desktop top bar. */
const TabLink = ({
  tab,
  active,
  isGuest,
  layout,
}: {
  tab: ShellTab;
  active: boolean;
  isGuest: boolean;
  layout: "bar" | "row";
}) => {
  const locked = isGuest && tab.needsAccount;
  const tone = active ? "border-mb-coral text-mb-coral" : "border-transparent text-mb-navy";
  return (
    <Link
      href={tabHref(tab, isGuest)}
      aria-current={active ? "page" : undefined}
      className={
        layout === "bar"
          ? `matchbook-display flex h-full min-w-0 flex-col items-center justify-center gap-1 border-t-[3px] px-0.5 text-[0.62rem] font-bold tracking-[0.06em] ${tone}`
          : `matchbook-display flex min-h-11 items-center gap-2 border-b-[3px] px-3 text-[0.78rem] font-bold tracking-[0.08em] ${tone}`
      }
    >
      <span className="relative">
        <MbIcon id={tab.icon} size={layout === "bar" ? 22 : 16} className="block" />
        {locked && (
          <span className="absolute -right-2 -top-1.5 flex size-3.5 items-center justify-center rounded-full bg-mb-paper-bright text-mb-ink-muted">
            <MbIcon id="lock" size={10} />
          </span>
        )}
      </span>
      <span className="max-w-full truncate">{tab.label}</span>
      {locked && <span className="sr-only">, sign in first</span>}
    </Link>
  );
};

/**
 * The frame around every page but sign-in and scoring: a top bar with the
 * brand and the account menu, and the four tabs, in a bar fixed above the
 * home indicator on a phone and in the top bar from lg up. Every edge
 * keeps clear of the notch, the status bar, and the home indicator.
 */
export const AppShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const { isGuest } = useAuth();
  const current = tabFor(pathname);

  return (
    <div className="matchbook-surface min-h-screen">
      <header className="sticky top-0 z-40 border-b-[1.5px] border-mb-navy bg-mb-paper pt-[env(safe-area-inset-top)]">
        <div className={`flex h-14 items-center gap-3 ${GUTTER}`}>
          <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="Tournament Tracker home">
            <Image
              src="/assets/matchbook/brand/crest.svg"
              alt=""
              width={30}
              height={35}
              priority
            />
            <span className="matchbook-display truncate text-[0.95rem] font-bold leading-none">
              <span className="text-mb-navy">Tournament </span>
              <span className="text-mb-coral">Tracker</span>
            </span>
          </Link>
          <nav aria-label="Sections" className="ml-auto hidden self-stretch lg:flex">
            {SHELL_TABS.map((tab) => (
              <TabLink
                key={tab.id}
                tab={tab}
                active={tab.id === current}
                isGuest={isGuest}
                layout="row"
              />
            ))}
          </nav>
          <div className="ml-auto shrink-0 lg:ml-2">
            <AccountMenu />
          </div>
        </div>
      </header>

      <main
        className={`pt-5 pb-[calc(var(--tab-bar-space)+env(safe-area-inset-bottom)+1.5rem)] ${GUTTER}`}
      >
        {children}
      </main>

      <nav
        aria-label="Sections"
        data-tab-bar
        className="fixed inset-x-0 bottom-0 z-40 border-t-[1.5px] border-mb-navy bg-mb-paper-bright pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] lg:hidden"
      >
        <div className="grid h-(--tab-bar-height) grid-cols-4">
          {SHELL_TABS.map((tab) => (
            <TabLink
              key={tab.id}
              tab={tab}
              active={tab.id === current}
              isGuest={isGuest}
              layout="bar"
            />
          ))}
        </div>
      </nav>
    </div>
  );
};
