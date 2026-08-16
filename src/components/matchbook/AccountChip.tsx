"use client";

import Image from "next/image";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { MbButton, MbButtonLink } from "./Button";
import { MbMenu, type MbMenuItem } from "./Menu";
import { MbSkeleton } from "./Skeleton";

export type MbAccountChipVariant = "masthead" | "rail" | "compact";

/* ===========================================================================
   THE ACCOUNT SURFACE

   `signOut()` is called in exactly two places in the whole app and both of them
   are inside the legacy `Navigation`, which no Matchbook route renders. The six
   converted screens each copy-paste an account chip that links to `/login`, and
   `useLoginPage` immediately pushes a signed-in user back to `/`. So the chip
   on every shipped Matchbook screen is a no-op loop: no sign-out, no email, no
   profile (shell brief W4).

   This component is the one place that owns the account: the address, the way
   out, and the way in. It is rendered by the sidebar rail and by the masthead
   or top strip, and never re-implemented at a call site.

   `variant="public"` shells must NOT render it — the public share routes cannot
   assume `AuthContext` has a user and must keep working with Firebase
   unconfigured (shell brief R6). `MatchbookShell` enforces that.

   ------------------------------------------------- ONE ACCOUNT, ONE PLACE (G16)

   It used to be rendered a THIRD time, inside `MatchbookBottomBar`'s More
   sheet, and that produced the defect G16 records: on a phone the account was
   an unlabelled `•••` disc in the top-right corner and the More sheet was an
   unlabelled `•••` cell in the bottom-right corner, ~740px apart, drawn from
   the same sprite glyph at the same size. A first-time user could not predict
   which one held what — and both held the same two rows, because the sheet's
   `variant="rail"` block repeated the address and Sign out that the top-right
   menu already carried.

   Two changes, and they are halves of one idea. The sheet now carries only
   DESTINATIONS (`BottomBar.tsx`), and this file's phone control is WORDED —
   the same `Account ⌄` trigger the desktop masthead already shows. So the two
   corners now read "ACCOUNT ⌄" and "••• MORE": one identity, one overflow, no
   shared rows and no shared glyph. Sign-out is reachable from exactly one
   control at each breakpoint — the top strip below `lg`, the sidebar rail
   above it — and never from two at once.
   =========================================================================== */

/**
 * The 40px crest disc. One of the four sanctioned 999px radii — and it now says
 * so in the system's own spelling. `rounded-full` compiles to
 * `calc(infinity * 1px)`, which measures 3.35544e+07px and shows up in the D2
 * radius census as a *second* round value beside the 999px the vocabulary
 * declares. `.mb-icon-disc` is the named class for exactly this shape (design
 * language §3.3 / §4.1b) and carries the geometry, the navy edge and the ink,
 * so the utility stack below it collapses to the size.
 */
const AccountDisc = ({ size = 40 }: { size?: number }) => (
  <span
    className="mb-icon-disc bg-mb-paper-bright"
    style={{ width: size, height: size }}
  >
    <Image
      src="/assets/matchbook/brand/crest.svg"
      alt=""
      width={Math.round(size * 0.6)}
      height={Math.round(size * 0.7)}
    />
  </span>
);

/**
 * Signed-in menu contents. The address is the first row and is deliberately
 * disabled: it is information, not a destination — there is no account page in
 * this build, and offering one that redirects back to `/` is the exact defect
 * W4 records.
 */
const menuItems = (email: string, onSignOut: () => void): MbMenuItem[] => [
  { label: email, icon: "mail", disabled: true, onSelect: () => {} },
  { label: "Sign out", icon: "logout", tone: "danger", onSelect: onSignOut },
];

export const MbAccountChip = ({
  variant = "masthead",
  className = "",
}: {
  variant?: MbAccountChipVariant;
  className?: string;
}) => {
  const { user, isGuest, isLoading, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleSignOut = () => {
    setBusy(true);
    // The context swallows its own errors and flips `user` to null; the busy
    // flag is released either way so the control can never latch.
    void signOut().finally(() => setBusy(false));
  };

  const address = user?.email ?? user?.displayName ?? "Signed in";
  const name = user?.displayName ?? user?.email ?? "Account";

  /* Auth resolves asynchronously on every load. A skeleton at the final
     geometry keeps the masthead action row from reflowing when it lands
     (invariants 26 and 27). */
  if (isLoading) {
    if (variant === "rail") {
      return (
        <div className={`flex flex-col gap-2 ${className}`}>
          <div className="flex items-center gap-2.5">
            <MbSkeleton w={40} h={40} radius={4} />
            <MbSkeleton w="60%" h={10} lines={2} />
          </div>
          <MbSkeleton w="100%" h={44} radius={4} />
        </div>
      );
    }
    /* One width for both worded variants, because they are now one control:
       118px is what `Account ⌄` measures at `md`. The compact variant used to
       reserve 48 here for the icon-only trigger it no longer renders, so the
       top strip reflowed by 70px the moment auth resolved. */
    return <MbSkeleton w={118} h={48} radius={4} className={className} />;
  }

  /* ------------------------------------------------------------------ rail */
  if (variant === "rail") {
    return (
      <div className={`flex flex-col gap-3 ${className}`}>
        <div className="flex min-w-0 items-center gap-2.5">
          <AccountDisc />
          <span className="flex min-w-0 flex-col">
            {/* 0.04em, not 0.08em. 0.72rem carries exactly one tracking in the
                named scale — `display/link`'s 0.04em — and this chip renders on
                every route, so a second value here put a tracking collision on
                the (11.52px, 700) pair of all seven screens at once. §3.2's
                account-chip sample still prints 0.08em; the sample is the bug
                (this document's own rule: the shipped page wins). */}
            <span className="matchbook-display truncate text-[0.72rem] mb-track-link font-bold leading-tight">
              {isGuest ? "Guest" : name}
            </span>
            <span className="truncate text-[0.66rem] leading-tight text-mb-ink-muted">
              {isGuest ? "Not signed in" : address}
            </span>
          </span>
        </div>

        {isGuest ? (
          <MbButtonLink
            href="/login"
            variant="outline-navy"
            size="sm"
            icon="login"
            fullWidth
          >
            Sign in
          </MbButtonLink>
        ) : (
          <MbButton
            variant="outline-navy"
            size="sm"
            icon="logout"
            fullWidth
            loading={busy}
            onClick={handleSignOut}
          >
            {busy ? "Signing out" : "Sign out"}
          </MbButton>
        )}
      </div>
    );
  }

  /* ------------------------------------------------------ compact / masthead
     One control, two call sites. `compact` is the top strip's spelling and
     `masthead` is the desktop console's, and they render the same worded
     trigger on purpose: an account is the same object at every width, and the
     two variants diverging is what put an unlabelled `•••` on the phone in the
     first place (G16). The names are kept so a call site still declares which
     surface it is on, and so the type can grow apart again if a surface ever
     earns a different treatment.

     A guest gets a destination (an anchor, so middle-click and "open in new
     tab" work); a signed-in user gets the menu. Both are worded — "SIGN IN"
     and "ACCOUNT ⌄" — because a bare glyph in a corner is a control whose only
     documentation is a guess. */
  if (isGuest) {
    return (
      <MbButtonLink href="/login" variant="outline-navy" icon="login" className={className}>
        Sign in
      </MbButtonLink>
    );
  }

  return (
    <MbMenu
      trigger="Account"
      variant="outline-navy"
      label="Account menu"
      items={menuItems(address, handleSignOut)}
      className={className}
    />
  );
};
