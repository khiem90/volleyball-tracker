import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach, describe } from "vitest";

const repoRoot = new URL("../../../", import.meta.url);

// firebase.json is the one place the emulator port is set.
const firebaseJson = JSON.parse(
  readFileSync(new URL("firebase.json", repoRoot), "utf8"),
) as { emulators: { firestore: { port: number } } };

export const firestoreEmulator = {
  host: "127.0.0.1",
  port: firebaseJson.emulators.firestore.port,
};

// Not the project id `npm run dev` uses, so wiping data between tests never
// touches what a developer is looking at in the browser. The demo- prefix keeps
// the emulator from ever calling real Firebase.
export const rulesTestProjectId = "demo-tournament-tracker-rules";

export const skipMessage =
  `Firestore emulator not reachable at ${firestoreEmulator.host}:${firestoreEmulator.port}, ` +
  "skipping rules tests. Run `npm run emulators` first.";

async function probeEmulator(): Promise<boolean> {
  try {
    // Any HTTP answer on the port means the emulator is up; the status doesn't matter.
    await fetch(`http://${firestoreEmulator.host}:${firestoreEmulator.port}/`, {
      signal: AbortSignal.timeout(1000),
    });
    return true;
  } catch {
    return false;
  }
}

export const firestoreEmulatorIsUp = await probeEmulator();

/**
 * A describe block that runs only while the Firestore emulator is up. It loads
 * firestore.rules once, wipes data before every test, and hands the body an
 * accessor for the test environment.
 *
 * Test files using it must run in Node rather than jsdom: put
 * `// @vitest-environment node` on their first line.
 */
export function describeFirestoreRules(
  name: string,
  body: (env: () => RulesTestEnvironment) => void,
): void {
  if (!firestoreEmulatorIsUp) console.warn(skipMessage);

  describe.skipIf(!firestoreEmulatorIsUp)(name, () => {
    let env: RulesTestEnvironment;

    beforeAll(async () => {
      env = await initializeTestEnvironment({
        projectId: rulesTestProjectId,
        firestore: {
          ...firestoreEmulator,
          rules: readFileSync(new URL("firestore.rules", repoRoot), "utf8"),
        },
      });
    });

    beforeEach(() => env.clearFirestore());
    afterAll(() => env.cleanup());

    body(() => env);
  });
}
