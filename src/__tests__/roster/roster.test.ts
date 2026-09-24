// @vitest-environment node
import { doc, getDoc, type Firestore, type Unsubscribe } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import {
  addRosterTeam,
  buildRosterTeam,
  saveRosterTeams,
  deleteRosterTeams,
  subscribeToRoster,
  updateRosterTeam,
} from "@/lib/roster";
import { applyTournamentCommand, createTournament } from "@/lib/tournaments";
import {
  DEFAULT_POINTS_FOR_LOSS,
  DEFAULT_POINTS_FOR_WIN,
  DEFAULT_TERMINOLOGY,
} from "@/types/competition-config";
import type { PersistentTeam, Tournament, TournamentStatus } from "@/types/game";
import { describeFirestoreRules, modularFirestore } from "../rules/emulator";

const owner = "owner-uid";

/** Resolves with the first roster snapshot that satisfies `ready`. */
const rosterWhen = (
  db: Firestore,
  uid: string,
  ready: (teams: PersistentTeam[]) => boolean,
): Promise<PersistentTeam[]> =>
  new Promise((resolve, reject) => {
    let unsubscribe: Unsubscribe = () => {};
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error("roster never reached the expected state"));
    }, 5000);
    unsubscribe = subscribeToRoster(
      db,
      uid,
      (teams) => {
        if (!ready(teams)) return;
        clearTimeout(timer);
        unsubscribe();
        resolve(teams);
      },
      (error) => {
        clearTimeout(timer);
        unsubscribe();
        reject(error);
      },
    );
  });

const tournamentDocOf = async (db: Firestore, id: string): Promise<Tournament> => {
  const snapshot = await getDoc(doc(db, "tournaments", id));
  return { ...(snapshot.data() as Tournament), id: snapshot.id };
};

/** A round robin of these teams, taken to the given status. */
const tournamentOf = async (
  db: Firestore,
  name: string,
  teams: PersistentTeam[],
  status: TournamentStatus,
): Promise<Tournament> => {
  const created = await createTournament(db, owner, {
    name,
    format: "round_robin",
    teams,
    settings: {
      courts: 1,
      seriesLength: 1,
      instantWin: false,
      pointsForWin: DEFAULT_POINTS_FOR_WIN,
      pointsForLoss: DEFAULT_POINTS_FOR_LOSS,
      terminology: DEFAULT_TERMINOLOGY,
    },
  });
  if (status !== "draft") await applyTournamentCommand(db, created.id, { type: "start" });
  if (status === "completed") await applyTournamentCommand(db, created.id, { type: "end" });
  return tournamentDocOf(db, created.id);
};

