"use client";

import { useCallback, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import type { RsvpEntry } from "@/lib/rsvp";
import {
  markNoticesRead,
  readRememberedName,
  rsvp,
  subscribeToRsvps,
  updateRsvp,
  withdraw,
} from "@/lib/rsvps";
import { useNotices } from "./useNotices";
import { subscribeToTournament } from "@/lib/tournaments";
import type { Rsvp, Tournament } from "@/types/game";

/**
 * One night as its RSVP page sees it, for the signed-in account `uid`: the
 * tournament, its RSVPs in arrival order, the owner's notices newest first,
 * the name the account last RSVP'd under, and the RSVP action. Kept apart from the tournaments a phone
 * reaches by spectator or scorer link, because an RSVP holder may read the
 * tournament but not, before it starts, its matches.
 *
 * Nothing is read without an account, so a guest or a phone holding only
 * a scorer link's silent identity reads nothing here.
 */
export const useRsvpNight = (tournamentId: string, uid: string | null) => {
  // undefined while it is on its way; null when it is gone or the rules
  // refuse it, which is how a link turned off looks to a non-owner.
  const [tournament, setTournament] = useState<Tournament | null | undefined>(undefined);
  const [rsvps, setRsvps] = useState<Rsvp[] | null>(null);
  const [listError, setListError] = useState<Error | null>(null);
  const [rememberedName, setRememberedName] = useState<string | null | undefined>(undefined);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!uid || !db) return;
    setTournament(undefined);
    return subscribeToTournament(db, tournamentId, setTournament, () => setTournament(null));
  }, [tournamentId, uid]);

  // A refused listener stays dead, so the list is opened again whenever
  // the link comes back on.
  const linkOn = tournament?.rsvp?.enabled === true;
  useEffect(() => {
    if (!uid || !db || !linkOn) return;
    setListError(null);
    return subscribeToRsvps(
      db,
      tournamentId,
      (next) => {
        setRsvps(next);
        setListError(null);
      },
      setListError,
    );
  }, [tournamentId, uid, linkOn]);

  useEffect(() => {
    if (!uid || !db) return;
    let current = true;
    setRememberedName(undefined);
    readRememberedName(db, uid).then(
      (name) => current && setRememberedName(name),
      () => current && setRememberedName(null),
    );
    return () => {
      current = false;
    };
  }, [uid]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const { notices, error: noticesError } = useNotices(tournamentId, !!uid && linkOn);

  // Opening the page records that this account has seen the notices, which
  // clears the mark Home puts on a newer one. Only an account on the list
  // has an RSVP to record it on. A notice that arrives while the page is
  // open has been seen too, so the newest one's id keys the write.
  const hasRsvp = !!uid && rsvps?.some((r) => r.uid === uid) === true;
  const newestNotice = notices === null ? null : (notices[0]?.id ?? "none");
  useEffect(() => {
    if (!uid || !db || !hasRsvp || newestNotice === null) return;
    markNoticesRead(db, tournamentId, uid).catch((error: unknown) => {
      console.warn("Could not record that the notices were read:", error);
    });
  }, [tournamentId, uid, hasRsvp, newestNotice]);

  /** RSVP as this account. Rejects with an RsvpRefusedError saying why the rules refused it. */
  const rsvpAs = useCallback(
    async (entry: RsvpEntry) => {
      if (!uid || !db) throw new Error("Sign in to RSVP.");
      await rsvp(db, tournamentId, uid, entry);
      setRememberedName(entry.name.trim());
    },
    [tournamentId, uid],
  );

  /** Change the name and note on this account's RSVP, keeping its place. */
  const updateMine = useCallback(
    async (entry: RsvpEntry) => {
      if (!uid || !db) throw new Error("Sign in to change your RSVP.");
      await updateRsvp(db, tournamentId, uid, entry);
      setRememberedName(entry.name.trim());
    },
    [tournamentId, uid],
  );

  /** Take this account off the list. */
  const withdrawMine = useCallback(async () => {
    if (!uid || !db) throw new Error("Sign in to withdraw.");
    await withdraw(db, tournamentId, uid);
  }, [tournamentId, uid]);

  return {
    tournament,
    rsvps,
    listError,
    /** The owner's notices, newest first; null until they arrive. */
    notices,
    noticesError,
    rememberedName,
    rsvp: rsvpAs,
    update: updateMine,
    withdraw: withdrawMine,
  };
};
