// Preflight for `npm run emulators`. The Firestore emulator is a Java program.
// Without this check, firebase-tools brings up the Auth emulator first and only
// then fails on Firestore, with a message that doesn't say where to get Java.
import { spawnSync } from "node:child_process";

// firebase-tools 15 refuses anything older than this (MIN_SUPPORTED_JAVA_MAJOR_VERSION).
const MIN_MAJOR = 21;
const DOWNLOAD_URL = "https://adoptium.net/temurin/releases/";

function installedJavaMajor() {
  // firebase-tools spawns plain `java`, so PATH is the only place that counts.
  const result = spawnSync("java", ["-version"], { encoding: "utf8" });
  if (result.error) return { found: false };
  // `java -version` writes to stderr, e.g. `openjdk version "21.0.4" 2024-07-16`.
  const match = /version "(\d+)(?:\.(\d+))?/.exec(`${result.stderr}${result.stdout}`);
  if (!match) return { found: true, major: null };
  const major = Number(match[1]);
  // Java 8 and older report as "1.8.0".
  return { found: true, major: major === 1 ? Number(match[2]) : major };
}

const java = installedJavaMajor();

if (!java.found) {
  console.error(
    [
      "The Firebase emulators need a Java runtime and none was found on PATH.",
      `Install a JDK ${MIN_MAJOR} or newer, for example Temurin from ${DOWNLOAD_URL},`,
      "reopen the terminal, and rerun `npm run emulators`.",
    ].join("\n"),
  );
  process.exit(1);
}

if (java.major === null) {
  console.warn("Could not read the Java version from `java -version`; letting firebase-tools check it.");
} else if (java.major < MIN_MAJOR) {
  console.error(
    [
      `Java ${java.major} is on PATH but the Firebase emulators need ${MIN_MAJOR} or newer.`,
      `Install a newer JDK, for example Temurin from ${DOWNLOAD_URL}, and put its bin folder first on PATH.`,
    ].join("\n"),
  );
  process.exit(1);
}
