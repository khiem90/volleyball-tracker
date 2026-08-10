import { FORMAT_META } from "@/components/matchbook/formatMeta";
import { rankTeams } from "@/lib/standings";
import type { Competition, Match, PersistentTeam } from "@/types/game";

/* ===========================================================================
   WHAT THE LINK LOOKS LIKE BEFORE ANYONE OPENS IT

   `/summary/[shareCode]` has exactly one distribution channel: somebody pastes
   the link into a group chat. Until this file existed it unfurled as a bare URL
   with the root layout's generic app description — the one artefact of the
   product that outlives the event, arriving looking like nothing.

   ---------------------------------------------------------------- THE READ

   Charter Appendix A, D-13: **unauthenticated Firestore REST `runQuery`, with
   a static card as the fallback.** Not `firebase-admin` — that would add a
   dependency and put a service-account private key in the deploy config for a
   document `firestore.rules` already declares world-readable
   (`match /summaries/{summaryId} { allow read: if true }`). The REST call sends
   the public Web API key and no bearer token at all, so Firestore evaluates it
   as `request.auth == null`, which is the same identity a stranger with the
   link already has.

   NOTHING PRIVILEGED CAN LEAK THROUGH HERE, and that is structural rather than
   careful: a summary document has no admin token in it (the token lives on the
   `sessions` collection, and `SessionSummary` in `types/session.ts` has no such
   field), and the only strings this module puts into metadata are the event
   name, team names, four counts and a date. `summaryMeta.test.ts` asserts the
   built metadata against a token-shaped needle so a future field cannot smuggle
   one in.

   ------------------------------------------------------- ONE CHAMPION, AGAIN

   Register D-40 is the reason this file imports `rankTeams` rather than reading
   `stats.winner`: `computeSessionStats` picks the first team to reach the
   highest win count with no tiebreak, and it is frozen into the document at end
   time, so on the `SPRNG7` fixture it names a different team from the table the
   page draws. A share card that names a different champion from the page it
   links to is worse than a share card that names none. The rule below is the
   one `useMatchbookSummary.ts` applies, against the same `rankTeams` the live
   table uses (charter N10).
   =========================================================================== */

/* --------------------------------------------------- firestore REST decoding */

type FsValue = Record<string, unknown>;

/**
 * Firestore's REST value envelope, unwrapped. Numbers arrive as
 * `{integerValue: "1730000000000"}` — a STRING, because JSON cannot hold an
 * int64 — so `Number()` is not optional politeness here.
 */
const decode = (value: FsValue | undefined): unknown => {
  if (!value || typeof value !== "object") return undefined;
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue as string;
  if ("booleanValue" in value) return value.booleanValue as boolean;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) return Date.parse(value.timestampValue as string);
  if ("arrayValue" in value) {
    const inner = value.arrayValue as { values?: FsValue[] };
    return (inner.values ?? []).map(decode);
  }
  if ("mapValue" in value) {
    const inner = value.mapValue as { fields?: Record<string, FsValue> };
    return decodeFields(inner.fields ?? {});
  }
  return undefined;
};

const decodeFields = (fields: Record<string, FsValue>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decode(v)]));

/* ------------------------------------------------------------------- shape */

export interface MbSummaryMeta {
  shareCode: string;
  name: string;
  /** Named only when the ranking produces an unshared top line. */
  champion: string | null;
  /** Set when it does not: who was level, and on what. */
  levelAtTop: { count: number; points: number } | null;
  teamCount: number;
  matchCount: number;
  formatLabel: string;
  /** `Feb 7, 2026`. */
  endedShort: string;
}

/** Everything the card says when the read did not produce a document. */
export const MB_SUMMARY_META_FALLBACK = {
  title: "Match Report — Tournament Tracker",
  description:
    "A finished event: the final table, every result, and the closest match of the day. Scored live with Tournament Tracker.",
} as const;

/* --------------------------------------------------------------- the fetch */

const REST_TIMEOUT_MS = 2500;

