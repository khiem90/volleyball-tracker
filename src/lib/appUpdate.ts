/**
 * Updating the app to a newly deployed version, the pure part. A new
 * version reaches a device as a service worker, and the page offers it with
 * a reload banner. Only a tap on that banner reloads the page, so nothing
 * reloads under whoever is scoring a match. AppUpdateProvider feeds the
 * service worker's events in and carries the effects out; nothing in here
 * touches the browser.
 */

/**
 * Where this page stands: on the newest version the device has, offering
 * one that is installed and waiting, letting that one in after a tap on
 * Reload, or behind the version another tab let in.
 */
export type UpdateStatus = "current" | "ready" | "switching" | "outdated";

export type UpdateEvent =
  /**
   * A new version finished installing and waits to take over. `controlled`
   * says whether an older version runs this page.
   */
  | { type: "waiting"; controlled: boolean }
  /**
   * A different service worker now runs this page. `hadController` says
   * whether one ran it before.
   */
  | { type: "took-over"; hadController: boolean }
  /** The reader tapped Reload on the banner. */
  | { type: "reload" };

/** What AppUpdateProvider does next: let the waiting version take over, or reload the page. */
type UpdateEffect = "activate" | "reload" | null;

interface UpdateStep {
  status: UpdateStatus;
  effect: UpdateEffect;
}

export const nextUpdate = (status: UpdateStatus, event: UpdateEvent): UpdateStep => {
  switch (event.type) {
    case "waiting":
      // A page no service worker runs came from the network, so it is
      // already as new as anything waiting.
      if (!event.controlled) return { status, effect: null };
      return { status: "ready", effect: null };
    case "reload":
      // Behind a version another tab let in, there is nothing left to wait for.
      if (status === "outdated") return { status: "switching", effect: "reload" };
      return { status: "switching", effect: "activate" };
    case "took-over":
      // Only the tap on this page's banner reloads it. A version another
      // tab let in runs the device now, and this page offers it.
      if (status === "switching") return { status, effect: "reload" };
      // The first service worker taking over a page that came from the
      // network brings nothing newer.
      if (!event.hadController) return { status, effect: null };
      return { status: "outdated", effect: null };
  }
};
