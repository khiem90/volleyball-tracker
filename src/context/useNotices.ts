"use client";

import { useCallback, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { deleteNotice, postNotice, subscribeToNotices } from "@/lib/rsvps";
import type { Notice } from "@/types/game";

/**
 * A tournament's notices, newest first, and the owner's two actions on
 * them. Nothing is read until `canRead`: the owner always can, anyone else
 * only while signed in with the RSVP link on. A refused listener stays
 * dead, so the list is opened again whenever `canRead` comes back.
 */
export const useNotices = (tournamentId: string, canRead: boolean) => {
  // null until the first delivery.
  const [notices, setNotices] = useState<Notice[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!canRead || !db) {
      setNotices(null);
      return;
    }
    setError(null);
    return subscribeToNotices(
      db,
      tournamentId,
      (next) => {
        setNotices(next);
        setError(null);
      },
      setError,
    );
  }, [tournamentId, canRead]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
