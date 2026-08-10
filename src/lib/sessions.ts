import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import { STORAGE_KEY } from "@/context/appReducer";
import type { Session, SessionRole, SessionSummary, SessionStats } from "@/types/session";
import type { AppState, Competition, PersistentTeam, Match } from "@/types/game";

// ============================================
// Constants
// ============================================
const SESSIONS_COLLECTION = "sessions";
const SUMMARIES_COLLECTION = "summaries";

// Generate a random share code (6 alphanumeric characters)
const generateShareCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars (0, O, 1, I)
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Generate a secure admin token (32 characters)
const generateAdminToken = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

// Generate a unique session ID
const generateSessionId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

const sanitizeForFirestore = <T>(value: T): T => {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    const cleaned = value
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined);
    return cleaned as T;
  }

  if (typeof value === "object") {
    if (value instanceof Date) {
      return value;
    }

    const cleanedEntries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, sanitizeForFirestore(entryValue)]);
    return Object.fromEntries(cleanedEntries) as T;
  }

  return value;
};

// ============================================
// Local design preview — production-dead (charter Appendix A, D-12)
// ============================================

/**
 * Local design-preview escape hatch for the PUBLIC SHARE ROUTES, built to the
 * same rule as the auth hatch in `src/context/AuthContext.tsx` (lines 53-59):
 * a module-level constant of two `process.env` reads, both of which Next
 * inlines at build time. In a production build the first term is literally
 * `false`, so every branch guarded by it is dead code the minifier deletes —
 * and `.env.local`, which is gitignored and never ships, is the only place the
 * flag is ever set, so it is off twice over.
 *
 * WHY IT EXISTS. `/session/[shareCode]` and `/summary/[shareCode]` read
 * Firestore, and the Firestore emulator needs Java, which is not installed on
 * this machine. Both routes therefore rendered their not-found state, and the
 * redesign of them could not be checked against a single populated pixel.
 *
 * WHAT IT SERVES. Not invented data — the same fixture the rest of the visual
 * harness uses. `pw/shot.mjs` seeds `localStorage[STORAGE_KEY]` from
 * `pw/fixture.json` before any page script runs, and the seeds below project
 * that AppState into Sessions and Summaries. Re-running `gen-fixture.mts`
 * updates the share routes with it; a `--empty` run empties them too.
 *
 * WHAT IT DOES NOT DO. With the flag on these routes never contact Firestore
 * at all, so an unknown share code resolves to null locally instead of a
 * network error: the not-found states stay clean and auditable.
 */
const DEV_PREVIEW_SESSION =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_DEV_PREVIEW_SESSION === "1";

/** The uid `AuthContext`'s PREVIEW_USER carries. "You", in preview. */
const PREVIEW_VIEWER_UID = "dev-preview-user";

/**
 * Somebody else. Sessions owned by this uid are the READ-ONLY half of the
 * preview: you get `role === "viewer"`, `canEdit === false`, and every write
 * through `SessionContext` is refused — which is exactly the permission-denied
 * path the public viewer has to render well.
 */
const PREVIEW_HOST_UID = "dev-preview-host";

/**
 * The admin token every preview session carries. Visiting
 * `/session/<code>?admin=dev-preview-admin-token` promotes a viewer to admin
 * through the real `applyAdminToken` -> `validateAdminToken` path, so the
 * read-only and the editable renderings of the same screen can both be shot.
 */
const PREVIEW_ADMIN_TOKEN = "dev-preview-admin-token";

type PreviewSeed = {
  /** Share code as it appears in the URL. Uppercase, 6 chars, no O/0/I/1. */
  shareCode: string;
  name: string;
  /** Competition id in `pw/fixture.json`. */
  competitionId: string;
  /** `self` = you created it (creator/admin). `host` = someone else's (viewer). */
  owner: "self" | "host";
};

/** Live shared sessions. One per competition shape a viewer can land on. */
const PREVIEW_SESSION_SEEDS: readonly PreviewSeed[] = [
  {
    shareCode: "SUMMER",
    name: "Summer League — Matchday 4",
    competitionId: "comp-rr-summer-league",
    owner: "host",
  },
  {
    shareCode: "CTYCUP",
    name: "City Cup — Semifinals",
    competitionId: "comp-se-city-cup",
    owner: "host",
  },
  {
    shareCode: "FRDAY2",
    name: "Friday Night Win 2 & Out",
    competitionId: "comp-w2o-friday-night",
    owner: "self",
  },
];

