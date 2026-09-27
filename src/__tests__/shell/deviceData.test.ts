// @vitest-environment node
import { disableNetwork, enableNetwork } from "firebase/firestore";
import { expect, it } from "vitest";
import { writesReachedServer } from "@/lib/deviceData";
import { buildRosterTeam, saveRosterTeams } from "@/lib/roster";
import { describeFirestoreRules, modularFirestore } from "../rules/emulator";

const owner = "owner-uid";

describeFirestoreRules("writes reaching the server before sign-out", (env) => {
  // Waits out the real few seconds sign-out gives queued writes.
  it("says a team added with no signal has not reached the server", async () => {
    const db = modularFirestore(env().authenticatedContext(owner));
    await disableNetwork(db);

    // Offline the save stays queued, so it is not awaited.
    void saveRosterTeams(db, owner, [buildRosterTeam(db, owner, { name: "Aces", color: "#ef4444" })]);

    expect(await writesReachedServer(db)).toBe(false);
    await enableNetwork(db);
  }, 10_000);

  it("says the queued team has reached the server once the signal is back", async () => {
    const db = modularFirestore(env().authenticatedContext(owner));
    await disableNetwork(db);
    void saveRosterTeams(db, owner, [buildRosterTeam(db, owner, { name: "Aces", color: "#ef4444" })]);

    await enableNetwork(db);

    expect(await writesReachedServer(db)).toBe(true);
  });
});
