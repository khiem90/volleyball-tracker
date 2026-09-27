import {
  clearIndexedDbPersistence,
  terminate,
  waitForPendingWrites,
  type Firestore,
} from "firebase/firestore";

/**
 * What the app keeps on a device, and clearing it at sign-out so a borrowed
 * phone does not keep the account's data: the offline copy of the account's
 * roster, tournaments, and matches, and the app's own storage, which holds
 * the scorer links the phone has opened and a formation draft.
 */

/** Sign-out was refused because changes made on this device have not reached the server. */
export class UnsyncedChangesError extends Error {
  constructor() {
    super("Some changes made on this device have not reached the server yet.");
    this.name = "UnsyncedChangesError";
  }
}

// How long sign-out waits for queued writes before saying they have not
// reached the server. Online they land well inside it; offline they never do.
const SYNC_WAIT_MS = 3000;

/** Whether every write made on this device has reached the server, waiting a moment for queued ones. */
export const writesReachedServer = (db: Firestore): Promise<boolean> =>
  Promise.race([
    waitForPendingWrites(db).then(
      () => true,
      () => false,
    ),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), SYNC_WAIT_MS)),
  ]);

// The service worker's runtime caches that can hold responses carrying the
// account's data: the ones for other origins, which Firestore is, and for
// the app's own API routes. The rest hold pages and static files.
const DATA_CACHES = ["cross-origin", "apis"];

/**
 * Clear the account's data from this device. The database cannot be used
 * again once it is cleared, so the page has to load afresh after this.
 * Another tab of the app with the offline copy open lets it go: Firestore
 * stops that tab's database when this one deletes the copy.
 */
export const clearDeviceData = async (db: Firestore | null): Promise<void> => {
  if (db) {
    await terminate(db);
    await clearIndexedDbPersistence(db).catch((error) =>
      console.warn("The offline copy could not be cleared:", error),
    );
  }
  try {
    window.localStorage.clear();
  } catch {
    // A browser that blocks storage has nothing stored to clear.
  }
  if ("caches" in window) {
    await Promise.all(DATA_CACHES.map((name) => caches.delete(name))).catch(() => undefined);
  }
};
