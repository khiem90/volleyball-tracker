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
 * Get a formation by share ID (for unlisted formations)
 */
export const getFormationByShareId = async (
  shareId: string
): Promise<UserFormation | null> => {
  if (!db) return null;

  const q = query(
    collection(db, FORMATIONS_COLLECTION),
    where("shareId", "==", shareId),
    where("visibility", "==", "unlisted")
  );
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    return snapshot.docs[0].data() as UserFormation;
  }
  return null;
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
 * Subscribe to a user's formations (real-time updates)
 */
export const subscribeToUserFormations = (
  userId: string,
  callback: (formations: UserFormation[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  if (!db) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, FORMATIONS_COLLECTION),
    where("ownerUserId", "==", userId),
    orderBy("updatedAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const formations = snapshot.docs.map((doc) => doc.data() as UserFormation);
      callback(formations);
    },
    (error) => {
      console.error("Error subscribing to formations:", error);
      onError?.(error);
    }
  );
};
