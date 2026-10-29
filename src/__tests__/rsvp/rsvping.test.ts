// @vitest-environment node
import { doc, getDoc, getDocs, type Firestore, type Timestamp } from "firebase/firestore";
import { expect, it } from "vitest";
import { millisOf, NOT_OPEN_YET } from "@/lib/rsvp";
import {
  deleteNotice,
  markNoticesRead,
  postNotice,
  readRememberedName,
  sendRsvp,
  RsvpRefusedError,
  rsvpsCollection,
  saveRsvpSettings,
  subscribeToNotices,
  subscribeToRsvps,
  turnRsvpLinkOff,
} from "@/lib/rsvping";
import { createTournament, type NewTournamentInput } from "@/lib/tournaments";
import { DEFAULT_TERMINOLOGY } from "@/types/competition-config";
import type { Notice, Rsvp, Tournament } from "@/types/game";
import { describeFirestoreRules, minutesFromNow, modularFirestore, when } from "../rules/emulator";

const owner = "owner-uid";

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

const friday7pm = Date.UTC(2026, 10, 7, 0, 0);
const thursday6pm = Date.UTC(2026, 10, 5, 23, 0);

const stored = async (db: Firestore, id: string): Promise<Tournament> =>
  (await getDoc(doc(db, "tournaments", id))).data() as Tournament;

describeFirestoreRules("RSVP settings on Firestore", (env) => {
  const ownerDb = () => modularFirestore(env().authenticatedContext(owner));

  it("saves the times, the zone they were entered in, and the RSVP settings on a new revision", async () => {
    const db = ownerDb();
    const created = await createTournament(db, owner, input);

    await saveRsvpSettings(
      db,
      created,
      { enabled: true, capacity: 16, scheduledAt: friday7pm, opensAt: thursday6pm },
      "America/New_York",
    );

    const after = await stored(db, created.id);
    expect(after.scheduledAt).toBe(friday7pm);
    expect(after.scheduledZone).toBe("America/New_York");
    expect(after.rsvp).toEqual({ enabled: true, capacity: 16, opensAt: thursday6pm, closed: false });
    expect(after.basedOn).toBe(created.revision);
    expect(after.revision).not.toBe(created.revision);
  });

  it("keeps the zone a scheduled time was set in when only the capacity changes", async () => {
    const db = ownerDb();
    const created = await createTournament(db, owner, {
      ...input,
      scheduledAt: friday7pm,
      scheduledZone: "America/New_York",
      rsvp: { enabled: true, capacity: 12, opensAt: thursday6pm, closed: false },
    });

    await saveRsvpSettings(
      db,
      created,
      { enabled: true, capacity: 14, scheduledAt: friday7pm, opensAt: thursday6pm },
      "Europe/London",
    );

    const after = await stored(db, created.id);
    expect(after.scheduledZone).toBe("America/New_York");
    expect(after.rsvp?.capacity).toBe(14);
  });

  it("clears the scheduled time and the open time of a tournament whose link is off", async () => {
    const db = ownerDb();
    const created = await createTournament(db, owner, {
      ...input,
      scheduledAt: friday7pm,
      scheduledZone: "America/New_York",
      rsvp: { enabled: false, capacity: 12, opensAt: thursday6pm, closed: false },
    });

    await saveRsvpSettings(
      db,
      created,
      { enabled: false, capacity: 12, scheduledAt: null, opensAt: null },
      "America/New_York",
    );

    const after = await stored(db, created.id);
    expect(after).not.toHaveProperty("scheduledAt");
    expect(after).not.toHaveProperty("scheduledZone");
    expect(after.rsvp).toEqual({ enabled: false, capacity: 12, closed: false });
  });

  it("refuses to turn the link on without both times, naming the first problem, and writes nothing", async () => {
    const db = ownerDb();
    const created = await createTournament(db, owner, input);

    await expect(
      saveRsvpSettings(
        db,
        created,
        { enabled: true, capacity: 12, scheduledAt: friday7pm, opensAt: null },
        "America/New_York",
      ),
    ).rejects.toThrow("Set when RSVPs open before turning the RSVP link on.");

    expect((await stored(db, created.id)).revision).toBe(created.revision);
  });

  it("turns the link off on its own, leaving the times and capacity as stored, on a new revision", async () => {
    const db = ownerDb();
    const created = await createTournament(db, owner, {
      ...input,
      scheduledAt: friday7pm,
      scheduledZone: "America/New_York",
      rsvp: { enabled: true, capacity: 12, opensAt: thursday6pm, closed: true },
    });

    await turnRsvpLinkOff(db, created.id);

    const after = await stored(db, created.id);
    expect(after.rsvp).toEqual({ enabled: false, capacity: 12, opensAt: thursday6pm, closed: true });
    expect(after.scheduledAt).toBe(friday7pm);
    expect(after.scheduledZone).toBe("America/New_York");
    expect(after.basedOn).toBe(created.revision);
  });
});

