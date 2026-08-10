"use client";

/**
 * Global error boundary (charter §2.3, invariants 2 / 28, W2 / P2b).
 *
 * This is the only file in the app that renders in place of `app/layout.tsx`,
 * so it owns its own `<html>` and `<body>` and gets NONE of the root layout's
 * work: no `Providers`, no `AuthProvider`, no router-dependent components. It
 * fires when the layout itself throws, which means anything the layout supplies
 * must be assumed unavailable.
 *
 * Two consequences are deliberate, not omissions:
 *
 *  1. NO `<Link>` AND NO SHELL. `MatchbookShell` reads `usePathname` and mounts
 *     a route announcer, and `MbButtonLink` renders `next/link`. Both depend on
 *     router context that may be exactly what failed. Every action here is an
 *     `onClick` against `location`, which cannot fail for that reason.
 *
 *  2. NO `next/font`. The two webfonts are instantiated by the root layout,
 *     which is gone, so `--font-oswald` / `--font-outfit` are unset and the
 *     token fallback chains in `globals.css` take over (`"Oswald", "Arial
 *     Narrow", …` and `"Outfit", system-ui`). Re-instantiating them here would
 *     put two network font requests on the one code path whose entire premise
 *     is that loading did not work. The screen paints with what is already on
 *     the machine, immediately.
 *
 * `error.message` is never shown (invariant 28). `error.digest` is, because it
 * is the same hash Next writes to the server log.
 */

import { MbRouteState } from "@/components/matchbook/Loading";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <div className="matchbook-surface min-h-screen">
          <main id="mb-main" className="px-4 py-5 sm:px-6 lg:px-8">
            {/* The wordmark, set in type rather than fetched as an asset — the
                crest is an SVG over the network, and this is the one screen
                that must not depend on the network having worked. */}
            <p className="matchbook-display mb-5 text-[1.05rem] font-bold leading-none tracking-[0.05em]">
              {/* `--mb-coral-deep`, not `--mb-coral`: measured 3.26:1 at
                  16.8px/700 on `--mb-paper` against the 4.5:1 floor below
                  18.66px (HF-6). The ink twin is 4.62:1 at the same step. */}
              Tournament <span className="text-mb-coral-deep">Tracker</span>
            </p>
            <MbRouteState
              state="globalError"
              digest={error.digest}
              actions={[
                { label: "Try again", icon: "refresh", onClick: reset },
                {
                  label: "Reload the app",
                  icon: "overview",
                  tone: "outline-navy",
                  onClick: () => location.assign("/"),
                },
              ]}
            />
          </main>
        </div>
      </body>
    </html>
  );
}
