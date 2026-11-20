"use client";

import { useEffect, useState } from "react";
import { useListRsvps } from "@/context/useListRsvps";
import {
  countdown,
  prefillName,
  splitRsvps,
  standingIn,
  type RsvpEntry,
  type RsvpStanding,
} from "@/lib/rsvp";
import {
  isListOver,
  LIST_IS_OVER,
  listPageState,
  listShutMessage,
  listTakesRsvps,
} from "@/lib/rsvpList";
import { RsvpRefusedError } from "@/lib/rsvpListData";
import type { RsvpList } from "@/types/game";

/** The longest wait a browser timer takes, a little under 25 days. */
const LONGEST_TIMER = 2_147_483_647;

/**
 * Hands `setNow` the clock once it reaches `at`, however far off that is,
 * and returns the cancel. A timer that fires a moment early still counts
 * as `at`, so the page never waits on a state it has already reached.
 */
const atMoment = (at: number, setNow: (now: number) => void): (() => void) => {
  let timer: ReturnType<typeof setTimeout>;
  const wait = () => {
    const left = at - Date.now();
    timer =
      left > LONGEST_TIMER
        ? setTimeout(wait, LONGEST_TIMER)
        : setTimeout(() => setNow(Math.max(Date.now(), at)), Math.max(0, left));
  };
  wait();
  return () => clearTimeout(timer);
};

/**
 * The RSVP side of a list's page: who is in and who is waiting, where the
 * viewer stands, the page state on this phone's clock, the countdown, and
 * the RSVP dialog. `list` is null until it loads and when the viewer cannot
 * read it.
 *
 * The phone's clock decides what the page shows and nothing else. The rules
 * judge the open time and the scheduled time by the server's clock, so a
 * phone whose clock runs ahead sees the button early, taps, and is told
 * "Not open yet" while the countdown goes on.
 */
export const useListRsvpView = (
  listId: string,
  list: RsvpList | null,
  user: { uid: string; displayName: string | null } | null,
) => {
  const uid = user?.uid ?? null;
  const data = useListRsvps(listId, uid, list !== null);
  const { rsvps } = data;

  const [now, setNow] = useState(() => Date.now());
  const state = list ? listPageState(list, now, rsvps?.length ?? 0) : null;
  const isOver = list !== null && isListOver(list, now);

  // Who is in and who is waiting is worked out here from arrival order and
  // the capacity, never stored (ADR-0004), so a withdrawal or a raised
  // capacity moves the waitlist up as soon as the RSVPs or the list arrive.
  const split = list && rsvps ? splitRsvps(rsvps, list.capacity) : null;
  const standing: RsvpStanding = split ? standingIn(split, uid) : { kind: "none" };
  const mine = rsvps?.find((rsvp) => rsvp.uid === uid) ?? null;

  // Tick once a second while counting down, and once more at the open
  // time so the button goes live then and not up to a second late.
  const opensAt = state?.kind === "not_open" ? state.opensAt : null;
  useEffect(() => {
    if (opensAt === null) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const cancel = atMoment(opensAt, setNow);
    return () => {
      clearInterval(tick);
      cancel();
    };
  }, [opensAt]);

  // Read the clock again at the scheduled time, so the page goes read-only
  // then and not at the next reload.
  const endsAt = list !== null && !isOver ? (list.scheduledAt ?? null) : null;
  useEffect(() => {
    if (endsAt === null) return;
    return atMoment(endsAt, setNow);
  }, [endsAt]);

  const [isDialogOpen, setDialogOpen] = useState(false);
  // What the person has typed, kept when the dialog closes on a refusal so
  // a second try starts from it. Null until the dialog first opens.
  const [entry, setEntry] = useState<RsvpEntry | null>(null);
  const [isSending, setSending] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The same dialog edits an RSVP already on the list. Its fields start
  // from the stored name and note each time it opens on one.
  const [edit, setEdit] = useState<RsvpEntry | null>(null);
  const isEditing = edit !== null;
  const [isWithdrawing, setWithdrawing] = useState(false);

  const canRsvp =
    state !== null &&
    listTakesRsvps(state) &&
    state.kind !== "not_open" &&
    !mine &&
    data.rememberedName !== undefined;
  // Name, note, and withdrawal stay open until the scheduled time, even
  // after the owner closes the list. From then on the list is read-only.
  const canChange = mine !== null && !isOver;

  const openDialog = () => {
    setError(null);
    if (mine) {
      if (!canChange) return;
      setEdit({ name: mine.name, note: mine.note ?? "" });
      setDialogOpen(true);
      return;
    }
    if (!canRsvp) return;
    setEdit(null);
    setEntry(
      (current) => current ?? { name: prefillName(data.rememberedName, user?.displayName), note: "" },
    );
    setDialogOpen(true);
  };

  // The edit stays put while the dialog fades out, so it does not flash
  // the new-RSVP form on its way out. Opening the dialog sets it afresh.
  const closeDialog = () => setDialogOpen(false);

  const send = async () => {
    const sending = edit ?? entry;
    if (!sending || isSending) return;
    setSending(true);
    setError(null);
    try {
      if (isEditing) {
        await data.update(sending);
        closeDialog();
        return;
      }
      await data.send(sending);
      setRefusal(null);
      setEntry(null);
      closeDialog();
    } catch (failure) {
      if (failure instanceof RsvpRefusedError) {
        setRefusal(failure.message);
        closeDialog();
      } else if (isEditing) {
        setError("Could not save your changes. Try again.");
      } else {
        setError(failure instanceof Error ? failure.message : "Could not RSVP. Try again.");
      }
    } finally {
      setSending(false);
    }
  };

  const withdrawMine = async () => {
    if (!canChange || isWithdrawing) return;
    setWithdrawing(true);
    setError(null);
    try {
      await data.withdraw();
      setEntry(null);
      closeDialog();
    } catch {
      setError("Could not withdraw. The scheduled time may have passed. Reload to check.");
    } finally {
      setWithdrawing(false);
    }
  };

  return {
    /** Where the list stands on this phone's clock. Null until the list loads. */
    state,
    /** True once the scheduled time has passed on this phone's clock. The page is read-only. */
    isOver,
    /** The time left before RSVPs open, on this phone's clock. Null once they are open. */
    countdown: opensAt === null ? null : countdown(opensAt - now),
    /** Every RSVP in arrival order, held spots included. Null while loading. */
    rsvps,
    /** The RSVPs split into confirmed and waitlisted, each in arrival order. Null while loading. */
    split,
    /** True when the RSVPs could not be read. */
    hasError: data.error !== null,
    /** This account's RSVP, or null while it has none. */
    mine,
    /** Where this account stands: not on the list, in, or waiting at a position. */
    standing,
    canRsvp,
    /** Whether this account can still change its name and note or withdraw. */
    canChange,
    /** Why the list takes no RSVPs, in place of the RSVP button. Null while it takes them. */
    shut: isOver ? LIST_IS_OVER : state ? listShutMessage(state) : null,
    /** Why the server refused the last RSVP, such as "Not open yet". */
    refusal,
    dialog: {
      isOpen: isDialogOpen,
      open: openDialog,
      close: closeDialog,
      /** True when the dialog edits the RSVP already on the list. */
      isEditing,
      entry: edit ?? entry,
      change: (changes: Partial<RsvpEntry>) =>
        (isEditing ? setEdit : setEntry)((current) => (current ? { ...current, ...changes } : current)),
      send,
      isSending,
      withdraw: withdrawMine,
      isWithdrawing,
      error,
    },
  };
};

export type ListRsvpView = ReturnType<typeof useListRsvpView>;