describeFirestoreRules("RSVPing on Firestore", (env) => {
  const dan = "dan-uid";
  const eve = "eve-uid";
  const accountDb = (uid: string) => modularFirestore(env().authenticatedContext(uid));

  /** The owner's tournament, with RSVPs opening `opensInMinutes` from the test's clock. */
  const rsvpTournament = async (
    options: { opensInMinutes?: number; capacity?: number; closed?: boolean; enabled?: boolean } = {},
  ): Promise<Tournament> =>
    createTournament(accountDb(owner), owner, {
      ...input,
      scheduledAt: minutesFromNow(60 * 24),
      scheduledZone: "America/New_York",
      rsvp: {
        enabled: options.enabled ?? true,
        capacity: options.capacity ?? 1,
        opensAt: minutesFromNow(options.opensInMinutes ?? -1),
        closed: options.closed ?? false,
      },
    });

  const listOf = (db: Firestore, tournamentId: string, count: number) =>
    when<Rsvp[]>(
      (onChange, onError) => subscribeToRsvps(db, tournamentId, onChange, onError),
      (rsvps) => rsvps.length === count,
    );

  it("lands two accounts that RSVP at the same moment, and delivers them in the server's order", async () => {
    const tournament = await rsvpTournament({ capacity: 1 });

    await Promise.all([
      sendRsvp(accountDb(dan), tournament.id, dan, { name: "Dan", note: "" }),
      sendRsvp(accountDb(eve), tournament.id, eve, { name: "Eve", note: "Bringing a ball" }),
    ]);

    const delivered = await listOf(accountDb(owner), tournament.id, 2);

    // The server's order, read with the rules off: arrival time to the
    // microsecond, then document id for a tie.
    let serverOrder: string[] = [];
    await env().withSecurityRulesDisabled(async (unrestricted) => {
      const docs = (await getDocs(rsvpsCollection(modularFirestore(unrestricted), tournament.id))).docs;
      serverOrder = docs
        .map((d) => ({ id: d.id, at: d.data().createdAt as Timestamp }))
        .sort(
          (a, b) =>
            a.at.seconds - b.at.seconds ||
            a.at.nanoseconds - b.at.nanoseconds ||
            (a.id < b.id ? -1 : 1),
        )
        .map((r) => r.id);
    });
    expect(delivered.map((r) => r.id)).toEqual(serverOrder);
    expect(delivered.map((r) => r.uid).sort()).toEqual([dan, eve]);
    expect(delivered.find((r) => r.uid === eve)).toMatchObject({ name: "Eve", note: "Bringing a ball" });
  });

  it("shows the list to another signed-in account holding the link", async () => {
    const tournament = await rsvpTournament();
    await sendRsvp(accountDb(dan), tournament.id, dan, { name: "Dan", note: "" });

    const seen = await listOf(accountDb(eve), tournament.id, 1);
    expect(seen.map((r) => r.name)).toEqual(["Dan"]);
  });

  it("saves the name trimmed and remembers it for the account's next RSVP", async () => {
    const tournament = await rsvpTournament();
    const db = accountDb(dan);
    expect(await readRememberedName(db, dan)).toBeNull();

    await sendRsvp(db, tournament.id, dan, { name: "  Dan from Tuesdays ", note: " Late " });

    const [mine] = await listOf(db, tournament.id, 1);
    expect(mine).toMatchObject({ id: dan, uid: dan, name: "Dan from Tuesdays", note: "Late" });
    expect(await readRememberedName(db, dan)).toBe("Dan from Tuesdays");
  });

  it("refuses a name the rules would refuse before writing anything", async () => {
    const tournament = await rsvpTournament();
    const db = accountDb(dan);

    await expect(sendRsvp(db, tournament.id, dan, { name: " ", note: "" })).rejects.toThrow(
      "Enter the name the owner will see.",
    );
    expect(await readRememberedName(db, dan)).toBeNull();
  });

  it("reads a refusal before the open time as not open yet, and remembers nothing", async () => {
    const tournament = await rsvpTournament({ opensInMinutes: 1 });
    const db = accountDb(dan);

    const refused = sendRsvp(db, tournament.id, dan, { name: "Dan", note: "" });
    await expect(refused).rejects.toBeInstanceOf(RsvpRefusedError);
    await expect(refused).rejects.toThrow(NOT_OPEN_YET);
    expect(await readRememberedName(db, dan)).toBeNull();
  });

  it("reads a refusal on a closed list, and on a link turned off, for what it is", async () => {
    const closed = await rsvpTournament({ closed: true });
    const off = await rsvpTournament({ enabled: false });
    const db = accountDb(dan);

    await expect(sendRsvp(db, closed.id, dan, { name: "Dan", note: "" })).rejects.toThrow(
      "The owner has closed RSVPs.",
    );
    await expect(sendRsvp(db, off.id, dan, { name: "Dan", note: "" })).rejects.toThrow(
      "This RSVP link is off.",
    );
  });
});

