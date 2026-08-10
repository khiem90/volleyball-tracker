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
  orderBy,
  type Unsubscribe,
} from "firebase/firestore";
import { nanoid } from "nanoid";
import { db } from "@/lib/firebase";
import { getTemplateById } from "./templateFormations";
import type {
  UserFormation,
  FormationData,
  FormationSource,
  FormationVisibility,
} from "./types";

// ============================================
// Constants
// ============================================
const FORMATIONS_COLLECTION = "formations";

// ============================================
// Local design preview — production-dead (charter Appendix A, D-12)
// ============================================

/**
 * The share-route half of `NEXT_PUBLIC_DEV_PREVIEW_SESSION`, declared exactly
 * as `src/lib/sessions.ts` and `src/context/AuthContext.tsx` declare it: two
 * build-time-inlined `process.env` reads, the first of which is literally
 * `false` in a production build, so everything below is dead code the minifier
 * removes.
 *
 * `/tools/volleyball-rotations/shared/[shareId]` is Firestore-only, and the
 * Firestore emulator needs Java, which is not installed here — so the page had
 * exactly one reachable rendering locally: "not shared". With the flag on, four
 * reserved share ids serve the populated view and each of the three distinct
 * failures, so all four states can be shot without a backend.
 */
const DEV_PREVIEW_SESSION =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_DEV_PREVIEW_SESSION === "1";

/**
 * The fixed clock `pw/gen-fixture.mts` runs on (2026-08-08T12:00:00Z). Sharing
 * it keeps the "Created / Last updated" rows in the Record panel from drifting
 * between screenshot runs, the same reason the fixture has no `Date.now()`.
 */
const PREVIEW_CLOCK = 1786190400000;

/** `mbPreview1` renders; the other three each force a distinct failure state. */
const PREVIEW_SHARE_ID = "mbPreview1";
const PREVIEW_FAILURE_SHARE_IDS: Readonly<Record<string, ShareLookupFailure>> = {
  mbPreviewNF: "notfound",
  mbPreviewOF: "offline",
  mbPreviewIX: "unindexed",
};

/**
 * Built from the app's own `standard-5-1` starter template rather than invented
 * coordinates — the shared view then shows a formation that is legal under
 * `formationValidation`, which a hand-written one would not be.
 */
/**
 * The signed-in user's archive, in memory, starting EMPTY on purpose.
 *
 * Empty is the truthful preview answer — there is no store behind this build —
 * and it matters that the answer comes from a decision rather than a failed
 * request: `useUserFormations` subscribes on every page that mounts it, the
 * shared viewer included, so without this the share route inherits a dead
 * Firestore listener (ERR_CONNECTION_REFUSED plus two @firebase/firestore
 * console errors) that has nothing to do with what the page is showing. It also
 * makes "Copy To My Formations" a working action instead of a guaranteed
 * failure notice, and it stops the archive reporting `fromCache: true`, i.e.
 * telling a coach with no formations that their formations could not be reached.
 */
const previewFormations = new Map<string, UserFormation>();

/** Listener -> the uid it subscribed for, so a re-emit stays correctly scoped. */
const previewFormationListeners = new Map<
  (formations: UserFormation[], meta: FormationsSnapshotMeta) => void,
  string
>();

const previewOwned = (userId: string): UserFormation[] =>
  Array.from(previewFormations.values())
    .filter((f) => f.ownerUserId === userId)
    .sort((a, b) => b.updatedAt - a.updatedAt);

const previewEmitFormations = () => {
  previewFormationListeners.forEach((userId, cb) =>
    cb(previewOwned(userId), { fromCache: false, hasPendingWrites: false })
  );
};

const buildPreviewSharedFormation = (): UserFormation | null => {
  const template = getTemplateById("standard-5-1");
  if (!template) return null;

  return {
    id: "preview-formation-standard-5-1",
    ownerUserId: "dev-preview-host",
    name: "Standard 5-1 — Serve Receive",
    description:
      "Our base 5-1 with a three-passer receive. Setter releases early from zone 1; middles hold the seam until the ball is up.",
    tags: ["5-1", "serve receive", "club"],
    visibility: "unlisted",
    shareId: PREVIEW_SHARE_ID,
    baseSource: { type: "template", id: template.id },
    data: template.data,
    createdAt: PREVIEW_CLOCK - 46 * 24 * 60 * 60 * 1000,
    updatedAt: PREVIEW_CLOCK - 5 * 24 * 60 * 60 * 1000,
  };
};

// ============================================
// ID Generation
// ============================================

