"use client";

import { MbSkeleton } from "@/components/matchbook/Skeleton";

/* The loading state of /login. `MbPageLoading` draws a shell and /login has
   none — it is a full-bleed two-column poster — so the bones are local and
   mirror the form's exact geometry: nothing moves when the real form arrives.
   The promo half paints flat navy (a static poster has no data to wait for).

   Colocated here, not inline in page.tsx, because `app/loading.tsx` also
   renders it (the root boundary paints before this route's own Suspense) and
   a page file's non-default exports belong to Next. */

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
          <span className="flex flex-col items-center gap-[3px] border-[2px] border-mb-rule px-2.5 py-1">
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
