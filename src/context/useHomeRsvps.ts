"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { homeRsvpRows, type AccountNights, type HomeRsvpRow } from "@/lib/rsvp";
import { subscribeToAccountNights } from "@/lib/rsvping";

/**
 * The nights the signed-in account `uid` has RSVP'd to, as Home lists them.
 * Empty without an account, so a guest or a phone holding only a scorer
 * link's silent identity reads nothing, and empty until the reads arrive.
 * If the account's own query fails, as it does before its index is built,
 * the failure is logged and Home goes on without the panel.
 */
export const useHomeRsvps = (uid: string | null): HomeRsvpRow[] => {
  const [nights, setNights] = useState<AccountNights | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setNights(null);
    if (!uid || !db) return;
    return subscribeToAccountNights(db, uid, setNights, (error) => {
      console.warn("Could not read the nights this account has RSVP'd to:", error);
      setNights(null);
    });
  }, [uid]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return useMemo(() => (uid && nights ? homeRsvpRows(uid, nights) : []), [uid, nights]);
};
