"use client";

import { MatchbookShell } from "@/components/matchbook/AppShell";
import { MbSkeleton } from "@/components/matchbook/Skeleton";

/* ===========================================================================
   THE CONSOLE, BEFORE THE DATA

   `AppContext` hydrates from localStorage inside an effect, so without this
   the first paint of every successful match load is the "Match not found"
   error screen. It draws the console's own final geometry (not
   `MbPageLoading`, which draws panel grids): every box below tracks a box in
   `MbScoreSide` / `MatchConsole` and must hold a 0px delta against its loaded
   counterpart — change this file whenever the column changes. Static blocks,
   no shimmer (a shimmer is a gradient), and one polite status line for
   screen readers.
   =========================================================================== */

const Column = () => (
  <div className="flex min-h-0 flex-col overflow-hidden rounded-[3px] border border-mb-navy bg-mb-paper-bright">
    {/* head bar — the same 2.5/3rem rhythm the real one carries */}
    <div className="flex shrink-0 items-center gap-2.5 border-b border-mb-navy px-3 py-2.5 sm:px-4">
      {/* 36 x 42 and 52 x 61 are `Crest`'s own 96:112 aspect at both steps. */}
      <span className="sm:hidden">
        <MbSkeleton w={36} h={42} radius={3} />
      </span>
      <span className="hidden sm:block">
        <MbSkeleton w={52} h={61} radius={3} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <MbSkeleton w="62%" h="1.575rem" />
        <span className="flex min-h-[14px] items-center">
          <MbSkeleton w="3rem" h={6} />
        </span>
      </span>
    </div>

    <div className="flex min-h-0 flex-1 items-center justify-center px-3 sm:px-4">
      {/* Zero delta against the loaded column, whose figure is
          `clamp(4rem, min(36vh,34vw), 9rem)` stacked and
          `clamp(4rem, min(36vh,26vw), 16rem)` side by side. */}
      <span className="sm:hidden">
        <MbSkeleton w="3ch" h="clamp(4rem, min(36vh, 34vw), 9rem)" radius={3} />
      </span>
      <span className="hidden sm:block">
        <MbSkeleton w="3ch" h="clamp(4rem, min(36vh, 26vw), 16rem)" radius={3} />
      </span>
    </div>

    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-mb-rule px-3 pb-3 pt-2 sm:px-4">
      <MbSkeleton w="6rem" h="0.74rem" />
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

      <div className="flex shrink-0 items-center gap-2 border-b border-mb-navy px-3 py-2 sm:gap-3 sm:px-4">
        <MbSkeleton w="4.5rem" h="1.35rem" radius={3} />
        <MbSkeleton w="9rem" h="0.62rem" />
        <span className="ml-auto">
          <MbSkeleton w="8.5rem" h={44} radius={4} />
        </span>
      </div>

      <div
        aria-hidden="true"
        className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[1fr_8px_1fr] sm:grid-cols-[1fr_8px_1fr] sm:grid-rows-1"
      >
        <Column />
        <span className="relative">
          <span className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-mb-navy sm:block" />
          <span className="absolute left-0 top-1/2 block h-px w-full -translate-y-1/2 bg-mb-navy sm:hidden" />
        </span>
        <Column />
      </div>

      {/* The console's hint row is always present, blank or not, so the
          skeleton reserves it too or its grid stands taller than the loaded
          console. */}
      <div className="min-h-[36px] shrink-0 border-t border-mb-rule px-4 py-2 [@media(max-height:520px)]:min-h-[28px] [@media(max-height:520px)]:py-1">
        <MbSkeleton w="11rem" h="0.85rem" />
      </div>

      <div className="mb-action-bar shrink-0">
        <span className="hidden flex-1 sm:block" />
        <MbSkeleton w="7rem" h={56} radius={4} />
        <MbSkeleton w="9.5rem" h={56} radius={4} />
      </div>
    </div>
  </MatchbookShell>
);