/** Generate unique formation ID */
const generateFormationId = (): string => {
  return `formation-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

/** Generate share ID (short, URL-safe) */
const generateShareId = (): string => {
  return nanoid(10);
};

// ============================================
// Sanitization (remove undefined values for Firestore)
// ============================================

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
// Create Operations
// ============================================

export type CreateFormationOptions = {
  description?: string;
  tags?: string[];
  visibility?: FormationVisibility;
  baseSource?: FormationSource;
};

/**
 * Create a new formation
 */
export const createFormation = async (
  userId: string,
  name: string,
  data: FormationData,
  options?: CreateFormationOptions
): Promise<UserFormation> => {
  const formationId = generateFormationId();
  const now = Date.now();

  const formation: UserFormation = {
    id: formationId,
    ownerUserId: userId,
    name,
    description: options?.description,
    tags: options?.tags || [],
    visibility: options?.visibility || "private",
    baseSource: options?.baseSource,
    data,
    createdAt: now,
    updatedAt: now,
  };

  if (DEV_PREVIEW_SESSION) {
    previewFormations.set(formationId, formation);
    previewEmitFormations();
    return formation;
  }

  if (!db) {
    throw new Error("Firebase is not configured");
  }

  const sanitized = sanitizeForFirestore(formation);
  await setDoc(doc(db, FORMATIONS_COLLECTION, formationId), sanitized);

  return formation;
};

/**
 * Duplicate an existing formation to a user's collection
 */
export const duplicateFormation = async (
  sourceFormation: UserFormation,
  newOwnerId: string,
  newName?: string
): Promise<UserFormation> => {
  return createFormation(
    newOwnerId,
    newName || `${sourceFormation.name} (Copy)`,
    sourceFormation.data,
    {
      description: sourceFormation.description,
      tags: sourceFormation.tags,
      visibility: "private",
      baseSource: { type: "custom", id: sourceFormation.id },
    }
  );
};

// ============================================
// Read Operations
// ============================================


/**
 * Why a share link failed to resolve. The three causes need three different
 * sentences and three different actions, and until now they all landed on one
 * "Formation Not Found" page — which tells a visitor the owner un-shared the
 * link when in fact their train went through a tunnel.
 *
 * `unindexed` is the one worth spelling out. The query below filters on
 * `shareId` AND `visibility`, which Firestore can only serve from a COMPOSITE
 * INDEX on (`shareId` ASC, `visibility` ASC). It works in the emulator and it
 * works locally because the SDK falls back, but in production a missing index
 * throws `failed-precondition` — and the old code funnelled that into
 * "not found", i.e. an unrecoverable lie about somebody else's data.
 */
export type ShareLookupFailure = "notfound" | "offline" | "unindexed" | "error";

export interface ShareLookupResult {
  formation: UserFormation | null;
  failure: ShareLookupFailure | null;
}

const classifyFirestoreError = (error: unknown): ShareLookupFailure => {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  if (code.includes("unavailable") || code.includes("deadline")) return "offline";
  if (code.includes("failed-precondition")) return "unindexed";
  if (code.includes("permission-denied")) return "notfound";
  return "error";
};

/**
 * Get a formation by share ID (for unlisted formations).
 *
 * Requires the composite index `formations(shareId ASC, visibility ASC)`.
 */
export const getFormationByShareId = async (
  shareId: string
): Promise<ShareLookupResult> => {
  if (DEV_PREVIEW_SESSION) {
    // A formation you shared yourself in this session resolves first, so the
    // share -> open-the-link loop closes without a backend.
    for (const formation of previewFormations.values()) {
      if (formation.shareId === shareId && formation.visibility === "unlisted") {
        return { formation, failure: null };
      }
    }
    if (shareId === PREVIEW_SHARE_ID) {
      const formation = buildPreviewSharedFormation();
      if (formation) return { formation, failure: null };
    }
    // No Firestore fallback on purpose: every id resolves locally, so the
    // failure states render from a decision rather than a dead network call.
    return {
      formation: null,
      failure: PREVIEW_FAILURE_SHARE_IDS[shareId] ?? "notfound",
    };
  }

  if (!db) return { formation: null, failure: "error" };

  const q = query(
    collection(db, FORMATIONS_COLLECTION),
    where("shareId", "==", shareId),
    where("visibility", "==", "unlisted")
  );

  try {
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return { formation: snapshot.docs[0].data() as UserFormation, failure: null };
    }
    return { formation: null, failure: "notfound" };
  } catch (error) {
    return { formation: null, failure: classifyFirestoreError(error) };
  }
};

/**
 * Get all formations for a user
 */
export const getUserFormations = async (
  userId: string
): Promise<UserFormation[]> => {
  if (DEV_PREVIEW_SESSION) return previewOwned(userId);
  if (!db) return [];

  const q = query(
    collection(db, FORMATIONS_COLLECTION),
    where("ownerUserId", "==", userId),
    orderBy("updatedAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => doc.data() as UserFormation);
};

// ============================================
// Update Operations
// ============================================

/**
 * Update a formation
 */
export const updateFormation = async (
  formationId: string,
  updates: Partial<Omit<UserFormation, "id" | "ownerUserId" | "createdAt">>
): Promise<void> => {
  if (DEV_PREVIEW_SESSION) {
    const existing = previewFormations.get(formationId);
    if (!existing) return;
    previewFormations.set(formationId, {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    });
    previewEmitFormations();
    return;
  }

  if (!db) {
    throw new Error("Firebase is not configured");
  }

  const docRef = doc(db, FORMATIONS_COLLECTION, formationId);
  const sanitized = sanitizeForFirestore({
    ...updates,
    updatedAt: Date.now(),
  });
  await updateDoc(docRef, sanitized);
};



// ============================================
// Sharing Operations
// ============================================

/**
 * Enable sharing for a formation (generate share ID)
 */
export const enableSharing = async (formationId: string): Promise<string> => {
  const shareId = generateShareId();

  if (DEV_PREVIEW_SESSION) {
    await updateFormation(formationId, { shareId, visibility: "unlisted" });
    return shareId;
  }

  if (!db) {
    throw new Error("Firebase is not configured");
  }

  await updateDoc(doc(db, FORMATIONS_COLLECTION, formationId), {
    shareId,
    visibility: "unlisted",
    updatedAt: Date.now(),
  });

  return shareId;
};

/**
 * Disable sharing for a formation
 */
export const disableSharing = async (formationId: string): Promise<void> => {
  if (DEV_PREVIEW_SESSION) {
    const existing = previewFormations.get(formationId);
    if (!existing) return;
    const revoked: UserFormation = {
      ...existing,
      visibility: "private",
      updatedAt: Date.now(),
    };
    delete revoked.shareId;
    previewFormations.set(formationId, revoked);
    previewEmitFormations();
    return;
  }

  if (!db) {
    throw new Error("Firebase is not configured");
  }

  await updateDoc(doc(db, FORMATIONS_COLLECTION, formationId), {
    shareId: null,
    visibility: "private",
    updatedAt: Date.now(),
  });
};

/**
 * Get the shareable URL for a formation
 */
export const getFormationShareUrl = (shareId: string): string => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/tools/volleyball-rotations/shared/${shareId}`;
  }
  return `/tools/volleyball-rotations/shared/${shareId}`;
};

