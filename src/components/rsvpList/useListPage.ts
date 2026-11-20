"use client";

import { useState } from "react";
import { useList } from "@/context/useList";
import { useOrigin } from "@/hooks/useOrigin";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { deviceZone, timeLabel, type TimeLabel } from "@/lib/rsvp";
import {
  firstListProblem,
  listLocks,
  listSetupOf,
  listSetupProblems,
  sameListSetup,
  type ListSetup,
  type ListSetupProblems,
} from "@/lib/rsvpList";
import { rsvpListLink } from "@/lib/shareLinks";
import { messageOf } from "@/lib/utils";
import { useListOwnerControls } from "./useListOwnerControls";
import { useListRsvpView } from "./useListRsvpView";

const NO_PROBLEMS: ListSetupProblems = {};

/**
 * Everything a list's page needs: the list, when it is on this phone's
 * clock, the RSVPs and the viewer's own RSVP, and for its owner the
 * settings form, the RSVP link, and the controls that manage the list. A
 * guest, and a phone holding only a scorer link's silent identity, are
 * sent to sign in and back here.
 */
export const useListPage = (listId: string) => {
  const { user, isLoading: isAuthLoading } = useRequireAuth();
  const uid = user?.uid ?? null;
  const { list, error: loadError, save: saveList } = useList(listId, uid);
  const rsvp = useListRsvpView(listId, list ?? null, user);
  const origin = useOrigin();
  const [zone] = useState(deviceZone);

  const isOwner = !!list && list.ownerId === uid;
  const owner = useListOwnerControls(
    isOwner ? list : null,
    rsvp.rsvps?.length ?? null,
    rsvp.hasError,
    rsvp.isOver,
  );
  const stored = list ? listSetupOf(list) : null;
  // What the list already holds, which limits how its settings may change.
  // The count is null until the RSVPs load, and no change saves without it.
  const rsvpCount = rsvp.rsvps?.length ?? null;
  const locks = list ? listLocks(list, rsvpCount, rsvp.now) : null;
  // The first RSVP locks the open time and the by-person or by-team choice.
  const openTimeLocked = (locks?.arrivals ?? 0) > 0;
  const takesLocked = openTimeLocked;

  // What the owner has changed and not yet saved. While it is null the
  // form shows the stored settings, so a save from another phone shows here.
  const [draft, setDraft] = useState<ListSetup | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Once an RSVP is on the list the open time and the by-person or by-team
  // choice are the stored ones, whatever was picked before the first RSVP
  // arrived.
  const typed =
    draft && stored && openTimeLocked
      ? { ...draft, opensAt: stored.opensAt, takes: stored.takes }
      : draft;
  const setup = typed ?? stored;
  const problems = setup && locks ? listSetupProblems(setup, locks) : NO_PROBLEMS;
  const isDirty = typed !== null && stored !== null && !sameListSetup(typed, stored);

  // A problem that comes from what the list already holds shows as soon as
  // an edit runs into it. The rest wait for a save to be tried.
  const withoutLocks = setup ? listSetupProblems(setup) : NO_PROBLEMS;
  const fromLocks: ListSetupProblems = {};
  for (const field of Object.keys(problems) as (keyof ListSetupProblems)[]) {
    if (problems[field] !== withoutLocks[field]) fromLocks[field] = problems[field];
  }

  const change = (changes: Partial<ListSetup>) => {
    if (!setup) return;
    setSaveError(null);
    setDraft({ ...setup, ...changes });
  };

  const discard = () => {
    setDraft(null);
    setAttempted(false);
    setSaveError(null);
  };

  const save = async () => {
    if (!setup || isSaving || rsvpCount === null) return;
    setAttempted(true);
    if (firstListProblem(problems)) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveList(setup, zone);
      setDraft(null);
      setAttempted(false);
    } catch (failure) {
      console.error("Failed to save the list's settings:", failure);
      setSaveError(messageOf(failure, "The settings could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  const when: TimeLabel | null =
    list?.scheduledAt !== undefined && list?.scheduledAt !== null
      ? timeLabel(list.scheduledAt, list.scheduledZone, zone)
      : null;

  const shown = attempted ? problems : fromLocks;

  return {
    /** True until the account and the list are known. */
    isLoading: isAuthLoading || !user || (list === undefined && loadError === null),
    /** The list, or null when it is gone or the rules refuse it. */
    list: list ?? null,
    /** True when the list could not be read for a reason other than a refusal. */
    hasLoadError: loadError !== null,
    isOwner,
    /** The RSVPs, the viewer's standing, and the RSVP dialog. The same for the owner as for anyone. */
    rsvp,
    /** The scheduled time on this phone's clock, with the owner's beside it when they differ. */
    when,
    /** The RSVP link, or null while it is off. */
    link: list?.enabled ? rsvpListLink(origin, list.id) : null,
    /** Close and Reopen, held spots, Remove, Duplicate, and Delete. Null for anyone but the owner. */
    owner,
    /**
     * The owner's settings form. Null for anyone else, and for the owner
     * once the list is over, when no setting can change.
     */
    settings:
      isOwner && setup && !rsvp.isOver
        ? {
            setup,
            zone,
            scheduledZone: list?.scheduledZone,
            /** True once the list has an RSVP, which fixes the open time. */
            openTimeLocked,
            /** True once the list has an RSVP, which fixes by person or by team. */
            takesLocked,
            change,
            /** A lock's problem at once, and the rest once a save has been tried. */
            problems: shown,
            /** The failed write's message, or the first problem to fix. */
            alert: saveError ?? firstListProblem(shown) ?? null,
            isDirty,
            /** False until the RSVPs load. The locks count them, so nothing saves without them. */
            canSave: rsvpCount !== null,
            isSaving,
            save,
            discard,
          }
        : null,
  };
};
