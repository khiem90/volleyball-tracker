"use client";

import { useCallback } from "react";
import { db } from "@/lib/firebase";
import { isRefused } from "@/lib/firestoreData";
import type { ListSetup } from "@/lib/rsvpList";
import { createRsvpList, saveListSettings, subscribeToRsvpList } from "@/lib/rsvpListData";
import type { RsvpList } from "@/types/game";
import { useSubscription } from "./useSubscription";

/**
 * Create a list owned by the account `uid`, with its times entered in
 * `zone`. Rejects with the first problem before writing. Resolves with the
 * new list's id once the server has it.
 */
export const createList = async (uid: string, setup: ListSetup, zone: string): Promise<string> => {
  if (!db) throw new Error("Not connected.");
  return (await createRsvpList(db, uid, setup, zone)).id;
};

/**
 * One RSVP list as its page sees it, for the signed-in account `uid`, and
 * the owner's save. Nothing is read without an account, so a guest or a
 * phone holding only a scorer link's silent identity reads nothing here.
 *
 * `list` is undefined while it is on its way, and null when it is gone or
 * the rules refuse it, which is how a list with its link off looks to
 * anyone but its owner. A refused listener stays dead, so a link turned
 * back on shows after a reload.
 */
export const useList = (listId: string, uid: string | null) => {
  // The delivery is wrapped so a deleted list, null, can be told from one still loading.
  const { value, error } = useSubscription<{ list: RsvpList | null }>(
    uid ? `${listId}/${uid}` : null,
    (db, onChange, onError) =>
      subscribeToRsvpList(db, listId, (list) => onChange({ list }), onError),
  );

  const refused = error !== null && isRefused(error);
  const list: RsvpList | null | undefined = refused ? null : value ? value.list : undefined;

  /**
   * Save the settings form. Rejects with the first problem before writing,
   * or with the rules' refusal. Owner only.
   */
  const save = useCallback(
    async (setup: ListSetup, zone: string) => {
      if (!db) throw new Error("Not connected.");
      if (!list) throw new Error("This list is no longer here.");
      await saveListSettings(db, list, setup, zone);
    },
    [list],
  );

  return {
    list,
    /** A failure that is not a refusal, such as no connection on a first load. */
    error: refused ? null : error,
    save,
  };
};
