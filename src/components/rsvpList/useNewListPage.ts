"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createList } from "@/context/useList";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { deviceZone } from "@/lib/rsvp";
import {
  emptyListSetup,
  firstListProblem,
  listSetupProblems,
  type ListSetup,
  type ListSetupProblems,
} from "@/lib/rsvpList";
import { messageOf } from "@/lib/utils";

const NO_PROBLEMS: ListSetupProblems = {};

/**
 * Everything the new-list page needs: the setup as it stands, the problems
 * with it once a create has been tried, and the action that saves the list
 * and opens its page. A guest is sent to sign in and back.
 */
export const useNewListPage = () => {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useRequireAuth();
  // Times are entered on this phone's clock and saved with its zone.
  const [zone] = useState(deviceZone);
  const [setup, setSetup] = useState<ListSetup>(emptyListSetup);
  const [attempted, setAttempted] = useState(false);
  const [isCreating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const problems = useMemo(() => listSetupProblems(setup), [setup]);

  // Every edit clears the last write's error: the setup it was about is gone.
  const change = useCallback((changes: Partial<ListSetup>) => {
    setError(null);
    setSetup((current) => ({ ...current, ...changes }));
  }, []);

  // The list's page mounts fresh once the server has the list, which is
  // what clears the busy flag.
  const create = useCallback(async () => {
    setAttempted(true);
    if (isCreating || !user || firstListProblem(problems)) return;
    setCreating(true);
    setError(null);
    try {
      const id = await createList(user.uid, setup, zone);
      router.push(`/rsvp/${id}`);
    } catch (failure) {
      console.error("Failed to create the list:", failure);
      setError(messageOf(failure, "The list could not be created."));
      setCreating(false);
    }
  }, [isCreating, user, problems, setup, zone, router]);

  const shown = attempted ? problems : NO_PROBLEMS;

  return {
    isLoading: isAuthLoading || !user,
    setup,
    zone,
    change,
    /** Shown once a create has been tried, and kept up to date after. */
    problems: shown,
    /** The failed write's message, or the first problem to fix. */
    alert: error ?? firstListProblem(shown) ?? null,
    isCreating,
    create,
  };
};
