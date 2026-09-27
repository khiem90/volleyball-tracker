/**
 * The app shell's navigation, the pure part: the four tabs, which tab a
 * page sits under, and where a tab leads a guest. The tab bar and the top
 * bar read it; nothing in here touches the browser.
 */

export type ShellTabId = "home" | "teams" | "tournaments" | "history";

export interface ShellTab {
  id: ShellTabId;
  label: string;
  /** The page the tab opens. */
  href: string;
  /** The matchbook sprite icon. */
  icon: string;
  /** Whether the tab's pages need an account. A guest is sent to sign in first. */
  needsAccount: boolean;
}

export const SHELL_TABS: readonly ShellTab[] = [
  { id: "home", label: "Home", href: "/", icon: "overview", needsAccount: false },
  { id: "teams", label: "Teams", href: "/teams", icon: "teams", needsAccount: true },
  {
    id: "tournaments",
    label: "Tournaments",
    href: "/competitions",
    icon: "compete",
    needsAccount: true,
  },
  { id: "history", label: "History", href: "/summaries", icon: "history", needsAccount: true },
];

/** The sign-in page, coming back to `returnTo` once signed in. */
export const signInHref = (returnTo: string): string =>
  `/login?redirect=${encodeURIComponent(returnTo)}`;

/**
 * Where a tab leads. A guest goes to sign in before a tab that needs an
 * account, so the tap lands where it says rather than bouncing off the page.
 */
export const tabHref = (tab: ShellTab, isGuest: boolean): string =>
  isGuest && tab.needsAccount ? signInHref(tab.href) : tab.href;

// Pages outside the four sections that are reached from Home.
const REACHED_FROM_HOME = ["/quick-match", "/tools"];

const isAt = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

/**
 * The tab a page sits under. Quick match and the tools sit under Home;
 * sign-in and the scoring page, which have no shell, sit under none.
 */
export const tabFor = (pathname: string): ShellTabId | null => {
  if (pathname === "/" || REACHED_FROM_HOME.some((base) => isAt(pathname, base))) return "home";
  return SHELL_TABS.find((tab) => tab.href !== "/" && isAt(pathname, tab.href))?.id ?? null;
};
