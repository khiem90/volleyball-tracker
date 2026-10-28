"use client";

import { useEffect, useState } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useRsvpNight } from "@/context/useRsvpNight";
import {
  countdown,
  deviceZone,
  prefillName,
  rsvpPageState,
  timeLabel,
  type RsvpEntry,
  type TimeLabel,
} from "@/lib/rsvp";
import { RsvpRefusedError } from "@/lib/rsvps";

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
  const state = tournament ? rsvpPageState(tournament, now) : null;

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

  const canRsvp = state?.kind === "open" && !mine && night.rememberedName !== undefined;

  const openDialog = () => {
    if (!canRsvp) return;
    setError(null);
    setEntry(
      (current) => current ?? { name: prefillName(night.rememberedName, user?.displayName), note: "" },
    );
    setDialogOpen(true);
  };

  const send = async () => {
    if (!entry || isSending) return;
    setSending(true);
    setError(null);
    try {
      await night.rsvp(entry);
      setRefusal(null);
      setEntry(null);
      setDialogOpen(false);
    } catch (failure) {
      if (failure instanceof RsvpRefusedError) {
        setRefusal(failure.message);
        setDialogOpen(false);
      } else {
        setError(failure instanceof Error ? failure.message : "Could not RSVP. Try again.");
      }
    } finally {
      setSending(false);
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
    listError: night.listError,
    /** The owner's notices, newest first; null until they arrive. */
    notices: night.notices,
    /** This account's RSVP, or null while it has none. */
    mine,
    canRsvp,
    /** Why the server refused the last RSVP, such as "Not open yet". */
    refusal,
    dialog: {
      isOpen: isDialogOpen,
      open: openDialog,
      close: () => setDialogOpen(false),
      entry,
      change: (changes: Partial<RsvpEntry>) =>
        setEntry((current) => (current ? { ...current, ...changes } : current)),
      send,
      isSending,
      error,
    },
  };
};
