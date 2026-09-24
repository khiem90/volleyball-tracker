// @vitest-environment node
import type { Firestore, Unsubscribe } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import {
  addRosterTeam,
  buildRosterTeam,
  saveRosterTeams,
  deleteRosterTeam,
  subscribeToRoster,
  updateRosterTeam,
} from "@/lib/roster";
import type { PersistentTeam } from "@/types/game";
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

      await updateRosterTeam(db, owner, team.id, { name: "Diggers", color: "#3b82f6" });

      const roster = await rosterWhen(db, owner, (teams) => teams[0]?.name === "Diggers");
      expect(roster[0]).toMatchObject({ id: team.id, name: "Diggers", color: "#3b82f6" });
    });

    it("no longer shows a team after it is deleted", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      const keep = await addRosterTeam(db, owner, { name: "Spikers" });
      const gone = await addRosterTeam(db, owner, { name: "Diggers" });

      await deleteRosterTeam(db, owner, gone.id);

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
});
