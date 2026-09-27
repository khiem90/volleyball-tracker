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
const scorerKeyAt = (db: Firestore, tournamentId: string) =>
  doc(db, "tournaments", tournamentId, "private", "scorerKey");
const proofAt = (db: Firestore, tournamentId: string, uid: string) =>
  doc(db, "tournaments", tournamentId, "scorers", uid);
const proofsOf = (db: Firestore, tournamentId: string) =>
  collection(db, "tournaments", tournamentId, "scorers");

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

  describe("share links", () => {
    const phoneA = "phone-a-uid";
    const phoneB = "phone-b-uid";
    const currentKey = "key-one";
    const oldKey = "key-zero";

    const liveTournamentDoc = (spectatorEnabled: boolean) => ({
      ...tournamentDoc(spectatorEnabled),
      status: "live",
      teamIds: ["t1", "t2"],
      entries: [
        { teamId: "t1", name: "Aces" },
        { teamId: "t2", name: "Blockers" },
      ],
      win2outState: { queue: [], courts: [], teamStatuses: [], numberOfCourts: 1, isComplete: false },
    });

    /** A live tournament with its scorer key, one match, and a proof per phone given. */
    const seedShared = (
      id: string,
      options: {
        status?: "draft" | "live" | "completed";
        format?: string;
        spectatorEnabled?: boolean;
        proofs?: Record<string, string>;
      } = {},
    ) =>
      env().withSecurityRulesDisabled(async (unrestricted) => {
        const db = modularFirestore(unrestricted);
        await setDoc(tournamentAt(db, id), {
          ...liveTournamentDoc(options.spectatorEnabled ?? false),
          status: options.status ?? "live",
          format: options.format ?? "round_robin",
        });
        await setDoc(scorerKeyAt(db, id), { key: currentKey, updatedAt: 1_700_000_000_000 });
        await setDoc(matchAt(db, id, "m1"), matchDoc(id));
        for (const [uid, key] of Object.entries(options.proofs ?? {})) {
          await setDoc(proofAt(db, id, uid), { key, updatedAt: 1_700_000_000_000 });
        }
      });

    const asScorer = () => modularFirestore(env().authenticatedContext(phoneA));

    describe("the scorer key", () => {
      it("is written and read by the owner", async () => {
        await seedShared("tourn-1");
        const db = modularFirestore(env().authenticatedContext(owner));
        await assertSucceeds(getDoc(scorerKeyAt(db, "tourn-1")));
        await assertSucceeds(
          setDoc(scorerKeyAt(db, "tourn-1"), { key: "key-two", updatedAt: 1_700_000_000_001 }),
        );
      });

      it.each([
        ["a scorer holding a valid proof", () => env().authenticatedContext(phoneA)],
        ["a different account", () => env().authenticatedContext(otherAccount)],
        ["a signed-out request", () => env().unauthenticatedContext()],
      ])("cannot be read or written by %s", async (_label, context) => {
        await seedShared("tourn-1", { spectatorEnabled: true, proofs: { [phoneA]: currentKey } });
        const db = modularFirestore(context());
        await assertFails(getDoc(scorerKeyAt(db, "tourn-1")));
        await assertFails(
          setDoc(scorerKeyAt(db, "tourn-1"), { key: "stolen", updatedAt: 1_700_000_000_001 }),
        );
      });
    });

    describe("proofs", () => {
      it("a signed-in phone writes its own proof with the current key", async () => {
        await seedShared("tourn-1");
        await assertSucceeds(
          setDoc(proofAt(asScorer(), "tourn-1", phoneA), { key: currentKey, updatedAt: 1 }),
        );
      });

      it("a proof with any other key is refused, so a phone learns at once that its link is stale", async () => {
        await seedShared("tourn-1");
        await assertFails(
          setDoc(proofAt(asScorer(), "tourn-1", phoneA), { key: oldKey, updatedAt: 1 }),
        );
      });

      it("a phone cannot write a proof under another uid or without signing in", async () => {
        await seedShared("tourn-1");
        await assertFails(
          setDoc(proofAt(asScorer(), "tourn-1", phoneB), { key: currentKey, updatedAt: 1 }),
        );
        await assertFails(
          setDoc(proofAt(modularFirestore(env().unauthenticatedContext()), "tourn-1", phoneA), {
            key: currentKey,
            updatedAt: 1,
          }),
        );
      });

      it("the owner can list and delete proofs, and a phone can read only its own", async () => {
        await seedShared("tourn-1", { proofs: { [phoneA]: currentKey, [phoneB]: currentKey } });
        const ownerDb = modularFirestore(env().authenticatedContext(owner));
        await assertSucceeds(getDocs(proofsOf(ownerDb, "tourn-1")));
        await assertSucceeds(deleteDoc(proofAt(ownerDb, "tourn-1", phoneB)));
        const scorerDb = asScorer();
        await assertSucceeds(getDoc(proofAt(scorerDb, "tourn-1", phoneA)));
        await assertFails(getDoc(proofAt(scorerDb, "tourn-1", phoneB)));
        await assertFails(getDocs(proofsOf(scorerDb, "tourn-1")));
      });
    });

    describe("a scorer holding a valid proof", () => {
      const seedWithProof = (options: Parameters<typeof seedShared>[1] = {}) =>
        seedShared("tourn-1", { ...options, proofs: { [phoneA]: currentKey } });
      const played = { win2outState: { queue: ["t2"], courts: [], teamStatuses: [], numberOfCourts: 1, isComplete: false } };
      const moved = { revision: "r2", updatedAt: 1_700_000_000_001 };

      it("can read the tournament and its matches while the spectator link is off", async () => {
        await seedWithProof();
        const db = asScorer();
        await assertSucceeds(getDoc(tournamentAt(db, "tourn-1")));
        await assertSucceeds(getDoc(matchAt(db, "tourn-1", "m1")));
        await assertSucceeds(getDocs(matchesOf(db, "tourn-1")));
      });

      it("can score a match, place the court's next match in the owner's name, and take one back", async () => {
        await seedWithProof();
        const db = asScorer();
        await assertSucceeds(updateDoc(matchAt(db, "tourn-1", "m1"), { homeScore: 5, status: "in_progress" }));
        await assertSucceeds(setDoc(matchAt(db, "tourn-1", "m2"), matchDoc("tourn-1")));
        await assertSucceeds(deleteDoc(matchAt(db, "tourn-1", "m2")));
      });

      it("cannot write a match that claims another owner or tournament", async () => {
        await seedWithProof();
        const db = asScorer();
        await assertFails(setDoc(matchAt(db, "tourn-1", "m2"), { ...matchDoc("tourn-1"), ownerId: phoneA }));
        await assertFails(setDoc(matchAt(db, "tourn-1", "m2"), { ...matchDoc("tourn-1"), tournamentId: "elsewhere" }));
        await assertFails(updateDoc(matchAt(db, "tourn-1", "m1"), { ownerId: phoneA }));
      });

      it("can move the rotation state and the revision of a live tournament", async () => {
        await seedWithProof();
        await assertSucceeds(updateDoc(tournamentAt(asScorer(), "tourn-1"), { ...played, ...moved }));
      });

      it("can complete the tournament with a winner from its teams, as the last result does", async () => {
        await seedWithProof();
        await assertSucceeds(
          updateDoc(tournamentAt(asScorer(), "tourn-1"), {
            ...moved,
            status: "completed",
            completedAt: 1_700_000_000_001,
            winnerId: "t1",
          }),
        );
      });

      it("cannot end the tournament, rename it, change its teams, settings, or spectator link, or hand it over", async () => {
        await seedWithProof();
        const db = asScorer();
        const ref = tournamentAt(db, "tourn-1");
        await assertFails(updateDoc(ref, { ...moved, status: "completed", completedAt: 1_700_000_000_001 }));
        await assertFails(updateDoc(ref, { ...moved, status: "completed", completedAt: 1, winnerId: "not-a-team" }));
        await assertFails(updateDoc(ref, { ...moved, name: "Hacked" }));
        await assertFails(updateDoc(ref, { ...moved, entries: [], teamIds: [] }));
        await assertFails(updateDoc(ref, { ...moved, settings: { ...tournamentDoc(false).settings, courts: 3 } }));
        await assertFails(updateDoc(ref, { ...moved, spectatorEnabled: true }));
        await assertFails(updateDoc(ref, { ...moved, ownerId: phoneA }));
        await assertFails(deleteDoc(ref));
      });

      it.each(["win2out", "two_match_rotation"])(
        "cannot complete a %s tournament, which only finishes through End",
        async (format) => {
          await seedWithProof({ format });
          await assertFails(
            updateDoc(tournamentAt(asScorer(), "tourn-1"), {
              ...moved,
              status: "completed",
              completedAt: 1_700_000_000_001,
              winnerId: "t1",
            }),
          );
        },
      );

      it.each(["draft", "completed"] as const)("is refused on a %s tournament", async (status) => {
        await seedWithProof({ status });
        const db = asScorer();
        await assertFails(updateDoc(matchAt(db, "tourn-1", "m1"), { homeScore: 5 }));
        await assertFails(setDoc(matchAt(db, "tourn-1", "m2"), matchDoc("tourn-1")));
        await assertFails(updateDoc(tournamentAt(db, "tourn-1"), { ...played, ...moved }));
      });
    });

    describe("a scorer whose link was regenerated", () => {
      it("is refused on its next write to a match or the tournament", async () => {
        await seedShared("tourn-1", { spectatorEnabled: true, proofs: { [phoneA]: oldKey } });
        const db = asScorer();
        await assertFails(updateDoc(matchAt(db, "tourn-1", "m1"), { homeScore: 5 }));
        await assertFails(setDoc(matchAt(db, "tourn-1", "m2"), matchDoc("tourn-1")));
        await assertFails(updateDoc(tournamentAt(db, "tourn-1"), { revision: "r2", updatedAt: 2 }));
      });

      it("can no longer read the tournament once the spectator link is off", async () => {
        await seedShared("tourn-1", { spectatorEnabled: false, proofs: { [phoneA]: oldKey } });
        const db = asScorer();
        await assertFails(getDoc(tournamentAt(db, "tourn-1")));
        await assertFails(getDocs(matchesOf(db, "tourn-1")));
      });
    });

    describe("the spectator link", () => {
      it("shows the tournament and its matches while on and refuses them once the owner turns it off", async () => {
        await seedShared("tourn-1", { spectatorEnabled: true });
        const db = modularFirestore(env().unauthenticatedContext());
        await assertSucceeds(getDoc(tournamentAt(db, "tourn-1")));
        await assertSucceeds(getDocs(matchesOf(db, "tourn-1")));

        const ownerDb = modularFirestore(env().authenticatedContext(owner));
        await assertSucceeds(updateDoc(tournamentAt(ownerDb, "tourn-1"), { spectatorEnabled: false }));

        await assertFails(getDoc(tournamentAt(db, "tourn-1")));
        await assertFails(getDocs(matchesOf(db, "tourn-1")));
      });
    });
  });
});
