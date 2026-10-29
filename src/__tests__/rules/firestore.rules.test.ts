// @vitest-environment node
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import {
  collection,
  collectionGroup,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { describe, expect, it } from "vitest";
import {
  anonymousContext,
  describeFirestoreRules,
  minutesFromNow,
  modularFirestore,
} from "./emulator";

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
const rsvpAt = (db: Firestore, tournamentId: string, rsvpId: string) =>
  doc(db, "tournaments", tournamentId, "rsvps", rsvpId);
const rsvpsOf = (db: Firestore, tournamentId: string) =>
  collection(db, "tournaments", tournamentId, "rsvps");
const userDocAt = (db: Firestore, uid: string) => doc(db, "users", uid);
const noticeAt = (db: Firestore, tournamentId: string, noticeId: string) =>
  doc(db, "tournaments", tournamentId, "notices", noticeId);
const noticesOf = (db: Firestore, tournamentId: string) =>
  collection(db, "tournaments", tournamentId, "notices");

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

      describe("moving the revision", () => {
        const moved = { revision: "r2", updatedAt: 1_700_000_000_001 };

        it("is refused when basedOn is not the stored revision", async () => {
          await seedTournament("tourn-1");
          const db = modularFirestore(env().authenticatedContext(owner));
          await assertFails(updateDoc(tournamentAt(db, "tourn-1"), { ...moved, basedOn: "r0" }));
        });

        it("is refused when basedOn is missing", async () => {
          await seedTournament("tourn-1");
          const db = modularFirestore(env().authenticatedContext(owner));
          await assertFails(updateDoc(tournamentAt(db, "tourn-1"), moved));
        });

        it("is accepted when basedOn is the stored revision, and the stored revision moves on with it", async () => {
          await seedTournament("tourn-1");
          const db = modularFirestore(env().authenticatedContext(owner));
          await assertSucceeds(updateDoc(tournamentAt(db, "tourn-1"), { ...moved, basedOn: "r1" }));
          await assertFails(updateDoc(tournamentAt(db, "tourn-1"), { revision: "r3", basedOn: "r1" }));
          await assertSucceeds(updateDoc(tournamentAt(db, "tourn-1"), { revision: "r3", basedOn: "r2" }));
        });

        it("is accepted for a rename built on the stored revision", async () => {
          await seedTournament("tourn-1");
          const db = modularFirestore(env().authenticatedContext(owner));
          await assertSucceeds(
            updateDoc(tournamentAt(db, "tourn-1"), { name: "Renamed", ...moved, basedOn: "r1" }),
          );
        });

        it("is not asked of an update that leaves the revision alone", async () => {
          await seedTournament("tourn-1");
          const db = modularFirestore(env().authenticatedContext(owner));
          await assertSucceeds(updateDoc(tournamentAt(db, "tourn-1"), { name: "Renamed" }));
          await assertSucceeds(updateDoc(tournamentAt(db, "tourn-1"), { name: "Again", basedOn: "r0" }));
        });
      });

      describe("RSVP settings", () => {
        const friday7pm = 1_800_000_000_000;
        const thursday6pm = friday7pm - 25 * 3_600_000;
        const rsvpOn = { enabled: true, capacity: 12, opensAt: thursday6pm, closed: false };
        const moved = { revision: "r2", basedOn: "r1", updatedAt: 1_700_000_000_001 };

        it("can create a tournament with its scheduled time and the RSVP link on", async () => {
          const db = modularFirestore(env().authenticatedContext(owner));
          await assertSucceeds(
            setDoc(tournamentAt(db, "tourn-1"), {
              ...tournamentDoc(false),
              scheduledAt: friday7pm,
              scheduledZone: "America/New_York",
              rsvp: rsvpOn,
            }),
          );
        });

        it("can create one with the RSVP link off and no times", async () => {
          const db = modularFirestore(env().authenticatedContext(owner));
          await assertSucceeds(
            setDoc(tournamentAt(db, "tourn-1"), {
              ...tournamentDoc(false),
              rsvp: { enabled: false, capacity: 12, closed: false },
            }),
          );
        });

        it("cannot create one with the RSVP link on and either time missing", async () => {
          const db = modularFirestore(env().authenticatedContext(owner));
          await assertFails(
            setDoc(tournamentAt(db, "tourn-1"), { ...tournamentDoc(false), rsvp: rsvpOn }),
          );
          await assertFails(
            setDoc(tournamentAt(db, "tourn-2"), {
              ...tournamentDoc(false),
              scheduledAt: friday7pm,
              rsvp: { enabled: true, capacity: 12, closed: false },
            }),
          );
        });

        it("can set the times and turn the link on with a write built on the stored revision, as a rename is", async () => {
          await seedTournament("tourn-1");
          const db = modularFirestore(env().authenticatedContext(owner));
          await assertSucceeds(
            updateDoc(tournamentAt(db, "tourn-1"), {
              ...moved,
              scheduledAt: friday7pm,
              scheduledZone: "America/New_York",
              rsvp: rsvpOn,
            }),
          );
        });

        it("cannot turn the link on without both times, or take a time away while it is on", async () => {
          await seedTournament("tourn-1");
          const db = modularFirestore(env().authenticatedContext(owner));
          const ref = tournamentAt(db, "tourn-1");
          await assertFails(updateDoc(ref, { ...moved, rsvp: rsvpOn }));
          await assertFails(
            updateDoc(ref, {
              ...moved,
              scheduledAt: friday7pm,
              rsvp: { enabled: true, capacity: 12, closed: false },
            }),
          );

          await assertSucceeds(
            updateDoc(ref, { ...moved, scheduledAt: friday7pm, rsvp: rsvpOn }),
          );
          await assertFails(
            updateDoc(ref, { revision: "r3", basedOn: "r2", scheduledAt: deleteField() }),
          );
          await assertFails(
            updateDoc(ref, { revision: "r3", basedOn: "r2", "rsvp.opensAt": deleteField() }),
          );
          await assertSucceeds(
            updateDoc(ref, { revision: "r3", basedOn: "r2", "rsvp.enabled": false }),
          );
        });

        it("cannot be set by another account", async () => {
          await seedTournament("tourn-1");
          const db = modularFirestore(env().authenticatedContext(otherAccount));
          await assertFails(
            updateDoc(tournamentAt(db, "tourn-1"), {
              ...moved,
              scheduledAt: friday7pm,
              rsvp: rsvpOn,
            }),
          );
        });
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
      const moved = { revision: "r2", basedOn: "r1", updatedAt: 1_700_000_000_001 };

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

      it("is refused when its result was built on a revision the tournament has moved past", async () => {
        await seedWithProof();
        const ref = tournamentAt(asScorer(), "tourn-1");
        await assertFails(updateDoc(ref, { ...played, ...moved, basedOn: "r0" }));
        await assertFails(updateDoc(ref, { ...played, revision: "r2", updatedAt: 1_700_000_000_001 }));
      });

      it("cannot write a result that leaves the revision where it is", async () => {
        await seedWithProof();
        const ref = tournamentAt(asScorer(), "tourn-1");
        await assertFails(updateDoc(ref, { ...played, updatedAt: 1_700_000_000_001 }));
        await assertFails(updateDoc(ref, { ...played, basedOn: "r1", updatedAt: 1_700_000_000_001 }));
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

      it("cannot set the scheduled time, its zone, or the RSVP settings", async () => {
        await seedWithProof();
        const ref = tournamentAt(asScorer(), "tourn-1");
        await assertFails(updateDoc(ref, { ...moved, scheduledAt: 1_800_000_000_000 }));
        await assertFails(updateDoc(ref, { ...moved, scheduledZone: "America/New_York" }));
        await assertFails(
          updateDoc(ref, {
            ...moved,
            rsvp: { enabled: false, capacity: 12, closed: false },
          }),
        );
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

  describe("RSVPs", () => {
    const friday7pm = 1_800_000_000_000;

    /**
     * A tournament with its RSVP link on and RSVPs opening `opensInMinutes`
     * from the test's own clock, plus any RSVPs given, seeded with the rules
     * off. The open time is computed here, inside the test, so the rules'
     * request time is compared against the same clock.
     */
    const seedNight = (
      id: string,
      options: {
        enabled?: boolean;
        closed?: boolean;
        status?: "draft" | "live" | "completed";
        opensInMinutes?: number;
        rsvps?: Record<string, { name: string; note?: string }>;
      } = {},
    ) =>
      env().withSecurityRulesDisabled(async (unrestricted) => {
        const db = modularFirestore(unrestricted);
        await setDoc(tournamentAt(db, id), {
          ...tournamentDoc(false),
          status: options.status ?? "draft",
          scheduledAt: friday7pm,
          scheduledZone: "America/New_York",
          rsvp: {
            enabled: options.enabled ?? true,
            capacity: 12,
            opensAt: minutesFromNow(options.opensInMinutes ?? -1),
            closed: options.closed ?? false,
          },
        });
        await setDoc(matchAt(db, id, "m1"), matchDoc(id));
        for (const [uid, rsvp] of Object.entries(options.rsvps ?? {})) {
          await setDoc(rsvpAt(db, id, uid), { uid, createdAt: serverTimestamp(), ...rsvp });
        }
      });

    const accountDb = (uid = otherAccount) => modularFirestore(env().authenticatedContext(uid));
    const anonymousDb = (uid = "scorer-phone-uid") => modularFirestore(anonymousContext(env(), uid));
    const signedOutDb = () => modularFirestore(env().unauthenticatedContext());

    describe("reading the tournament through the RSVP link", () => {
      it("lets a signed-in account read it while the link is on", async () => {
        await seedNight("tourn-1");
        await assertSucceeds(getDoc(tournamentAt(accountDb(), "tourn-1")));
      });

      it("refuses the account once the owner turns the link off", async () => {
        await seedNight("tourn-1");
        const db = accountDb();
        await assertSucceeds(getDoc(tournamentAt(db, "tourn-1")));

        await assertSucceeds(
          updateDoc(tournamentAt(accountDb(owner), "tourn-1"), { "rsvp.enabled": false }),
        );

        await assertFails(getDoc(tournamentAt(db, "tourn-1")));
      });

      it("refuses a signed-out request and the anonymous identity a scorer link creates", async () => {
        await seedNight("tourn-1");
        await assertFails(getDoc(tournamentAt(signedOutDb(), "tourn-1")));
        await assertFails(getDoc(tournamentAt(anonymousDb(), "tourn-1")));
      });
    });

    describe("watching through the RSVP link", () => {
      it("lets a signed-in account read the matches of a live tournament while the link is on", async () => {
        await seedNight("tourn-1", { status: "live" });
        const db = accountDb();
        await assertSucceeds(getDocs(matchesOf(db, "tourn-1")));
        await assertSucceeds(getDoc(matchAt(db, "tourn-1", "m1")));
      });

      it("refuses the account the matches once the owner turns the link off", async () => {
        await seedNight("tourn-1", { status: "live" });
        const db = accountDb();
        await assertSucceeds(getDocs(matchesOf(db, "tourn-1")));

        await assertSucceeds(
          updateDoc(tournamentAt(accountDb(owner), "tourn-1"), { "rsvp.enabled": false }),
        );

        await assertFails(getDocs(matchesOf(db, "tourn-1")));
      });

      it("refuses the matches to a signed-out request and the anonymous identity a scorer link creates", async () => {
        await seedNight("tourn-1", { status: "live" });
        await assertFails(getDocs(matchesOf(signedOutDb(), "tourn-1")));
        await assertFails(getDocs(matchesOf(anonymousDb(), "tourn-1")));
      });

      it("gives the account nothing to write: not a match, and not the tournament", async () => {
        await seedNight("tourn-1", { status: "live" });
        const db = accountDb();
        await assertFails(updateDoc(matchAt(db, "tourn-1", "m1"), { status: "completed" }));
        await assertFails(updateDoc(tournamentAt(db, "tourn-1"), { name: "Mine now" }));
      });
    });

    describe("RSVPing", () => {
      const dan = "dan-uid";
      const rsvpBy = (uid: string, changes: Record<string, unknown> = {}) => ({
        uid,
        name: "Dan from Tuesdays",
        note: "Thirty minutes late",
        createdAt: serverTimestamp(),
        ...changes,
      });

      it("is accepted from a minute after the open time, by the server's clock", async () => {
        await seedNight("tourn-1", { opensInMinutes: -1 });
        await assertSucceeds(setDoc(rsvpAt(accountDb(dan), "tourn-1", dan), rsvpBy(dan)));
      });

      it("is refused a minute before the open time", async () => {
        await seedNight("tourn-1", { opensInMinutes: 1 });
        await assertFails(setDoc(rsvpAt(accountDb(dan), "tourn-1", dan), rsvpBy(dan)));
      });

      it("must carry the request's time as its arrival time, never a time of the phone's choosing", async () => {
        await seedNight("tourn-1");
        const db = accountDb(dan);
        await assertFails(
          setDoc(rsvpAt(db, "tourn-1", dan), rsvpBy(dan, { createdAt: minutesFromNow(-60) })),
        );
        await assertFails(setDoc(rsvpAt(db, "tourn-1", dan), rsvpBy(dan, { createdAt: Date.now() })));
      });

      it("may leave the note out", async () => {
        await seedNight("tourn-1");
        const withoutNote: Record<string, unknown> = rsvpBy(dan);
        delete withoutNote.note;
        await assertSucceeds(setDoc(rsvpAt(accountDb(dan), "tourn-1", dan), withoutNote));
      });

      it("is refused under another account's id or uid", async () => {
        await seedNight("tourn-1");
        const db = accountDb(dan);
        await assertFails(setDoc(rsvpAt(db, "tourn-1", otherAccount), rsvpBy(otherAccount)));
        await assertFails(setDoc(rsvpAt(db, "tourn-1", dan), rsvpBy(otherAccount)));
        await assertFails(setDoc(rsvpAt(db, "tourn-1", otherAccount), rsvpBy(dan)));
      });

      it("is refused from the anonymous identity a scorer link creates, and from a signed-out request", async () => {
        await seedNight("tourn-1");
        const phone = "scorer-phone-uid";
        await assertFails(setDoc(rsvpAt(anonymousDb(phone), "tourn-1", phone), rsvpBy(phone)));
        await assertFails(setDoc(rsvpAt(signedOutDb(), "tourn-1", dan), rsvpBy(dan)));
      });

      it("is refused while the link is off or the list is closed", async () => {
        await seedNight("tourn-1", { enabled: false });
        await seedNight("tourn-2", { closed: true });
        const db = accountDb(dan);
        await assertFails(setDoc(rsvpAt(db, "tourn-1", dan), rsvpBy(dan)));
        await assertFails(setDoc(rsvpAt(db, "tourn-2", dan), rsvpBy(dan)));
      });

      it.each(["live", "completed"] as const)("is refused once the tournament is %s", async (status) => {
        await seedNight("tourn-1", { status });
        await assertFails(setDoc(rsvpAt(accountDb(dan), "tourn-1", dan), rsvpBy(dan)));
      });

      it("is refused with a key outside the RSVP's fields", async () => {
        await seedNight("tourn-1");
        const db = accountDb(dan);
        await assertFails(setDoc(rsvpAt(db, "tourn-1", dan), rsvpBy(dan, { held: true })));
        await assertFails(setDoc(rsvpAt(db, "tourn-1", dan), rsvpBy(dan, { status: "confirmed" })));
      });

      it("needs a name of one to forty characters", async () => {
        await seedNight("tourn-1");
        const db = accountDb(dan);
        await assertFails(setDoc(rsvpAt(db, "tourn-1", dan), rsvpBy(dan, { name: "" })));
        await assertFails(setDoc(rsvpAt(db, "tourn-1", dan), rsvpBy(dan, { name: "x".repeat(41) })));
        await assertFails(setDoc(rsvpAt(db, "tourn-1", dan), rsvpBy(dan, { name: 7 })));
        await assertSucceeds(setDoc(rsvpAt(db, "tourn-1", dan), rsvpBy(dan, { name: "x".repeat(40) })));
      });

      it("keeps the note short", async () => {
        await seedNight("tourn-1");
        const db = accountDb(dan);
        await assertFails(setDoc(rsvpAt(db, "tourn-1", dan), rsvpBy(dan, { note: "x".repeat(141) })));
        await assertSucceeds(setDoc(rsvpAt(db, "tourn-1", dan), rsvpBy(dan, { note: "x".repeat(140) })));
      });

      it("lands together with the remembered name in one batch", async () => {
        await seedNight("tourn-1");
        const db = accountDb(dan);
        const batch = writeBatch(db);
        batch.set(rsvpAt(db, "tourn-1", dan), rsvpBy(dan));
        batch.set(userDocAt(db, dan), { rsvpName: "Dan from Tuesdays" }, { merge: true });
        await assertSucceeds(batch.commit());
      });
    });

    describe("reading the list", () => {
      const rsvps = { "dan-uid": { name: "Dan" }, "eve-uid": { name: "Eve", note: "Late" } };

      it("lets any signed-in account list the RSVPs in arrival order while the link is on", async () => {
        await seedNight("tourn-1", { rsvps });
        await assertSucceeds(getDocs(query(rsvpsOf(accountDb(), "tourn-1"), orderBy("createdAt"))));
      });

      it("refuses a signed-out request and the anonymous identity", async () => {
        await seedNight("tourn-1", { rsvps });
        await assertFails(getDocs(rsvpsOf(signedOutDb(), "tourn-1")));
        await assertFails(getDocs(rsvpsOf(anonymousDb(), "tourn-1")));
      });

      it("refuses another account once the link is off, and the owner can still read it", async () => {
        await seedNight("tourn-1", { enabled: false, rsvps });
        await assertFails(getDocs(rsvpsOf(accountDb(), "tourn-1")));
        await assertSucceeds(getDocs(rsvpsOf(accountDb(owner), "tourn-1")));
      });
    });

    describe("an account's RSVPs across tournaments", () => {
      const dan = "dan-uid";
      const eve = "eve-uid";
      const mine = (db: Firestore, uid: string) =>
        query(collectionGroup(db, "rsvps"), where("uid", "==", uid), orderBy("createdAt"));

      it("returns the account's own RSVPs from every tournament, the link on or off", async () => {
        await seedNight("tourn-1", { rsvps: { [dan]: { name: "Dan" }, [eve]: { name: "Eve" } } });
        await seedNight("tourn-2", { enabled: false, rsvps: { [dan]: { name: "Dan" } } });
        const snapshot = await assertSucceeds(getDocs(mine(accountDb(dan), dan)));
        expect(snapshot.docs.map((d) => d.ref.parent.parent?.id).sort()).toEqual(["tourn-1", "tourn-2"]);
      });

      it("refuses another account's RSVPs, and a query not limited to the account's own", async () => {
        await seedNight("tourn-1", { rsvps: { [dan]: { name: "Dan" }, [eve]: { name: "Eve" } } });
        await assertFails(getDocs(mine(accountDb(dan), eve)));
        await assertFails(getDocs(query(collectionGroup(accountDb(dan), "rsvps"))));
      });

      it("refuses a signed-out request, and the anonymous identity even under the same uid", async () => {
        await seedNight("tourn-1", { rsvps: { [dan]: { name: "Dan" } } });
        await assertFails(getDocs(mine(signedOutDb(), dan)));
        await assertFails(getDocs(mine(anonymousDb(dan), dan)));
      });
    });

    describe("the remembered name", () => {
      const dan = "dan-uid";

      it("is written and read by its own account", async () => {
        const db = accountDb(dan);
        await assertSucceeds(setDoc(userDocAt(db, dan), { rsvpName: "Dan" }, { merge: true }));
        await assertSucceeds(getDoc(userDocAt(db, dan)));
      });

      it("cannot be read or written by another account, a signed-out request, or the anonymous identity", async () => {
        await env().withSecurityRulesDisabled(async (unrestricted) => {
          await setDoc(userDocAt(modularFirestore(unrestricted), dan), { rsvpName: "Dan" });
        });
        for (const db of [accountDb(otherAccount), signedOutDb(), anonymousDb(dan)]) {
          await assertFails(getDoc(userDocAt(db, dan)));
          await assertFails(setDoc(userDocAt(db, dan), { rsvpName: "Mallory" }));
        }
      });

      it("holds only a name of one to forty characters", async () => {
        const db = accountDb(dan);
        await assertFails(setDoc(userDocAt(db, dan), { rsvpName: "" }));
        await assertFails(setDoc(userDocAt(db, dan), { rsvpName: "x".repeat(41) }));
        await assertFails(setDoc(userDocAt(db, dan), { rsvpName: "Dan", isAdmin: true }));
      });
    });

    describe("changing an RSVP", () => {
      const dan = "dan-uid";
      const eve = "eve-uid";
      const rsvps = { [dan]: { name: "Dan", note: "Late" }, [eve]: { name: "Eve" } };

      it("lets the account change its own name and note", async () => {
        await seedNight("tourn-1", { rsvps });
        const db = accountDb(dan);
        await assertSucceeds(updateDoc(rsvpAt(db, "tourn-1", dan), { name: "Dan from Tuesdays" }));
        await assertSucceeds(updateDoc(rsvpAt(db, "tourn-1", dan), { note: "On time after all" }));
        await assertSucceeds(updateDoc(rsvpAt(db, "tourn-1", dan), { note: deleteField() }));
      });

      it("lets the account change them after the owner closes the list", async () => {
        await seedNight("tourn-1", { closed: true, rsvps });
        await assertSucceeds(updateDoc(rsvpAt(accountDb(dan), "tourn-1", dan), { name: "Daniel" }));
      });

      it("never lets the account move its arrival time or its uid", async () => {
        await seedNight("tourn-1", { rsvps });
        const db = accountDb(dan);
        await assertFails(updateDoc(rsvpAt(db, "tourn-1", dan), { createdAt: serverTimestamp() }));
        await assertFails(updateDoc(rsvpAt(db, "tourn-1", dan), { createdAt: minutesFromNow(-60) }));
        await assertFails(updateDoc(rsvpAt(db, "tourn-1", dan), { uid: eve }));
      });

      it("holds a changed name and note to the limits an RSVP takes, and adds no other key", async () => {
        await seedNight("tourn-1", { rsvps });
        const db = accountDb(dan);
        await assertFails(updateDoc(rsvpAt(db, "tourn-1", dan), { name: "" }));
        await assertFails(updateDoc(rsvpAt(db, "tourn-1", dan), { name: "x".repeat(41) }));
        await assertFails(updateDoc(rsvpAt(db, "tourn-1", dan), { note: "x".repeat(141) }));
        await assertFails(updateDoc(rsvpAt(db, "tourn-1", dan), { status: "confirmed" }));
      });

      it("refuses a change to another account's RSVP, from that account's neighbour or the owner", async () => {
        await seedNight("tourn-1", { rsvps });
        await assertFails(updateDoc(rsvpAt(accountDb(eve), "tourn-1", dan), { name: "Mallory" }));
        await assertFails(updateDoc(rsvpAt(accountDb(owner), "tourn-1", dan), { name: "Mallory" }));
      });
    });

    describe("withdrawing", () => {
      const dan = "dan-uid";
      const eve = "eve-uid";
      const rsvps = { [dan]: { name: "Dan" }, [eve]: { name: "Eve" } };

      it("lets the account withdraw while the tournament is a draft, even after the list is closed", async () => {
        await seedNight("tourn-1", { rsvps });
        await seedNight("tourn-2", { closed: true, rsvps });
        await assertSucceeds(deleteDoc(rsvpAt(accountDb(dan), "tourn-1", dan)));
        await assertSucceeds(deleteDoc(rsvpAt(accountDb(dan), "tourn-2", dan)));
      });

      it.each(["live", "completed"] as const)(
        "refuses the account's withdrawal once the tournament is %s",
        async (status) => {
          await seedNight("tourn-1", { status, rsvps });
          await assertFails(deleteDoc(rsvpAt(accountDb(dan), "tourn-1", dan)));
        },
      );

      it("refuses withdrawing someone else, and the anonymous identity under the same uid", async () => {
        await seedNight("tourn-1", { rsvps });
        await assertFails(deleteDoc(rsvpAt(accountDb(eve), "tourn-1", dan)));
        await assertFails(deleteDoc(rsvpAt(anonymousDb(dan), "tourn-1", dan)));
        await assertFails(deleteDoc(rsvpAt(signedOutDb(), "tourn-1", dan)));
      });
    });

    describe("the owner removing anyone", () => {
      const dan = "dan-uid";
      const rsvps = { [dan]: { name: "Dan" } };

      it.each(["draft", "live", "completed"] as const)(
        "lets the owner remove an RSVP while the tournament is %s",
        async (status) => {
          await seedNight("tourn-1", { status, rsvps });
          await assertSucceeds(deleteDoc(rsvpAt(accountDb(owner), "tourn-1", dan)));
        },
      );

      it("lets the owner remove an RSVP after the list is closed and with the link off", async () => {
        await seedNight("tourn-1", { closed: true, rsvps });
        await seedNight("tourn-2", { enabled: false, rsvps });
        await assertSucceeds(deleteDoc(rsvpAt(accountDb(owner), "tourn-1", dan)));
        await assertSucceeds(deleteDoc(rsvpAt(accountDb(owner), "tourn-2", dan)));
      });
    });

    describe("held spots", () => {
      const held = (changes: Record<string, unknown> = {}) => ({
        uid: null,
        held: true,
        name: "Walk-in Sam",
        createdAt: serverTimestamp(),
        ...changes,
      });

      const seedHeld = (tournamentId: string, heldId: string) =>
        env().withSecurityRulesDisabled(async (unrestricted) => {
          await setDoc(rsvpAt(modularFirestore(unrestricted), tournamentId, heldId), held());
        });

      it.each(["draft", "live"] as const)(
        "are added by the owner under a generated id while the tournament is %s",
        async (status) => {
          await seedNight("tourn-1", { status });
          await assertSucceeds(setDoc(doc(rsvpsOf(accountDb(owner), "tourn-1")), held()));
        },
      );

      it("are added after the list is closed and with the link off, which only stop RSVPs from people", async () => {
        await seedNight("tourn-1", { closed: true });
        await seedNight("tourn-2", { enabled: false });
        await assertSucceeds(setDoc(doc(rsvpsOf(accountDb(owner), "tourn-1")), held()));
        await assertSucceeds(setDoc(doc(rsvpsOf(accountDb(owner), "tourn-2")), held()));
      });

      it("are refused once the tournament is completed", async () => {
        await seedNight("tourn-1", { status: "completed" });
        await assertFails(setDoc(doc(rsvpsOf(accountDb(owner), "tourn-1")), held()));
      });

      it("are added by nobody but the owner", async () => {
        await seedNight("tourn-1");
        for (const db of [accountDb(otherAccount), signedOutDb(), anonymousDb()]) {
          await assertFails(setDoc(doc(rsvpsOf(db, "tourn-1")), held()));
        }
      });

      it("must be held, with no uid, a name of one to forty characters, the request's time, and nothing else", async () => {
        await seedNight("tourn-1");
        const db = accountDb(owner);
        const add = (changes: Record<string, unknown>) => setDoc(doc(rsvpsOf(db, "tourn-1")), held(changes));
        await assertFails(add({ held: false }));
        await assertFails(add({ uid: otherAccount }));
        await assertFails(add({ uid: owner }));
        await assertFails(add({ name: "" }));
        await assertFails(add({ name: "x".repeat(41) }));
        await assertFails(add({ createdAt: Date.now() }));
        await assertFails(add({ note: "Brings a ball" }));
        await assertSucceeds(add({ name: "x".repeat(40) }));

        const withoutHeld: Record<string, unknown> = held();
        delete withoutHeld.held;
        await assertFails(setDoc(doc(rsvpsOf(db, "tourn-1")), withoutHeld));
      });

      it("are changed by nobody, not even the owner", async () => {
        await seedNight("tourn-1");
        await seedHeld("tourn-1", "held-1");
        for (const db of [accountDb(owner), accountDb(otherAccount)]) {
          await assertFails(updateDoc(rsvpAt(db, "tourn-1", "held-1"), { name: "Sam" }));
          await assertFails(
            updateDoc(rsvpAt(db, "tourn-1", "held-1"), { noticesReadAt: serverTimestamp() }),
          );
        }
      });

      it("are removed by the owner and nobody else", async () => {
        await seedNight("tourn-1");
        await seedHeld("tourn-1", "held-1");
        await assertFails(deleteDoc(rsvpAt(accountDb(otherAccount), "tourn-1", "held-1")));
        await assertSucceeds(deleteDoc(rsvpAt(accountDb(owner), "tourn-1", "held-1")));
      });

      it("are listed with everyone else's RSVPs", async () => {
        await seedNight("tourn-1", { rsvps: { "dan-uid": { name: "Dan" } } });
        await seedHeld("tourn-1", "held-1");
        await assertSucceeds(getDocs(query(rsvpsOf(accountDb(), "tourn-1"), orderBy("createdAt"))));
      });
    });

    describe("the owner's own RSVP", () => {
      it("is made like anyone else's, under the owner's uid, while RSVPs are open", async () => {
        await seedNight("tourn-1");
        await assertSucceeds(
          setDoc(rsvpAt(accountDb(owner), "tourn-1", owner), {
            uid: owner,
            name: "The organiser",
            createdAt: serverTimestamp(),
          }),
        );
      });

      it("is refused before the open time, like anyone else's", async () => {
        await seedNight("tourn-1", { opensInMinutes: 1 });
        await assertFails(
          setDoc(rsvpAt(accountDb(owner), "tourn-1", owner), {
            uid: owner,
            name: "The organiser",
            createdAt: serverTimestamp(),
          }),
        );
      });
    });

    describe("notices", () => {
      const notice = (changes: Record<string, unknown> = {}) => ({
        body: "We moved to 7:30.",
        createdAt: serverTimestamp(),
        ...changes,
      });

      const seedNotice = (tournamentId: string, noticeId: string) =>
        env().withSecurityRulesDisabled(async (unrestricted) => {
          await setDoc(noticeAt(modularFirestore(unrestricted), tournamentId, noticeId), notice());
        });

      it("are posted and deleted by the owner", async () => {
        await seedNight("tourn-1");
        const db = accountDb(owner);
        await assertSucceeds(setDoc(noticeAt(db, "tourn-1", "n1"), notice()));
        await assertSucceeds(deleteDoc(noticeAt(db, "tourn-1", "n1")));
      });

      it("cannot be posted or deleted by another account, a signed-out request, or the anonymous identity", async () => {
        await seedNight("tourn-1");
        await seedNotice("tourn-1", "n1");
        for (const db of [accountDb(otherAccount), signedOutDb(), anonymousDb()]) {
          await assertFails(setDoc(noticeAt(db, "tourn-1", "n2"), notice()));
          await assertFails(deleteDoc(noticeAt(db, "tourn-1", "n1")));
        }
      });

      it("cannot be edited once posted, even by the owner", async () => {
        await seedNight("tourn-1");
        await seedNotice("tourn-1", "n1");
        await assertFails(updateDoc(noticeAt(accountDb(owner), "tourn-1", "n1"), { body: "Typo" }));
      });

      it("carry a body of one to five hundred characters, the request's time, and nothing else", async () => {
        await seedNight("tourn-1");
        const db = accountDb(owner);
        await assertFails(setDoc(noticeAt(db, "tourn-1", "n1"), notice({ body: "" })));
        await assertFails(setDoc(noticeAt(db, "tourn-1", "n1"), notice({ body: "x".repeat(501) })));
        await assertFails(setDoc(noticeAt(db, "tourn-1", "n1"), notice({ body: 7 })));
        await assertFails(setDoc(noticeAt(db, "tourn-1", "n1"), notice({ createdAt: Date.now() })));
        await assertFails(setDoc(noticeAt(db, "tourn-1", "n1"), notice({ pinned: true })));
        await assertSucceeds(setDoc(noticeAt(db, "tourn-1", "n1"), notice({ body: "x".repeat(500) })));
      });

      it("are read by the owner, and by any signed-in account while the link is on", async () => {
        await seedNight("tourn-1");
        await seedNotice("tourn-1", "n1");
        const newestFirst = (db: Firestore) =>
          getDocs(query(noticesOf(db, "tourn-1"), orderBy("createdAt", "desc")));
        await assertSucceeds(newestFirst(accountDb(owner)));
        await assertSucceeds(newestFirst(accountDb()));
      });

      it("refuse a signed-out request and the anonymous identity", async () => {
        await seedNight("tourn-1");
        await seedNotice("tourn-1", "n1");
        await assertFails(getDocs(noticesOf(signedOutDb(), "tourn-1")));
        await assertFails(getDocs(noticesOf(anonymousDb(), "tourn-1")));
      });

      it("refuse another account once the link is off, and the owner can still read them", async () => {
        await seedNight("tourn-1", { enabled: false });
        await seedNotice("tourn-1", "n1");
        await assertFails(getDocs(noticesOf(accountDb(), "tourn-1")));
        await assertSucceeds(getDocs(noticesOf(accountDb(owner), "tourn-1")));
      });

      describe("the time an RSVP last read them", () => {
        const dan = "dan-uid";
        const read = { noticesReadAt: serverTimestamp() };

        it("is written by the RSVP's own account, as the request's time", async () => {
          await seedNight("tourn-1", { rsvps: { [dan]: { name: "Dan" } } });
          const db = accountDb(dan);
          await assertSucceeds(updateDoc(rsvpAt(db, "tourn-1", dan), read));
          await assertSucceeds(updateDoc(rsvpAt(db, "tourn-1", dan), read));
          await assertFails(updateDoc(rsvpAt(db, "tourn-1", dan), { noticesReadAt: Date.now() }));
        });

        it("is written by nobody else: not another account, the owner, a signed-out request, or the anonymous identity", async () => {
          await seedNight("tourn-1", { rsvps: { [dan]: { name: "Dan" } } });
          for (const db of [accountDb(otherAccount), accountDb(owner), signedOutDb(), anonymousDb(dan)]) {
            await assertFails(updateDoc(rsvpAt(db, "tourn-1", dan), read));
          }
        });

        it("cannot carry another change with it", async () => {
          await seedNight("tourn-1", { rsvps: { [dan]: { name: "Dan" } } });
          const db = accountDb(dan);
          await assertFails(updateDoc(rsvpAt(db, "tourn-1", dan), { ...read, createdAt: serverTimestamp() }));
          await assertFails(updateDoc(rsvpAt(db, "tourn-1", dan), { ...read, uid: otherAccount }));
        });

        it("may come with the RSVP itself", async () => {
          await seedNight("tourn-1");
          const db = accountDb(dan);
          await assertSucceeds(
            setDoc(rsvpAt(db, "tourn-1", dan), {
              uid: dan,
              name: "Dan",
              createdAt: serverTimestamp(),
              ...read,
            }),
          );
        });
      });
    });
  });
});
