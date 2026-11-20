// @vitest-environment node
import {
  collection,
  disableNetwork,
  doc,
  enableNetwork,
  getDoc,
  getDocFromServer,
  getDocsFromServer,
} from "firebase/firestore";
import { expect, it } from "vitest";
import { applyTournamentCommand } from "@/lib/commandQueue";
import { createTournamentFromSetup } from "@/lib/creationData";
import {
  createRsvpList,
  deleteRsvpList,
  saveListSettings,
  sendListRsvp,
  setListClosed,
  subscribeToListTournaments,
  subscribeToRsvpList,
} from "@/lib/rsvpListData";
import { listSetupOf } from "@/lib/rsvpList";
import {
  deleteTournament,
  subscribeToTournament,
  subscribeToTournamentMatches,
  subscribeToTournaments,
} from "@/lib/tournaments";
import {
  DEFAULT_POINTS_FOR_LOSS,
  DEFAULT_POINTS_FOR_WIN,
  DEFAULT_TERMINOLOGY,
} from "@/types/competition-config";
import type { Match, PersistentTeam, RsvpList, Tournament } from "@/types/game";
import { describeFirestoreRules, minutesFromNow, modularFirestore, when } from "../rules/emulator";

const owner = "owner-uid";
const dan = "dan-uid";
const REFUSED = { code: "permission-denied" };
const ZONE = "America/New_York";

const roster: PersistentTeam[] = [
  { id: "t1", name: "Aces", color: "#ef4444", createdAt: 1 },
  { id: "t2", name: "Blockers", color: "#3b82f6", createdAt: 2 },
  { id: "t3", name: "Chasers", color: "#22c55e", createdAt: 3 },
  { id: "t4", name: "Diggers", color: "#f59e0b", createdAt: 4 },
];

