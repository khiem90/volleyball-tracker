"use client";

import { useCallback, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  addHeldSpot,
  countRsvps,
  removeRsvp,
  setRsvpClosed,
  subscribeToRsvps,
} from "@/lib/rsvps";
import type { RsvpHeadcount } from "@/lib/console";
import type { Rsvp } from "@/types/game";

/**
 * A tournament's RSVP list in arrival order, as the owner manages it from
 * the console, with the owner's actions on it. Nothing is read until
 * `canRead`, which is the owner. A refused listener stays dead, so the list
 * is opened again whenever `canRead` comes back.
 */
export const useRsvpList = (tournamentId: string, canRead: boolean) => {
  // null until the first delivery.
  const [rsvps, setRsvps] = useState<Rsvp[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!canRead || !db) {
      setRsvps(null);
      return;
    }
    setError(null);
    return subscribeToRsvps(
      db,
      tournamentId,
      (next) => {
        setRsvps(next);
        setError(null);
      },
      setError,
    );
  }, [tournamentId, canRead]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /** Add a held spot by name. Rejects with the problem before writing, or with the rules' refusal. */
  const addHeld = useCallback(
    async (name: string) => {
      if (!db) throw new Error("Not connected.");
      await addHeldSpot(db, tournamentId, name);
    },
    [tournamentId],
  );

  /** Take anyone off the list. */
  const remove = useCallback(
    async (rsvpId: string) => {
      if (!db) throw new Error("Not connected.");
      await removeRsvp(db, tournamentId, rsvpId);
    },
    [tournamentId],
  );

  /** Close the list early, or reopen it while the tournament is a draft. */
  const setClosed = useCallback(
    async (closed: boolean) => {
      if (!db) throw new Error("Not connected.");
      await setRsvpClosed(db, tournamentId, closed);
    },
    [tournamentId],
  );

  return { rsvps, error, addHeld, remove, setClosed };
};

/**
 * How many people are on the list of the tournament `tournamentId`, read
 * once from the server when the id is given, for a delete confirmation on
 * a screen that does not hold the list. Counting while it is on its way or
 * with no id, and unknown when the count cannot be read, as offline.
 */
export const useRsvpCount = (tournamentId: string | null): RsvpHeadcount => {
  const [counted, setCounted] = useState<{ id: string; headcount: RsvpHeadcount } | null>(null);

  useEffect(() => {
    if (!tournamentId || !db) return;
    let current = true;
    countRsvps(db, tournamentId).then(
      (count) => current && setCounted({ id: tournamentId, headcount: { kind: "counted", count } }),
      (error: unknown) => {
        console.warn("Could not count the RSVP list:", error);
        if (current) setCounted({ id: tournamentId, headcount: { kind: "unknown" } });
      },
    );
    return () => {
      current = false;
    };
  }, [tournamentId]);

  return counted && counted.id === tournamentId ? counted.headcount : { kind: "counting" };
};
