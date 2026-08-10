"use client";

import { MatchbookShell } from "@/components/matchbook/AppShell";
import { MbSkeleton } from "@/components/matchbook/Skeleton";

/* ===========================================================================
   THE CONSOLE, BEFORE THE DATA

   `AppContext` hydrates from localStorage inside an effect, so the first paint
   of EVERY successful match load used to be the "Match not found" error screen
   — probe-confirmed, and the single most alarming frame in the product.

   This is what renders instead, and it is the console's own geometry rather
   than a generic panel grid. `MbPageLoading variant="focus"` was the obvious
   candidate and is deliberately not used: it draws five `xl:col-span-*` panels,
   which is the CONSOLE variant's layout, and invariant 26 asks for the FINAL
   geometry — a fixture line, two full-height columns either side of a navy
   rule, and a 56px action rail. Drawing five panels here would move everything
   the moment the match arrived, which is the defect a skeleton exists to
   prevent (invariant 27).

   Static blocks, no shimmer (a shimmer is a gradient), and one polite status so
   a screen reader hears "Loading the match" once rather than crawling a dozen
   empty boxes.
   =========================================================================== */

const Column = () => (
  <div className="flex min-h-0 flex-col items-center justify-center gap-3 px-3 sm:px-5">
    <div className="flex w-full shrink-0 items-center gap-2 border-b border-mb-rule pb-2 pt-3">
      {/* 40 x 47 is `Crest`'s own 96:112 aspect at the size the console uses. */}
      <MbSkeleton w={40} h={47} radius={3} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <MbSkeleton w="62%" h="1.05rem" />
        <MbSkeleton w="7rem" h={3} />
      </span>
    </div>
    <div className="flex w-full flex-1 items-center justify-center">
      <MbSkeleton w="3ch" h="clamp(4rem, 18vw, 9rem)" radius={3} />
    </div>
    <div className="flex w-full shrink-0 items-center justify-between gap-2 border-t border-mb-rule pb-3 pt-2">
      <MbSkeleton w="9rem" h="0.66rem" />
      <MbSkeleton w={44} h={44} radius={4} />
    </div>
  </div>
);

export const MatchConsoleSkeleton = () => (
  <MatchbookShell variant="focus" back={{ href: "/", label: "Back" }}>
    <div
      aria-busy="true"
      className="flex min-h-0 flex-col overflow-hidden bg-mb-paper-bright h-[calc(100vh_-_61px_-_var(--mb-safe-top))] [@supports(height:100dvh)]:h-[calc(100dvh_-_61px_-_var(--mb-safe-top))]"
    >
      <span className="sr-only" role="status">
        Loading the match
      </span>

      <div className="flex shrink-0 items-center gap-3 border-b border-mb-navy px-3 py-2 sm:px-4">
        <MbSkeleton w="4.5rem" h="1.15rem" radius={3} />
        <MbSkeleton w="9rem" h="0.66rem" />
        <span className="ml-auto">
          <MbSkeleton w="8.5rem" h={44} radius={4} />
        </span>
      </div>

      <div
        aria-hidden="true"
        className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[1fr_1px_1fr] sm:grid-cols-[1fr_1px_1fr] sm:grid-rows-1"
      >
        <Column />
        <span className="bg-mb-navy" />
        <Column />
      </div>

      <div className="mb-action-bar shrink-0">
        <span className="hidden flex-1 sm:block" />
        <MbSkeleton w="7rem" h={56} radius={4} />
        <MbSkeleton w="9.5rem" h={56} radius={4} />
      </div>
    </div>
  </MatchbookShell>
);
