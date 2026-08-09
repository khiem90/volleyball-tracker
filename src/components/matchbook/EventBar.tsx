"use client";

import type { CSSProperties, ReactNode } from "react";
import { MbButtonLink } from "./Button";
import { MbIconButton } from "./IconButton";

/* ===========================================================================
   THE NAVY EVENT STRIP

   Distinct from `MatchbookMasthead`, and deliberately not a variant of it
   (charter Appendix A, D-5): the editorial masthead is paper, static, and sets
   a 3rem headline; the event strip is navy, sticky, 56px, and exists to keep
   the event's identity and the way out on screen while the body of the page is
   a scoring console or a public scoreboard.

   Used by `MatchbookShell variant="focus"` (live scoring — where it is the
   *only* chrome, per shell brief R4) and available to `variant="public"` for
   the share routes.

   NAVY GROUND, so `--mb-focus` is re-pointed here rather than a ring being
   restated: the token is inherited and every navy surface in the system flips
   it to paper-bright (12.84:1 against the navy's 1.00:1). See the focus block
   in `globals.css`.
   =========================================================================== */

export interface MbEventBarBack {
  href?: string;
  onClick?: () => void;
  /** Visible word and accessible name. */
  label: string;
}

/** Paper-bright ink and rules, plus the inherited focus ring flip. */
const NAVY_SURFACE = {
  background: "var(--mb-navy)",
  color: "var(--mb-paper-bright)",
  borderBottom: "var(--mb-rule-edge) solid var(--mb-rule-on-navy)",
  "--mb-focus": "var(--mb-paper-bright)",
} as CSSProperties;

/**
 * THE ON-NAVY CONTROL TREATMENT — spread this onto any `.mb-btn` you put in the
 * bar, including through `actions` and `status`.
 *
 * It has to be an inline style rather than a class, and that is not a
 * preference. `.mb-btn-outline` declares `color: var(--mb-navy)` and
 * `border-color: var(--mb-navy)` in UNLAYERED CSS, and unlayered declarations
 * beat every Tailwind utility regardless of specificity — the same trap
 * `Button.tsx` documents for `.mb-btn`'s padding. A `text-[…]` class on a
 * control in this bar is silently inert and paints navy ink on a navy ground,
 * which is how the first cut of this component rendered an invisible Exit
 * button.
 *
 * The hover wash is deliberately not restored. `--mb-tint-2` is a 6% navy wash;
 * on a navy ground it is invisible, so there was never anything to keep. The
 * press (`translateY(--mb-press-shift)`) and the paper-bright focus ring both
 * still respond, so the control is not silent.
 */
export const MB_ON_NAVY_CONTROL: CSSProperties = {
  color: "var(--mb-paper-bright)",
  borderColor: "var(--mb-rule-on-navy)",
  background: "transparent",
};

export const MbEventBar = ({
  back,
  title,
  kicker,
  status,
  actions,
  sticky = true,
  className = "",
}: {
  back?: MbEventBarBack;
  title: ReactNode;
  /** The eyebrow above the title — competition name, round, venue. */
  kicker?: ReactNode;
  /** A live/final mark. Rendered right of the title on wide viewports. */
  status?: ReactNode;
  /** Trailing controls. Keep to two; they compete with the score. */
  actions?: ReactNode;
  sticky?: boolean;
  className?: string;
}) => (
  <header
    className={`mb-safe-top mb-print-hide ${
      sticky ? "sticky top-0 z-30" : ""
    } ${className}`}
    style={NAVY_SURFACE}
  >
    <div className="flex min-h-[56px] items-center gap-3 px-3 py-1.5 sm:px-4">
      {back &&
        (back.href ? (
          <MbButtonLink
            href={back.href}
            variant="outline"
            icon="chevron-left"
            className="shrink-0"
            style={MB_ON_NAVY_CONTROL}
          >
            {back.label}
          </MbButtonLink>
        ) : (
          <MbIconButton
            icon="chevron-left"
            label={back.label}
            tone="outline"
            onClick={back.onClick}
            className="shrink-0"
            style={MB_ON_NAVY_CONTROL}
          />
        ))}

      <div className="flex min-w-0 flex-1 flex-col justify-center">
        {kicker && (
          <span className="matchbook-display truncate text-[0.62rem] font-semibold leading-none tracking-[0.16em] opacity-80">
            {kicker}
          </span>
        )}
        <span className="matchbook-display min-w-0 truncate text-[0.95rem] font-bold leading-tight tracking-[0.05em]">
          {title}
        </span>
      </div>

      {status && <div className="shrink-0">{status}</div>}
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  </header>
);
