import { describe, expect, it } from "vitest";
import {
  MB_ROUTE_SKELETON,
  mbSkeletonSpecFor,
  type MbAccountShape,
  type MbSkeletonRouteSpec,
} from "@/components/matchbook/Loading";
import { MB_NAV_ALL } from "@/components/matchbook/BottomBar";

/* ===========================================================================
   THE SKELETON'S GEOMETRY IS A CLAIM ABOUT ANOTHER FILE

   `MB_ROUTE_SKELETON` reserves each console route's real height so nothing
   moves when the data lands (invariant 27). Every number in it is measured off
   a shipped page, which means it is a claim about a file this one does not
   own, and claims rot.

   These tests cannot re-measure a browser, so they pin what is checkable
   without one: that every destination in the nav has an answer at all, that
   the spans tile the 12-column grid exactly, and that no reservation is zero
   or negative. A route deleted from the table, a nav entry added without a
   measurement, or a span row that silently adds up to 11 all fail here. A
   panel that was re-cut from 465px to 600px does not — re-run
   `pw/mb-geom.mjs` after any panel-level redesign.
   =========================================================================== */

const SPECS = Object.entries(MB_ROUTE_SKELETON);

/** Every spec in the table, `full` and `empty` alike, flattened for the shape
 *  checks — an `empty` variant is a skeleton on exactly the same terms. */
const ALL_SPECS: [string, MbSkeletonRouteSpec][] = SPECS.flatMap(([route, entry]) => [
  [`${route} (full)`, entry.full] as [string, MbSkeletonRouteSpec],
  ...(entry.empty
    ? [[`${route} (empty)`, entry.empty] as [string, MbSkeletonRouteSpec]]
    : []),
]);

describe("MB_ROUTE_SKELETON", () => {
  it("answers for every destination the nav offers", () => {
    for (const item of MB_NAV_ALL) {
      expect(
        MB_ROUTE_SKELETON[item.href],
        `${item.href} is in the bar but has no measured skeleton — run pw/mb-geom.mjs`
      ).toBeDefined();
    }
  });

  it("is not a table of one route", () => {
    expect(SPECS.length).toBeGreaterThanOrEqual(MB_NAV_ALL.length);
  });

  /* An `empty` spec with no signal is dead geometry — it can never be chosen —
     and a signal with no `empty` spec is a rule with nothing to apply. Either
     one is a half-finished edit, and both are silent. */
  it("pairs every empty spec with the signal that selects it", () => {
    for (const [route, entry] of SPECS) {
      expect(
        Boolean(entry.empty),
        `${route} declares emptySignal "${entry.emptySignal}" but no empty spec`
      ).toBe(Boolean(entry.emptySignal));
    }
  });

  for (const [label, spec] of ALL_SPECS) {
    describe(label, () => {
      it("fills whole 12-column rows", () => {
        /* Greedy row fill, exactly as CSS grid places the cells: a span that
           does not fit starts the next row. Every row must close on 12, or the
           skeleton is drawing a column the page does not have. */
        let row = 0;
        for (const cell of spec.cells) {
          if (row + cell.span > 12) {
            expect(row, `a row of ${label} closed on ${row}, not 12`).toBe(12);
            row = 0;
          }
          row += cell.span;
        }
        expect(row, `the last row of ${label} closed on ${row}, not 12`).toBe(12);
      });

      it("reserves a positive height for the masthead and every panel", () => {
        expect(spec.lead).toBeGreaterThan(0);
        expect(spec.leadXl).toBeGreaterThan(0);
        expect(spec.cells.length).toBeGreaterThan(0);
        for (const cell of spec.cells) {
          expect(cell.panels.length).toBeGreaterThan(0);
          for (const panel of cell.panels) {
            expect(panel.h).toBeGreaterThan(0);
            if (panel.xl !== undefined) expect(panel.xl).toBeGreaterThan(0);
          }
        }
      });

      it("declares the grid it is imitating", () => {
        /* The page's own classes, copied verbatim. `grid-cols-1` is the phone
           column and `xl:grid-cols-12` is the console one; a spec missing
           either is describing a layout no console route has. */
        expect(spec.grid).toContain("grid-cols-1");
        expect(spec.grid).toContain("xl:grid-cols-12");
        expect(spec.grid).toContain("gap-4");
      });
    });
  }
});

/* ===========================================================================
   CHOOSING BETWEEN THEM

   The selector is the whole reason the empty specs are reachable, and it has
   one job that matters more than the others: an account it cannot read must
   reserve `full`. Reserving `empty` on a guess would GROW the document on
   every populated account in the world — the residual the table's docblock
   spends four paragraphs explaining is the harmful one.
   =========================================================================== */

const account = (over: Partial<MbAccountShape> = {}): MbAccountShape => ({
  teams: 4,
  competitions: 2,
  played: 9,
  ...over,
});

describe("mbSkeletonSpecFor", () => {
  it("reserves the full page when the account cannot be read", () => {
    for (const [route, entry] of SPECS) {
      expect(mbSkeletonSpecFor(entry, null), route).toBe(entry.full);
    }
  });

  it("reserves the full page for an account with data", () => {
    for (const [route, entry] of SPECS) {
      expect(mbSkeletonSpecFor(entry, account()), route).toBe(entry.full);
    }
  });

  it("reserves the empty page for a brand new account", () => {
    const fresh = account({ teams: 0, competitions: 0, played: 0 });
    for (const [route, entry] of SPECS) {
      const want = entry.empty ?? entry.full;
      expect(mbSkeletonSpecFor(entry, fresh), route).toBe(want);
    }
  });

  it("reads each route's own emptiness, not a shared one", () => {
    /* Teams and a competition, nothing played. `/` and `/summaries` are still
       first-run; `/teams`, `/quick-match` and `/competitions` are not. */
    const unplayed = account({ played: 0 });
    expect(mbSkeletonSpecFor(MB_ROUTE_SKELETON["/"], unplayed)).toBe(
      MB_ROUTE_SKELETON["/"].empty
    );
    expect(mbSkeletonSpecFor(MB_ROUTE_SKELETON["/summaries"], unplayed)).toBe(
      MB_ROUTE_SKELETON["/summaries"].empty
    );
    expect(mbSkeletonSpecFor(MB_ROUTE_SKELETON["/teams"], unplayed)).toBe(
      MB_ROUTE_SKELETON["/teams"].full
    );
    expect(mbSkeletonSpecFor(MB_ROUTE_SKELETON["/quick-match"], unplayed)).toBe(
      MB_ROUTE_SKELETON["/quick-match"].full
    );
    expect(mbSkeletonSpecFor(MB_ROUTE_SKELETON["/competitions"], unplayed)).toBe(
      MB_ROUTE_SKELETON["/competitions"].full
    );

    /* Teams but no competition yet — only `/competitions` has collapsed. */
    const noComp = account({ competitions: 0 });
    expect(mbSkeletonSpecFor(MB_ROUTE_SKELETON["/competitions"], noComp)).toBe(
      MB_ROUTE_SKELETON["/competitions"].empty
    );
    expect(mbSkeletonSpecFor(MB_ROUTE_SKELETON["/teams"], noComp)).toBe(
      MB_ROUTE_SKELETON["/teams"].full
    );
  });

  it("never reserves the empty page for a route that has no empty spec", () => {
    const fresh = account({ teams: 0, competitions: 0, played: 0 });
    expect(mbSkeletonSpecFor(MB_ROUTE_SKELETON["/tools"], fresh)).toBe(
      MB_ROUTE_SKELETON["/tools"].full
    );
  });
});
