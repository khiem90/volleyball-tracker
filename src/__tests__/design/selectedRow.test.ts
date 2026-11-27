// @vitest-environment node
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/contrast";
import { token } from "./stylesheet";

/*
 * The row picked in a list is washed with action-tint: the team whose profile
 * is open in the Teams tab's directory. Everything a row writes sits on that
 * wash while the row is picked, so each text color a row uses has to read on
 * it as well as on the card.
 */

describe("a selected row", () => {
  /* The name, the facts under it, and a green word such as a chip's. */
  it.each(["ink", "ink-soft", "action"])("keeps %s at 4.5 to 1 on action-tint", (text) => {
    expect(contrastRatio(token(text), token("action-tint"))).toBeGreaterThanOrEqual(4.5);
  });

  /* A chip on the wash is drawn on white, so it keeps an edge. Its words still have to read. */
  it.each(["ink", "action"])("keeps a chip's %s at 4.5 to 1 on surface", (text) => {
    expect(contrastRatio(token(text), token("surface"))).toBeGreaterThanOrEqual(4.5);
  });
});