describeFirestoreRules("Watching a list's tournaments on Firestore", (env) => {
  const accountDb = (uid: string) => modularFirestore(env().authenticatedContext(uid));

  /**
   * The owner's by-team list with its link on and Dan's team on it, closed
   * for an import. Dan is a person on the list, with no link to any
   * tournament but the list's own.
   */
  const closedListWithDan = async (): Promise<RsvpList> => {
    const ownerDb = accountDb(owner);
    const list = await createRsvpList(
      ownerDb,
      owner,
      {
        name: "Friday teams",
        takes: "teams",
        capacity: 8,
        scheduledAt: minutesFromNow(60 * 24),
        opensAt: minutesFromNow(-1),
        enabled: true,
      },
      ZONE,
    );
    await sendListRsvp(accountDb(dan), list.id, dan, { name: "Aces", note: "" }, "teams");
    await setListClosed(ownerDb, list, true);
    return list;
  };

  /** A draft round robin of four roster teams that the owner imported from the list. */
  const importedDraft = (list: RsvpList, name = "Friday night"): Promise<Tournament> =>
    createTournamentFromSetup(
      accountDb(owner),
      owner,
      {
        name,
        format: "round_robin",
        teams: roster,
        settings: {
          courts: 1,
          seriesLength: 1,
          instantWin: false,
          pointsForWin: DEFAULT_POINTS_FOR_WIN,
          pointsForLoss: DEFAULT_POINTS_FOR_LOSS,
          terminology: DEFAULT_TERMINOLOGY,
        },
        rsvpListId: list.id,
      },
      roster,
    );

  const start = (tournamentId: string) =>
    applyTournamentCommand(accountDb(owner), tournamentId, { type: "start" });

  /** The list as its page holds it, once it records `count` tournaments. */
  const listRecording = (listId: string, count: number) =>
    when<RsvpList | null>(
      (onChange, onError) => subscribeToRsvpList(accountDb(dan), listId, onChange, onError),
      (list) => list?.tournamentIds.length === count,
    ) as Promise<RsvpList>;

  /** What the console reads for a spectator: the tournament and its matches. */
  const watch = async (uid: string, tournamentId: string) => {
    const db = accountDb(uid);
    const tournament = await when<Tournament | null>(
      (onChange, onError) => subscribeToTournament(db, tournamentId, onChange, onError),
      (seen) => seen !== null,
    );
    const matches = await when<Match[]>(
      (onChange, onError) => subscribeToTournamentMatches(db, tournamentId, onChange, onError),
      (seen) => seen.length === 6,
    );
    return { tournament, matches };
  };

  /** A fresh read of the tournament and of its matches, as a reload makes it. */
  const freshReads = (uid: string, tournamentId: string) => {
    const db = accountDb(uid);
    return [
      getDocFromServer(doc(db, "tournaments", tournamentId)),
      getDocsFromServer(collection(db, "tournaments", tournamentId, "matches")),
    ];
  };

  it("refuses a person on the list the tournament while it is a draft, and reads it and its matches once it starts", async () => {
    const list = await closedListWithDan();
    const created = await importedDraft(list);

    await expect(watch(dan, created.id)).rejects.toMatchObject(REFUSED);
    for (const read of freshReads(dan, created.id)) {
      await expect(read).rejects.toMatchObject(REFUSED);
    }

    await start(created.id);

    const { tournament, matches } = await watch(dan, created.id);
    expect(tournament).toMatchObject({
      id: created.id,
      status: "live",
      spectatorEnabled: false,
      rsvpListId: list.id,
    });
    expect(matches.every((match) => match.tournamentId === created.id)).toBe(true);
  });

  it("refuses a fresh read once the owner turns the list's link off", async () => {
    const list = await closedListWithDan();
    const created = await importedDraft(list);
    await start(created.id);
    await watch(dan, created.id);

    await saveListSettings(accountDb(owner), list, { ...listSetupOf(list), enabled: false }, ZONE);

    for (const read of freshReads(dan, created.id)) {
      await expect(read).rejects.toMatchObject(REFUSED);
    }
  });

  it("leaves an imported tournament and its matches with their owner when the list is deleted, and ends the watching from it", async () => {
    const list = await closedListWithDan();
    const created = await importedDraft(list);
    await start(created.id);
    await watch(dan, created.id);

    await deleteRsvpList(accountDb(owner), list.id);

    const { tournament, matches } = await watch(owner, created.id);
    expect(tournament).toMatchObject({ id: created.id, status: "live", rsvpListId: list.id });
    expect(matches).toHaveLength(6);
    for (const read of freshReads(owner, created.id)) await read;
    for (const read of freshReads(dan, created.id)) {
      await expect(read).rejects.toMatchObject(REFUSED);
    }
  });

  it("gives a list's page the tournaments its viewer can read, in the order imported, and leaves out a draft and a deleted one", async () => {
    const list = await closedListWithDan();
    const early = await importedDraft(list, "Early round");
    const deleted = await importedDraft(list, "Called off");
    const late = await importedDraft(list, "Late round");
    const draft = await importedDraft(list, "Still arranging");
    await start(early.id);
    await start(late.id);
    const recorded = await listRecording(list.id, 4);
    expect(recorded.tournamentIds).toEqual([early.id, deleted.id, late.id, draft.id]);
    await deleteTournament(accountDb(owner), deleted.id);

    // The ids are the list's record from before the delete, which is what a
    // page still holds when a tournament goes while it is open.
    const namesFor = async (uid: string) => {
      const tournaments = await when<Tournament[]>(
        (onChange) => subscribeToListTournaments(accountDb(uid), recorded.tournamentIds, onChange),
        () => true,
      );
      return tournaments.map((tournament) => tournament.name);
    };
    expect(await namesFor(dan)).toEqual(["Early round", "Late round"]);
    expect(await namesFor(owner)).toEqual(["Early round", "Late round", "Still arranging"]);
  });

  /** Whether the tournament is still stored, read around the rules. */
  const isStored = async (tournamentId: string): Promise<boolean> => {
    let exists = true;
    await env().withSecurityRulesDisabled(async (unrestricted) => {
      const snapshot = await getDoc(doc(modularFirestore(unrestricted), "tournaments", tournamentId));
      exists = snapshot.exists();
    });
    return exists;
  };

  it("takes a deleted tournament off its list's record and keeps the others in order", async () => {
    const list = await closedListWithDan();
    const early = await importedDraft(list, "Early round");
    const deleted = await importedDraft(list, "Called off");
    const late = await importedDraft(list, "Late round");
    await listRecording(list.id, 3);

    await deleteTournament(accountDb(owner), deleted.id);

    const recorded = await listRecording(list.id, 2);
    expect(recorded.tournamentIds).toEqual([early.id, late.id]);
    expect(await isStored(deleted.id)).toBe(false);
  });

  it("still deletes a tournament whose list is gone", async () => {
    const list = await closedListWithDan();
    const created = await importedDraft(list);
    await deleteRsvpList(accountDb(owner), list.id);

    await deleteTournament(accountDb(owner), created.id);

    expect(await isStored(created.id)).toBe(false);
  });

  it("deletes a tournament from a phone with no connection once it is back, and its list forgets it then", async () => {
    const list = await closedListWithDan();
    const created = await importedDraft(list);
    const kept = await importedDraft(list, "Late round");
    await listRecording(list.id, 2);
    // The owner's phone holds its tournaments in its cache, as the app does.
    const phone = accountDb(owner);
    let stopHolding = () => {};
    await new Promise<void>((resolve, reject) => {
      stopHolding = subscribeToTournaments(phone, owner, (own) => own.length === 2 && resolve(), reject);
    });

    await disableNetwork(phone);
    let deleting: Promise<void>;
    try {
      deleting = deleteTournament(phone, created.id);
    } finally {
      await enableNetwork(phone);
    }
    await deleting;
    stopHolding();

    expect(await isStored(created.id)).toBe(false);
    expect((await listRecording(list.id, 1)).tournamentIds).toEqual([kept.id]);
  });

  it("gives a list's page nothing for a list that records no tournament", async () => {
    const tournaments = await when<Tournament[]>(
      (onChange) => subscribeToListTournaments(accountDb(dan), [], onChange),
      () => true,
    );
    expect(tournaments).toEqual([]);
  });

  it("gives a page that was open on a draft the tournament once it starts, by asking again", async () => {
    const list = await closedListWithDan();
    const created = await importedDraft(list);
    const deliveries: Tournament[][] = [];

    const live = when<Tournament[]>(
      (onChange) =>
        subscribeToListTournaments(
          accountDb(dan),
          [created.id],
          (tournaments) => {
            deliveries.push(tournaments);
            onChange(tournaments);
          },
          { retryEvery: 100 },
        ),
      (tournaments) => tournaments.length === 1,
    );
    // The first answer is the refusal of the draft.
    await expect.poll(() => deliveries.length).toBe(1);
    expect(deliveries[0]).toEqual([]);

    await start(created.id);

    expect(await live).toMatchObject([{ id: created.id, status: "live" }]);
    // The refusals in between changed nothing, so the page heard nothing.
    expect(deliveries).toHaveLength(2);
  });
});
