"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { isRefused } from "@/lib/firestoreData";
import {
  forgetScorerLink,
  memoryLinkStore,
  recordScorerLink,
  recordedScorerLinks,
  type LinkStore,
  type ScorerLinkRecord,
} from "@/lib/shareLinks";
import { proveScorer, StaleScorerLinkError } from "@/lib/sharing";
import { subscribeToTournament, subscribeToTournamentMatches } from "@/lib/tournaments";
import type { Match, Tournament } from "@/types/game";

/**
 * Tournaments a phone reached by link rather than through its own account:
 * the ones it holds a scorer link for, and the one a spectator has open.
 * Each is watched on its own, and none of them joins the account's lists,
 * so a helper's phone never sees them in History or the Tournaments tab.
 */

/** How far a tournament reached by link has got. */
export type LinkStatus =
  /** Nothing has asked for it yet. */
  | "idle"
  /** The scorer link's proof is being written. */
  | "proving"
  /** The tournament or its matches have not arrived. */
  | "loading"
  | "ready"
  /** The rules refuse it, or it is gone. The spectator link is off, or the tournament was deleted. */
  | "unavailable";

/** Whether a tournament reached by link is still on its way. */
export const isLinkPending = (status: LinkStatus): boolean =>
  status === "idle" || status === "proving" || status === "loading";

/** What has arrived for a tournament reached by link, and whether it can be shown. */
interface LinkedTournament {
  tournament: Tournament | null;
  matches: Match[] | null;
  unavailable: boolean;
}

// The record of scorer links lives in localStorage, so a phone that opened
// a link is still a scorer after a reload. On the server, and in a browser
// that blocks storage, it lives only in memory.
const fallbackStore = memoryLinkStore();
const linkStore = (): LinkStore =>
  typeof window === "undefined" ? fallbackStore : window.localStorage;

const withId = (set: ReadonlySet<string>, id: string): ReadonlySet<string> =>
  set.has(id) ? set : new Set(set).add(id);

const withoutId = (set: ReadonlySet<string>, id: string): ReadonlySet<string> => {
  if (!set.has(id)) return set;
  const next = new Set(set);
  next.delete(id);
  return next;
};

