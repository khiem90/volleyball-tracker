// @vitest-environment node
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from "firebase/firestore";
import { describe, it } from "vitest";
import { describeFirestoreRules, modularFirestore } from "./emulator";

const owner = "owner-uid";
const otherAccount = "other-account-uid";

const teamDoc = { name: "Spikers", color: "#ef4444", createdAt: 1_700_000_000_000 };

// The paths are spelled out here rather than imported from the data modules,
// so a wrong path in a module cannot make the rules look right.
const rosterOf = (db: Firestore, uid: string) => collection(db, "users", uid, "teams");
const teamIn = (db: Firestore, uid: string, teamId: string) =>
  doc(db, "users", uid, "teams", teamId);
const tournamentAt = (db: Firestore, id: string) => doc(db, "tournaments", id);
const matchAt = (db: Firestore, tournamentId: string, matchId: string) =>
  doc(db, "tournaments", tournamentId, "matches", matchId);
const matchesOf = (db: Firestore, tournamentId: string) =>
  collection(db, "tournaments", tournamentId, "matches");
const quickMatchAt = (db: Firestore, uid: string, id: string) =>
  doc(db, "users", uid, "matches", id);

const tournamentDoc = (spectatorEnabled: boolean) => ({
  ownerId: owner,
  name: "Tuesday night",
  format: "round_robin",
  status: "draft",
  entries: [],
  teamIds: [],
  settings: { courts: 1, seriesLength: 1, instantWin: false, pointsForWin: 3, pointsForLoss: 0 },
  spectatorEnabled,
  revision: "r1",
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
});

const matchDoc = (tournamentId: string) => ({
  ownerId: owner,
  tournamentId,
  homeTeamId: "t1",
  awayTeamId: "t2",
  homeScore: 0,
  awayScore: 0,
  status: "pending",
  round: 1,
  position: 1,
  createdAt: 1_700_000_000_000,
});

