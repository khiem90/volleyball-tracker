"use client";

import { useCallback, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  deleteListNotice,
  markListNoticesRead,
  postListNotice,
  subscribeToListNotices,
} from "@/lib/rsvpListData";
import type { Notice } from "@/types/game";
import { useSubscription } from "./useSubscription";

/**
 * A list's notices, newest first, and the owner's two actions on them.
 * Call it only for a list the viewer can read, which the list's page does
 * by rendering nothing else until the list has loaded.
 *
 * `readerUid` is the viewer's uid while they have an RSVP on the list, and
 * null otherwise. Opening the page records on that RSVP that the account
 * has seen the notices, which is what Home compares the newest notice
 * with. An account with no RSVP has nowhere to record it.
 */
export const useListNotices = (listId: string, readerUid: string | null) => {
  // null until the first delivery.
  const { value: notices, error } = useSubscription<Notice[]>(listId, (db, onChange, onError) =>
    subscribeToListNotices(db, listId, onChange, onError),
  );

  // A notice that arrives while the page is open has been seen too, so the
  // newest one's id keys the write. The viewer's RSVP changes when the
  // write lands, so the effect follows the uid and never the RSVP itself.
  const newestNotice = notices === null ? null : (notices[0]?.id ?? "none");
  useEffect(() => {
    if (!db || !readerUid || newestNotice === null) return;
    markListNoticesRead(db, listId, readerUid).catch((failure: unknown) => {
      console.warn("Could not record that the notices were read:", failure);
    });
  }, [listId, readerUid, newestNotice]);

  /** Post a notice. Rejects with the problem before writing, or with the rules' refusal. Owner only. */
  const post = useCallback(
    async (body: string) => {
      if (!db) throw new Error("Not connected.");
      await postListNotice(db, listId, body);
    },
    [listId],
  );

  /** Delete a notice. Owner only. */
  const remove = useCallback(
    async (noticeId: string) => {
      if (!db) throw new Error("Not connected.");
      await deleteListNotice(db, listId, noticeId);
    },
    [listId],
  );

  return {
    /** Newest first. Null until they arrive. */
    notices,
    error,
    post,
    remove,
  };
};