describeFirestoreRules("Roster", (env) => {
  describe("as the owner", () => {
    it("shows a team that was added, with its name and color", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));

      await addRosterTeam(db, owner, { name: "Spikers", color: "#ef4444" });

      const roster = await rosterWhen(db, owner, (teams) => teams.length === 1);
      expect(roster[0]).toMatchObject({ name: "Spikers", color: "#ef4444" });
    });

    it("shows a team's new name and color after it is renamed and recolored", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const team = await addRosterTeam(db, owner, { name: "Spikers", color: "#ef4444" });

      await updateRosterTeam(db, owner, team.id, { name: "Diggers", color: "#3b82f6" }, []);

      const roster = await rosterWhen(db, owner, (teams) => teams[0]?.name === "Diggers");
      expect(roster[0]).toMatchObject({ id: team.id, name: "Diggers", color: "#3b82f6" });
    });

    it("no longer shows a team after it is deleted", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const keep = await addRosterTeam(db, owner, { name: "Spikers" });
      const gone = await addRosterTeam(db, owner, { name: "Diggers" });

      const outcome = await deleteRosterTeams(db, owner, [gone.id], []);

      expect(outcome).toEqual({ deleted: [gone.id], kept: [] });
      const roster = await rosterWhen(db, owner, (teams) => teams.length === 1);
      expect(roster.map((team) => team.id)).toEqual([keep.id]);
    });

    it("lists teams in the order they were added", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const first = await addRosterTeam(db, owner, { name: "Aces" });
      const second = await addRosterTeam(db, owner, { name: "Blockers" });
      const third = await addRosterTeam(db, owner, { name: "Chasers" });

      const roster = await rosterWhen(db, owner, (teams) => teams.length === 3);
      expect(roster.map((team) => team.id)).toEqual([first.id, second.id, third.id]);
    });

    it("keeps the order of teams added in the same instant", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const names = ["Aces", "Blockers", "Chasers", "Diggers", "Eagles"];

      await Promise.all(names.map((name) => addRosterTeam(db, owner, { name })));

      const roster = await rosterWhen(db, owner, (teams) => teams.length === names.length);
      expect(roster.map((team) => team.name)).toEqual(names);
    });

    it("shows every team of a pasted list, in the pasted order, with its color", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const names = ["Aces", "Blockers", "Chasers", "Diggers", "Eagles"];
      const pasted = names.map((name) => buildRosterTeam(db, owner, { name, color: "#22c55e" }));

      await saveRosterTeams(db, owner, pasted);

      const roster = await rosterWhen(db, owner, (teams) => teams.length === names.length);
      expect(roster.map((team) => team.name)).toEqual(names);
      expect(roster.map((team) => team.id)).toEqual(pasted.map((team) => team.id));
      expect(roster.every((team) => team.color === "#22c55e")).toBe(true);
    });
  });

  describe("a roster change and the tournaments it reaches", () => {
    const threeTeams = async (db: Firestore) => [
      await addRosterTeam(db, owner, { name: "Aces", color: "#ef4444" }),
      await addRosterTeam(db, owner, { name: "Blockers", color: "#3b82f6" }),
      await addRosterTeam(db, owner, { name: "Chasers", color: "#22c55e" }),
    ];

    it("a rename reaches the team's entry in a draft and a live tournament and leaves a completed one alone", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const [aces, blockers, chasers] = await threeTeams(db);
      const draft = await tournamentOf(db, "Draft night", [aces, blockers, chasers], "draft");
      const live = await tournamentOf(db, "Live night", [aces, blockers, chasers], "live");
      const completed = await tournamentOf(db, "Last week", [aces, blockers, chasers], "completed");

      await updateRosterTeam(db, owner, aces.id, { name: "Ace Hitters", color: "#eab308" }, [
        draft,
        live,
        completed,
      ]);

      const entryIn = async (tournament: Tournament) =>
        (await tournamentDocOf(db, tournament.id)).entries.find((e) => e.teamId === aces.id);
      expect(await entryIn(draft)).toEqual({ teamId: aces.id, name: "Ace Hitters", color: "#eab308" });
      expect(await entryIn(live)).toEqual({ teamId: aces.id, name: "Ace Hitters", color: "#eab308" });
      expect(await entryIn(completed)).toEqual({ teamId: aces.id, name: "Aces", color: "#ef4444" });
      expect((await tournamentDocOf(db, live.id)).revision).not.toBe(live.revision);
      expect((await tournamentDocOf(db, completed.id)).revision).toBe(completed.revision);
      const roster = await rosterWhen(db, owner, (teams) => teams[0]?.name === "Ace Hitters");
      expect(roster[0]).toMatchObject({ id: aces.id, color: "#eab308" });
    });

    it("deleting a team takes its entry out of every draft", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const [aces, blockers, chasers] = await threeTeams(db);
      const draft = await tournamentOf(db, "Draft night", [aces, blockers, chasers], "draft");
      const other = await tournamentOf(db, "Other draft", [blockers, chasers], "draft");

      const outcome = await deleteRosterTeams(db, owner, [aces.id], [draft, other]);

      expect(outcome).toEqual({ deleted: [aces.id], kept: [] });
      const stored = await tournamentDocOf(db, draft.id);
      expect(stored.entries.map((e) => e.teamId)).toEqual([blockers.id, chasers.id]);
      expect(stored.teamIds).toEqual([blockers.id, chasers.id]);
      expect((await tournamentDocOf(db, other.id)).revision).toBe(other.revision);
      const roster = await rosterWhen(db, owner, (teams) => teams.length === 2);
      expect(roster.map((team) => team.id)).toEqual([blockers.id, chasers.id]);
    });

    it("keeps a team that is in a live tournament, names the tournament, and deletes the rest", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const [aces, blockers, chasers] = await threeTeams(db);
      const live = await tournamentOf(db, "Live night", [aces, blockers, chasers], "live");
      const spare = await addRosterTeam(db, owner, { name: "Diggers" });
      const draft = await tournamentOf(db, "Draft night", [aces, spare, chasers], "draft");

      const outcome = await deleteRosterTeams(db, owner, [aces.id, spare.id], [live, draft]);

      expect(outcome.deleted).toEqual([spare.id]);
      expect(outcome.kept).toHaveLength(1);
      expect(outcome.kept[0].teamId).toBe(aces.id);
      expect(outcome.kept[0].tournaments.map((t) => [t.id, t.name])).toEqual([[live.id, "Live night"]]);
      expect((await tournamentDocOf(db, live.id)).entries.map((e) => e.teamId)).toEqual([
        aces.id,
        blockers.id,
        chasers.id,
      ]);
      expect((await tournamentDocOf(db, draft.id)).entries.map((e) => e.teamId)).toEqual([
        aces.id,
        chasers.id,
      ]);
      const roster = await rosterWhen(db, owner, (teams) => teams.length === 3);
      expect(roster.map((team) => team.id)).toEqual([aces.id, blockers.id, chasers.id]);
    });

    it("re-checks against the stored tournament, so a draft that went live meanwhile keeps its team", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const [aces, blockers, chasers] = await threeTeams(db);
      const draft = await tournamentOf(db, "Tonight", [aces, blockers, chasers], "draft");
      // Another device started it after this one loaded its copy.
      await applyTournamentCommand(db, draft.id, { type: "start" });

      const outcome = await deleteRosterTeams(db, owner, [aces.id], [draft]);

      expect(outcome.deleted).toEqual([]);
      expect(outcome.kept.map((k) => k.teamId)).toEqual([aces.id]);
      expect((await tournamentDocOf(db, draft.id)).entries).toHaveLength(3);
      const roster = await rosterWhen(db, owner, (teams) => teams.length === 3);
      expect(roster.map((team) => team.id)).toContain(aces.id);
    });
  });
});
