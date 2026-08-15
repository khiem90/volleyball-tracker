import { describe, expect, it } from "vitest";
import { MB_ROUTE_SKELETON } from "@/components/matchbook/Loading";
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

  for (const [route, spec] of SPECS) {
    describe(route, () => {
      it("fills whole 12-column rows", () => {
        /* Greedy row fill, exactly as CSS grid places the cells: a span that
           does not fit starts the next row. Every row must close on 12, or the
           skeleton is drawing a column the page does not have. */
        let row = 0;
        for (const cell of spec.cells) {
          if (row + cell.span > 12) {
            expect(row, `a row of ${route} closed on ${row}, not 12`).toBe(12);
            row = 0;
          }
          row += cell.span;
        }
        expect(row, `the last row of ${route} closed on ${row}, not 12`).toBe(12);
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
