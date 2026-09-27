/**
 * Share links, the pure part: how the spectator and scorer links are spelled,
 * how the scorer key is read back from a page, and the record a phone keeps
 * of the scorer links it has opened. Nothing in here touches the database or
 * the browser; the record takes its store as an argument.
 */

const SCORER_PARAM = "scorer";

/** What a phone is told when the rules refuse its scorer link. */
export const STALE_SCORER_LINK =
  "This scorer link is no longer valid. Ask the tournament's owner for the current one.";

/** The spectator link is the tournament's page. */
export const spectatorLink = (origin: string, tournamentId: string): string =>
  `${origin}/competitions/${tournamentId}`;

/** The scorer link is the same page carrying the key. */
export const scorerLink = (origin: string, tournamentId: string, key: string): string =>
  `${spectatorLink(origin, tournamentId)}?${SCORER_PARAM}=${encodeURIComponent(key)}`;

/** The scorer key a page was opened with, or null when it was not a scorer link. */
export const scorerKeyIn = (params: Pick<URLSearchParams, "get">): string | null => {
  const key = params.get(SCORER_PARAM);
  return key ? key : null;
};

// ============================================
// The phone's record of scorer links
// ============================================

/** The part of localStorage the record uses. */
export interface LinkStore {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

/** A store that lives only as long as the page, for a server render or a browser that blocks storage. */
export const memoryLinkStore = (): LinkStore => {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
  };
};

/** Tournament id to the key of the scorer link the phone opened for it. */
export type ScorerLinkRecord = Record<string, string>;

const RECORD_KEY = "tournament-tracker.scorerLinks";

const isRecord = (value: unknown): value is ScorerLinkRecord =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.values(value as Record<string, unknown>).every((key) => typeof key === "string");

/**
 * The scorer links this phone has opened. An empty record when the store is
 * empty, holds something unreadable, or cannot be read at all, as in a
 * browser that blocks storage.
 */
export const recordedScorerLinks = (store: LinkStore): ScorerLinkRecord => {
  try {
    const parsed: unknown = JSON.parse(store.getItem(RECORD_KEY) ?? "{}");
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const save = (store: LinkStore, record: ScorerLinkRecord): ScorerLinkRecord => {
  try {
    store.setItem(RECORD_KEY, JSON.stringify(record));
  } catch {
    // A store that refuses writes leaves the record to this page's memory.
  }
  return record;
};

/** Remember the scorer link opened for a tournament; a newer key replaces the old. */
export const recordScorerLink = (
  store: LinkStore,
  tournamentId: string,
  key: string,
): ScorerLinkRecord => save(store, { ...recordedScorerLinks(store), [tournamentId]: key });

/** Drop a tournament's scorer link, as when the owner has regenerated it. */
export const forgetScorerLink = (store: LinkStore, tournamentId: string): ScorerLinkRecord => {
  const rest = { ...recordedScorerLinks(store) };
  delete rest[tournamentId];
  return save(store, rest);
};