/** Ended sessions, i.e. the post-event summary route. */
const PREVIEW_SUMMARY_SEEDS: readonly PreviewSeed[] = [
  {
    shareCode: "SPRNG7",
    name: "Spring Invitational",
    competitionId: "comp-rr-spring-final",
    owner: "self",
  },
  {
    shareCode: "GYMDAY",
    name: "Open Gym Rotation",
    competitionId: "comp-tmr-open-gym",
    owner: "host",
  },
];

/** The harness fixture, read from the key `appReducer` persists AppState under. */
const readPreviewAppState = (): AppState | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (
      !Array.isArray(parsed.teams) ||
      !Array.isArray(parsed.competitions) ||
      !Array.isArray(parsed.matches)
    ) {
      return null;
    }
    return {
      teams: parsed.teams,
      competitions: parsed.competitions,
      matches: parsed.matches,
    };
  } catch {
    return null;
  }
};

/**
 * The fixture, captured AT MODULE LOAD, which is the only moment it can be
 * trusted.
 *
 * `AppContext` truncates this key during hydration: its load effect dispatches
 * LOAD_STATE, and its save effect — committing in the same pass, before that
 * dispatch lands — writes the still-empty initial state back over storage. The
 * share routes' first lookup falls inside that window; measured, it read 43
 * bytes (`{"teams":[],"competitions":[],"matches":[]}`) with the full fixture
 * restored a tick later. Reading lazily therefore seeded an empty store and
 * every share code resolved to "not found" with populated storage sitting right
 * next to it. Module evaluation runs before React mounts, so this snapshot
 * predates the wipe.
 */
const PREVIEW_APP_STATE_AT_LOAD: AppState | null = DEV_PREVIEW_SESSION
  ? readPreviewAppState()
  : null;

/**
 * Project one fixture competition into a Session.
 *
 * Every timestamp is derived from the fixture, never `Date.now()` — the fixture
 * is generated off a fixed clock precisely so screenshots do not drift, and a
 * live "duration" would undo that.
 */
const buildPreviewSession = (seed: PreviewSeed, state: AppState): Session | null => {
  const competition = state.competitions.find((c) => c.id === seed.competitionId);
  if (!competition) return null;

  const matchIds = new Set(competition.matchIds);
  const matches = state.matches.filter(
    (m) => matchIds.has(m.id) || m.competitionId === competition.id
  );

  const teamsById = new Map(state.teams.map((t) => [t.id, t]));
  const teams = competition.teamIds
    .map((id) => teamsById.get(id))
    .filter((t): t is PersistentTeam => Boolean(t));

  const creatorId = seed.owner === "self" ? PREVIEW_VIEWER_UID : PREVIEW_HOST_UID;
  const lastActivity = matches.reduce(
    (latest, m) => Math.max(latest, m.completedAt ?? m.createdAt),
    competition.createdAt
  );

  return {
    id: `preview-session-${seed.shareCode.toLowerCase()}`,
    name: seed.name,
    creatorId,
    adminToken: PREVIEW_ADMIN_TOKEN,
    adminIds: [creatorId],
    shareCode: seed.shareCode,
    competition,
    teams,
    matches,
    createdAt: competition.createdAt,
    updatedAt: lastActivity,
  };
};

/**
 * Stats for a preview summary.
 *
 * Deliberately not `computeSessionStats`: that one measures duration against
 * `Date.now()`, which would make the summary page report a different number
 * every screenshot. Here duration is `endedAt - createdAt`, both from the
 * fixture.
 */
const buildPreviewStats = (session: Session, endedAt: number): SessionStats => {
  const completed = session.matches.filter((m) => m.status === "completed");
  const wins = new Map<string, number>();
  completed.forEach((m) => {
    if (m.winnerId) wins.set(m.winnerId, (wins.get(m.winnerId) ?? 0) + 1);
  });

  let winner: SessionStats["winner"] | undefined;
  wins.forEach((count, teamId) => {
    if (!winner || count > winner.wins) {
      winner = {
        teamId,
        teamName: session.teams.find((t) => t.id === teamId)?.name ?? "Unknown Team",
        wins: count,
      };
    }
  });

  return {
    totalMatches: session.matches.length,
    completedMatches: completed.length,
    totalTeams: session.teams.length,
    duration: Math.max(0, endedAt - session.createdAt),
    winner,
  };
};

