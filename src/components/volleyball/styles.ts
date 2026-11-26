/*
 * Class strings the rotation tool's controls share, so a rotation button on
 * the page and one in the editor are the same control.
 */

/** The small heading over a group of controls. */
export const GROUP_LABEL = "text-caption font-medium text-ink-soft";

/**
 * A button that is one of a set, or a switch. Filled with ink when it is
 * chosen or on, white with the control edge when it is not.
 */
export const toggleClass = (on: boolean): string =>
  `inline-flex min-h-11 items-center justify-center gap-1.5 rounded-tile border px-3 py-1.5 text-label font-semibold leading-tight transition-colors ${
    on
      ? "border-ink bg-ink text-white"
      : "border-ink-soft/75 bg-surface text-ink hover:border-ink"
  }`;

/** A tile that picks one formation of several. The chosen one takes the green tint and a green edge. */
export const choiceTileClass = (chosen: boolean): string =>
  `flex flex-col gap-1 rounded-tile border p-3 text-left transition-colors ${
    chosen
      ? "border-action bg-action-tint"
      : "border-ink-soft/75 bg-surface hover:border-ink"
  }`;

/** A button with no fill of its own, for the lesser actions beside a row's main one. */
export const QUIET_BUTTON = "btn px-3 text-ink-soft hover:bg-ink/8 hover:text-ink";
