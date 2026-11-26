/**
 * The shell's gutters, shared by the top bar, the page, and the page header
 * so the three line up. The widths are custom properties set on the shell's
 * root, because the page header has to reach back out through the page's
 * gutter to the edges of the screen.
 */

/**
 * Sets the widths, for the shell's root. On a phone each side gutter clears
 * the notch and the round corners in landscape. The top one is the gap
 * between the top bar and a page that opens with no header block.
 */
export const GUTTER_WIDTHS =
  "[--shell-top:1.25rem] [--shell-left:max(1rem,env(safe-area-inset-left))] [--shell-right:max(1rem,env(safe-area-inset-right))] sm:[--shell-left:max(1.5rem,env(safe-area-inset-left))] sm:[--shell-right:max(1.5rem,env(safe-area-inset-right))] lg:[--shell-left:2rem] lg:[--shell-right:2rem]";

/** Side padding as wide as the gutters. */
export const GUTTER = "pl-(--shell-left) pr-(--shell-right)";

/** Pulls a block inside the page out to the screen's edges and up against the top bar. */
export const BLEED = "-mt-(--shell-top) -ml-(--shell-left) -mr-(--shell-right)";
