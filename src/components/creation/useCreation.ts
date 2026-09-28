"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  emptySetup,
  enteredTeams,
  firstProblem,
  setupInput,
  setupProblems,
  type SetupProblems,
  type TournamentSetup,
} from "@/lib/creation";
import type { AddedTeams } from "@/lib/roster";
import { messageOf } from "@/lib/utils";

const NO_PROBLEMS: SetupProblems = {};

/** What the two buttons do: keep the tournament as a draft, or start it now. */
export type CreationAction = "draft" | "start";

/**
 * Everything the creation page needs: the setup as it stands, the problems
 * with it once a create has been tried, the roster to tick from, and the
 * actions that change the setup or turn it into a tournament and open its
 * console.
 */
export const useCreation = () => {
  const router = useRouter();
  const { roster, isRosterLoading, addTeamsFromText: addToRoster, createTournament } = useApp();
  const [setup, setSetup] = useState<TournamentSetup>(emptySetup);
  const [attempted, setAttempted] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [busy, setBusy] = useState<CreationAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealId, setRevealId] = useState<string | null>(null);

  const problems = useMemo(() => setupProblems(setup, roster), [setup, roster]);
  const ticked = useMemo(() => new Set(setup.teamIds), [setup.teamIds]);
  const enteredCount = useMemo(
    () => enteredTeams(setup, roster).length,
    [setup, roster],
  );

  // Every edit clears the last write's error: the setup it was about is gone.
  const edit = useCallback((update: (current: TournamentSetup) => TournamentSetup) => {
    setError(null);
    setSetup(update);
  }, []);

  const change = useCallback(
    (changes: Partial<TournamentSetup>) => edit((current) => ({ ...current, ...changes })),
    [edit],
  );

  const toggleTeam = useCallback(
    (teamId: string) =>
      edit((current) => ({
        ...current,
        teamIds: current.teamIds.includes(teamId)
          ? current.teamIds.filter((id) => id !== teamId)
          : [...current.teamIds, teamId],
      })),
    [edit],
  );

  // Ticking every team keeps the ones already ticked in their order, which
  // is the seed order, and adds the rest in roster order.
  const setAllTeams = useCallback(
    (on: boolean) =>
      edit((current) => ({
        ...current,
        teamIds: on
          ? [
              ...current.teamIds,
              ...roster.map((team) => team.id).filter((id) => !current.teamIds.includes(id)),
            ]
          : [],
      })),
    [edit, roster],
  );

  /** Add one team per line to the roster, tick each, and reveal the last. */
  const addTeamsFromText = useCallback(
    (text: string): AddedTeams => {
      const outcome = addToRoster(text);
      if (outcome.added.length > 0) {
        const ids = outcome.added.map((team) => team.id);
        edit((current) => ({ ...current, teamIds: [...current.teamIds, ...ids] }));
        setRevealId(ids[ids.length - 1]);
      }
      return outcome;
    },
    [addToRoster, edit],
  );

  // The tournament's id is known at once, so the console opens straight
  // away; the page for it mounts fresh, which is what clears the busy flag.
  const create = useCallback(
    async (action: CreationAction) => {
      setAttempted(true);
      if (busy || firstProblem(problems)) return;
      setBusy(action);
      setError(null);
      try {
        const id = await createTournament(setupInput(setup, roster), {
          start: action === "start",
        });
        router.push(`/competitions/${id}`);
      } catch (error) {
        console.error("Failed to create the tournament:", error);
        setError(messageOf(error, "The tournament could not be created."));
        setBusy(null);
      }
    },
    [busy, problems, setup, roster, createTournament, router],
  );

  return {
    isRosterLoading,
    roster,
    setup,
    change,
    ticked,
    enteredCount,
    toggleTeam,
    setAllTeams,
    addTeamsFromText,
    revealId,
    /** Shown once a create has been tried, and kept up to date after. */
    problems: attempted ? problems : NO_PROBLEMS,
    advancedOpen,
    setAdvancedOpen,
    busy,
    error,
    create,
  };
};
