"use client";

/* ===========================================================================
   THE LOADING STATE, AT THE REAL GEOMETRY

   `MbPageLoading` draws a console masthead and five generic panels, which is
   the wrong page: this route has no masthead, its first object is a scoreboard
   and its grid is 8/4. A skeleton that advertises a layout the page does not
   have is a second layout change on top of the first, so it draws THIS page's
   bones instead — navy event strip, one hero scoreboard, the two side panels,
   the table. Never a spinner: a spinner on an empty page tells a reader on a
   slow connection nothing about what is coming.
   =========================================================================== */

import { MbSkeleton } from "@/components/matchbook/Skeleton";

const Bar = ({ w, h = "0.82rem" }: { w: string; h?: string }) => (
  <MbSkeleton w={w} h={h} radius={2} />
);

/** The navy strip's bones, in the strip's own ink. */
const StripBones = () => (
  <div
    className="mb-safe-top -mx-4 -mt-5 mb-4 sm:-mx-6 lg:-mx-8"
    style={{
      background: "var(--mb-navy)",
      borderBottom: "var(--mb-rule-edge) solid var(--mb-rule-on-navy)",
    }}
  >
    <div className="flex min-h-[56px] items-center gap-3 px-3 py-1.5 sm:px-4">
      <span className="flex min-w-0 flex-1 flex-col gap-1.5 opacity-25">
        <Bar w="7rem" h="0.62rem" />
        <Bar w="min(60%, 16rem)" h="0.95rem" />
      </span>
      <span className="shrink-0 opacity-25">
        <Bar w="5rem" h="0.66rem" />
      </span>
    </div>
  </div>
);

const PanelBones = ({ rows, tall = false }: { rows: number; tall?: boolean }) => (
  <section className="mb-panel" aria-hidden="true">
    <header className="mb-panel-head">
      <span className="flex h-6 w-[8rem] max-w-[60%] items-center">
        <Bar w="100%" h="0.95rem" />
      </span>
      <span className="flex h-6 w-[4rem] items-center">
        <Bar w="100%" h="0.62rem" />
      </span>
    </header>
    {tall ? (
      /* The scoreboard's bones: two identity blocks flanking a numeral pair,
         at the hero step's own height, so nothing jumps when it lands. */
      <div className="flex items-center justify-between gap-4 px-6 py-6">
        <span className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <MbSkeleton w={34} h={40} radius={2} />
          <Bar w="70%" />
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <MbSkeleton w="3.5rem" h="3.5rem" radius={2} />
          <MbSkeleton w="3.5rem" h="3.5rem" radius={2} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <MbSkeleton w={34} h={40} radius={2} />
          <Bar w="70%" />
        </span>
      </div>
    ) : (
      <div className="flex flex-col">
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-mb-rule px-4 py-2.5 last:border-b-0"
          >
            <MbSkeleton w={24} h={28} radius={2} />
            <span className="min-w-0 flex-1">
              <Bar w={["70%", "55%", "62%", "48%"][i % 4]} />
            </span>
            <Bar w="2.5rem" h="0.9rem" />
          </div>
        ))}
      </div>
    )}
  </section>
);

/** The three-up counts strip, at the height the real one settles at. */
const CountsBones = () => (
  <section className="mb-panel" aria-hidden="true">
    <header className="mb-panel-head">
      <span className="flex h-6 w-[9rem] max-w-[60%] items-center">
        <Bar w="100%" h="0.95rem" />
      </span>
    </header>
    <div className="grid grid-cols-1 divide-y divide-mb-rule sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <MbSkeleton w={44} h={44} radius={3} />
          <span className="flex min-w-0 flex-col gap-1.5">
            <Bar w="5rem" h="0.62rem" />
            <Bar w="2rem" h="1.5rem" />
          </span>
        </div>
      ))}
    </div>
  </section>
);

/**
 * The bones are the REAL grid — full-width board, counts strip, 12-column
 * table, 7/5 ledgers — not a generic five-panel console. A skeleton that
 * advertises a layout the page does not have is a second layout change on top
 * of the first, which is the whole thing it exists to prevent.
 */
export const SessionSkeleton = () => (
  <div aria-busy="true">
    {/* One announcement for the whole route, naming what is loading rather
        than saying "Loading" into the void. */}
    <span className="sr-only" role="status">
      Loading the live scoreboard
    </span>
    <StripBones />
    <div className="mb-enter-grid grid grid-cols-1 gap-4 xl:grid-cols-12">
      <div className="min-w-0 xl:col-span-12">
        <PanelBones rows={0} tall />
      </div>
      <div className="min-w-0 xl:col-span-12">
        <CountsBones />
      </div>
      <div className="min-w-0 xl:col-span-12">
        <PanelBones rows={6} />
      </div>
      <div className="min-w-0 xl:col-span-7">
        <PanelBones rows={4} />
      </div>
      <div className="min-w-0 xl:col-span-5">
        <PanelBones rows={4} />
      </div>
    </div>
  </div>
);
