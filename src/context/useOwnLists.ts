"use client";

import { subscribeToOwnLists } from "@/lib/rsvpListData";
import type { RsvpList } from "@/types/game";
import { useSubscription } from "./useSubscription";

/**
 * The RSVP lists the account `uid` owns, newest first, for the RSVP tab.
 * Nothing is read without an account. `lists` is null until the first
 * delivery, and `error` is set when the query fails, as it does until its
 * index is deployed.
 */
export const useOwnLists = (uid: string | null) => {
  const { value: lists, error } = useSubscription<RsvpList[]>(uid, (db, onChange, onError) =>
    subscribeToOwnLists(db, uid!, onChange, onError),
  );
  return { lists, error };
};