describeFirestoreRules("Notices on Firestore", (env) => {
  const dan = "dan-uid";
  const accountDb = (uid: string) => modularFirestore(env().authenticatedContext(uid));

  const openTournament = () =>
    createTournament(accountDb(owner), owner, {
      ...input,
      scheduledAt: minutesFromNow(60 * 24),
      scheduledZone: "America/New_York",
      rsvp: { enabled: true, capacity: 12, opensAt: minutesFromNow(-1), closed: false },
    });

  const noticesOf = (db: Firestore, tournamentId: string, ready: (notices: Notice[]) => boolean) =>
    when<Notice[]>(
      (onChange, onError) => subscribeToNotices(db, tournamentId, onChange, onError),
      ready,
    );

  it("shows the owner's notices to an account holding the link, newest first", async () => {
    const tournament = await openTournament();
    await postNotice(accountDb(owner), tournament.id, "Courts 3 and 4 tonight.");
    await postNotice(accountDb(owner), tournament.id, "  We moved to 7:30.  ");

    const seen = await noticesOf(accountDb(dan), tournament.id, (n) => n.length === 2);
    expect(seen.map((n) => n.body)).toEqual(["We moved to 7:30.", "Courts 3 and 4 tonight."]);
  });

  it("refuses an empty or over-long notice before writing anything", async () => {
    const tournament = await openTournament();
    const db = accountDb(owner);

    await expect(postNotice(db, tournament.id, "   ")).rejects.toThrow("Write the notice first.");
    await expect(postNotice(db, tournament.id, "x".repeat(501))).rejects.toThrow(
      "Keep the notice to 500 characters.",
    );
    expect(await noticesOf(db, tournament.id, () => true)).toEqual([]);
  });

  it("takes a deleted notice off everyone's list", async () => {
    const tournament = await openTournament();
    await postNotice(accountDb(owner), tournament.id, "Wrong night, sorry.");
    await postNotice(accountDb(owner), tournament.id, "We moved to 7:30.");
    const [, mistake] = await noticesOf(accountDb(owner), tournament.id, (n) => n.length === 2);

    await deleteNotice(accountDb(owner), tournament.id, mistake.id);

    const seen = await noticesOf(accountDb(dan), tournament.id, (n) => n.length === 1);
    expect(seen.map((n) => n.body)).toEqual(["We moved to 7:30."]);
  });

  it("records on an account's RSVP that it has seen the newest notice", async () => {
    const tournament = await openTournament();
    const db = accountDb(dan);
    await sendRsvp(db, tournament.id, dan, { name: "Dan", note: "" });
    await postNotice(accountDb(owner), tournament.id, "We moved to 7:30.");
    const [newest] = await noticesOf(db, tournament.id, (n) => n.length === 1);

    await markNoticesRead(db, tournament.id, dan);

    const [mine] = await when<Rsvp[]>(
      (onChange, onError) => subscribeToRsvps(db, tournament.id, onChange, onError),
      (rsvps) => rsvps[0]?.noticesReadAt !== undefined,
    );
    expect(millisOf(mine.noticesReadAt!)).toBeGreaterThanOrEqual(millisOf(newest.createdAt));
  });
});
