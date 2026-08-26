"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { MbButtonLink, type MbButtonVariant } from "./Button";
import { MbAccountChip } from "./AccountChip";
import { MbIcon } from "./MbIcon";
import { MB_NAV_ALL, mbNavActive } from "./BottomBar";

export interface MbSidebarCta {
  href: string;
  label: string;
  /** Sprite icon id. */
  icon?: string;
  /**
   * Coral by default, because the rail's key is normally the screen's primary
   * action. It is a prop because only **one** coral fill is allowed per
   * screen and on two of the six console routes the primary action is an
   * `onClick`, not a link — `/quick-match` starts a match, `/summaries`
   * exports a CSV — so it can only live in the masthead. On those routes the
   * rail still wants a useful destination, and it takes `outline-navy` so the
   * screen's single coral stays where the primary actually is.
   *
   * Without this the rail and the masthead each painted a coral fill and every
   * converted screen carried two primaries.
   */
  variant?: MbButtonVariant;
}

/**
 * The desktop rail. Geometry is unchanged from what shipped — `w-[218px]`,
 * `border-r border-mb-rule`, sticky, its own scroll — and four things inside it
 * are not:
 *
 *   1. `.scrollbar-thin` is gone. It is a LEGACY class whose thumb is
 *      `oklch(0.7 0.08 25 / 0.3)`, the pre-Matchbook warm red, and this file
 *      was one of only two Matchbook components consuming anything from the
 *      legacy stylesheet. The native scrollbar is the
 *      correct answer here: the rail only scrolls on a short viewport.
 *   2. `<nav aria-label="Primary">` and `aria-current="page"`, neither of which
 *      any of the app's three navigations had.
 *   3. The CTA is the screen's real primary action instead of a "Create Team"
 *      link that navigated to `/teams` and stopped — and was a self-link from
 *      `/teams` itself (shell brief W5).
 *   4. The footer is `MbAccountChip`, so sign-out and the signed-in address are
 *      reachable from a Matchbook route for the first time (W4). It used to be
 *      a `<Link href="/login">` that redirects a signed-in user straight back
 *      to `/`.
 *
 * `active` and `cta` are optional so the six shipped screens keep compiling
 * while a sibling converts them; both default to the same values the shell
 * passes.
 */
export const MatchbookSidebar = ({
  active,
  cta = { href: "/quick-match", label: "Quick Match", icon: "quick" },
}: {
  active?: string;
  cta?: MbSidebarCta;
} = {}) => {
  const pathname = usePathname();
  const here = active ?? pathname;

  return (
    <aside className="mb-safe-top mb-print-hide sticky top-0 hidden max-h-screen min-h-screen w-[218px] shrink-0 flex-col overflow-y-auto border-r border-mb-rule lg:flex">
      {/* Brand */}
      <Link href="/" className="flex flex-col items-center gap-2 px-6 pt-7 pb-5">
        <Image
          src="/assets/matchbook/brand/crest.svg"
          alt="Tournament Tracker crest"
          width={64}
          height={72}
          priority
        />
        {/* `display/stat-sm`. The lockup was `text-[1.05rem]` — 16.8px, dead
            between steps 0.95 and 1.2 — and it was one of THREE sizes the same
            two-word wordmark was drawn at (1.15rem on /login, 1.05rem here and
            in `global-error`). One mark, one step; 1.2rem is the nearest, and
            "Tournament" still fits the 170px the 218px rail leaves it.

            "Tracker" stays `--mb-coral-deep`, not `--mb-coral`. At 16.8px/700
            the bright coral measured 3.26:1 on `--mb-paper` against a 4.5:1
            floor; 19.2px/700 now clears WCAG's 18.66px large-text threshold, so
            3:1 would suffice — but §1.3 makes the ink twin the rule rather than
            a size check, and at label size it reads as the same colour. */}
        <span className="matchbook-display text-center leading-[1.05] text-[1.2rem] mb-track-display font-bold">
          <span className="block text-mb-navy">Tournament</span>
          <span className="block text-mb-coral-deep">Tracker</span>
        </span>
      </Link>

      <div className="border-t border-mb-rule mx-5 mb-2" />

      {/* Two measurements decided this markup.
          `min-h-11` — the rows render 217x38 with a MOUSE. The coarse-pointer
          floor `layout.tsx` arms only fires at `pointer: coarse`, and invariant
          33 is not scoped to touch, so the rail needs the floor unconditionally.
          `.mb-nav-item` declares no `min-height` of its own, so the utility
          applies without a fight.
          `divide-y` — six 44px rows that abut at 0px are six adjacent
          interactive boxes under the 8px separation floor. A hairline between
          them is both the fix and the system's own list vocabulary: it makes
          the rail one ruled ledger rather than six crowded controls. */}
      <nav aria-label="Primary" className="flex flex-col divide-y divide-mb-rule">
        {MB_NAV_ALL.map((item) => {
          const on = mbNavActive(here, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="mb-nav-item min-h-11"
              data-active={on}
              aria-current={on ? "page" : undefined}
            >
              <MbIcon id={item.icon} size={18} className="shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 pt-5">
        <MbButtonLink
          href={cta.href}
          variant={cta.variant ?? "coral"}
          icon={cta.icon}
          fullWidth
        >
          {cta.label}
        </MbButtonLink>
      </div>

      <div className="mt-auto px-5 pt-8 pb-6">
        <div className="mb-4 border-t border-mb-rule" />
        <MbAccountChip variant="rail" />
      </div>
    </aside>
  );
};