const buildPreviewSummary = (
  seed: PreviewSeed,
  state: AppState
): SessionSummary | null => {
  const session = buildPreviewSession(seed, state);
  if (!session) return null;

  const endedAt = session.matches.reduce(
    (latest, m) => Math.max(latest, m.completedAt ?? 0),
    session.createdAt
  );

  return {
    id: `preview-summary-${seed.shareCode.toLowerCase()}`,
    name: seed.name,
    creatorId: session.creatorId,
    shareCode: seed.shareCode,
    competition: session.competition,
    teams: session.teams,
    matches: session.matches,
    createdAt: session.createdAt,
    endedAt,
    stats: buildPreviewStats(session, endedAt),
  };
};

type PreviewStore = {
  seeded: boolean;
  sessions: Map<string, Session>;
  summaries: Map<string, SessionSummary>;
  listeners: Map<string, Set<(session: Session | null) => void>>;
};

/**
 * In-memory stand-in for the two Firestore collections. It is a real store, not
 * a lookup table: writes land in it and fire the subscribers, so an admin edit
 * round-trips through `subscribeToSession` exactly as it would in production
 * and the editable path is genuinely exercisable, not just visible.
 */
const previewStore: PreviewStore = {
  seeded: false,
  sessions: new Map(),
  summaries: new Map(),
  listeners: new Map(),
};

/**
 * Seeding RETRIES until the fixture is actually there, and that is not
 * defensive padding — `AppContext` has a hydration window in which it truncates
 * this very key. Its load effect dispatches LOAD_STATE, and its save effect,
 * committing in the same pass, writes the still-initial empty state back over
 * localStorage before the dispatch lands. Seeding once, eagerly, caught that
 * empty snapshot and left every share route reading "not found" with populated
 * storage sitting right next to it.
 *
 * Runtime writes are kept regardless of seeding, so a session created or ended
 * in preview survives a later re-seed.
 */
const previewData = (): PreviewStore => {
  if (previewStore.seeded) return previewStore;

  // The load-time snapshot first; a fresh read only if there was none (SSR, or
  // a hot reload that re-evaluated this module after the app had booted).
  const state = PREVIEW_APP_STATE_AT_LOAD ?? readPreviewAppState();
  if (!state) return previewStore;

  PREVIEW_SESSION_SEEDS.forEach((seed) => {
    const session = buildPreviewSession(seed, state);
    if (session) previewStore.sessions.set(session.id, session);
  });
  PREVIEW_SUMMARY_SEEDS.forEach((seed) => {
    const summary = buildPreviewSummary(seed, state);
    if (summary) previewStore.summaries.set(summary.id, summary);
  });

  // An empty AppState (the `--empty` fixture, or the hydration window above)
  // is not a seeded store: leave the flag down so the next call tries again.
  previewStore.seeded = state.competitions.length > 0;
  return previewStore;
};

const previewNotify = (sessionId: string, value: Session | null) => {
  previewData().listeners.get(sessionId)?.forEach((cb) => cb(value));
};

const previewSubscribe = (
  sessionId: string,
  callback: (session: Session | null) => void
): Unsubscribe => {
  const store = previewData();
  const listeners = store.listeners.get(sessionId) ?? new Set();
  store.listeners.set(sessionId, listeners);
  listeners.add(callback);

  // Firestore's onSnapshot delivers the current document asynchronously; match
  // that so a caller never gets a callback inside its own subscribe() frame.
  queueMicrotask(() => {
    if (listeners.has(callback)) callback(store.sessions.get(sessionId) ?? null);
  });

  return () => {
    listeners.delete(callback);
  };
};

// ============================================
// Session CRUD Operations
// ============================================

/**
 * Create a new session in Firestore
 */
