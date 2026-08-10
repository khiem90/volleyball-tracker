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
  if (!db) {
    throw new Error("Firebase is not configured");
  }

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
  if (!db) {
    throw new Error("Firebase is not configured");
  }

  const shareId = generateShareId();
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



