"use client";

import { MbSkeleton } from "@/components/matchbook/Skeleton";

/* ---------------------------------------------------------------------------
   THE LOADING STATE OF /login (invariants 2 and 26, W2 / P4)

   This replaces `PageLoadingSpinner`, which was the LAST consumer of the
   pre-Matchbook shell anywhere in the app: it rendered `<Navigation/>` — the
   old warm-red nav bar — over `bg-background` with a framer-motion ring
   spinning in the middle of an empty `max-w-6xl` column. On this route that
   meant the redesigned poster was preceded, on every cold load and on every
   `useSearchParams` suspension, by a flash of the design system this whole
   programme exists to remove. Invariant 2 hard-fails a converted route that
   renders `<Navigation/>` "including during loading"; invariant 26 hard-fails
   the spinner separately.

   `MbPageLoading` is the general answer but not this route's: its three
   variants all draw the console or public *shell*, and `/login` has no shell —
   it is a full-bleed two-column poster. So the bones are local, and they are
   the poster's own geometry, not a generic grey page: the 52x60 crest slot and
   two-line wordmark, the masthead row with its bordered "All Events" block,
   the `.mb-panel` carrying a full-width button, the ruled "or", two 48px
   fields and the coral submit, then the guest row. Nothing moves when the real
   form arrives.

   The promo half stays `hidden lg:block` and paints flat navy: it is a static
   poster with no data to wait for, so drawing skeleton bones over it would
   invent a wait that does not exist.

   ------------------------------------------------------- WHY IT LIVES HERE

   It was inline in `page.tsx` until the root loading boundary needed it too.
   `app/loading.tsx` paints BEFORE this route's own `<Suspense>` — Next shows
   the outermost invalidated boundary first — and it was drawing the console
   shell there: measured on a production build at 390x844, 255ms of sidebar,
   bottom bar and "Quick Match" on the sign-in screen. A page file cannot be
   imported from for that (its non-default exports are Next's, not ours), so
   the component is colocated in the route folder instead, where both the page
   and the boundary can reach it.
   --------------------------------------------------------------------------- */

export const LoginSkeleton = () => (
  <div className="min-h-screen lg:grid lg:grid-cols-2">
    <div className="matchbook-surface flex min-h-screen flex-col items-center justify-center px-5 py-6 lg:min-h-0">
      <span className="sr-only" role="status">
        Loading sign-in
      </span>
      <div className="w-full max-w-[460px]" aria-hidden="true">
        {/* Brand lockup — crest box + the two wordmark lines */}
        <div className="mb-5 flex items-center gap-3">
          <MbSkeleton w={52} h={60} radius={3} />
          <span className="flex flex-col gap-1.5">
            <MbSkeleton w="8.5rem" h="1.15rem" />
            <MbSkeleton w="6rem" h="1.15rem" />
          </span>
        </div>

        {/* Masthead — the h1 measure beside the framed "All / Events" block */}
        <div className="mb-3 flex items-center gap-3 sm:gap-4">
          <span className="flex-1">
            <MbSkeleton w="88%" h="2rem" radius={3} className="sm:h-[2.9rem]!" />
          </span>
          <span className="flex flex-col items-center gap-1 border-[2px] border-mb-rule px-2.5 py-1">
            <MbSkeleton w="1.6rem" h="0.8rem" />
            <MbSkeleton w="2.6rem" h="0.8rem" />
          </span>
        </div>
        <span className="mb-5 block">
          <MbSkeleton w="72%" h="0.82rem" />
        </span>

        {/* Form panel at its final geometry */}
        <div className="mb-panel h-auto!">
          <div className="flex flex-col gap-4 p-5">
            <MbSkeleton w="100%" h={48} radius={4} />
            <span className="flex items-center gap-3">
              <span className="h-px flex-1 bg-mb-rule" />
              <MbSkeleton w="11rem" h="0.62rem" />
              <span className="h-px flex-1 bg-mb-rule" />
            </span>
            {[0, 1].map((i) => (
              <span key={i} className="block">
                <span className="mb-1 block">
                  <MbSkeleton w="4.5rem" h="0.62rem" />
                </span>
                <MbSkeleton w="100%" h={48} radius={4} />
              </span>
            ))}
            <MbSkeleton w="100%" h={52} radius={4} />
            <span className="flex justify-center">
              <MbSkeleton w="15rem" h="0.72rem" />
            </span>
          </div>
        </div>

        {/* Guest row */}
        <div className="mt-5 flex items-center gap-3">
          <MbSkeleton w={22} h={22} radius={3} />
          <span className="flex-1">
            <MbSkeleton w="100%" h={48} radius={4} />
          </span>
        </div>
      </div>
    </div>
    <div className="hidden bg-mb-navy lg:block" aria-hidden="true" />
  </div>
);
