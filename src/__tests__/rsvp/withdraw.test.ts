// @vitest-environment node
import { doc, getDoc, type Firestore } from "firebase/firestore";
import { expect, it } from "vitest";
import { applyTournamentCommand } from "@/lib/commandQueue";
import { rsvpPageState, splitRsvps, standingIn } from "@/lib/rsvp";
import {
  readRememberedName,
  rsvp,
  saveRsvpSettings,
  subscribeToRsvps,
  updateRsvp,
  withdraw,
} from "@/lib/rsvps";
import { createTournament, subscribeToTournament, type NewTournamentInput } from "@/lib/tournaments";
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

describeFirestoreRules("Waitlist and withdrawing on Firestore", (env) => {
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

  const tournamentWhere = (db: Firestore, id: string, ready: (t: Tournament) => boolean) =>
    when<Tournament | null>(
      (onChange, onError) => subscribeToTournament(db, id, onChange, onError),
      (t) => t !== null && ready(t),
    ) as Promise<Tournament>;

  /** Dan RSVPs, then Eve, one after the other so the order is certain. */
  const danThenEve = async (tournamentId: string) => {
    await rsvp(accountDb(dan), tournamentId, dan, { name: "Dan", note: "" });
    await rsvp(accountDb(eve), tournamentId, eve, { name: "Eve", note: "" });
  };

  it("promotes the first person waiting when the first confirmed withdraws, with no write to them, and puts a returning account at the back", async () => {
    const tournament = await night(1);
    await danThenEve(tournament.id);
    const eveDb = accountDb(eve);

    const before = await listWhere(eveDb, tournament.id, (rsvps) => rsvps.length === 2);
    expect(standingIn(splitRsvps(before, 1), eve)).toEqual({ kind: "waitlisted", position: 1 });
    const eveBefore = before.find((r) => r.uid === eve);

    await withdraw(accountDb(dan), tournament.id, dan);

    const after = await listWhere(eveDb, tournament.id, (rsvps) => rsvps.length === 1);
    expect(standingIn(splitRsvps(after, 1), eve)).toEqual({ kind: "confirmed", position: 1 });
    // Eve's RSVP is the one she wrote: the promotion is the split, not a write.
    expect(after[0]).toEqual(eveBefore);

    await rsvp(accountDb(dan), tournament.id, dan, { name: "Dan", note: "Back in" });

    const again = await listWhere(eveDb, tournament.id, (rsvps) => rsvps.length === 2);
    expect(again.map((r) => r.uid)).toEqual([eve, dan]);
    expect(standingIn(splitRsvps(again, 1), dan)).toEqual({ kind: "waitlisted", position: 1 });
  });

  it("promotes the next person when the owner raises the capacity", async () => {
    const tournament = await night(1);
    await danThenEve(tournament.id);
    const eveDb = accountDb(eve);
    const list = await listWhere(eveDb, tournament.id, (rsvps) => rsvps.length === 2);

    await saveRsvpSettings(
      accountDb(owner),
      await stored(accountDb(owner), tournament.id),
      { enabled: true, capacity: 2, scheduledAt: tournament.scheduledAt!, opensAt: tournament.rsvp!.opensAt! },
      "America/New_York",
    );

    const raised = await tournamentWhere(eveDb, tournament.id, (t) => t.rsvp?.capacity === 2);
    expect(standingIn(splitRsvps(list, raised.rsvp!.capacity), eve)).toEqual({
      kind: "confirmed",
      position: 2,
    });
  });

  it("keeps a person's place when they change their name and note, and remembers the new name", async () => {
    const tournament = await night(1);
    await danThenEve(tournament.id);
    const danDb = accountDb(dan);
    const [first] = await listWhere(danDb, tournament.id, (rsvps) => rsvps.length === 2);

    await updateRsvp(danDb, tournament.id, dan, { name: " Dan from Tuesdays ", note: " Late " });

    const after = await listWhere(danDb, tournament.id, (rsvps) => rsvps[0]?.name !== "Dan");
    expect(after.map((r) => r.uid)).toEqual([dan, eve]);
    expect(after[0]).toEqual({ ...first, name: "Dan from Tuesdays", note: "Late" });
    expect(standingIn(splitRsvps(after, 1), dan)).toEqual({ kind: "confirmed", position: 1 });
    expect(await readRememberedName(danDb, dan)).toBe("Dan from Tuesdays");
  });

  it("refuses a changed name the rules would refuse before writing anything", async () => {
    const tournament = await night(1);
    await rsvp(accountDb(dan), tournament.id, dan, { name: "Dan", note: "" });

    await expect(updateRsvp(accountDb(dan), tournament.id, dan, { name: "  ", note: "" })).rejects.toThrow(
      "Enter the name the owner will see.",
    );
  });

  it("closes the list when the tournament starts, without writing to the RSVP settings, and ends withdrawals", async () => {
    const tournament = await night(1);
    await danThenEve(tournament.id);
    const ownerDb = accountDb(owner);
    const settings = (await stored(ownerDb, tournament.id)).rsvp;

    await applyTournamentCommand(ownerDb, tournament.id, { type: "start" });

    const started = await stored(ownerDb, tournament.id);
    expect(started.status).toBe("live");
    expect(started.rsvp).toEqual(settings);
    expect(rsvpPageState(started, Date.now(), 2)).toEqual({ kind: "live" });

    await expect(withdraw(accountDb(dan), tournament.id, dan)).rejects.toMatchObject({
      code: "permission-denied",
    });
    await expect(
      rsvp(accountDb("fay-uid"), tournament.id, "fay-uid", { name: "Fay", note: "" }),
    ).rejects.toThrow("This tournament has started, so RSVPs are closed.");
  });
});
