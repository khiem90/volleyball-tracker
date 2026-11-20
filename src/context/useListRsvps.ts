"use client";

import { useCallback, useState } from "react";
import { db } from "@/lib/firebase";
import type { RsvpEntry } from "@/lib/rsvp";
import type { RememberedNames } from "@/lib/rsvpList";
import {
  readRememberedNames,
  sendListRsvp,
  subscribeToListRsvps,
  updateListRsvp,
  withdrawFromList,
} from "@/lib/rsvpListData";
import type { Rsvp, RsvpTakes } from "@/types/game";
import { useSubscription } from "./useSubscription";

/**
 * A list's RSVPs as its page sees them, for the signed-in account `uid`:
 * the RSVPs in arrival order, the names the account last RSVP'd under, and
 * the account's own RSVP, change, and withdrawal.
 *
 * `takes` is what the list takes, or null until the list loads. It says
 * whether a name this page sends is a person's or a team's, so the account
 * remembers it as the right one.
 *
 * `canRead` says whether the account can read the list at all. Nothing is
 * read without it, or without an account. A refused listener stays dead,
 * so the RSVPs are opened again when `canRead` comes back.
 */
export const useListRsvps = (
  listId: string,
  uid: string | null,
  canRead: boolean,
  takes: RsvpTakes | null,
) => {
  const { value: rsvps, error } = useSubscription<Rsvp[]>(
    uid && canRead ? `${listId}/${uid}` : null,
    (db, onChange, onError) => subscribeToListRsvps(db, listId, onChange, onError),
  );

  // The remembered names are read once per account.
  const read = useSubscription<RememberedNames>(uid, (db, onChange, onError) => {
    let current = true;
    readRememberedNames(db, uid!).then(
      (names) => current && onChange(names),
      (failure: Error) => current && onError(failure),
    );
    return () => {
      current = false;
    };
  });
  // The names this page last sent, which are newer than the ones read.
  const [sent, setSent] = useState<Partial<RememberedNames>>({});
  const stored: RememberedNames | undefined =
    read.value ?? (read.error ? { person: null, team: null } : undefined);
  const remembered: RememberedNames | undefined = stored && { ...stored, ...sent };

  const noteSent = useCallback((sentAs: RsvpTakes, name: string) => {
    const kind = sentAs === "teams" ? "team" : "person";
    setSent((current) => ({ ...current, [kind]: name.trim() }));
  }, []);

  /** RSVP as this account. Rejects with an RsvpRefusedError saying why the rules refused it. */
  const send = useCallback(
    async (entry: RsvpEntry) => {
      if (!uid || !db) throw new Error("Sign in to RSVP.");
      if (!takes) throw new Error("The list has not loaded yet.");
      await sendListRsvp(db, listId, uid, entry, takes);
      noteSent(takes, entry.name);
    },
    [listId, uid, takes, noteSent],
  );

  /** Change the name and note on this account's RSVP, keeping its place. */
  const update = useCallback(
    async (entry: RsvpEntry) => {
      if (!uid || !db) throw new Error("Sign in to change your RSVP.");
      if (!takes) throw new Error("The list has not loaded yet.");
      await updateListRsvp(db, listId, uid, entry, takes);
      noteSent(takes, entry.name);
    },
    [listId, uid, takes, noteSent],
  );

  /** Take this account off the list. */
  const withdraw = useCallback(async () => {
    if (!uid || !db) throw new Error("Sign in to withdraw.");
    await withdrawFromList(db, listId, uid);
  }, [listId, uid]);

  return {
    /** The RSVPs in arrival order, held spots included. Null until they arrive. */
    rsvps,
    error,
    /**
     * The person name and the team name the account last RSVP'd under,
     * each null before its first RSVP of that kind. Undefined while the
     * read is on its way.
     */
    remembered,
    send,
    update,
    withdraw,
  };
};
