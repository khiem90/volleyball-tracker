import { FirebaseError } from "firebase/app";
import { deleteField } from "firebase/firestore";
import { nanoid } from "nanoid";

/**
 * Small helpers shared by the Firestore data modules.
 */

/**
 * Firestore refuses documents containing `undefined`. Drop those properties,
 * at any depth and inside arrays, before a set.
 */
export const stripUndefined = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (entry === undefined) continue;
      cleaned[key] = stripUndefined(entry);
    }
    return cleaned as T;
  }
  return value;
};

/**
 * Turn a partial object into an `updateDoc` payload. A property set to
 * undefined means "remove this field", which Firestore spells `deleteField()`.
 */
export const toUpdatePayload = (changes: Record<string, unknown>): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(changes)) {
    payload[key] = value === undefined ? deleteField() : stripUndefined(value);
  }
  return payload;
};

/** A fresh, unguessable token. Used for document ids and revisions. */
export const newToken = (): string => nanoid();

/** Firestore's ways of saying the client cannot reach the server right now. */
export const isOffline = (error: unknown): boolean =>
  error instanceof FirebaseError &&
  (error.code === "unavailable" || error.code === "deadline-exceeded");

/** Firestore's ways of saying a transaction lost a race with another write. */
export const lostRace = (error: unknown): boolean =>
  error instanceof FirebaseError &&
  (error.code === "aborted" ||
    error.code === "failed-precondition" ||
    error.code === "already-exists");
