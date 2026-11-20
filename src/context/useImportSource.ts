"use client";

import { useCallback } from "react";
import { db } from "@/lib/firebase";
import { importList, type ListImport } from "@/lib/rsvpImport";
import { readListForImport } from "@/lib/rsvpListData";
import type { RsvpList } from "@/types/game";
import { useOwnLists } from "./useOwnLists";

/**
 * What an import reads from: the lists the account `uid` owns, and the
 * copy of one of them that the creation page arranges into teams.
 * `lists` is null until the first delivery.
 */
export const useImportSource = (uid: string | null) => {
  const { lists, error } = useOwnLists(uid);

  /**
   * Import a list as the server has it now, closing it first when asked.
   * A by-person list is dealt into mixed teams by `Math.random`. Rejects
   * with no connection, since a copy of the list has to be the server's.
   */
  const take = useCallback(async (list: RsvpList, closeFirst: boolean): Promise<ListImport> => {
    if (!db) throw new Error("Not connected.");
    return importList(list, await readListForImport(db, list, { closeFirst }), Math.random);
  }, []);

  return { lists, error, take };
};