export const createSession = async (
  name: string,
  creatorId: string | null,
  competition: Competition | null = null,
  teams: PersistentTeam[] = [],
  matches: Match[] = []
): Promise<{ session: Session; adminToken: string }> => {
  const sessionId = generateSessionId();
  const shareCode = generateShareCode();
  const adminToken = generateAdminToken();

  const session: Session = {
    id: sessionId,
    name,
    creatorId,
    adminToken, // Store the plain token - in production, you'd want to hash this
    adminIds: creatorId ? [creatorId] : [],
    shareCode,
    competition,
    teams,
    matches,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  if (DEV_PREVIEW_SESSION) {
    // Keeps the whole create -> share -> join loop working locally, so the
    // share dialog's code and QR are pointed at something that resolves.
    previewData().sessions.set(sessionId, session);
    return { session, adminToken };
  }

  if (!db) {
    throw new Error("Firebase is not configured");
  }

  const sanitizedSession = sanitizeForFirestore(session);
  await setDoc(doc(db, SESSIONS_COLLECTION, sessionId), sanitizedSession);

  return { session, adminToken };
};

/**
 * Get a session by share code
 */
export const getSessionByShareCode = async (shareCode: string): Promise<Session | null> => {
  if (DEV_PREVIEW_SESSION) {
    const wanted = shareCode.toUpperCase();
    for (const session of previewData().sessions.values()) {
      if (session.shareCode.toUpperCase() === wanted) return session;
    }
    // No Firestore fallback on purpose: an unknown code has to reach the
    // not-found state without a failed network request behind it.
    return null;
  }
  if (!db) return null;

  const q = query(
    collection(db, SESSIONS_COLLECTION),
    where("shareCode", "==", shareCode.toUpperCase())
  );
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].data() as Session;
  }
  return null;
};

/**
 * Update session data
 */
const updateSession = async (
  sessionId: string,
  updates: Partial<Omit<Session, "id" | "shareCode" | "adminToken" | "createdAt">>
): Promise<void> => {
  if (DEV_PREVIEW_SESSION) {
    const store = previewData();
    const existing = store.sessions.get(sessionId);
    if (!existing) return;
    const next: Session = { ...existing, ...updates, updatedAt: Date.now() };
    store.sessions.set(sessionId, next);
    previewNotify(sessionId, next);
    return;
  }

  if (!db) {
    throw new Error("Firebase is not configured");
  }

  const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
  const sanitizedUpdates = sanitizeForFirestore({
    ...updates,
    updatedAt: Date.now(),
  });
  await updateDoc(docRef, sanitizedUpdates);
};

/**
 * Update all session data at once (for batch updates)
 */
export const updateSessionData = async (
  sessionId: string,
  data: {
    competition?: Competition | null;
    teams?: PersistentTeam[];
    matches?: Match[];
  }
): Promise<void> => {
  await updateSession(sessionId, data);
};

/**
 * Delete a session
 */
export const deleteSession = async (sessionId: string): Promise<void> => {
  if (DEV_PREVIEW_SESSION) {
    previewData().sessions.delete(sessionId);
    previewNotify(sessionId, null);
    return;
  }

  if (!db) {
    throw new Error("Firebase is not configured");
  }

  const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await deleteDoc(docRef);
};

// ============================================
// Real-time Subscriptions
// ============================================

/**
 * Subscribe to real-time session updates
 */
export const subscribeToSession = (
  sessionId: string,
  callback: (session: Session | null) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  if (DEV_PREVIEW_SESSION) {
    return previewSubscribe(sessionId, callback);
  }

  if (!db) {
    // Return a no-op unsubscribe function
    callback(null);
    return () => {};
  }

  const docRef = doc(db, SESSIONS_COLLECTION, sessionId);

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as Session);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error("Error subscribing to session:", error);
      if (onError) {
        onError(error);
      }
    }
  );
};

// ============================================
// Permission Helpers
// ============================================

/**
 * Check if a user has admin access to a session
 */
const hasAdminAccess = (
  session: Session,
  userId: string | null,
  adminToken: string | null
): boolean => {
  // Check if user is in admin list
  if (userId && session.adminIds.includes(userId)) {
    return true;
  }

  // Check if user is the creator
  if (userId && session.creatorId === userId) {
    return true;
  }

  // Check admin token for anonymous access
  if (adminToken && session.adminToken === adminToken) {
    return true;
  }

  return false;
};

/**
 * Get user's role in a session
 */
export const getSessionRole = (
  session: Session,
  userId: string | null,
  adminToken: string | null
): SessionRole => {
  // Check if user is the creator
  if (userId && session.creatorId === userId) {
    return "creator";
  }

  // Check if user has admin access
  if (hasAdminAccess(session, userId, adminToken)) {
    return "admin";
  }

  return "viewer";
};

/**
 * Validate admin token
 */
export const validateAdminToken = (session: Session, token: string): boolean => {
  return session.adminToken === token;
};

// ============================================
// Session URL Helpers
// ============================================

