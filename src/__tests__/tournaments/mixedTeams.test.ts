// @vitest-environment node
import {
  collection,
  disableNetwork,
  doc,
  enableNetwork,
  getDoc,
  getDocs,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import { describe, expect, it } from "vitest";
import { applyTournamentCommand } from "@/lib/commandQueue";
import { createTournamentFromSetup } from "@/lib/creationData";
import {
  createTournament,
  duplicateInput,
  saveMixedTeamEdit,
  subscribeToTournament,
  type NewTournamentInput,
} from "@/lib/tournaments";
import {
  DEFAULT_POINTS_FOR_LOSS,
  DEFAULT_POINTS_FOR_WIN,
  DEFAULT_TERMINOLOGY,
} from "@/types/competition-config";
import type { Entry, Match, Tournament } from "@/types/game";
import { describeFirestoreRules, modularFirestore, when } from "../rules/emulator";

const owner = "owner-uid";

/** Four mixed teams of two on one court. No roster team stands behind any of them. */
const mixedNight: NewTournamentInput = {
  name: "Friday mix",
  format: "win2out",
  teams: [
    { id: "m1", name: "Team 1", color: "#ef4444", players: ["Ana", "Ben"] },
    { id: "m2", name: "Team 2", color: "#3b82f6", players: ["Cy", "Dee"] },
    { id: "m3", name: "Team 3", color: "#22c55e", players: ["Eli", "Fay"] },
    { id: "m4", name: "Team 4", color: "#f59e0b", players: ["Gus", "Hal"] },
  ],
  settings: {
    courts: 1,
    seriesLength: 1,
    instantWin: true,
    pointsForWin: DEFAULT_POINTS_FOR_WIN,
    pointsForLoss: DEFAULT_POINTS_FOR_LOSS,
    terminology: DEFAULT_TERMINOLOGY,
  },
};

const tournamentDocOf = async (db: Firestore, id: string): Promise<Tournament> =>
  (await getDoc(doc(db, "tournaments", id))).data() as Tournament;

const matchDocsOf = async (db: Firestore, tournamentId: string): Promise<Match[]> => {
  const snapshot = await getDocs(collection(db, "tournaments", tournamentId, "matches"));
  return snapshot.docs.map((d) => d.data() as Match);
};

const entryOf = (tournament: Tournament, teamId: string): Entry =>
  tournament.entries.find((entry) => entry.teamId === teamId)!;

describeFirestoreRules("Editing mixed teams on Firestore", (env) => {
  /** One of the owner's devices. Each call is a device of its own, with its own cache. */
  const ownerDevice = () => modularFirestore(env().authenticatedContext(owner));

  /** A live mixed night, with the match on its one court. */
  const liveNight = async (db: Firestore) => {
    const created = await createTournament(db, owner, mixedNight, { start: true });
    const [onCourt] = await matchDocsOf(db, created.id);
    return { id: created.id, onCourt };
  };

  /** Resolves once this device's own subscription shows a tournament that passes `ready`. */
  const shown = (db: Firestore, id: string, ready: (tournament: Tournament) => boolean) =>
    when<Tournament | null>(
      (onChange, onError) => subscribeToTournament(db, id, onChange, onError),
      (tournament) => tournament !== null && ready(tournament),
    );

  it("renames a mixed team on the stored tournament, built on the stored revision, and touches no match", async () => {
    const db = ownerDevice();
    const { id } = await liveNight(db);
    const before = await tournamentDocOf(db, id);
    const matchesBefore = await matchDocsOf(db, id);

    await saveMixedTeamEdit(db, id, { kind: "rename", teamId: "m2", name: " Net Ninjas " });

    const after = await tournamentDocOf(db, id);
    expect(entryOf(after, "m2")).toEqual({
      teamId: "m2",
      name: "Net Ninjas",
      color: "#3b82f6",
      players: ["Cy", "Dee"],
    });
    expect(after.basedOn).toBe(before.revision);
    expect(after.revision).not.toBe(before.revision);
    expect({
      ...after,
      entries: before.entries,
      revision: before.revision,
      basedOn: before.basedOn,
      updatedAt: before.updatedAt,
    }).toEqual(before);
    expect(await matchDocsOf(db, id)).toEqual(matchesBefore);
  });

  it("changes players on a draft, which has no matches yet", async () => {
    const db = ownerDevice();
    const draft = await createTournament(db, owner, mixedNight);

    await saveMixedTeamEdit(db, draft.id, {
      kind: "move_player",
      teamId: "m1",
      player: { name: "Ben", index: 1 },
      toTeamId: "m4",
    });
    await saveMixedTeamEdit(db, draft.id, {
      kind: "remove_player",
      teamId: "m2",
      player: { name: "Cy", index: 0 },
    });

    const stored = await tournamentDocOf(db, draft.id);
    expect(stored.entries.map((entry) => entry.players)).toEqual([
      ["Ana"],
      ["Dee"],
      ["Eli", "Fay"],
      ["Gus", "Hal", "Ben"],
    ]);
    expect(stored.teamIds).toEqual(["m1", "m2", "m3", "m4"]);
    expect(stored.status).toBe("draft");
  });

  it("refuses an empty name and writes nothing", async () => {
    const db = ownerDevice();
    const { id } = await liveNight(db);
    const before = await tournamentDocOf(db, id);

    await expect(saveMixedTeamEdit(db, id, { kind: "rename", teamId: "m1", name: "  " })).rejects.toThrow(
      "A team needs a name.",
    );
    await expect(
      saveMixedTeamEdit(db, id, { kind: "add_player", teamId: "m1", name: "" }),
    ).rejects.toThrow("A player needs a name.");

    expect(await tournamentDocOf(db, id)).toEqual(before);
  });

  it("changes nothing once the tournament is completed", async () => {
    const db = ownerDevice();
    const { id } = await liveNight(db);
    await applyTournamentCommand(db, id, { type: "end" });
    const before = await tournamentDocOf(db, id);

    await expect(
      saveMixedTeamEdit(db, id, { kind: "rename", teamId: "m1", name: "Net Ninjas" }),
    ).rejects.toThrow("A completed tournament keeps its teams as they were.");

    expect(await tournamentDocOf(db, id)).toEqual(before);
  });

  it("an edit and a result landing at the same moment are both kept", async () => {
    const { id, onCourt } = await liveNight(ownerDevice());

    await Promise.all([
      applyTournamentCommand(ownerDevice(), id, {
        type: "instant_win",
        matchId: onCourt.id,
        winnerId: "m2",
      }),
      saveMixedTeamEdit(ownerDevice(), id, {
        kind: "remove_player",
        teamId: "m2",
        player: { name: "Dee", index: 1 },
      }),
    ]);

    const db = ownerDevice();
    const stored = await tournamentDocOf(db, id);
    expect(entryOf(stored, "m2").players).toEqual(["Cy"]);
    expect(stored.win2outState?.courts[0].teamIds).toEqual(["m2", "m3"]);
    expect((await matchDocsOf(db, id)).find((m) => m.id === onCourt.id)).toMatchObject({
      status: "completed",
      winnerId: "m2",
    });
  });

  it("a duplicate enters the mixed teams under new ids with their players, names no list, and adds nothing to the roster", async () => {
    const db = ownerDevice();
    const { id } = await liveNight(db);
    await saveMixedTeamEdit(db, id, { kind: "rename", teamId: "m2", name: "Net Ninjas" });
    await applyTournamentCommand(db, id, { type: "withdraw", teamId: "m4" });
    // The source came from an RSVP list. A stored tournament cannot gain one, so it is seeded.
    await env().withSecurityRulesDisabled(async (unrestricted) => {
      await updateDoc(doc(modularFirestore(unrestricted), "tournaments", id), { rsvpListId: "list-1" });
    });
    const source = await tournamentDocOf(db, id);

    const duplicate = await createTournamentFromSetup(db, owner, duplicateInput(source, []), []);

    const stored = await tournamentDocOf(db, duplicate.id);
    expect(stored.status).toBe("draft");
    expect(stored.name).toBe("Friday mix (duplicate)");
    const copied = stored.entries.map(({ name, color, players, withdrawnAt }) => ({
      name,
      color,
      players,
      withdrawnAt,
    }));
    expect(copied).toEqual([
      { name: "Team 1", color: "#ef4444", players: ["Ana", "Ben"] },
      { name: "Net Ninjas", color: "#3b82f6", players: ["Cy", "Dee"] },
      { name: "Team 3", color: "#22c55e", players: ["Eli", "Fay"] },
      { name: "Team 4", color: "#f59e0b", players: ["Gus", "Hal"] },
    ]);
    const ids = stored.entries.map((entry) => entry.teamId);
    expect(stored.teamIds).toEqual(ids);
    expect(new Set([...ids, ...source.teamIds]).size).toBe(8);
    expect("rsvpListId" in stored).toBe(false);
    expect((await getDocs(collection(db, "users", owner, "teams"))).size).toBe(0);
  });

  describe("an edit whose base the tournament has moved past", () => {
    const OFFLINE_TIMEOUT = 20_000;

    /**
     * The owner edits on a phone with no signal, so the edit is built on
     * the phone's copy and waits. `meanwhile` then changes the tournament
     * from another device, and the phone reconnects. The rules refuse the
     * waiting write, since its base is no longer the stored revision, and
     * the edit has to be built again.
     */
    const editWithNoSignal = async (
      id: string,
      edit: Parameters<typeof saveMixedTeamEdit>[2],
      showsEdit: (tournament: Tournament) => boolean,
      meanwhile: (otherDevice: Firestore) => Promise<unknown>,
    ) => {
      const phone = ownerDevice();
      const stop = subscribeToTournament(phone, id, () => {});
      await shown(phone, id, () => true);
      let saved: Promise<void>;
      try {
        await disableNetwork(phone);
        saved = saveMixedTeamEdit(phone, id, edit);
        // The phone shows its own edit before the server has heard of it.
        await shown(phone, id, showsEdit);
        await meanwhile(ownerDevice());
      } finally {
        await enableNetwork(phone);
      }
      await saved;
      stop();
    };

    it(
      "keeps a result that landed first, and lands the edit on top of it",
      async () => {
        const { id, onCourt } = await liveNight(ownerDevice());

        await editWithNoSignal(
          id,
          { kind: "add_player", teamId: "m3", name: "Late Lou" },
          (tournament) => entryOf(tournament, "m3").players?.length === 3,
          (courtside) =>
            applyTournamentCommand(courtside, id, {
              type: "instant_win",
              matchId: onCourt.id,
              winnerId: "m1",
            }),
        );

        const db = ownerDevice();
        const stored = await tournamentDocOf(db, id);
        expect(entryOf(stored, "m3").players).toEqual(["Eli", "Fay", "Late Lou"]);
        expect(stored.win2outState?.courts[0].teamIds).toEqual(["m1", "m3"]);
        expect(stored.win2outState?.queue).toEqual(["m4", "m2"]);
        const matches = await matchDocsOf(db, id);
        expect(matches).toHaveLength(2);
        expect(matches.find((m) => m.id === onCourt.id)).toMatchObject({
          status: "completed",
          winnerId: "m1",
        });
      },
      OFFLINE_TIMEOUT,
    );

    it(
      "keeps a withdrawal that landed first, which changed the same entries",
      async () => {
        const { id } = await liveNight(ownerDevice());

        await editWithNoSignal(
          id,
          { kind: "rename", teamId: "m1", name: "Net Ninjas" },
          (tournament) => entryOf(tournament, "m1").name === "Net Ninjas",
          (courtside) => applyTournamentCommand(courtside, id, { type: "withdraw", teamId: "m4" }),
        );

        const stored = await tournamentDocOf(ownerDevice(), id);
        expect(entryOf(stored, "m1").name).toBe("Net Ninjas");
        expect(entryOf(stored, "m4").withdrawnAt).toEqual(expect.any(Number));
        expect(entryOf(stored, "m4").players).toEqual(["Gus", "Hal"]);
        expect(stored.win2outState?.queue).toEqual(["m3"]);
      },
      OFFLINE_TIMEOUT,
    );

    it(
      "is not undone by a result built on the copy from before it",
      async () => {
        const { id, onCourt } = await liveNight(ownerDevice());
        // A phone at the court records a win with no signal, on the copy
        // it holds. The command writes the whole tournament, old names and all.
        const courtside = ownerDevice();
        const held = {
          tournament: await tournamentDocOf(courtside, id),
          matches: await matchDocsOf(courtside, id),
        };
        let recorded: Promise<unknown>;
        try {
          await disableNetwork(courtside);
          recorded = applyTournamentCommand(
            courtside,
            id,
            { type: "instant_win", matchId: onCourt.id, winnerId: "m1" },
            { basis: held },
          );
          await saveMixedTeamEdit(ownerDevice(), id, {
            kind: "rename",
            teamId: "m1",
            name: "Net Ninjas",
          });
        } finally {
          await enableNetwork(courtside);
        }
        await recorded;

        const stored = await tournamentDocOf(ownerDevice(), id);
        expect(entryOf(stored, "m1").name).toBe("Net Ninjas");
        expect(stored.win2outState?.courts[0].teamIds).toEqual(["m1", "m3"]);
      },
      OFFLINE_TIMEOUT,
    );
  });
});
