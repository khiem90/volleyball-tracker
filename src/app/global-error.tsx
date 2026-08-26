"use client";

/**
 * Global error boundary — renders IN PLACE of `app/layout.tsx`, so it owns its
 * own `<html>`/`<body>` and nothing the root layout supplies exists here.
 * Deliberate consequences:
 *  - No `<Link>` and no `MatchbookShell`: both need router context, which may
 *    be exactly what failed. Actions use `onClick` against `location`.
 *  - No `next/font`: the layout that instantiates the webfonts is gone, so the
 *    token fallback chains in `globals.css` take over and the screen paints
 *    without any network fetch.
 * `error.message` is never shown; `error.digest` is (the hash Next also writes
 * to the server log).
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
            {/* Wordmark set in type, not the crest SVG — this is the one
                screen that must not depend on the network having worked. */}
            <p className="matchbook-display mb-5 text-[1.2rem] mb-track-display font-bold leading-none">
              {/* `--mb-coral-deep`, not `--mb-coral`: the bright coral fails
                  the 4.5:1 contrast floor at this size; the deep twin passes. */}
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
                  variant: "outline-navy",
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
