// @vitest-environment node
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { expect, it } from "vitest";
import { applyTournamentCommand } from "@/lib/commandQueue";
import { rsvpPageState, splitRsvps, standingIn } from "@/lib/rsvp";
import {
  addHeldSpot,
  countRsvps,
  postNotice,
  removeRsvp,
  sendRsvp,
  setRsvpClosed,
  subscribeToRsvps,
  withdraw,
} from "@/lib/rsvping";
import { createTournament, deleteTournament, type NewTournamentInput } from "@/lib/tournaments";
import { DEFAULT_TERMINOLOGY } from "@/types/competition-config";
import type { Rsvp, Tournament } from "@/types/game";
import { describeFirestoreRules, minutesFromNow, modularFirestore, when } from "../rules/emulator";

const owner = "owner-uid";
const dan = "dan-uid";
const eve = "eve-uid";

const input: NewTournamentInput = {
  name: "Friday night",
  format: "round_robin",
  teams: [
    { id: "t1", name: "Aces", createdAt: 1 },
    { id: "t2", name: "Blockers", createdAt: 2 },
    { id: "t3", name: "Chasers", createdAt: 3 },
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
  (await getDoc(doc(db, "tournaments", id))).data() as Tournament;

describeFirestoreRules("The owner managing the RSVP list on Firestore", (env) => {
  const accountDb = (uid: string) => modularFirestore(env().authenticatedContext(uid));

  /** The owner's night, open since a minute ago, taking `capacity`. */
  const night = (capacity: number): Promise<Tournament> =>
    createTournament(accountDb(owner), owner, {
      ...input,
      scheduledAt: minutesFromNow(60 * 24),
      scheduledZone: "America/New_York",
      rsvp: { enabled: true, capacity, opensAt: minutesFromNow(-1), closed: false },
    });

  /** The first list the subscription delivers that satisfies `ready`. */
  const listWhere = (db: Firestore, tournamentId: string, ready: (rsvps: Rsvp[]) => boolean) =>
    when<Rsvp[]>((onChange, onError) => subscribeToRsvps(db, tournamentId, onChange, onError), ready);

  it("puts the owner's held spot in the next place in arrival order, behind everyone already there", async () => {
    const tournament = await night(2);
    await sendRsvp(accountDb(dan), tournament.id, dan, { name: "Dan", note: "" });
    await addHeldSpot(accountDb(owner), tournament.id, " Walk-in Sam ");
    await sendRsvp(accountDb(eve), tournament.id, eve, { name: "Eve", note: "" });

    const list = await listWhere(accountDb(owner), tournament.id, (rsvps) => rsvps.length === 3);
    expect(list.map((r) => r.name)).toEqual(["Dan", "Walk-in Sam", "Eve"]);
    const held = list[1];
    expect(held).toMatchObject({ uid: null, held: true, name: "Walk-in Sam" });
    expect(held.id).not.toBe(owner);

    const split = splitRsvps(list, 2);
    expect(split.confirmed.map((r) => r.name)).toEqual(["Dan", "Walk-in Sam"]);
    expect(standingIn(split, eve)).toEqual({ kind: "waitlisted", position: 1 });
  });

  it("refuses a held spot's name the rules would refuse before writing anything", async () => {
    const tournament = await night(2);
    await expect(addHeldSpot(accountDb(owner), tournament.id, "   ")).rejects.toThrow(
      "Enter the name the owner will see.",
    );
  });

  it("promotes the first person waiting when the owner removes a confirmed RSVP, with no write to them", async () => {
    const tournament = await night(1);
    await sendRsvp(accountDb(dan), tournament.id, dan, { name: "Dan", note: "" });
    await sendRsvp(accountDb(eve), tournament.id, eve, { name: "Eve", note: "" });
    const eveDb = accountDb(eve);
    const before = await listWhere(eveDb, tournament.id, (rsvps) => rsvps.length === 2);
    expect(standingIn(splitRsvps(before, 1), eve)).toEqual({ kind: "waitlisted", position: 1 });

    await removeRsvp(accountDb(owner), tournament.id, dan);

    const after = await listWhere(eveDb, tournament.id, (rsvps) => rsvps.length === 1);
    expect(standingIn(splitRsvps(after, 1), eve)).toEqual({ kind: "confirmed", position: 1 });
    expect(after[0]).toEqual(before.find((r) => r.uid === eve));
  });

  it("removes a held spot, and anyone once the tournament has started", async () => {
    const tournament = await night(4);
    await sendRsvp(accountDb(dan), tournament.id, dan, { name: "Dan", note: "" });
    await addHeldSpot(accountDb(owner), tournament.id, "Walk-in Sam");
    const ownerDb = accountDb(owner);
    const list = await listWhere(ownerDb, tournament.id, (rsvps) => rsvps.length === 2);

    await applyTournamentCommand(ownerDb, tournament.id, { type: "start" });
    await removeRsvp(ownerDb, tournament.id, list.find((r) => r.held)!.id);
    await removeRsvp(ownerDb, tournament.id, dan);

    await listWhere(ownerDb, tournament.id, (rsvps) => rsvps.length === 0);
  });

  it("closes the list early, which refuses new RSVPs but not withdrawals, and reopens it while a draft", async () => {
    const tournament = await night(4);
    await sendRsvp(accountDb(dan), tournament.id, dan, { name: "Dan", note: "" });
    const ownerDb = accountDb(owner);

    await setRsvpClosed(ownerDb, tournament.id, true);
    const closed = await stored(ownerDb, tournament.id);
    expect(closed.rsvp).toEqual({ ...tournament.rsvp, closed: true });
    expect(rsvpPageState(closed, Date.now())).toEqual({ kind: "closed" });
    await expect(
      sendRsvp(accountDb(eve), tournament.id, eve, { name: "Eve", note: "" }),
    ).rejects.toThrow("The owner has closed RSVPs.");
    await withdraw(accountDb(dan), tournament.id, dan);

    await setRsvpClosed(ownerDb, tournament.id, false);
    expect((await stored(ownerDb, tournament.id)).rsvp?.closed).toBe(false);
    await sendRsvp(accountDb(eve), tournament.id, eve, { name: "Eve", note: "" });
  });

  it("refuses to reopen the list once the tournament has started, before writing anything", async () => {
    const tournament = await night(4);
    const ownerDb = accountDb(owner);
    await setRsvpClosed(ownerDb, tournament.id, true);
    await applyTournamentCommand(ownerDb, tournament.id, { type: "start" });

    await expect(setRsvpClosed(ownerDb, tournament.id, false)).rejects.toThrow(
      "The list can only be reopened while the tournament is a draft.",
    );
    expect((await stored(ownerDb, tournament.id)).rsvp?.closed).toBe(true);
  });

  it("lets the owner RSVP to their own night like anyone else, on the same list", async () => {
    const tournament = await night(4);
    await sendRsvp(accountDb(dan), tournament.id, dan, { name: "Dan", note: "" });
    await sendRsvp(accountDb(owner), tournament.id, owner, { name: "The organiser", note: "" });

    const list = await listWhere(accountDb(owner), tournament.id, (rsvps) => rsvps.length === 2);
    expect(standingIn(splitRsvps(list, 4), owner)).toEqual({ kind: "confirmed", position: 2 });
  });

  it("counts the people on the list for the owner, held spots included", async () => {
    const tournament = await night(1);
    const ownerDb = accountDb(owner);
    expect(await countRsvps(ownerDb, tournament.id)).toBe(0);

    await sendRsvp(accountDb(dan), tournament.id, dan, { name: "Dan", note: "" });
    await sendRsvp(accountDb(eve), tournament.id, eve, { name: "Eve", note: "" });
    await addHeldSpot(ownerDb, tournament.id, "Walk-in Sam");

    expect(await countRsvps(ownerDb, tournament.id)).toBe(3);
  });

  it("deleting a tournament removes its RSVPs and held spots with its notices, scorer key, and matches", async () => {
    const tournament = await night(4);
    const ownerDb = accountDb(owner);
    await sendRsvp(accountDb(dan), tournament.id, dan, { name: "Dan", note: "" });
    await sendRsvp(accountDb(eve), tournament.id, eve, { name: "Eve", note: "" });
    await addHeldSpot(ownerDb, tournament.id, "Walk-in Sam");
    await postNotice(ownerDb, tournament.id, "We moved to 7:30.");

    await deleteTournament(ownerDb, tournament.id);

    // A read of a missing document cannot pass the rules, so look with them
    // off: this is a check of what is stored, not of who may read it.
    await env().withSecurityRulesDisabled(async (unrestricted) => {
      const raw = modularFirestore(unrestricted);
      expect((await getDocs(collection(raw, "tournaments", tournament.id, "rsvps"))).size).toBe(0);
      expect((await getDocs(collection(raw, "tournaments", tournament.id, "notices"))).size).toBe(0);
      expect((await getDoc(doc(raw, "tournaments", tournament.id))).exists()).toBe(false);
    });
  });

  it("deleting a tournament with hundreds on its list removes all of them in one cleanup, never half the list", async () => {
    const tournament = await night(4);
    await env().withSecurityRulesDisabled(async (unrestricted) => {
      const raw = modularFirestore(unrestricted);
      for (let start = 0; start < 520; start += 260) {
        const batch = writeBatch(raw);
        for (let i = start; i < start + 260; i++) {
          batch.set(doc(raw, "tournaments", tournament.id, "rsvps", `held-${i}`), {
            uid: null,
            held: true,
            name: `Held ${i}`,
            createdAt: serverTimestamp(),
          });
        }
        await batch.commit();
      }
    });

    // The owner's console watches the list while the delete goes through.
    // One cleanup batch takes the whole list at once; split batches would
    // show it part gone first.
    const ownerDb = accountDb(owner);
    const sizes: number[] = [];
    const unsubscribe = subscribeToRsvps(ownerDb, tournament.id, (rsvps) => sizes.push(rsvps.length), () => {});
    await listWhere(ownerDb, tournament.id, (rsvps) => rsvps.length === 520);

    await deleteTournament(ownerDb, tournament.id);
    unsubscribe();

    expect(sizes.filter((size) => size !== 520 && size !== 0)).toEqual([]);
    await env().withSecurityRulesDisabled(async (unrestricted) => {
      const raw = modularFirestore(unrestricted);
      expect((await getDocs(collection(raw, "tournaments", tournament.id, "rsvps"))).size).toBe(0);
      expect((await getDoc(doc(raw, "tournaments", tournament.id))).exists()).toBe(false);
    });
  });
});
