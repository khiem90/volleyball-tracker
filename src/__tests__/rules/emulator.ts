import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import type { Firestore } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe } from "vitest";

const repoRoot = new URL("../../../", import.meta.url);

// Read the port from firebase.json rather than repeating it here.
const firebaseJson = JSON.parse(
  readFileSync(new URL("firebase.json", repoRoot), "utf8"),
) as { emulators: { firestore: { port: number } } };

const firestoreEmulator = {
  host: "127.0.0.1",
  port: firebaseJson.emulators.firestore.port,
};

// Each test file gets its own project, named after its describe block. Not the
// project id `npm run dev` uses, so wiping data between tests never touches
// what a developer is looking at in the browser, and not shared between files,
// so one file's wipe cannot hit another file running in parallel. The demo-
// prefix keeps the emulator from ever calling real Firebase.
const projectIdFor = (name: string): string => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  // A short hash keeps two long names apart after the slug is cut down.
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `demo-tt-${slug.slice(0, 16)}-${hash.toString(36)}`;
};

const skipMessage =
  `Firestore emulator not reachable at ${firestoreEmulator.host}:${firestoreEmulator.port}, ` +
  "skipping rules tests. Run `npm run emulators` first.";

async function probeEmulator(): Promise<boolean> {
  try {
    // Any HTTP answer on the port counts. If some other server holds the port,
    // the tests run and fail loudly, which beats a quiet skip hiding a broken
    // harness.
    await fetch(`http://${firestoreEmulator.host}:${firestoreEmulator.port}/`, {
      signal: AbortSignal.timeout(1000),
    });
    return true;
  } catch {
    return false;
  }
}

const firestoreEmulatorIsUp = await probeEmulator();

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
        projectId: projectIdFor(name),
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

/**
 * The test context hands back a compat Firestore. The modular functions in
 * `firebase/firestore` unwrap the compat delegate at runtime, so this only
 * narrows the type for callers written against the modular API.
 */
export function modularFirestore(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore;
}
