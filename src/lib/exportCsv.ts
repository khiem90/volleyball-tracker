/* ===========================================================================
   CSV EXPORT (charter H10, §2.3 `exportMatchesCsv()`, W2 / P2b)

   H10 records this exporter as living inline in `src/app/summaries/page.tsx`
   and assigns W2 to extract it so W6 can reuse it without opening that file.
   It had already moved once by the time this landed — into
   `useMatchbookHistory.ts` — so the extraction is from there. `summaries/page.tsx`
   is NOT touched: it calls `data.downloadCsv` and never knew where the bytes
   came from.

   The serialisation is byte-for-byte what shipped: every cell quoted, inner
   quotes doubled, `\n` between rows, an ISO timestamp or an empty string for
   the date. An exporter is a data contract with whatever the user opens the
   file in, so the extraction deliberately changes none of it. (A UTF-8 BOM
   would stop Excel mangling accented team names, and is the obvious next
   improvement — but it is an improvement, not an extraction, and it belongs in
   its own change.)

   What did change is the download mechanics, which had a real race: the old
   code called `URL.revokeObjectURL` on the line after `link.click()`, and
   Firefox and Safari can revoke the blob before the download stream opens,
   producing a silent zero-byte file. See `download()` below.
   =========================================================================== */

/** One exported match. Deliberately primitives only, so a caller shapes its
 *  own rows and this module never imports the domain types. */
export interface MbMatchCsvRow {
  /** Epoch ms, or `null` for a match with no recorded completion. */
  completedAt: number | null;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  winner: string;
  competition: string;
}

export const MB_MATCH_CSV_HEADER = [
  "Date",
  "Home",
  "Away",
  "Home Score",
  "Away Score",
  "Winner",
  "Competition",
] as const;

/**
 * RFC 4180-shaped serialisation, matching the shipped output exactly: EVERY
 * cell is quoted, not just the ones that need it. Unconditional quoting is
 * also the safer rule — a team called `Riptide, B` or one whose name contains a
 * newline cannot break the column count.
 */
export const toCsv = (rows: readonly (readonly string[])[]): string =>
  rows
    .map((r) => r.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
    .join("\n");

/** The header row plus one row per match. Pure — the unit under test. */
export const buildMatchesCsv = (rows: readonly MbMatchCsvRow[]): string =>
  toCsv([
    [...MB_MATCH_CSV_HEADER],
    ...rows.map((m) => [
      m.completedAt ? new Date(m.completedAt).toISOString() : "",
      m.home,
      m.away,
      String(m.homeScore),
      String(m.awayScore),
      m.winner,
      m.competition,
    ]),
  ]);

/**
 * Hand a string to the browser as a file.
 *
 * The anchor is attached to the document before it is clicked, because a
 * detached anchor's `click()` is a no-op in Firefox. The object URL is revoked
 * on the next macrotask rather than on the next line, because the download is
 * started asynchronously and revoking synchronously can beat it — the symptom
 * is an empty file with the right name, which looks like a data bug and is not.
 */
const download = (contents: string, filename: string, mime: string): void => {
  const url = URL.createObjectURL(new Blob([contents], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

export type MbExportResult = { ok: true } | { ok: false; reason: string };

/**
 * Build and download the match archive.
 *
 * Returns a result instead of throwing or returning `void`, because the one
 * thing the old inline version could not do was tell the user it had failed —
 * a blocked blob URL, a WebView with no download support or a full disk all
 * produced a button that did nothing. The caller turns the result into a toast.
 */
export const exportMatchesCsv = (
  rows: readonly MbMatchCsvRow[],
  filename = "match-archive.csv"
): MbExportResult => {
  if (typeof document === "undefined" || typeof URL.createObjectURL !== "function") {
    return { ok: false, reason: "Downloads are not available in this browser." };
  }
  if (rows.length === 0) {
    return { ok: false, reason: "There is nothing to export yet." };
  }
  try {
    download(buildMatchesCsv(rows), filename, "text/csv");
    return { ok: true };
  } catch {
    /* The thrown value is a browser/security object with no wording fit for a
       user, and invariant 28 forbids leaking a raw provider message. */
    return { ok: false, reason: "The file could not be saved." };
  }
};
