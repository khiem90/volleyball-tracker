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

type UseUserFormationsReturn = {
  // Data
  formations: UserFormation[];
  isLoading: boolean;
  error: Error | null;

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
      return;
    }

    setIsLoading(true);
    setError(null);

    // Subscribe to user's formations
    const unsubscribe = subscribeToUserFormations(
      userId,
      (updatedFormations) => {
        setFormations(updatedFormations);
        setIsLoading(false);
      },
      (err) => {
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
  }, [userId, authLoading]);

  // Manual refresh (fetch without subscription)
  const refresh = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await getUserFormations(userId);
      setFormations(data);
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

  return {
    formations,
    isLoading: authLoading || isLoading,
    error,
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
