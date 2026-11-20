"use client";

import { useMemo, useState } from "react";
import { useOwnLists } from "@/context/useOwnLists";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { deviceZone } from "@/lib/rsvp";
import { ownListsInOrder } from "@/lib/rsvpList";

/**
 * Everything the RSVP tab needs: the account's own lists, the upcoming ones
 * first and then the ones that are over. A guest is sent to sign in and
 * back. The phone's clock, read once as the page opens, sorts a list under
 * upcoming or over, which is only about where it shows.
 */
export const useListsPage = () => {
  const { user, isLoading: isAuthLoading } = useRequireAuth();
  const { lists, error } = useOwnLists(user?.uid ?? null);
  const [now] = useState(() => Date.now());
  const [zone] = useState(deviceZone);
  const ordered = useMemo(() => (lists ? ownListsInOrder(lists, now) : null), [lists, now]);

  return {
    /** True until the account and its lists are known. */
    isLoading: isAuthLoading || !user || (lists === null && error === null),
    /** The lists in the tab's order, or null when they could not be loaded. */
    lists: ordered,
    hasError: error !== null,
    /** This phone's zone, which the scheduled times are shown in. */
    zone,
  };
};
