// @vitest-environment node
import { doc, getDoc, type Firestore, type Unsubscribe } from "firebase/firestore";
import { expect, it } from "vitest";
import { homeRsvpRows, type AccountNights } from "@/lib/rsvp";
import {
  markNoticesRead,
  postNotice,
  rsvp,
  saveRsvpSettings,
  subscribeToAccountNights,
  withdraw,
} from "@/lib/rsvps";
import { createTournament, type NewTournamentInput } from "@/lib/tournaments";
import { DEFAULT_TERMINOLOGY } from "@/types/competition-config";
import type { Tournament } from "@/types/game";
import { describeFirestoreRules, minutesFromNow, modularFirestore } from "../rules/emulator";

const owner = "owner-uid";
const dan = "dan-uid";
const eve = "eve-uid";

const input: NewTournamentInput = {
  name: "Friday night",
  format: "round_robin",
  teams: [
    { id: "t1", name: "Aces", createdAt: 1 },
    { id: "t2", name: "Blockers", createdAt: 2 },
  ],
  settings: {
    courts: 1,
    seriesLength: 1,
    instantWin: false,
    pointsForWin: 3,
    pointsForLoss: 0,
    terminology: DEFAULT_TERMINOLOGY,
  },
};

const stored = async (db: Firestore, id: string): Promise<Tournament> =>
  ({ ...(await getDoc(doc(db, "tournaments", id))).data(), id }) as Tournament;

/**
 * A long-lived Home subscription, watched across several writes. `until`
 * resolves with the first delivery, or the latest one, that satisfies
 * `ready`, and fails the test if one never comes.
 */
const watchNights = (db: Firestore, uid: string) => {
  let latest: AccountNights | null = null;
  let failure: Error | null = null;
  let waiting: { ready: (n: AccountNights) => boolean; resolve: (n: AccountNights) => void } | null =
    null;
  const unsubscribe: Unsubscribe = subscribeToAccountNights(
    db,
    uid,
    (nights) => {
      latest = nights;
      if (waiting?.ready(nights)) {
        waiting.resolve(nights);
        waiting = null;
      }
    },
    (error) => {
      failure = error;
    },
  );
  const until = (ready: (n: AccountNights) => boolean) =>
    new Promise<AccountNights>((resolve, reject) => {
      if (failure) return reject(failure);
      if (latest && ready(latest)) return resolve(latest);
      const timer = setTimeout(
        () => reject(failure ?? new Error("the nights never reached the expected state")),
        5000,
      );
      waiting = {
        ready,
        resolve: (n) => {
          clearTimeout(timer);
          resolve(n);
        },
      };
    });
  return { until, stop: unsubscribe, failure: () => failure };
};

const rowIds = (uid: string, nights: AccountNights) =>
  homeRsvpRows(uid, nights).map((row) => row.tournament.name);

describeFirestoreRules("Home's RSVPs on Firestore", (env) => {
  const accountDb = (uid: string) => modularFirestore(env().authenticatedContext(uid));

  /** One of the owner's nights, open since a minute ago. */
  const night = (name: string, capacity = 12): Promise<Tournament> =>
    createTournament(accountDb(owner), owner, {
      ...input,
      name,
      scheduledAt: minutesFromNow(60 * 24),
      scheduledZone: "America/New_York",
      rsvp: { enabled: true, capacity, opensAt: minutesFromNow(-1), closed: false },
    });

  it("lists the account's nights across two tournaments, and drops one on withdrawal", async () => {
    const friday = await night("Friday");
    const saturday = await night("Saturday", 1);
    const sunday = await night("Sunday");
    await rsvp(accountDb(eve), saturday.id, eve, { name: "Eve", note: "" });
    await rsvp(accountDb(dan), friday.id, dan, { name: "Dan", note: "" });
    await rsvp(accountDb(dan), saturday.id, dan, { name: "Dan", note: "" });
    await rsvp(accountDb(eve), sunday.id, eve, { name: "Eve", note: "" });
    const danDb = accountDb(dan);
    const watcher = watchNights(danDb, dan);

    try {
      // The cache can deliver Saturday's list holding only Dan before the
      // server adds Eve, who arrived first, so wait for the whole list.
      const both = await watcher.until(
        (n) => homeRsvpRows(dan, n).length === 2 && n.lists[saturday.id]?.length === 2,
      );
      expect(both.mine.map((r) => r.tournamentId).sort()).toEqual([friday.id, saturday.id].sort());
      expect(Object.keys(both.tournaments).sort()).toEqual([friday.id, saturday.id].sort());
      const rows = homeRsvpRows(dan, both);
      expect(rows.find((r) => r.tournament.id === friday.id)?.standing).toEqual({
        kind: "confirmed",
        position: 1,
      });
      expect(rows.find((r) => r.tournament.id === saturday.id)?.standing).toEqual({
        kind: "waitlisted",
        position: 1,
      });

      await withdraw(danDb, friday.id, dan);

      const after = await watcher.until((n) => n.mine.length === 1);
      expect(after.mine.map((r) => r.tournamentId)).toEqual([saturday.id]);
      expect(Object.keys(after.tournaments)).toEqual([saturday.id]);
      expect(rowIds(dan, after)).toEqual(["Saturday"]);
      expect(watcher.failure()).toBeNull();
    } finally {
      watcher.stop();
    }
  });

  it("drops a night whose link the owner turns off, and keeps the rest of the panel", async () => {
    const friday = await night("Friday");
    const saturday = await night("Saturday");
    await rsvp(accountDb(dan), friday.id, dan, { name: "Dan", note: "" });
    await rsvp(accountDb(dan), saturday.id, dan, { name: "Dan", note: "" });
    const watcher = watchNights(accountDb(dan), dan);

    try {
      await watcher.until((n) => homeRsvpRows(dan, n).length === 2);
      const ownerDb = accountDb(owner);
      const current = await stored(ownerDb, friday.id);
      await saveRsvpSettings(
        ownerDb,
        current,
        {
          enabled: false,
          capacity: 12,
          scheduledAt: current.scheduledAt!,
          opensAt: current.rsvp!.opensAt!,
        },
        "America/New_York",
      );

      const after = await watcher.until((n) => !(friday.id in n.tournaments));
      expect(after.mine).toHaveLength(2);
      expect(rowIds(dan, after)).toEqual(["Saturday"]);
      expect(watcher.failure()).toBeNull();
    } finally {
      watcher.stop();
    }
  });

  it("marks a new notice until the account opens the RSVP page", async () => {
    const friday = await night("Friday");
    await rsvp(accountDb(dan), friday.id, dan, { name: "Dan", note: "" });
    const danDb = accountDb(dan);
    const watcher = watchNights(danDb, dan);

    try {
      const before = await watcher.until((n) => homeRsvpRows(dan, n).length === 1);
      expect(homeRsvpRows(dan, before)[0].unread).toBe(false);

      await postNotice(accountDb(owner), friday.id, "We moved to 7:30.");
      await watcher.until((n) => homeRsvpRows(dan, n)[0]?.unread === true);

      await markNoticesRead(danDb, friday.id, dan);
      // Until the server answers, the time read is this phone's estimate,
      // which can fall before the notice; the server's own time does not.
      const read = await watcher.until((n) => homeRsvpRows(dan, n)[0]?.unread === false);
      expect(read.mine[0].noticesReadAt).toBeDefined();
    } finally {
      watcher.stop();
    }
  });
});
