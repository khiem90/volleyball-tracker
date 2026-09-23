// Preflight for `npm run emulators`. The Firestore emulator is a Java program.
// firebase-tools checks for Java itself, but its message only says to put Java
// on PATH. This one also says which version to get and where.
import { spawnSync } from "node:child_process";

// firebase-tools 15 refuses anything older; see MIN_SUPPORTED_JAVA_MAJOR_VERSION
// in its emulator/commandUtils.js.
const MIN_MAJOR = 21;
const DOWNLOAD_URL = "https://adoptium.net/temurin/releases/";

function detectJava() {
  // firebase-tools spawns plain `java`, so PATH is the only place that counts.
  const result = spawnSync("java", ["-version"], { encoding: "utf8" });
  if (result.error) return { found: false, major: null };
  // `java -version` writes to stderr, e.g. `openjdk version "21.0.4" 2024-07-16`.
  const match = /version "(\d+)(?:\.(\d+))?/.exec(`${result.stderr}${result.stdout}`);
  if (!match) return { found: true, major: null };
  const major = Number(match[1]);
  // Java 8 and older report as "1.8.0".
  return { found: true, major: major === 1 ? Number(match[2]) : major };
}

function fail(...lines) {
  console.error(lines.join("\n"));
  process.exit(1);
}

const java = detectJava();

if (!java.found) {
  fail(
    "The Firebase emulators need a Java runtime and none was found on PATH.",
    `Install a JDK ${MIN_MAJOR} or newer, for example Temurin from ${DOWNLOAD_URL},`,
    "reopen the terminal, and rerun `npm run emulators`.",
  );
}

if (java.major === null) {
  console.warn("Could not read the Java version from `java -version`; letting firebase-tools check it.");
} else if (java.major < MIN_MAJOR) {
  fail(
    `Java ${java.major} is on PATH but the Firebase emulators need ${MIN_MAJOR} or newer.`,
    `Install a newer JDK, for example Temurin from ${DOWNLOAD_URL}, and put its bin folder first on PATH.`,
  );
}
