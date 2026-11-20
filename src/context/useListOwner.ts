"use client";

import { useMemo } from "react";
import type { Firestore } from "firebase/firestore";
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
export const useListOwner = (list: RsvpList | null) =>
  useMemo(() => {
    /** Run a write on the list. Rejects with no connection, and once the list is gone. */
    const onList = async <Result>(
      write: (db: Firestore, list: RsvpList) => Promise<Result>,
    ): Promise<Result> => {
      if (!db) throw new Error("Not connected.");
      if (!list) throw new Error("This list is no longer here.");
      return write(db, list);
    };

    return {
      /** Close the list, or reopen it. Rejects once the list is over. */
      setClosed: (closed: boolean) => onList((db, list) => setListClosed(db, list, closed)),
      /** Add a held spot by name. Rejects with the name's problem before writing. */
      addHeld: (name: string) => onList((db, list) => addListHeldSpot(db, list.id, name)),
      /** Take an RSVP off the list, a held spot included. */
      removeRsvp: (rsvpId: string) => onList((db, list) => removeListRsvp(db, list.id, rsvpId)),
      /** Duplicate the list. Resolves with the new list's id once the server has it. */
      duplicate: () =>
        onList(async (db, list) => (await duplicateRsvpList(db, list.ownerId, list)).id),
      /** Delete the list with every RSVP on it. */
      remove: () => onList((db, list) => deleteRsvpList(db, list.id)),
    };
  }, [list]);
