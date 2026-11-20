"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useImportSource } from "@/context/useImportSource";
import {
  BY_PERSON_NOT_YET,
  importedTeamRows,
  importReadiness,
  listToImportIn,
  renameImportedTeam,
  type ImportReadiness,
  type ListImport,
} from "@/lib/rsvpImport";
import { isListOver, listWording, ownListsInOrder, TAKES_LABEL } from "@/lib/rsvpList";
import type { PersistentTeam, RsvpList } from "@/types/game";

const IMPORT_FAILED = "The list could not be imported. Check your connection and try again.";
const LIST_NOT_FOUND = "That RSVP list is not one of yours, or it was deleted.";
const LIST_GONE = "The list these teams came from was deleted. Remove the import to go on.";

/** A list in the picker: what it is, where it stands, and whether it can be chosen. */
export interface ImportChoice {
  list: RsvpList;
  /** "By team • Closed", or for a by-person list why it cannot be chosen. */
  detail: string;
  canChoose: boolean;
}

const choiceFor = (list: RsvpList, now: number): ImportChoice => {
  const readiness = importReadiness(list, now);
  if (readiness.kind === "by_person") {
    return { list, detail: `${TAKES_LABEL[list.takes]} • ${BY_PERSON_NOT_YET}`, canChoose: false };
  }
  const standing = isListOver(list, now) ? "Over" : list.closed ? "Closed" : "Open";
  return { list, detail: `${TAKES_LABEL[list.takes]} • ${standing}`, canChoose: true };
};

/**
 * The import on the creation page: the owner's lists to pick from, the
 * offer to close an open one, and the imported teams once a list is
 * chosen. `current` is the import the setup holds, `onChange` replaces it,
 * and `roster` says which imported names are already roster teams.
 *
 * The page may open with a list chosen, from Create tournament on the
 * list's own page. A list that is ready is then imported at once, and an
 * open one goes straight to the offer to close it.
 */
export const useListImport = (
  current: ListImport | null,
  roster: PersistentTeam[],
  onChange: (next: ListImport | null) => void,
) => {
  const { user } = useAuth();
  const source = useImportSource(user?.uid ?? null);
  const { lists, take } = source;
  const requestedId = listToImportIn(useSearchParams());
  // The phone's clock as the page opens. It only decides what to show.
  const [now] = useState(() => Date.now());

  const [isPicking, setPicking] = useState(false);
  const [chosenToClose, setChosenToClose] = useState<RsvpList | null>(null);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Whether the list the page was opened for still waits to be dealt with.
  const [isRequestOpen, setRequestOpen] = useState(requestedId !== null);

  // Undefined with no request, or until the lists arrive. Null when the
  // requested list is not among them.
  const requested =
    isRequestOpen && lists ? (lists.find((list) => list.id === requestedId) ?? null) : undefined;
  const requestedKind: ImportReadiness["kind"] | null = requested
    ? importReadiness(requested, now).kind
    : null;

  // A requested list that is ready needs no question, so it is read at
  // once. Everything this sets, it sets after the read has answered.
  const started = useRef(false);
  useEffect(() => {
    if (!requested || requestedKind !== "ready" || started.current) return;
    started.current = true;
    take(requested, false).then(
      (imported) => {
        onChange(imported);
        setRequestOpen(false);
      },
      (failure: unknown) => {
        console.error("Failed to import the list:", failure);
        setError(IMPORT_FAILED);
        setRequestOpen(false);
      },
    );
  }, [requested, requestedKind, take, onChange]);

  const bring = async (list: RsvpList, closeFirst: boolean) => {
    if (isBusy) return;
    setBusy(true);
    setError(null);
    setRequestOpen(false);
    try {
      onChange(await take(list, closeFirst));
    } catch (failure) {
      console.error("Failed to import the list:", failure);
      setError(IMPORT_FAILED);
    } finally {
      setBusy(false);
      setPicking(false);
      setChosenToClose(null);
    }
  };

  const choose = (list: RsvpList) => {
    setRequestOpen(false);
    setError(null);
    const readiness = importReadiness(list, Date.now());
    if (readiness.kind === "by_person") return;
    if (readiness.kind === "open") {
      setPicking(false);
      setChosenToClose(list);
      return;
    }
    void bring(list, false);
  };

  const listToClose = chosenToClose ?? (requested && requestedKind === "open" ? requested : null);

  const choices = useMemo(() => {
    if (!lists) return null;
    const { upcoming, over } = ownListsInOrder(lists, now);
    return [...upcoming, ...over].map((list) => choiceFor(list, now));
  }, [lists, now]);

  const rows = useMemo(() => (current ? importedTeamRows(current, roster) : []), [current, roster]);
  const rosterIds = useMemo(
    () => new Set(rows.flatMap((row) => (row.rosterTeam ? row.rosterTeam.id : []))),
    [rows],
  );
  const isListGone =
    current !== null && lists !== null && !lists.some((list) => list.id === current.listId);

  const requestProblem =
    requested === null ? LIST_NOT_FOUND : requestedKind === "by_person" ? BY_PERSON_NOT_YET : null;

  return {
    picker: {
      isOpen: isPicking,
      open: () => {
        setError(null);
        setPicking(true);
      },
      close: () => !isBusy && setPicking(false),
      /** The owner's lists in the RSVP tab's order, or null until they arrive. */
      choices,
      hasLoadError: source.error !== null,
      choose,
    },
    /** The open list the owner is asked to close, or null. */
    closeOffer: listToClose && {
      description: listWording(listToClose.takes).closeToImport(listToClose.name),
      confirm: () => {
        // Kept by hand from here on, since the request stops pointing at it.
        setChosenToClose(listToClose);
        void bring(listToClose, true);
      },
      cancel: () => {
        if (isBusy) return;
        setChosenToClose(null);
        setRequestOpen(false);
      },
    },
    /** True while a list is being closed or read. */
    isBusy:
      isBusy ||
      (isRequestOpen && lists === null && source.error === null) ||
      (requestedKind === "ready" && current === null),
    /** Why the last import did not happen. */
    error: error ?? requestProblem,
    /** The imported teams, or null with no import. */
    imported: current && {
      listName: current.listName,
      rows,
      /** The roster teams the import enters. Their rows in the checklist are taken. */
      rosterIds,
      /** Set when the list has been deleted since, which the save would be refused for. */
      problem: isListGone ? LIST_GONE : null,
      rename: (teamId: string, name: string) => onChange(renameImportedTeam(current, teamId, name)),
      remove: () => onChange(null),
    },
  };
};

export type ListImportView = ReturnType<typeof useListImport>;
