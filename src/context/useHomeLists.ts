"use client";

import { useEffect, useMemo, useState } from "react";
import { homeListRows, type AccountLists, type HomeListRow } from "@/lib/rsvpList";
import { subscribeToAccountLists } from "@/lib/rsvpListData";
import { useSubscription } from "./useSubscription";

/** How often Home reads the clock again, in milliseconds. */
const CLOCK_TICK = 60_000;

/**
 * The lists the signed-in account `uid` is on, as Home shows them. Empty
 * without an account, so a guest or a phone holding only a scorer link's
 * silent identity reads nothing, and empty until the reads arrive. If the
 * account's own query fails, as it does before its index is built, the
 * failure is logged and Home goes on without the rows.
 */
export const useHomeLists = (uid: string | null): HomeListRow[] => {
  const { value: read, error } = useSubscription<AccountLists>(uid, (db, onChange, onError) =>
    subscribeToAccountLists(db, uid!, onChange, onError),
  );

  useEffect(() => {
    if (error) console.warn("Could not read the lists this account has RSVP'd to:", error);
  }, [error]);

  // Home drops a list 24 hours after its scheduled time. Reading the clock
  // each minute lets the row go without a reload.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!uid) return;
    const tick = setInterval(() => setNow(Date.now()), CLOCK_TICK);
    return () => clearInterval(tick);
  }, [uid]);

  return useMemo(
    () => (uid && read && !error ? homeListRows(uid, read, now) : []),
    [uid, read, error, now],
  );
};
