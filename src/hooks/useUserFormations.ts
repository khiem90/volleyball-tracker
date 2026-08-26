"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import type { UserFormation, FormationData } from "@/lib/volleyball/types";
import {
  getUserFormations,
  createFormation,
  updateFormation,
  deleteFormation,
  duplicateFormation,
  enableSharing,
  disableSharing,
  subscribeToUserFormations,
  type CreateFormationOptions,
} from "@/lib/volleyball/userFormations";

/**
 * Why the list is not showing live server data. Consumed by the archive and the
 * designer to pick a state block; `null` means the list is authoritative.
 *
 * The distinction exists because "empty" and "unreachable" produced the same
 * screen before: zero rows, an invitation to create a formation, and no hint
 * that forty of them were sitting on a server the browser could not reach.
 */
export type FormationsStatus = "ready" | "loading" | "stale" | "denied" | "error";

type UseUserFormationsReturn = {
  // Data
  formations: UserFormation[];
  isLoading: boolean;
  error: Error | null;
  /** The list came out of the local cache — it may be stale or empty-by-default. */
  isStale: boolean;
  /** One value the UI can switch on, rather than four booleans in every caller. */
  status: FormationsStatus;
  /** `permission-denied` from Firestore, which needs its own copy, not "error". */
  isDenied: boolean;
  /** When the last SERVED (non-cache) snapshot arrived. */
  lastSyncedAt: number | null;

  // Auth state
  isAuthenticated: boolean;
  userId: string | null;

  // CRUD operations
  create: (
    name: string,
    data: FormationData,
    options?: CreateFormationOptions
  ) => Promise<UserFormation>;
  update: (
    formationId: string,
    updates: Partial<Omit<UserFormation, "id" | "ownerUserId" | "createdAt">>
  ) => Promise<void>;
  remove: (formationId: string) => Promise<void>;
  duplicate: (formation: UserFormation, newName?: string) => Promise<UserFormation>;

  // Sharing
  share: (formationId: string) => Promise<string>;
  unshare: (formationId: string) => Promise<void>;

  // Utilities
  refresh: () => Promise<void>;
  getById: (formationId: string) => UserFormation | undefined;
};

/**
 * Hook for managing user's custom volleyball formations
 */
export const useUserFormations = (): UseUserFormationsReturn => {
  const { user, isLoading: authLoading } = useAuth();
  const [formations, setFormations] = useState<UserFormation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [isDenied, setIsDenied] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const userId = user?.uid ?? null;
  const isAuthenticated = !!user;

  // Subscribe to real-time updates
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    // No user, clear formations
    if (!userId) {
      setFormations([]);
      setIsLoading(false);
      setIsStale(false);
      setIsDenied(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsDenied(false);

    // Subscribe to user's formations
    const unsubscribe = subscribeToUserFormations(
      userId,
      (updatedFormations, meta) => {
        setFormations(updatedFormations);
        setIsLoading(false);
        /* A cache-only snapshot is NOT authoritative. Reporting it as such is
           what made an unreachable backend look like an empty account. */
        setIsStale(meta.fromCache);
        if (!meta.fromCache) setLastSyncedAt(Date.now());
      },
      (err) => {
        const code =
          typeof err === "object" && err !== null && "code" in err
            ? String((err as { code: unknown }).code)
            : "";
        setIsDenied(code.includes("permission-denied"));
        setError(err);
        setIsLoading(false);
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [userId, authLoading, attempt]);

  /**
   * Retry. It re-runs the one-shot read AND bumps `attempt`, which tears the
   * subscription down and re-establishes it — the case that matters is a
   * listener that failed or went cache-only, and re-fetching without
   * re-subscribing would leave the stale flag latched on for ever.
   */
  const refresh = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);
    setIsDenied(false);
    setAttempt((n) => n + 1);

    try {
      const data = await getUserFormations(userId);
      setFormations(data);
      setIsStale(false);
      setLastSyncedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch formations"));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Create formation
  const create = useCallback(
    async (
      name: string,
      data: FormationData,
      options?: CreateFormationOptions
    ): Promise<UserFormation> => {
      if (!userId) {
        throw new Error("Must be signed in to create formations");
      }

      const formation = await createFormation(userId, name, data, options);
      return formation;
    },
    [userId]
  );

  // Update formation
  const update = useCallback(
    async (
      formationId: string,
      updates: Partial<Omit<UserFormation, "id" | "ownerUserId" | "createdAt">>
    ): Promise<void> => {
      if (!userId) {
        throw new Error("Must be signed in to update formations");
      }

      await updateFormation(formationId, updates);
    },
    [userId]
  );

  // Delete formation
  const remove = useCallback(
    async (formationId: string): Promise<void> => {
      if (!userId) {
        throw new Error("Must be signed in to delete formations");
      }

      await deleteFormation(formationId);
    },
    [userId]
  );

  // Duplicate formation
  const duplicateFormationFn = useCallback(
    async (formation: UserFormation, newName?: string): Promise<UserFormation> => {
      if (!userId) {
        throw new Error("Must be signed in to duplicate formations");
      }

      return duplicateFormation(formation, userId, newName);
    },
    [userId]
  );

  // Enable sharing
  const share = useCallback(
    async (formationId: string): Promise<string> => {
      if (!userId) {
        throw new Error("Must be signed in to share formations");
      }

      return enableSharing(formationId);
    },
    [userId]
  );

  // Disable sharing
  const unshare = useCallback(
    async (formationId: string): Promise<void> => {
      if (!userId) {
        throw new Error("Must be signed in to unshare formations");
      }

      await disableSharing(formationId);
    },
    [userId]
  );

  // Get formation by ID from local state
  const getById = useCallback(
    (formationId: string): UserFormation | undefined => {
      return formations.find((f) => f.id === formationId);
    },
    [formations]
  );

  const loading = authLoading || isLoading;
  const status: FormationsStatus = loading
    ? "loading"
    : isDenied
    ? "denied"
    : error
    ? "error"
    : isStale
    ? "stale"
    : "ready";

  return {
    formations,
    isLoading: loading,
    error,
    isStale,
    isDenied,
    status,
    lastSyncedAt,
    isAuthenticated,
    userId,
    create,
    update,
    remove,
    duplicate: duplicateFormationFn,
    share,
    unshare,
    refresh,
    getById,
  };
};
