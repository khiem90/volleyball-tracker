"use client";

/* ===========================================================================
   THE OFFLINE BANNER (charter §2.3, shell R9, W2 / P2b)

   Two hard requirements from the charter, and they pull against each other:

     "enters once, never re-animates"   and   "must NOT shift layout".

   A banner in normal flow satisfies the first and breaks the second: it pushes
   the masthead down 40px the instant the network drops, which is a full-page
   reflow at the exact moment the user is least able to understand why the page
   moved. Reserving 40px permanently to avoid that spends the top of every
   screen, on every route, forever, for a state that is almost never true.

   So it is FIXED. It occupies no flow space at any time, and it enters with the
   system's own `mb-enter` keyframe on mount — once, because it only mounts when
   the state changes, and it is removed outright under `prefers-reduced-motion`
   by the block at the end of the Matchbook zone in `globals.css`.

   It is a full-bleed band rather than a floating card because that is what it
   is: a statement about the whole document, not about a thing on it. The
   toasts own the floating-card idiom and the two must not be confused — one is
   "this action finished", the other is "nothing you do now will be saved".

   WHAT IT COVERS, AND WHY THAT IS THE CHEAPEST THING TO COVER. Being fixed, it
   sits over the top ~51px of the page. Measured at 390x844 that is the brand
   lockup and the Quick Match key in `MatchbookMobileBar` — the nav row itself
   stays visible and every route stays reachable, and on desktop the sidebar
   carries all of it anyway. The alternative, bottom-fixed, would cover live
   scores and the toast stack instead. Chrome is worth more than content is.
   =========================================================================== */

import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { MbIcon } from "./MbIcon";

/**
 * How the band is positioned.
 *
 * `fixed` is the shipped form. `inline` exists so the gallery and any future
 * embedded surface can show the band in flow — it is the same markup with the
 * fixed positioning neutralised, exactly the pattern `/dev/kit` already uses to
 * make `.mb-skip-link` inspectable.
 */
export type MbOfflineBannerVariant = "fixed" | "inline";

const VARIANT_CLASS: Record<MbOfflineBannerVariant, string> = {
  fixed: "mb-enter fixed inset-x-0 top-0 z-30",
  inline: "relative",
};

export const MbOfflineBanner = ({
  offline,
  variant = "fixed",
  message = "You are offline. The scores on screen are the last ones received; changes are not being saved.",
}: {
  /**
   * Force the state. Omit to read `navigator.onLine`.
   *
   * The override is not a convenience: `navigator.onLine === true` only means
   * a network interface exists, so a consumer that has better evidence — a
   * Firestore snapshot error, a write that never acknowledged — is the only
   * thing that can tell the truth. W6 drives this prop from the session
   * subscription rather than from the hook.
   */
  offline?: boolean;
  variant?: MbOfflineBannerVariant;
  /** Overridable so a read-only public viewer can drop the "not saved" half. */
  message?: string;
}) => {
  const online = useOnlineStatus();
  const isOffline = offline ?? !online;

  if (!isOffline) return null;

  return (
    <div
      className={`${VARIANT_CLASS[variant]} border-b-[1.5px] border-mb-navy bg-mb-paper-bright text-mb-navy`}
      /* The tone rides a 4px top rule in gold-INK, not raw gold: `--mb-gold`
         measures 2.15:1 on paper and would be a non-text contrast failure
         (invariant 14) even as an accent. `--mb-gold-ink` is the same signal at
         a legible weight. The rule is the third channel behind the word and the
         glyph, never the only one (invariant 13). */
      style={{ borderTop: "4px solid var(--mb-gold-ink)" }}
      /* Polite, not assertive: losing the network is not worth interrupting a
         sentence the reader is mid-way through. The `status` role and the
         visible word say the same thing to two different audiences. */
      role="status"
      aria-live="polite"
    >
      <div className="mb-safe-top flex items-start gap-2.5 px-4 py-2.5">
        {/* `items-start` + a 2px nudge, the same optical alignment `MbNotice`
            uses: the message wraps to three lines at 390px, and a centred
            glyph then sits beside the SECOND line, reading as a bullet for
            the middle of the sentence rather than as the mark on the state. */}
        <MbIcon
          id="wifi-off"
          size={16}
          className="mt-[2px] shrink-0 text-mb-gold-ink"
        />
        <p className="min-w-0 text-[0.78rem] leading-[1.4]">
          {/* The WORD carries the state; the hue only agrees with it. A
              greyscale render still reads "Offline" (invariant 13). */}
          <span className="matchbook-display mb-track-display font-bold">
            Offline
          </span>
          <span className="mx-1.5 text-mb-ink-muted">—</span>
          {message}
        </p>
      </div>
    </div>
  );
};
