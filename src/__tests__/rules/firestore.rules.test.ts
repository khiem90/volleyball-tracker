// @vitest-environment node
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import { describe, it } from "vitest";
import { describeFirestoreRules, modularFirestore } from "./emulator";

const owner = "owner-uid";
const otherAccount = "other-account-uid";

const teamDoc = { name: "Spikers", color: "#ef4444", createdAt: 1_700_000_000_000 };

// The path is spelled out here rather than imported from src/lib/roster.ts,
// so a wrong path in the module cannot make the rules look right.
const rosterOf = (db: Firestore, uid: string) => collection(db, "users", uid, "teams");
const teamIn = (db: Firestore, uid: string, teamId: string) =>
  doc(db, "users", uid, "teams", teamId);

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
});