/**
 * A share card is not worth delaying the document for. `generateMetadata`
 * blocks the response, so the read is given 2.5s and then abandoned — the
 * static card is a complete, correct answer, just a less specific one.
 */
export const fetchSummaryMeta = async (
  shareCode: string
): Promise<MbSummaryMeta | null> => {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!projectId || !apiKey || !shareCode) return null;

  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/(default)/documents:runQuery?key=${encodeURIComponent(apiKey)}`;

  const body = {
    structuredQuery: {
      from: [{ collectionId: "summaries" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "shareCode" },
          op: "EQUAL",
          value: { stringValue: shareCode.toUpperCase() },
        },
      },
      limit: 1,
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REST_TIMEOUT_MS),
      /* The document is frozen the moment the session ends, so an hour-old
         answer is the same answer. Next's Data Cache only covers GET, so this
         POST is not deduped between `generateMetadata` and the OG image route
         — two reads per unfurl, and the scraper caches the result of both. */
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    const rows = (await response.json()) as { document?: { fields?: Record<string, FsValue> } }[];
    const fields = Array.isArray(rows) ? rows.find((r) => r.document)?.document?.fields : undefined;
    if (!fields) return null;
    return shapeSummaryMeta(decodeFields(fields));
  } catch {
    /* Offline, rules changed, project renamed, timed out — all of them mean the
       same thing to a card: say the true general thing instead of a false
       specific one. Nothing is logged; this runs on every unfurl. */
    return null;
  }
};

/* ------------------------------------------------------------- the shaping */

const shortDate = (ts: number) =>
  Number.isFinite(ts) && ts > 0
    ? new Date(ts).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "";

/**
 * Exported so the test can drive it with a decoded document and so the OG image
 * route and `generateMetadata` cannot shape the same document two ways.
 */
export const shapeSummaryMeta = (raw: Record<string, unknown>): MbSummaryMeta | null => {
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const shareCode = typeof raw.shareCode === "string" ? raw.shareCode : "";
  if (!name) return null;

  const teams = (Array.isArray(raw.teams) ? raw.teams : []) as PersistentTeam[];
  const matches = (Array.isArray(raw.matches) ? raw.matches : []) as Match[];
  const competition = (raw.competition ?? null) as Competition | null;

  const nameOf = (id: string) => teams.find((t) => t.id === id)?.name ?? "";

  const played = matches.filter((m) => m?.status === "completed" && !m.isBye);

  const teamIds = competition?.teamIds?.length
    ? competition.teamIds.filter((id) => teams.some((t) => t.id === id))
    : teams.map((t) => t.id);

  /* THE D-40 RULE, transcribed from `useMatchbookSummary.ts` line for line:
       - a competition that recorded its own `winnerId` names that team, which
         in practice is the knockout case — a bracket winner is a fact about
         the draw, not about a points table;
       - otherwise `rankTeams(...)[0]`, and only when that line does not share
         its rank;
       - a session with no completed match names nobody.
     `stats.winner` is never read: `computeSessionStats` picks the first team to
     reach the highest win count with no tiebreak, and the hook stopped trusting
     it for exactly that reason. */
  const declaredWinner =
    competition?.winnerId && teams.some((t) => t.id === competition.winnerId)
      ? competition.winnerId
      : null;

  const standings = played.length > 0 ? rankTeams(teamIds, matches, competition?.config) : [];
  const top = standings[0] ?? null;
  const championId =
    played.length === 0
      ? null
      : (declaredWinner ?? (top && !top.sharesRank ? top.teamId : null));

  const levelAtTop =
    !championId && top && played.length > 0
      ? {
          count: standings.filter((line) => line.rank === top.rank).length,
          points: top.competitionPoints,
        }
      : null;

  return {
    shareCode,
    name,
    champion: championId ? nameOf(championId) || null : null,
    levelAtTop,
    teamCount: teams.length,
    matchCount: played.length,
    formatLabel: competition ? (FORMAT_META[competition.type]?.label ?? "Session") : "Session",
    endedShort: shortDate(typeof raw.endedAt === "number" ? raw.endedAt : 0),
  };
};

/* ---------------------------------------------------------------- the copy */

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

export const summaryTitle = (meta: MbSummaryMeta) => `${meta.name} — Match Report`;

/**
 * The description has to survive being truncated at ~155 characters by every
 * consumer, so the RESULT is the first clause and the provenance is last.
 * Never "View the summary" — a preview that describes the page instead of the
 * event is the same bare URL with extra steps.
 */
export const summaryDescription = (meta: MbSummaryMeta) => {
  const tail = [
    plural(meta.teamCount, "team", "teams"),
    plural(meta.matchCount, "match", "matches"),
    meta.formatLabel,
  ].join(" · ");

  const headline = meta.champion
    ? `${meta.champion} won ${meta.name}.`
    : meta.levelAtTop
      ? `${meta.name} ended with ${meta.levelAtTop.count} teams level on ${plural(
          meta.levelAtTop.points,
          "point",
          "points"
        )}.`
      : `${meta.name} ended without a result recorded.`;

  const ended = meta.endedShort ? ` ${meta.endedShort} · ` : " ";
  return `${headline}${ended}${tail}. The full table, every result and the closest match.`;
};

/* ------------------------------------------------------- the card's palette */

/**
 * Satori has no cascade, no stylesheet and no custom properties, so the OG card
 * cannot say `var(--mb-navy)`. This is the token table transcribed, one entry
 * per `--mb-*` it is named for, and `summaryMeta.test.ts` reads `globals.css`
 * and fails the moment a value here stops matching its token. It is the only
 * place in `src/` that writes a Matchbook colour as a literal.
 */
export const MB_OG_INK = {
  /** `--mb-paper` */
  paper: "#f7f0e4",
  /** `--mb-navy` */
  navy: "#07324d",
  /** `--mb-coral` — a MARK here (the spine, the rule), never a letterform. */
  coral: "#ee4b34",
  /** `--mb-coral-deep` — the ink twin, for the 22px kicker. 4.62:1 on paper. */
  coralDeep: "#c9351f",
  /** `--mb-ink-muted` — 4.82:1 on paper. */
  inkMuted: "#5d6c70",
  /** `--mb-rule` — an alpha ink, and Satori composites rgba() correctly. */
  rule: "rgba(7, 50, 77, 0.28)",
} as const;

/**
 * The crest, inlined rather than read off disk. `process.cwd() + "/public"` is
 * not something a serverless bundle is guaranteed to have traced, and the file
 * is 630 bytes. `summaryMeta.test.ts` asserts this string still equals
 * `public/assets/matchbook/brand/crest.svg` byte for byte.
 */
export const MB_OG_CREST_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 112" role="img" aria-labelledby="title">
  <title id="title">Tournament Tracker crest</title>
  <path d="M48 4 88 18v34c0 26-15 44-40 56C23 96 8 78 8 52V18Z" fill="#fffaf1" stroke="#07324d" stroke-width="6"/>
  <path d="M48 11 81 23v28c0 21-11 36-33 48-22-12-33-27-33-48V23Z" fill="#07324d"/>
  <path d="M48 11v88c22-12 33-27 33-48V23Z" fill="#ee4b34" opacity=".92"/>
  <path d="M29 29h38v8c0 11-6 19-15 22v9h10v7H34v-7h10v-9C35 56 29 48 29 37Zm-8 2h9v7h-3c0 7 3 11 9 13l-3 6C24 54 21 47 21 31Zm54 0h-9v7h3c0 7-3 11-9 13l3 6c9-3 12-10 12-26Z" fill="#f7f0e4"/>
</svg>
`;

/** The kicker/headline pair the OG card sets in type. */
export const summaryCardLines = (meta: MbSummaryMeta) =>
  meta.champion
    ? { kicker: "Champion", headline: meta.champion }
    : meta.levelAtTop
      ? {
          kicker: "No outright winner",
          headline: `${meta.levelAtTop.count} teams level on ${meta.levelAtTop.points}`,
        }
      : { kicker: "Full time", headline: "No result recorded" };
