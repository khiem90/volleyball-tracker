// @vitest-environment node
import { assertFails } from "@firebase/rules-unit-testing";
import { it } from "vitest";
import { describeFirestoreRules } from "./emulator";

describeFirestoreRules("Firestore rules", (env) => {
  it("denies a signed-out read of a document no rule matches", async () => {
    const db = env().unauthenticatedContext().firestore();
    await assertFails(db.doc("arbitrary/document").get());
  });
});
