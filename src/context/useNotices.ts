"use client";

import { useCallback } from "react";
import { db } from "@/lib/firebase";
import { deleteNotice, postNotice, subscribeToNotices } from "@/lib/rsvping";
import type { Notice } from "@/types/game";
import { useSubscription } from "./useSubscription";

/**
 * A tournament's notices, newest first, and the owner's two actions on
 * them. Nothing is read until `canRead`: the owner always can, anyone else
 * only while signed in with the RSVP link on. A refused listener stays
 * dead, so the list is opened again whenever `canRead` comes back.
 */
export const useNotices = (tournamentId: string, canRead: boolean) => {
  // null until the first delivery.
  const { value: notices, error } = useSubscription<Notice[]>(
    canRead ? tournamentId : null,
    (db, onChange, onError) => subscribeToNotices(db, tournamentId, onChange, onError),
  );

  /** Post a notice. Rejects with the problem before writing, or with the rules' refusal. Owner only. */
  const post = useCallback(
    async (body: string) => {
      if (!db) throw new Error("Not connected.");
      await postNotice(db, tournamentId, body);
    },
    [tournamentId],
  );

  /** Delete a notice. Owner only. */
  const remove = useCallback(
    async (noticeId: string) => {
      if (!db) throw new Error("Not connected.");
      await deleteNotice(db, tournamentId, noticeId);
    },
    [tournamentId],
  );

  return { notices, error, post, remove };
};