describeFirestoreRules("Firestore rules", (env) => {
  it("denies a signed-out read of a document no rule matches", async () => {
    const db = env().unauthenticatedContext().firestore();
    await assertFails(db.doc("arbitrary/document").get());
  });

  describe("roster", () => {
    it("lets the owner add a team to their own roster", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      await assertSucceeds(setDoc(teamIn(db, owner, "team-1"), teamDoc));
    });

    it("lets the owner read their own roster", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      await assertSucceeds(getDocs(rosterOf(db, owner)));
    });

    describe.each([
      ["a different account", () => env().authenticatedContext(otherAccount)],
      ["a signed-out request", () => env().unauthenticatedContext()],
    ])("%s", (_label, context) => {
      const seedOwnerTeam = () =>
        env().withSecurityRulesDisabled((unrestricted) =>
          setDoc(teamIn(modularFirestore(unrestricted), owner, "team-1"), teamDoc),
        );

      it("cannot list the roster", async () => {
        await seedOwnerTeam();
        await assertFails(getDocs(rosterOf(modularFirestore(context()), owner)));
      });

      it("cannot read one of its teams", async () => {
        await seedOwnerTeam();
        await assertFails(getDoc(teamIn(modularFirestore(context()), owner, "team-1")));
      });

      it("cannot add a team to it", async () => {
        await assertFails(
          setDoc(teamIn(modularFirestore(context()), owner, "team-2"), teamDoc),
        );
      });

      it("cannot rename one of its teams", async () => {
        await seedOwnerTeam();
        await assertFails(
          updateDoc(teamIn(modularFirestore(context()), owner, "team-1"), { name: "Hacked" }),
        );
      });

      it("cannot delete one of its teams", async () => {
        await seedOwnerTeam();
        await assertFails(deleteDoc(teamIn(modularFirestore(context()), owner, "team-1")));
      });
    });
  });

  describe("tournaments", () => {
    const seedTournament = (id: string, spectatorEnabled = false) =>
      env().withSecurityRulesDisabled(async (unrestricted) => {
        const db = modularFirestore(unrestricted);
        await setDoc(tournamentAt(db, id), tournamentDoc(spectatorEnabled));
        await setDoc(matchAt(db, id, "m1"), matchDoc(id));
      });

    describe("as the owner", () => {
      it("can create a tournament it owns", async () => {
        const db = modularFirestore(env().authenticatedContext(owner));
        await assertSucceeds(setDoc(tournamentAt(db, "tourn-1"), tournamentDoc(false)));
      });

      it("cannot create a tournament owned by someone else", async () => {
        const db = modularFirestore(env().authenticatedContext(owner));
        await assertFails(
          setDoc(tournamentAt(db, "tourn-1"), { ...tournamentDoc(false), ownerId: otherAccount }),
        );
      });

      it("can read, update, and delete its tournament", async () => {
        await seedTournament("tourn-1");
        const db = modularFirestore(env().authenticatedContext(owner));
        await assertSucceeds(getDoc(tournamentAt(db, "tourn-1")));
        await assertSucceeds(updateDoc(tournamentAt(db, "tourn-1"), { name: "Renamed" }));
        await assertSucceeds(deleteDoc(tournamentAt(db, "tourn-1")));
      });

      it("cannot hand its tournament to another account", async () => {
        await seedTournament("tourn-1");
        const db = modularFirestore(env().authenticatedContext(owner));
        await assertFails(updateDoc(tournamentAt(db, "tourn-1"), { ownerId: otherAccount }));
      });

      it("can list its own tournaments", async () => {
        await seedTournament("tourn-1");
        const db = modularFirestore(env().authenticatedContext(owner));
        await assertSucceeds(
          getDocs(query(collection(db, "tournaments"), where("ownerId", "==", owner))),
        );
      });

      it("can write a match under its tournament", async () => {
        await seedTournament("tourn-1");
        const db = modularFirestore(env().authenticatedContext(owner));
        await assertSucceeds(setDoc(matchAt(db, "tourn-1", "m2"), matchDoc("tourn-1")));
        await assertSucceeds(updateDoc(matchAt(db, "tourn-1", "m1"), { homeScore: 5 }));
        await assertSucceeds(deleteDoc(matchAt(db, "tourn-1", "m1")));
      });

      it("cannot write a match that claims another owner or tournament", async () => {
        await seedTournament("tourn-1");
        const db = modularFirestore(env().authenticatedContext(owner));
        await assertFails(
          setDoc(matchAt(db, "tourn-1", "m2"), { ...matchDoc("tourn-1"), ownerId: otherAccount }),
        );
        await assertFails(
          setDoc(matchAt(db, "tourn-1", "m2"), { ...matchDoc("tourn-1"), tournamentId: "elsewhere" }),
        );
      });

      it("can read all of its matches across tournaments in one query", async () => {
        await seedTournament("tourn-1");
        await seedTournament("tourn-2");
        const db = modularFirestore(env().authenticatedContext(owner));
        await assertSucceeds(
          getDocs(query(collectionGroup(db, "matches"), where("ownerId", "==", owner))),
        );
      });

      it("can list the matches of one tournament", async () => {
        await seedTournament("tourn-1");
        const db = modularFirestore(env().authenticatedContext(owner));
        await assertSucceeds(getDocs(matchesOf(db, "tourn-1")));
      });
    });

    describe.each([
      ["a different account", () => env().authenticatedContext(otherAccount)],
      ["a signed-out request", () => env().unauthenticatedContext()],
    ])("%s", (_label, context) => {
      it("cannot create a tournament in the owner's name", async () => {
        await assertFails(
          setDoc(tournamentAt(modularFirestore(context()), "tourn-1"), tournamentDoc(false)),
        );
      });

      it("cannot update or delete the owner's tournament", async () => {
        await seedTournament("tourn-1", true);
        const db = modularFirestore(context());
        await assertFails(updateDoc(tournamentAt(db, "tourn-1"), { name: "Hacked" }));
        await assertFails(deleteDoc(tournamentAt(db, "tourn-1")));
      });

      it("cannot write the owner's matches, even with spectator access on", async () => {
        await seedTournament("tourn-1", true);
        const db = modularFirestore(context());
        await assertFails(setDoc(matchAt(db, "tourn-1", "m2"), matchDoc("tourn-1")));
        await assertFails(updateDoc(matchAt(db, "tourn-1", "m1"), { homeScore: 99 }));
        await assertFails(deleteDoc(matchAt(db, "tourn-1", "m1")));
      });

      it("cannot read a tournament or its matches while spectator access is off", async () => {
        await seedTournament("tourn-1", false);
        const db = modularFirestore(context());
        await assertFails(getDoc(tournamentAt(db, "tourn-1")));
        await assertFails(getDoc(matchAt(db, "tourn-1", "m1")));
        await assertFails(getDocs(matchesOf(db, "tourn-1")));
      });

      it("can read a tournament and its matches while spectator access is on", async () => {
        await seedTournament("tourn-1", true);
        const db = modularFirestore(context());
        await assertSucceeds(getDoc(tournamentAt(db, "tourn-1")));
        await assertSucceeds(getDoc(matchAt(db, "tourn-1", "m1")));
        await assertSucceeds(getDocs(matchesOf(db, "tourn-1")));
      });

      it("cannot query the owner's matches across tournaments", async () => {
        await seedTournament("tourn-1", true);
        await assertFails(
          getDocs(
            query(collectionGroup(modularFirestore(context()), "matches"), where("ownerId", "==", owner)),
          ),
        );
      });
    });
  });

  describe("quick matches", () => {
    const quickMatch = { ...matchDoc("ignored"), tournamentId: null };

    it("lets the owner write and read a quick match", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      await assertSucceeds(setDoc(quickMatchAt(db, owner, "q1"), quickMatch));
      await assertSucceeds(getDoc(quickMatchAt(db, owner, "q1")));
      await assertSucceeds(updateDoc(quickMatchAt(db, owner, "q1"), { homeScore: 3 }));
      await assertSucceeds(deleteDoc(quickMatchAt(db, owner, "q1")));
    });

    it("refuses a quick match that names another owner or a tournament", async () => {
      const db = modularFirestore(env().authenticatedContext(owner));
      await assertFails(setDoc(quickMatchAt(db, owner, "q1"), { ...quickMatch, ownerId: otherAccount }));
      await assertFails(setDoc(quickMatchAt(db, owner, "q1"), { ...quickMatch, tournamentId: "tourn-1" }));
    });

    it("returns quick matches in the owner's account-wide match query", async () => {
      await env().withSecurityRulesDisabled((unrestricted) =>
        setDoc(quickMatchAt(modularFirestore(unrestricted), owner, "q1"), quickMatch),
      );
      const db = modularFirestore(env().authenticatedContext(owner));
      await assertSucceeds(
        getDocs(query(collectionGroup(db, "matches"), where("ownerId", "==", owner))),
      );
    });

    it.each([
      ["a different account", () => env().authenticatedContext(otherAccount)],
      ["a signed-out request", () => env().unauthenticatedContext()],
    ])("%s cannot read or write the owner's quick matches", async (_label, context) => {
      await env().withSecurityRulesDisabled((unrestricted) =>
        setDoc(quickMatchAt(modularFirestore(unrestricted), owner, "q1"), quickMatch),
      );
      const db = modularFirestore(context());
      await assertFails(getDoc(quickMatchAt(db, owner, "q1")));
      await assertFails(setDoc(quickMatchAt(db, owner, "q2"), quickMatch));
    });
  });
});