/**
 * Get the shareable URL for a session
 */
export const getSessionUrl = (shareCode: string): string => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/session/${shareCode}`;
  }
  return `/session/${shareCode}`;
};

/**
 * Get the admin URL for a session (includes admin token)
 */
export const getAdminUrl = (shareCode: string, adminToken: string): string => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/session/${shareCode}?admin=${adminToken}`;
  }
  return `/session/${shareCode}?admin=${adminToken}`;
};

// ============================================
// Session Summary Functions
// ============================================

/**
 * Compute stats from session data
 */
const computeSessionStats = (
  session: Session
): SessionStats => {
  const matches = session.matches || [];
  const teams = session.teams || [];
  const completedMatches = matches.filter((m) => m.status === "completed");

  // Count wins per team
  const winsPerTeam: Record<string, number> = {};
  completedMatches.forEach((match) => {
    if (match.winnerId) {
      winsPerTeam[match.winnerId] = (winsPerTeam[match.winnerId] || 0) + 1;
    }
  });

  // Find the team with most wins
  let winner: SessionStats["winner"] | undefined;
  let maxWins = 0;
  Object.entries(winsPerTeam).forEach(([teamId, wins]) => {
    if (wins > maxWins) {
      maxWins = wins;
      const team = teams.find((t) => t.id === teamId);
      winner = {
        teamId,
        teamName: team?.name || "Unknown Team",
        wins,
      };
    }
  });

  return {
    totalMatches: matches.length,
    completedMatches: completedMatches.length,
    totalTeams: teams.length,
    duration: Date.now() - session.createdAt,
    winner,
  };
};

/**
 * Create a session summary (called when ending a session)
 */
export const createSessionSummary = async (
  session: Session
): Promise<SessionSummary> => {
  const summaryId = `summary-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  const shareCode = generateShareCode();
  const stats = computeSessionStats(session);

  const summary: SessionSummary = {
    id: summaryId,
    name: session.name,
    creatorId: session.creatorId,
    shareCode,
    competition: session.competition,
    teams: session.teams,
    matches: session.matches,
    createdAt: session.createdAt,
    endedAt: Date.now(),
    stats,
  };

  if (DEV_PREVIEW_SESSION) {
    // "End session" has to land somewhere the summary route can read back.
    previewData().summaries.set(summaryId, summary);
    return summary;
  }

  if (!db) {
    throw new Error("Firebase is not configured");
  }

  const sanitizedSummary = sanitizeForFirestore(summary);
  await setDoc(doc(db, SUMMARIES_COLLECTION, summaryId), sanitizedSummary);

  return summary;
};

/**
 * Get a summary by share code
 */
export const getSummaryByShareCode = async (
  shareCode: string
): Promise<SessionSummary | null> => {
  if (DEV_PREVIEW_SESSION) {
    const wanted = shareCode.toUpperCase();
    for (const summary of previewData().summaries.values()) {
      if (summary.shareCode.toUpperCase() === wanted) return summary;
    }
    return null;
  }
  if (!db) return null;

  const q = query(
    collection(db, SUMMARIES_COLLECTION),
    where("shareCode", "==", shareCode.toUpperCase())
  );
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].data() as SessionSummary;
  }
  return null;
};

/**
 * Get all summaries for a creator
 */
export const getCreatorSummaries = async (
  creatorId: string
): Promise<SessionSummary[]> => {
  if (DEV_PREVIEW_SESSION) {
    return Array.from(previewData().summaries.values()).filter(
      (summary) => summary.creatorId === creatorId
    );
  }
  if (!db) return [];

  const q = query(
    collection(db, SUMMARIES_COLLECTION),
    where("creatorId", "==", creatorId)
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => doc.data() as SessionSummary);
};

/**
 * Delete a summary (only creator can delete)
 */
export const deleteSummary = async (summaryId: string): Promise<void> => {
  if (DEV_PREVIEW_SESSION) {
    previewData().summaries.delete(summaryId);
    return;
  }

  if (!db) {
    throw new Error("Firebase is not configured");
  }

  const docRef = doc(db, SUMMARIES_COLLECTION, summaryId);
  await deleteDoc(docRef);
};

/**
 * Get the shareable URL for a summary
 */
export const getSummaryUrl = (shareCode: string): string => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/summary/${shareCode}`;
  }
  return `/summary/${shareCode}`;
};

