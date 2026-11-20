"use client";

import { useState } from "react";
import { useList } from "@/context/useList";
import { useOrigin } from "@/hooks/useOrigin";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { deviceZone, timeLabel, type TimeLabel } from "@/lib/rsvp";
import {
  firstListProblem,
  listSetupOf,
  listSetupProblems,
  type ListSetup,
  type ListSetupProblems,
} from "@/lib/rsvpList";
import { rsvpListLink } from "@/lib/shareLinks";
import { messageOf } from "@/lib/utils";
import { useListRsvpView } from "./useListRsvpView";

const NO_PROBLEMS: ListSetupProblems = {};

const sameSetup = (a: ListSetup, b: ListSetup): boolean =>
  a.name === b.name &&
  a.takes === b.takes &&
  a.capacity === b.capacity &&
  a.scheduledAt === b.scheduledAt &&
  a.opensAt === b.opensAt &&
  a.enabled === b.enabled;

/**
 * Everything a list's page needs: the list, when it is on this phone's
 * clock, the RSVPs and the viewer's own RSVP, and for its owner the
 * settings form and the RSVP link. A guest, and a phone holding only a
 * scorer link's silent identity, are sent to sign in and back here.
 */
export const useListPage = (listId: string) => {
  const { user, isLoading: isAuthLoading } = useRequireAuth();
  const uid = user?.uid ?? null;
  const { list, error: loadError, save: saveList } = useList(listId, uid);
  const rsvp = useListRsvpView(listId, list ?? null, user);
  const origin = useOrigin();
  const [zone] = useState(deviceZone);

  const isOwner = !!list && list.ownerId === uid;
  const stored = list ? listSetupOf(list) : null;

  // What the owner has changed and not yet saved. While it is null the
  // form shows the stored settings, so a save from another phone shows here.
  const [draft, setDraft] = useState<ListSetup | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const setup = draft ?? stored;
  const problems = setup ? listSetupProblems(setup) : NO_PROBLEMS;
  const isDirty = draft !== null && stored !== null && !sameSetup(draft, stored);

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
    if (!setup || isSaving) return;
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

  const shown = attempted ? problems : NO_PROBLEMS;

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
    /** The owner's settings form. Null for anyone else. */
    settings:
      isOwner && setup
        ? {
            setup,
            zone,
            scheduledZone: list?.scheduledZone,
            change,
            /** Shown once a save has been tried, and kept up to date after. */
            problems: shown,
            /** The failed write's message, or the first problem to fix. */
            alert: saveError ?? firstListProblem(shown) ?? null,
            isDirty,
            isSaving,
            save,
            discard,
          }
        : null,
  };
};
