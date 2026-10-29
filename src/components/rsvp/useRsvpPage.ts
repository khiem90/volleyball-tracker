"use client";

import { useEffect, useState } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useRsvpNight } from "@/context/useRsvpNight";
import {
  countdown,
  deviceZone,
  prefillName,
  rsvpPageState,
  splitRsvps,
  standingIn,
  takesRsvps,
  timeLabel,
  watchView,
  type RsvpEntry,
  type RsvpStanding,
  type TimeLabel,
} from "@/lib/rsvp";
import { RsvpRefusedError } from "@/lib/rsvping";

/**
 * Everything the RSVP page needs: the night, its list, the page state on
 * this phone's clock, the countdown, and the RSVP dialog. A guest, and a
 * phone holding only a scorer link's silent identity, are sent to sign in
 * and back here.
 *
 * The phone's clock drives the countdown and nothing else. The rules
 * decide whether an RSVP is in time by the server's clock, so a phone
 * whose clock runs ahead sees the button early, taps, and is told "Not
 * open yet" while the countdown goes on.
 */
export const useRsvpPage = (tournamentId: string) => {
  const { user, isLoading: isAuthLoading } = useRequireAuth();
  const uid = user?.uid ?? null;
  const night = useRsvpNight(tournamentId, uid);
  const { tournament, rsvps } = night;

  const [now, setNow] = useState(() => Date.now());
  const state = tournament ? rsvpPageState(tournament, now, rsvps?.length ?? 0) : null;

  // Who is in and who is waiting is worked out here from arrival order and
  // the capacity, never stored (ADR-0004), so a withdrawal or a raised
  // capacity moves the waitlist up as soon as the list or night arrives.
  const list = rsvps ? splitRsvps(rsvps, tournament?.rsvp?.capacity ?? 0) : null;
  const standing: RsvpStanding = list ? standingIn(list, uid) : { kind: "none" };

  // Tick once a second while counting down, and once more at the open
  // time so the button goes live then rather than up to a second late.
  const opensAt = state?.kind === "not_open" ? state.opensAt : null;
  useEffect(() => {
    if (opensAt === null) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const atOpen = setTimeout(() => setNow(Date.now()), Math.max(0, opensAt - Date.now()));
    return () => {
      clearInterval(tick);
      clearTimeout(atOpen);
    };
  }, [opensAt]);

  const [zone] = useState(deviceZone);
  const when: TimeLabel | null =
    tournament?.scheduledAt !== undefined && tournament?.scheduledAt !== null
      ? timeLabel(tournament.scheduledAt, tournament.scheduledZone, zone)
      : null;

  const mine = rsvps?.find((r) => r.uid === uid) ?? null;

  const [isDialogOpen, setDialogOpen] = useState(false);
  // What the person has typed, kept when the dialog closes on a refusal
  // so a second try starts from it. Null until the dialog first opens.
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
    takesRsvps(state) &&
    state.kind !== "not_open" &&
    !mine &&
    night.rememberedName !== undefined;
  // Name, note, and withdrawal stay open until the tournament starts, even
  // after the owner closes the list. Once the page shows the watch view,
  // the list is read-only.
  const canChange =
    mine !== null && tournament?.status === "draft" && state !== null && watchView(state) === null;

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
      (current) => current ?? { name: prefillName(night.rememberedName, user?.displayName), note: "" },
    );
    setDialogOpen(true);
  };

  // The edit stays put while the dialog fades out, so it does not flash
  // the new-RSVP form on its way out; opening the dialog sets it afresh.
  const closeDialog = () => setDialogOpen(false);

  const send = async () => {
    const sending = edit ?? entry;
    if (!sending || isSending) return;
    setSending(true);
    setError(null);
    try {
      if (isEditing) {
        await night.update(sending);
        closeDialog();
        return;
      }
      await night.sendRsvp(sending);
      setRefusal(null);
      setEntry(null);
      setDialogOpen(false);
    } catch (failure) {
      if (failure instanceof RsvpRefusedError) {
        setRefusal(failure.message);
        setDialogOpen(false);
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
      await night.withdraw();
      setEntry(null);
      closeDialog();
    } catch {
      setError("Could not withdraw. The tournament may have started; reload to check.");
    } finally {
      setWithdrawing(false);
    }
  };

  return {
    /** True until the account, the tournament, and the remembered name are known. */
    isLoading: isAuthLoading || !user || tournament === undefined,
    tournament,
    state,
    /** The scheduled time on this phone's clock, with the owner's beside it when they differ. */
    when,
    /** The time left before RSVPs open, on this phone's clock; null once they are open. */
    countdown: opensAt === null ? null : countdown(opensAt - now),
    rsvps,
    /** The list split into confirmed and waitlisted, each in arrival order; null while loading. */
    list,
    listError: night.listError,
    /** The owner's notices, newest first; null until they arrive. */
    notices: night.notices,
    /** This account's RSVP, or null while it has none. */
    mine,
    /** Where this account stands: not on the list, in, or waiting at a position. */
    standing,
    canRsvp,
    /** Whether this account can still change its name and note or withdraw. */
    canChange,
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