// ============================================
// Delete Operations
// ============================================

/**
 * Delete a formation
 */
export const deleteFormation = async (formationId: string): Promise<void> => {
  if (DEV_PREVIEW_SESSION) {
    previewFormations.delete(formationId);
    previewEmitFormations();
    return;
  }

  if (!db) {
    throw new Error("Firebase is not configured");
  }

  const docRef = doc(db, FORMATIONS_COLLECTION, formationId);
  await deleteDoc(docRef);
};

// ============================================
// Real-time Subscriptions
// ============================================

/**
 * What a snapshot knows about itself beyond its documents.
 *
 * `fromCache` is the fix for the worst state bug in this group: with Firestore
 * unreachable the subscription still fires, with zero documents, and the UI
 * rendered "Your Formations (0)" and offered to create another. A coach with
 * forty saved formations was told they had none. The snapshot always knew —
 * `snapshot.metadata.fromCache` is true and nothing read it.
 */
export interface FormationsSnapshotMeta {
  fromCache: boolean;
  hasPendingWrites: boolean;
}

/**
 * Subscribe to a user's formations (real-time updates).
 *
 * Requires the composite index `formations(ownerUserId ASC, updatedAt DESC)`.
 */
export const subscribeToUserFormations = (
  userId: string,
  callback: (formations: UserFormation[], meta: FormationsSnapshotMeta) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  if (DEV_PREVIEW_SESSION) {
    previewFormationListeners.set(callback, userId);
    // Asynchronous, like onSnapshot: never call back inside subscribe()'s frame.
    queueMicrotask(() => {
      if (previewFormationListeners.has(callback)) {
        callback(previewOwned(userId), { fromCache: false, hasPendingWrites: false });
      }
    });
    return () => {
      previewFormationListeners.delete(callback);
    };
  }

  if (!db) {
    callback([], { fromCache: true, hasPendingWrites: false });
    return () => {};
  }

  const q = query(
    collection(db, FORMATIONS_COLLECTION),
    where("ownerUserId", "==", userId),
    orderBy("updatedAt", "desc")
  );

  return onSnapshot(
    q,
    // `includeMetadataChanges` so the UI learns when a cached read is replaced
    // by a served one and can drop the "showing last known" label without a
    // document actually changing.
    { includeMetadataChanges: true },
    (snapshot) => {
      const formations = snapshot.docs.map((doc) => doc.data() as UserFormation);
      callback(formations, {
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
      });
    },
    (error) => {
      onError?.(error);
    }
  );
};


// ============================================
// Permission Helpers
// ============================================



