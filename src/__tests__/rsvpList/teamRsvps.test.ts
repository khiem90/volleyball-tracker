// @vitest-environment node
import { collection, getDocs, type Firestore } from "firebase/firestore";
import { expect, it } from "vitest";
import { splitRsvps, standingIn } from "@/lib/rsvp";
import { listSetupOf, type ListSetup } from "@/lib/rsvpList";
import {
  createRsvpList,
  readRememberedNames,
  saveListSettings,
  sendListRsvp,
  subscribeToListRsvps,
  subscribeToRsvpList,
  updateListRsvp,
} from "@/lib/rsvpListData";
import type { Rsvp, RsvpList } from "@/types/game";
import { describeFirestoreRules, minutesFromNow, modularFirestore, when } from "../rules/emulator";

const owner = "owner-uid";
const dan = "dan-uid";
const eve = "eve-uid";

describeFirestoreRules("RSVPing a team to a list on Firestore", (env) => {
  const accountDb = (uid: string) => modularFirestore(env().authenticatedContext(uid));

  /** One of the owner's lists, open since a minute ago and scheduled for tomorrow. */
  const openList = (changes: Partial<ListSetup>): Promise<RsvpList> =>
    createRsvpList(
      accountDb(owner),
      owner,
      {
        name: "Friday teams",
        takes: "teams",
        capacity: 8,
        scheduledAt: minutesFromNow(60 * 24),
        opensAt: minutesFromNow(-1),
        enabled: true,
        ...changes,
      },
      "America/New_York",
    );

  const rsvpsWhere = (db: Firestore, listId: string, ready: (rsvps: Rsvp[]) => boolean) =>
    when<Rsvp[]>((onChange, onError) => subscribeToListRsvps(db, listId, onChange, onError), ready);

  const listWhere = (db: Firestore, listId: string, ready: (list: RsvpList) => boolean) =>
    when<RsvpList | null>(
      (onChange, onError) => subscribeToRsvpList(db, listId, onChange, onError),
      (list) => list !== null && ready(list),
    ) as Promise<RsvpList>;

  /** A list's RSVP documents as stored, read around the rules. */
  const storedRsvps = async (listId: string): Promise<Record<string, Record<string, unknown>>> => {
    const found: Record<string, Record<string, unknown>> = {};
    await env().withSecurityRulesDisabled(async (unrestricted) => {
      const snapshot = await getDocs(
        collection(modularFirestore(unrestricted), "rsvpLists", listId, "rsvps"),
      );
      for (const d of snapshot.docs) found[d.id] = d.data();
    });
    return found;
  };

  it("RSVPs a captain's whole team under its team name, as one RSVP held by the captain's account", async () => {
    const list = await openList({ takes: "teams" });

    await sendListRsvp(accountDb(dan), list.id, dan, { name: " Spikers ", note: " Six of us " }, "teams");

    expect(await storedRsvps(list.id)).toEqual({
      [dan]: { uid: dan, name: "Spikers", note: "Six of us", createdAt: expect.anything() },
    });
  });

  it("remembers the team name apart from the person name, and neither write touches the other", async () => {
    const pickup = await openList({ name: "Friday pickup", takes: "people" });
    const teams = await openList({ takes: "teams" });
    const db = accountDb(dan);
    expect(await readRememberedNames(db, dan)).toEqual({ person: null, team: null });

    await sendListRsvp(db, pickup.id, dan, { name: "Dan from Tuesdays", note: "" }, "people");
    expect(await readRememberedNames(db, dan)).toEqual({ person: "Dan from Tuesdays", team: null });

    await sendListRsvp(db, teams.id, dan, { name: "Spikers", note: "" }, "teams");
    expect(await readRememberedNames(db, dan)).toEqual({
      person: "Dan from Tuesdays",
      team: "Spikers",
    });

    // Fixing the person name later leaves the team name as it was.
    await updateListRsvp(db, pickup.id, dan, { name: "Daniel", note: "" }, "people");
    expect(await readRememberedNames(db, dan)).toEqual({ person: "Daniel", team: "Spikers" });
  });

  it("remembers a team name for a captain who has never RSVP'd as a person", async () => {
    const list = await openList({ takes: "teams" });
    const db = accountDb(eve);

    await sendListRsvp(db, list.id, eve, { name: "Net Ninjas", note: "" }, "teams");

    expect(await readRememberedNames(db, eve)).toEqual({ person: null, team: "Net Ninjas" });
  });

  it("keeps a team's place when its captain renames it, and remembers the new team name", async () => {
    const list = await openList({ takes: "teams", capacity: 1 });
    await sendListRsvp(accountDb(dan), list.id, dan, { name: "Spikers", note: "" }, "teams");
    await sendListRsvp(accountDb(eve), list.id, eve, { name: "Net Ninjas", note: "" }, "teams");
    const arrived = (await storedRsvps(list.id))[dan].createdAt;

    await updateListRsvp(accountDb(dan), list.id, dan, { name: "Spikers II", note: "" }, "teams");

    const after = await rsvpsWhere(accountDb(dan), list.id, (rsvps) => rsvps[0]?.name === "Spikers II");
    expect(after.map((r) => r.uid)).toEqual([dan, eve]);
    expect((await storedRsvps(list.id))[dan].createdAt).toEqual(arrived);
    expect(await readRememberedNames(accountDb(dan), dan)).toEqual({ person: null, team: "Spikers II" });
  });

  it("holds an account to one team per list", async () => {
    const list = await openList({ takes: "teams" });
    const db = accountDb(dan);
    await sendListRsvp(db, list.id, dan, { name: "Spikers", note: "" }, "teams");

    await expect(
      sendListRsvp(db, list.id, dan, { name: "Spikers B", note: "" }, "teams"),
    ).rejects.toThrow();

    const stored = await storedRsvps(list.id);
    expect(Object.keys(stored)).toEqual([dan]);
    expect(stored[dan].name).toBe("Spikers");
    expect(await readRememberedNames(db, dan)).toEqual({ person: null, team: "Spikers" });
  });

  it("puts a team past capacity on the waitlist and confirms it when capacity goes up, with no write to it", async () => {
    const list = await openList({ takes: "teams", capacity: 1 });
    await sendListRsvp(accountDb(dan), list.id, dan, { name: "Spikers", note: "" }, "teams");
    await sendListRsvp(accountDb(eve), list.id, eve, { name: "Net Ninjas", note: "" }, "teams");
    const eveDb = accountDb(eve);

    const before = await rsvpsWhere(eveDb, list.id, (rsvps) => rsvps.length === 2);
    expect(before.map((r) => r.name)).toEqual(["Spikers", "Net Ninjas"]);
    expect(standingIn(splitRsvps(before, list.capacity), dan)).toEqual({ kind: "confirmed", position: 1 });
    expect(standingIn(splitRsvps(before, list.capacity), eve)).toEqual({ kind: "waitlisted", position: 1 });
    const eveStored = (await storedRsvps(list.id))[eve];

    await saveListSettings(
      accountDb(owner),
      list,
      { ...listSetupOf(list), capacity: 2 },
      "America/New_York",
    );

    const raised = await listWhere(eveDb, list.id, (l) => l.capacity === 2);
    const after = await rsvpsWhere(eveDb, list.id, (rsvps) => rsvps.length === 2);
    expect(standingIn(splitRsvps(after, raised.capacity), eve)).toEqual({ kind: "confirmed", position: 2 });
    expect((await storedRsvps(list.id))[eve]).toEqual(eveStored);
  });
});
