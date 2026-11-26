"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { SHELL_TABS, tabFor, tabGlyph, tabHref, type ShellTab } from "@/lib/shell";
import { Brand } from "@/components/shared/Brand";
import { Icon } from "@/components/shared/Icon";
import { AccountMenu } from "./AccountMenu";
import { GUTTER, GUTTER_WIDTHS } from "./frame";
import { UpdateBanner } from "./UpdateBanner";

/**
 * One tab, as a column in the phone tab bar or as a row in the desktop top
 * bar. The tab the page sits under is in ink with its glyph filled, and the
 * rest are in the soft ink. A tab a guest has to sign in for carries a small
 * lock, set clear of the glyph: beside it in the bar, after the label in the
 * row.
 */
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
  return (
    <Link
      href={tabHref(tab, isGuest)}
      aria-current={active ? "page" : undefined}
      className={
        layout === "bar"
          ? `flex h-full min-w-0 flex-auto flex-col items-center justify-center gap-[3px] px-0.5 text-tab font-semibold focus-visible:-outline-offset-2 ${
              active ? "text-ink" : "text-ink-soft"
            }`
          : `flex min-h-11 items-center gap-2 border-b-[3px] px-3 text-label font-semibold focus-visible:-outline-offset-2 ${
              active ? "border-action text-ink" : "border-transparent text-ink-soft hover:text-ink"
            }`
      }
    >
      <span className="relative">
        <Icon id={tabGlyph(tab, active)} size={layout === "bar" ? 22 : 16} className="block" />
        {locked && layout === "bar" && (
          <Icon id="lock" size={12} className="absolute left-full top-0 ml-0.5" />
        )}
      </span>
      <span className="max-w-full truncate">{tab.label}</span>
      {locked && layout === "row" && <Icon id="lock" size={12} className="-ml-1" />}
      {locked && <span className="sr-only">, sign in first</span>}
    </Link>
  );
};

/**
 * The frame around every page but sign-in and scoring: a white top bar with
 * the brand and the account menu, and the five tabs, in a white bar fixed
 * above the home indicator on a phone and in the top bar from lg up. Every
 * edge keeps clear of the notch, the status bar, and the home indicator.
 *
 * A page opens with a PageHeader, which sits against the top bar. On a phone
 * the brand row gives way to the back link of a page one level down, so the
 * row is hidden there while a back link is on the page. The strip above it
 * stays, and keeps the status bar's area white as the page scrolls.
 */
export const AppShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const { isGuest } = useAuth();
  const current = tabFor(pathname);

  return (
    <div className={`group/shell min-h-screen bg-ground text-ink ${GUTTER_WIDTHS}`}>
      <header className="sticky top-0 z-40 bg-surface pt-[env(safe-area-inset-top)]">
        <div
          className={`flex h-14 items-center gap-3 border-b border-line max-lg:group-has-[[data-back-link]]/shell:hidden ${GUTTER}`}
        >
          <Link href="/" className="flex min-h-11 min-w-0 items-center" aria-label="Tournament Tracker home">
            <Brand />
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
        <UpdateBanner />
      </header>

      <main
        className={`pt-(--shell-top) pb-[calc(var(--tab-bar-space)+env(safe-area-inset-bottom)+1.5rem)] ${GUTTER}`}
      >
        {children}
      </main>

      <nav
        aria-label="Sections"
        data-tab-bar
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] lg:hidden"
      >
        <div className="flex h-(--tab-bar-height)">
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
