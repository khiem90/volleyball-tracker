"use client";

import Image from "next/image";
import Link from "next/link";
import { MbButtonLink } from "./Button";
import { MbIconButton } from "./IconButton";
import { MbAccountChip } from "./AccountChip";

/* ===========================================================================
   THE MOBILE IDENTITY STRIP

   What replaces the top half of `MatchbookMobileBar`. The bottom half — a
   horizontally scrolling row of six 30px text links — is replaced by
   `MatchbookBottomBar`; between them they resolve W6 through W11 of the shell
   brief.

   The strip carries identity and CONTEXT and nothing else. No nav links (they
   are in the bar), and no duplicate primary CTA: the mobile bar rendered
   "Quick Match" 131x39 and the masthead rendered "Quick Match" 152x39 about
   120px apart on three of the six screens (W10).

   It is sticky rather than static, because the thing it replaces scrolled away
   entirely and left a phone with no navigation, no brand and no back
   affordance on screen after one flick (W8).
   =========================================================================== */

export interface MbTopStripBack {
  href?: string;
  onClick?: () => void;
  /** The visible word AND the accessible name. Keep it to one short word. */
  label: string;
}

export interface MbTopStripAction {
  /** Sprite icon id. */
  icon: string;
  /** Becomes `title` and `aria-label`. */
  label: string;
  onClick: () => void;
}

/** The 28px crest lockup, home on the dashboard, a real link everywhere. */
const BrandMark = () => (
  <Link
    href="/"
    aria-label="Tournament Tracker — overview"
    title="Tournament Tracker — overview"
    className="mb-btn-touch inline-flex shrink-0 items-center justify-center rounded-[3px] transition-colors hover:bg-[var(--mb-tint-2)]"
  >
    <Image
      src="/assets/matchbook/brand/crest.svg"
      alt=""
      width={24}
      height={28}
      priority
    />
  </Link>
);

/**
 * `{ title, back?, action? }` (charter §2.3). Rendered by
 * `MatchbookShell variant="console"` below `lg`; `variant="focus"` uses
 * `MbEventBar` instead, and `variant="public"` uses its own brand lockup.
 */
export const MatchbookTopStrip = ({
  title,
  back,
  action,
  account = true,
}: {
  title: string;
  back?: MbTopStripBack;
  action?: MbTopStripAction;
  /** `false` on any surface that must not touch `AuthContext`. */
  account?: boolean;
}) => (
  <div className="mb-safe-top mb-print-hide sticky top-0 z-30 border-b border-mb-rule bg-mb-paper lg:hidden">
    <div className="flex min-h-[56px] items-center gap-2 px-2 py-1">
      {back ? (
        back.href ? (
          <MbButtonLink
            href={back.href}
            variant="outline-navy"
            icon="chevron-left"
            className="shrink-0"
          >
            {back.label}
          </MbButtonLink>
        ) : (
          <MbIconButton
            icon="chevron-left"
            label={back.label}
            onClick={back.onClick}
            className="shrink-0"
          />
        )
      ) : (
        <BrandMark />
      )}

      {/* The screen's own name, which the masthead used to carry until it
          scrolled away. `min-w-0` + `truncate` is what stops a long event name
          pushing the account control off the right edge. */}
      <span className="matchbook-display min-w-0 flex-1 truncate text-[0.8rem] font-bold tracking-[0.06em]">
        {title}
      </span>

      {action && (
        <MbIconButton
          icon={action.icon}
          label={action.label}
          onClick={action.onClick}
          className="shrink-0"
        />
      )}
      {account && <MbAccountChip variant="compact" className="shrink-0" />}
    </div>
  </div>
);
