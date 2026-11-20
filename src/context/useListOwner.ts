"use client";

import { useCallback } from "react";
import { db } from "@/lib/firebase";
import {
  addListHeldSpot,
  deleteRsvpList,
  duplicateRsvpList,
  removeListRsvp,
  setListClosed,
} from "@/lib/rsvpListData";
import type { RsvpList } from "@/types/game";

/**
 * What only the owner does to a list from its page: close and reopen it,
 * add a held spot, remove an RSVP, duplicate it, and delete it. `list` is
 * the copy this phone holds, or null while there is none. The rules refuse
 * every one of these from any other account.
 */
export const useListOwner = (list: RsvpList | null) => {
  /** Close the list, or reopen it. Rejects once the list is over. */
  const setClosed = useCallback(
    async (closed: boolean) => {
      if (!db) throw new Error("Not connected.");
      if (!list) throw new Error("This list is no longer here.");
      await setListClosed(db, list, closed);
    },
    [list],
  );

  /** Add a held spot by name. Rejects with the name's problem before writing. */
  const addHeld = useCallback(
    async (name: string) => {
      if (!db) throw new Error("Not connected.");
      if (!list) throw new Error("This list is no longer here.");
      await addListHeldSpot(db, list.id, name);
    },
    [list],
  );

  /** Take an RSVP off the list, a held spot included. */
  const removeRsvp = useCallback(
    async (rsvpId: string) => {
      if (!db) throw new Error("Not connected.");
      if (!list) throw new Error("This list is no longer here.");
      await removeListRsvp(db, list.id, rsvpId);
    },
    [list],
  );

  /** Duplicate the list. Resolves with the new list's id once the server has it. */
  const duplicate = useCallback(async (): Promise<string> => {
    if (!db) throw new Error("Not connected.");
    if (!list) throw new Error("This list is no longer here.");
    return (await duplicateRsvpList(db, list.ownerId, list)).id;
  }, [list]);

  /** Delete the list with every RSVP on it. */
  const remove = useCallback(async () => {
    if (!db) throw new Error("Not connected.");
    if (!list) throw new Error("This list is no longer here.");
    await deleteRsvpList(db, list.id);
  }, [list]);

  return { setClosed, addHeld, removeRsvp, duplicate, remove };
};
