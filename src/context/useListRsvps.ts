"use client";

import { useCallback, useState } from "react";
import { db } from "@/lib/firebase";
import type { RsvpEntry } from "@/lib/rsvp";
import {
  readRememberedName,
  sendListRsvp,
  subscribeToListRsvps,
  updateListRsvp,
  withdrawFromList,
} from "@/lib/rsvpListData";
import type { Rsvp } from "@/types/game";
import { useSubscription } from "./useSubscription";

/**
 * A list's RSVPs as its page sees them, for the signed-in account `uid`:
 * the RSVPs in arrival order, the name the account last RSVP'd under, and
 * the account's own RSVP, change, and withdrawal.
 *
 * `canRead` says whether the account can read the list at all. Nothing is
 * read without it, or without an account. A refused listener stays dead,
 * so the RSVPs are opened again when `canRead` comes back.
 */
export const useListRsvps = (listId: string, uid: string | null, canRead: boolean) => {
  const { value: rsvps, error } = useSubscription<Rsvp[]>(
    uid && canRead ? `${listId}/${uid}` : null,
    (db, onChange, onError) => subscribeToListRsvps(db, listId, onChange, onError),
  );

  // The remembered name is read once per account. The delivery is wrapped
  // so no name yet, null, can be told from a read still on its way.
  const remembered = useSubscription<{ name: string | null }>(uid, (db, onChange, onError) => {
    let current = true;
    readRememberedName(db, uid!).then(
      (name) => current && onChange({ name }),
      (failure: Error) => current && onError(failure),
    );
    return () => {
      current = false;
    };
  });
  // The name this page last sent, which is newer than the one read.
  const [sentName, setSentName] = useState<string | null>(null);
  const rememberedName: string | null | undefined =
    sentName ?? (remembered.value ? remembered.value.name : remembered.error ? null : undefined);

  /** RSVP as this account. Rejects with an RsvpRefusedError saying why the rules refused it. */
  const send = useCallback(
    async (entry: RsvpEntry) => {
      if (!uid || !db) throw new Error("Sign in to RSVP.");
      await sendListRsvp(db, listId, uid, entry);
      setSentName(entry.name.trim());
    },
    [listId, uid],
  );

  /** Change the name and note on this account's RSVP, keeping its place. */
  const update = useCallback(
    async (entry: RsvpEntry) => {
      if (!uid || !db) throw new Error("Sign in to change your RSVP.");
      await updateListRsvp(db, listId, uid, entry);
      setSentName(entry.name.trim());
    },
    [listId, uid],
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
    /** Undefined while it is on its way, null when the account has never RSVP'd. */
    rememberedName,
    send,
    update,
    withdraw,
  };
};