export const useLinkedTournaments = ({
  identityUid,
  isAuthLoading,
  ensureIdentity,
}: {
  identityUid: string | null;
  isAuthLoading: boolean;
  ensureIdentity: () => Promise<string>;
}) => {
  const [scorerLinks, setScorerLinks] = useState<ScorerLinkRecord>(() =>
    recordedScorerLinks(linkStore()),
  );
  const [spectating, setSpectating] = useState<ReadonlySet<string>>(() => new Set());
  const [linked, setLinked] = useState<Map<string, LinkedTournament>>(() => new Map());
  const [proving, setProving] = useState<ReadonlySet<string>>(() => new Set());
  const [staleLinks, setStaleLinks] = useState<ReadonlySet<string>>(() => new Set());

  // Every tournament this phone holds a scorer link for is watched from the
  // start, so a reload on its scoring page finds the match again, and a
  // spectator's tournament from the moment its page opens. The ids travel
  // as one string so the effect below restarts only when the set changes.
  const watchedKey = useMemo(
    () => Array.from(new Set([...Object.keys(scorerLinks), ...spectating])).sort().join("|"),
    [scorerLinks, spectating],
  );

  // The subscriptions start again whenever the identity changes, since the
  // rules answer a silent identity differently from nobody, and a refused
  // listener stays dead until it is opened again.
  useEffect(() => {
    if (isAuthLoading || !db) return;
    const database = db;
    const ids = watchedKey === "" ? [] : watchedKey.split("|");
    setLinked(
      (prev) =>
        new Map(
          ids.map((id) => [
            id,
            {
              tournament: prev.get(id)?.tournament ?? null,
              matches: prev.get(id)?.matches ?? null,
              unavailable: false,
            },
          ]),
        ),
    );
    const patch = (id: string, changes: Partial<LinkedTournament>) =>
      setLinked((prev) => {
        const entry = prev.get(id);
        if (!entry) return prev;
        const next = new Map(prev);
        next.set(id, { ...entry, ...changes });
        return next;
      });
    const refuse = (id: string) => () => patch(id, { unavailable: true });
    const unsubscribers = ids.flatMap((id) => [
      subscribeToTournament(
        database,
        id,
        (tournament) => patch(id, { tournament, unavailable: tournament === null }),
        refuse(id),
      ),
      subscribeToTournamentMatches(
        database,
        id,
        (matches) => patch(id, { matches }),
        refuse(id),
      ),
    ]);
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [watchedKey, identityUid, isAuthLoading]);

  /** Watch a tournament this account does not own, as its spectator link allows. */
  const watchTournament = useCallback((tournamentId: string) => {
    setSpectating((prev) => withId(prev, tournamentId));
  }, []);

  // A stale link is forgotten and the tournament stays watched, so the
  // phone falls back to what the spectator link allows. That is the
  // tournament read-only while the link is on, and not found once it is off.
  const markStale = useCallback((tournamentId: string) => {
    setScorerLinks(forgetScorerLink(linkStore(), tournamentId));
    setSpectating((prev) => withId(prev, tournamentId));
    setStaleLinks((prev) => withId(prev, tournamentId));
  }, []);

  /**
   * Open a scorer link: give the phone a silent identity if it has none,
   * write the proof, remember the link, and watch the tournament. A
   * refused proof marks the link stale rather than rejecting, unless the
   * phone already holds a newer link for the same tournament.
   */
  const openScorerLink = useCallback(
    async (tournamentId: string, key: string) => {
      if (!db) throw new Error("Firebase is not configured.");
      const database = db;
      setProving((prev) => withId(prev, tournamentId));
      setStaleLinks((prev) => withoutId(prev, tournamentId));
      try {
        await proveScorer(database, tournamentId, await ensureIdentity(), key);
        setScorerLinks(recordScorerLink(linkStore(), tournamentId, key));
      } catch (error) {
        if (!isRefused(error)) throw error;
        const recorded = recordedScorerLinks(linkStore())[tournamentId];
        if (recorded === undefined || recorded === key) markStale(tournamentId);
      } finally {
        setProving((prev) => withoutId(prev, tournamentId));
      }
    },
    [ensureIdentity, markStale],
  );

  // The rules refuse a scorer whose link was replaced, and also a change a
  // scorer may not make. Proving the recorded link again tells the two
  // apart; only a refused proof means the link is stale.
  const linkWentStale = useCallback(
    async (tournamentId: string): Promise<boolean> => {
      const key = recordedScorerLinks(linkStore())[tournamentId];
      if (key === undefined || !db) return false;
      try {
        await proveScorer(db, tournamentId, await ensureIdentity(), key);
        return false;
      } catch (error) {
        if (!isRefused(error)) return false;
        markStale(tournamentId);
        return true;
      }
    },
    [ensureIdentity, markStale],
  );

  /**
   * Run a write against a tournament. When the rules refuse it because the
   * phone's scorer link has been replaced, the phone forgets the link and
   * the write rejects with a StaleScorerLinkError; any other failure comes
   * back as it was.
   */
  const guardScorerWrite = useCallback(
    async <T,>(tournamentId: string, write: () => Promise<T>): Promise<T> => {
      try {
        return await write();
      } catch (error) {
        if (isRefused(error) && (await linkWentStale(tournamentId))) {
          throw new StaleScorerLinkError();
        }
        throw error;
      }
    },
    [linkWentStale],
  );

  const linkStatus = useCallback(
    (tournamentId: string): LinkStatus => {
      if (proving.has(tournamentId)) return "proving";
      const entry = linked.get(tournamentId);
      if (!entry) return "idle";
      if (entry.unavailable) return "unavailable";
      if (entry.tournament === null || entry.matches === null) return "loading";
      return "ready";
    },
    [proving, linked],
  );

  /** Whether the phone opened a scorer link for the tournament that the owner has since replaced. */
  const isStaleLink = useCallback(
    (tournamentId: string) => staleLinks.has(tournamentId) && !(tournamentId in scorerLinks),
    [staleLinks, scorerLinks],
  );

  /** Whether this phone holds the tournament's scorer link. */
  const holdsScorerLink = useCallback(
    (tournamentId: string) => tournamentId in scorerLinks,
    [scorerLinks],
  );

  const linkedTournaments = useMemo(() => {
    const byId = new Map<string, Tournament>();
    for (const [id, entry] of linked) {
      if (entry.tournament && !entry.unavailable) byId.set(id, entry.tournament);
    }
    return byId;
  }, [linked]);

  const linkedMatches = useMemo(
    () =>
      Array.from(linked.values()).flatMap((entry) =>
        entry.unavailable ? [] : (entry.matches ?? []),
      ),
    [linked],
  );

  const linkedMatchesOf = useCallback(
    (tournamentId: string): Match[] => {
      const entry = linked.get(tournamentId);
      return entry && !entry.unavailable ? (entry.matches ?? []) : [];
    },
    [linked],
  );

  const isLinkedLoading =
    proving.size > 0 ||
    Array.from(linked.keys()).some((id) => isLinkPending(linkStatus(id)));

  return {
    watchTournament,
    openScorerLink,
    guardScorerWrite,
    linkStatus,
    isStaleLink,
    holdsScorerLink,
    isLinkedLoading,
    linkedTournaments,
    linkedMatches,
    linkedMatchesOf,
  };
};
