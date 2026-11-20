"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useListOwner } from "@/context/useListOwner";
import { deleteListDescription } from "@/lib/rsvpList";
import { messageOf } from "@/lib/utils";
import type { RsvpList } from "@/types/game";

/**
 * The owner's controls on a list's page: Close and Reopen, Add held spot,
 * Remove on a row, Duplicate, and Delete with its confirmation. `list` is
 * null for anyone but the owner, and then nothing here does anything.
 * `rsvpCount` is how many RSVPs are on the list, held spots included, or
 * null until they arrive, and `rsvpsFailed` says they never will. `isOver`
 * is true once the scheduled time has passed on this phone's clock.
 */
export const useListOwnerControls = (
  list: RsvpList | null,
  rsvpCount: number | null,
  rsvpsFailed: boolean,
  isOver: boolean,
) => {
  const router = useRouter();
  const owner = useListOwner(list);

  const [isClosing, setClosing] = useState(false);
  const [isDuplicating, setDuplicating] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleClosed = async () => {
    if (!list || isOver || isClosing) return;
    setClosing(true);
    setError(null);
    try {
      await owner.setClosed(!list.closed);
    } catch (failure) {
      console.error("Failed to close or reopen the list:", failure);
      setError(
        list.closed
          ? "The list could not be reopened. Check your connection and try again."
          : "The list could not be closed. Check your connection and try again.",
      );
    } finally {
      setClosing(false);
    }
  };

  // The new list's page mounts fresh once the server has the list, which
  // is what clears the busy flag.
  const duplicate = async () => {
    if (!list || isDuplicating) return;
    setDuplicating(true);
    setError(null);
    try {
      const id = await owner.duplicate();
      router.push(`/rsvp/${id}`);
    } catch (failure) {
      console.error("Failed to duplicate the list:", failure);
      setError(messageOf(failure, "The list could not be duplicated."));
      setDuplicating(false);
    }
  };

  const confirmDelete = async () => {
    if (!list || isDeleting) return;
    setDeleting(true);
    setError(null);
    try {
      await owner.remove();
      router.push("/rsvp");
    } catch (failure) {
      console.error("Failed to delete the list:", failure);
      setError("The list could not be deleted. Check your connection and try again.");
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (!list) return null;

  return {
    isClosed: list.closed,
    /** False once the list is over. Close, Reopen, Add held spot, and Remove are hidden then. */
    canChange: !isOver,
    toggleClosed,
    isClosing,
    /** Add a held spot by name. Rejects with the name's problem, or the write's failure. */
    addHeld: owner.addHeld,
    /** Take an RSVP off the list by its id. */
    removeRsvp: owner.removeRsvp,
    duplicate,
    isDuplicating,
    deletion: {
      isOpen: isDeleteOpen,
      open: () => setDeleteOpen(true),
      setOpen: (open: boolean) => !isDeleting && setDeleteOpen(open),
      title: `Delete ${list.name}?`,
      /** Names how many RSVPs go with the list, when there are any. */
      description: deleteListDescription(list.name, rsvpCount),
      /** Delete waits for the count, so the owner never confirms against a wrong number. */
      canConfirm: rsvpCount !== null || rsvpsFailed,
      confirm: confirmDelete,
      isDeleting,
    },
    /** The last failed action's message. */
    error,
  };
};

export type ListOwnerControls = NonNullable<ReturnType<typeof useListOwnerControls>>;
