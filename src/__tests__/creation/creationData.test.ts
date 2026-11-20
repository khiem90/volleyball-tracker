// @vitest-environment node
import {
  collection,
  disableNetwork,
  doc,
  enableNetwork,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { expect, it } from "vitest";
import { emptySetup, setupInput, type TournamentSetup } from "@/lib/creation";
import { createTournamentFromSetup } from "@/lib/creationData";
import { addRosterTeam, TEAM_COLORS } from "@/lib/roster";
import { changeTeamSize, importList, type ListImport, type Random } from "@/lib/rsvpImport";
import {
  addListHeldSpot,
  createRsvpList,
  deleteRsvpList,
  readListForImport,
  sendListRsvp,
  setListClosed,
  withdrawFromList,
} from "@/lib/rsvpListData";
import type { Entry, PersistentTeam, RsvpList, Tournament } from "@/types/game";
import { describeFirestoreRules, minutesFromNow, modularFirestore } from "../rules/emulator";

const owner = "owner-uid";
const dan = "dan-uid";
const eve = "eve-uid";
const fay = "fay-uid";
const gus = "gus-uid";

/** Leaves the people in arrival order, so a deal is the same on every run. */
const inOrder: Random = () => 0.999999;

describeFirestoreRules("Creating a tournament from an RSVP list on Firestore", (env) => {
  const accountDb = (uid: string) => modularFirestore(env().authenticatedContext(uid));

  /** The owner's by-team list, open since a minute ago and scheduled for tomorrow. */
  const teamList = (capacity = 8): Promise<RsvpList> =>
    createRsvpList(
      accountDb(owner),
      owner,
      {
        name: "Friday teams",
        takes: "teams",
        capacity,
        scheduledAt: minutesFromNow(60 * 24),
        opensAt: minutesFromNow(-1),
        enabled: true,
      },
      "America/New_York",
    );

  /** A captain RSVPs a team to the list. */
  const rsvpTeam = (listId: string, uid: string, name: string) =>
    sendListRsvp(accountDb(uid), listId, uid, { name, note: "" }, "teams");

  /** The owner's by-person list, open since a minute ago and scheduled for tomorrow. */
  const personList = (capacity = 8): Promise<RsvpList> =>
    createRsvpList(
      accountDb(owner),
      owner,
      {
        name: "Friday pickup",
        takes: "people",
        capacity,
        scheduledAt: minutesFromNow(60 * 24),
        opensAt: minutesFromNow(-1),
        enabled: true,
      },
      "America/New_York",
    );

  /** A person RSVPs to the list as themselves. */
  const rsvpPerson = (listId: string, uid: string, name: string) =>
    sendListRsvp(accountDb(uid), listId, uid, { name, note: "" }, "people");

  /** The list as the owner imports it now. A by-person list is dealt in arrival order. */
  const importing = async (list: RsvpList): Promise<ListImport> =>
    importList(
      list,
      await readListForImport(accountDb(owner), list, { closeFirst: false }),
      inOrder,
    );

  /** The creation page's setup once the owner has imported the list as it stands. */
  const setupImporting = async (
    list: RsvpList,
    changes: Partial<TournamentSetup> = {},
  ): Promise<TournamentSetup> => ({
    ...emptySetup(),
    name: "Friday night",
    format: "single_elimination",
    import: await importing(list),
    ...changes,
  });

  /** The owner's roster as stored, oldest first, read around the rules. */
  const storedRoster = async (): Promise<PersistentTeam[]> => {
    let teams: PersistentTeam[] = [];
    await env().withSecurityRulesDisabled(async (unrestricted) => {
      const snapshot = await getDocs(collection(modularFirestore(unrestricted), "users", owner, "teams"));
      teams = snapshot.docs.map((d) => ({ ...(d.data() as PersistentTeam), id: d.id }));
    });
    return teams.sort((a, b) => a.createdAt - b.createdAt);
  };

  /** A document as stored, read around the rules, or undefined when there is none. */
  const stored = async <T>(...path: [string, ...string[]]): Promise<T | undefined> => {
    let data: T | undefined;
    await env().withSecurityRulesDisabled(async (unrestricted) => {
      data = (await getDoc(doc(modularFirestore(unrestricted), ...path))).data() as T | undefined;
    });
    return data;
  };

  const storedMatchCount = async (tournamentId: string): Promise<number> => {
    let count = 0;
    await env().withSecurityRulesDisabled(async (unrestricted) => {
      const matches = collection(modularFirestore(unrestricted), "tournaments", tournamentId, "matches");
      count = (await getDocs(matches)).size;
    });
    return count;
  };

  it("enters a roster team for a name the roster has, adds a new name to the roster, and ties the tournament and the list together", async () => {
    const ownerDb = accountDb(owner);
    const aces = await addRosterTeam(ownerDb, owner, { name: "Aces", color: TEAM_COLORS[0] });
    const list = await teamList(2);
    await rsvpTeam(list.id, dan, "aces");
    await rsvpTeam(list.id, eve, "Newcomers");
    await rsvpTeam(list.id, fay, "Waitlisted");
    await setListClosed(ownerDb, list, true);

    const setup = await setupImporting(list);
    const tournament = await createTournamentFromSetup(
      ownerDb,
      owner,
      setupInput(setup, [aces]),
      [aces],
    );

    const roster = await storedRoster();
    expect(roster.map((team) => team.name)).toEqual(["Aces", "Newcomers"]);
    const newcomers = roster[1];
    expect(newcomers.color).toBe(TEAM_COLORS[1]);

    const saved = await stored<Tournament>("tournaments", tournament.id);
    expect(saved?.status).toBe("draft");
    expect(saved?.entries).toEqual<Entry[]>([
      { teamId: aces.id, name: "Aces", color: TEAM_COLORS[0] },
      { teamId: newcomers.id, name: "Newcomers", color: TEAM_COLORS[1] },
    ]);
    expect(saved?.teamIds).toEqual([aces.id, newcomers.id]);
    expect(saved?.rsvpListId).toBe(list.id);

    expect((await stored<RsvpList>("rsvpLists", list.id))?.tournamentIds).toEqual([tournament.id]);
    expect(await stored("tournaments", tournament.id, "private", "scorerKey")).toBeDefined();
  });

  it("leaves the tournament as it was when a team withdraws from the list, and imports the same list again", async () => {
    const ownerDb = accountDb(owner);
    const list = await teamList();
    await rsvpTeam(list.id, dan, "Spikers");
    await rsvpTeam(list.id, eve, "Diggers");
    await setListClosed(ownerDb, list, true);
    const first = await createTournamentFromSetup(
      ownerDb,
      owner,
      setupInput(await setupImporting(list), []),
      [],
    );
    const entriesAtImport = (await stored<Tournament>("tournaments", first.id))?.entries;
    expect(entriesAtImport?.map((entry) => entry.name)).toEqual(["Spikers", "Diggers"]);

    await withdrawFromList(accountDb(dan), list.id, dan);

    expect((await stored<Tournament>("tournaments", first.id))?.entries).toEqual(entriesAtImport);

    const roster = await storedRoster();
    const [spikers, diggers] = roster;
    const again = await setupImporting(list, { name: "Friday bracket", teamIds: [spikers.id] });
    expect(again.import?.teams.map((team) => team.name)).toEqual(["Diggers"]);
    const second = await createTournamentFromSetup(ownerDb, owner, setupInput(again, roster), roster);

    expect((await stored<Tournament>("tournaments", second.id))?.teamIds).toEqual([
      spikers.id,
      diggers.id,
    ]);
    expect((await storedRoster()).map((team) => team.name)).toEqual(["Spikers", "Diggers"]);
    expect((await stored<RsvpList>("rsvpLists", list.id))?.tournamentIds).toEqual([
      first.id,
      second.id,
    ]);
    expect((await stored<Tournament>("tournaments", first.id))?.entries).toEqual(entriesAtImport);
  });

  it("starts an imported tournament as it is created", async () => {
    const ownerDb = accountDb(owner);
    const list = await teamList();
    await rsvpTeam(list.id, dan, "Spikers");
    await rsvpTeam(list.id, eve, "Diggers");
    await setListClosed(ownerDb, list, true);

    const tournament = await createTournamentFromSetup(
      ownerDb,
      owner,
      setupInput(await setupImporting(list), []),
      [],
      { start: true },
    );

    const saved = await stored<Tournament>("tournaments", tournament.id);
    expect(saved?.status).toBe("live");
    expect(saved?.rsvpListId).toBe(list.id);
    expect(await storedMatchCount(tournament.id)).toBe(1);
    expect((await stored<RsvpList>("rsvpLists", list.id))?.tournamentIds).toEqual([tournament.id]);
  });

  it("saves nothing, not even the new roster teams, when the list was deleted before the save", async () => {
    const ownerDb = accountDb(owner);
    const list = await teamList();
    await rsvpTeam(list.id, dan, "Spikers");
    await rsvpTeam(list.id, eve, "Diggers");
    await setListClosed(ownerDb, list, true);
    const setup = await setupImporting(list);
    await deleteRsvpList(ownerDb, list.id);

    let tournamentId = "";
    await expect(
      createTournamentFromSetup(ownerDb, owner, setupInput(setup, []), []).then((tournament) => {
        tournamentId = tournament.id;
      }),
    ).rejects.toThrow();

    expect(tournamentId).toBe("");
    expect(await storedRoster()).toEqual([]);
    let tournaments = -1;
    await env().withSecurityRulesDisabled(async (unrestricted) => {
      tournaments = (await getDocs(collection(modularFirestore(unrestricted), "tournaments"))).size;
    });
    expect(tournaments).toBe(0);
  });

  it("stores a by-person list's mixed teams with their players and writes nothing to the roster", async () => {
    const ownerDb = accountDb(owner);
    const aces = await addRosterTeam(ownerDb, owner, { name: "Aces", color: TEAM_COLORS[0] });
    const list = await personList(4);
    await rsvpPerson(list.id, dan, "Dan");
    await rsvpPerson(list.id, eve, "Eve");
    await addListHeldSpot(ownerDb, list.id, "Walk-in Wes");
    await rsvpPerson(list.id, fay, "Fay");
    await rsvpPerson(list.id, gus, "Waitlisted Gus");
    await setListClosed(ownerDb, list, true);

    const setup: TournamentSetup = {
      ...emptySetup(),
      name: "Friday night",
      format: "single_elimination",
      teamIds: [aces.id],
      import: changeTeamSize(await importing(list), 2, inOrder),
    };
    const tournament = await createTournamentFromSetup(
      ownerDb,
      owner,
      setupInput(setup, [aces]),
      [aces],
    );

    const saved = await stored<Tournament>("tournaments", tournament.id);
    expect(saved?.status).toBe("draft");
    expect(saved?.entries).toHaveLength(3);
    const [acesEntry, teamOne, teamTwo] = saved?.entries ?? [];
    expect(acesEntry).toEqual<Entry>({ teamId: aces.id, name: "Aces", color: TEAM_COLORS[0] });
    expect(teamOne).toEqual<Entry>({
      teamId: expect.any(String),
      name: "Team 1",
      color: TEAM_COLORS[1],
      players: ["Dan", "Walk-in Wes"],
    });
    expect(teamTwo).toEqual<Entry>({
      teamId: expect.any(String),
      name: "Team 2",
      color: TEAM_COLORS[2],
      players: ["Eve", "Fay"],
    });
    expect(saved?.teamIds).toEqual([aces.id, teamOne.teamId, teamTwo.teamId]);
    expect(new Set(saved?.teamIds).size).toBe(3);
    expect(saved?.rsvpListId).toBe(list.id);

    expect(await storedRoster()).toEqual([aces]);
    expect((await stored<RsvpList>("rsvpLists", list.id))?.tournamentIds).toEqual([tournament.id]);
  });

  it("starts a tournament of people entered alone as it is created", async () => {
    const ownerDb = accountDb(owner);
    const list = await personList();
    await rsvpPerson(list.id, dan, "Dan");
    await rsvpPerson(list.id, eve, "Eve");
    await setListClosed(ownerDb, list, true);

    const setup: TournamentSetup = {
      ...emptySetup(),
      name: "Friday singles",
      format: "single_elimination",
      import: changeTeamSize(await importing(list), 1, inOrder),
    };
    const tournament = await createTournamentFromSetup(ownerDb, owner, setupInput(setup, []), [], {
      start: true,
    });

    const saved = await stored<Tournament>("tournaments", tournament.id);
    expect(saved?.status).toBe("live");
    expect(saved?.entries.map((entry) => [entry.name, entry.players])).toEqual([
      ["Dan", ["Dan"]],
      ["Eve", ["Eve"]],
    ]);
    expect(await storedMatchCount(tournament.id)).toBe(1);
    expect(await storedRoster()).toEqual([]);
  });

  it("closes an open list when asked, then reads its RSVPs in arrival order", async () => {
    const ownerDb = accountDb(owner);
    const list = await teamList();
    await rsvpTeam(list.id, eve, "Diggers");
    await rsvpTeam(list.id, dan, "Spikers");

    const rsvps = await readListForImport(ownerDb, list, { closeFirst: true });

    expect(rsvps.map((rsvp) => rsvp.name)).toEqual(["Diggers", "Spikers"]);
    expect((await stored<RsvpList>("rsvpLists", list.id))?.closed).toBe(true);
  });

  it("reads a closed list without writing to it", async () => {
    const ownerDb = accountDb(owner);
    const list = await teamList();
    await rsvpTeam(list.id, dan, "Spikers");
    await setListClosed(ownerDb, list, true);
    const before = await stored<RsvpList>("rsvpLists", list.id);

    const rsvps = await readListForImport(ownerDb, list, { closeFirst: false });

    expect(rsvps.map((rsvp) => rsvp.name)).toEqual(["Spikers"]);
    expect(await stored<RsvpList>("rsvpLists", list.id)).toEqual(before);
  });

  it("with no connection, refuses at once and leaves the list open", async () => {
    const ownerDb = accountDb(owner);
    const list = await teamList();
    await rsvpTeam(list.id, dan, "Spikers");

    await disableNetwork(ownerDb);
    try {
      await expect(readListForImport(ownerDb, list, { closeFirst: true })).rejects.toThrow();
    } finally {
      await enableNetwork(ownerDb);
    }

    expect((await stored<RsvpList>("rsvpLists", list.id))?.closed).toBe(false);
  });

  it("creates a tournament with no import as before, with no list on it", async () => {
    const ownerDb = accountDb(owner);
    const aces = await addRosterTeam(ownerDb, owner, { name: "Aces" });
    const blockers = await addRosterTeam(ownerDb, owner, { name: "Blockers" });
    const roster = [aces, blockers];
    const setup: TournamentSetup = {
      ...emptySetup(),
      name: "Tuesday night",
      format: "single_elimination",
      teamIds: [blockers.id, aces.id],
    };

    const tournament = await createTournamentFromSetup(ownerDb, owner, setupInput(setup, roster), roster);

    const saved = await stored<Tournament>("tournaments", tournament.id);
    expect(saved?.teamIds).toEqual([blockers.id, aces.id]);
    expect(saved && "rsvpListId" in saved).toBe(false);
    expect(await stored("tournaments", tournament.id, "private", "scorerKey")).toBeDefined();
  });
});
