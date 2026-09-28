/**
 * Saving a file the page made, such as the History CSV, on every browser
 * the app supports. The choice between a download and the share sheet is
 * pure and tested; the rest touches the browser and is checked in it.
 */

/** The parts of `navigator` the choice reads. */
export interface SaveHost {
  /** Set by Safari on iOS: true when the page runs as an app added to the home screen. */
  standalone?: boolean;
  canShare?: (data: ShareData) => boolean;
}

export type SaveMethod = "share" | "download";

/**
 * How the file reaches the person. An iPhone home screen app cannot be
 * trusted with a download: the file can open over the app with no way
 * back. There the share sheet offers Save to Files instead. Every other
 * browser downloads, including desktop ones that could share, since a
 * download is what a desktop expects.
 */
export const saveMethod = (host: SaveHost, file: File): SaveMethod =>
  host.standalone === true && host.canShare?.({ files: [file] }) === true ? "share" : "download";

/**
 * Safari and Firefox read the file after the click returns, so revoking
 * its URL at once can cancel the download. A minute is long enough for
 * the browser to have taken it.
 */
const REVOKE_AFTER_MS = 60_000;

const download = (file: File) => {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.hidden = true;
  // Firefox only follows a link that is in the document.
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
};

/** Save the file. Call it straight from a tap: the share sheet needs one. */
export const saveFile = async (file: File): Promise<void> => {
  const host = navigator as Navigator & SaveHost;
  if (saveMethod(host, file) === "share") {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (error) {
      // Closing the share sheet is a choice, not a failure.
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }
  download(file);
};

/**
 * A CSV file with a byte order mark in front, which Excel needs to read
 * the text as UTF-8 rather than mangle accented and emoji team names.
 */
export const csvFile = (name: string, csv: string): File =>
  new File(["﻿", csv], name, { type: "text/csv" });
