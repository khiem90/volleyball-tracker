// @vitest-environment node
import { doc, getDoc, type Firestore } from "firebase/firestore";
import { expect, it } from "vitest";
import { saveRsvpSettings } from "@/lib/rsvps";
import { createTournament, type NewTournamentInput } from "@/lib/tournaments";
import { DEFAULT_TERMINOLOGY } from "@/types/competition-config";
import type { Tournament } from "@/types/game";
import { describeFirestoreRules, modularFirestore } from "../rules/emulator";

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

  it("clears the scheduled time and the open time of a night whose link is off", async () => {
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
});
