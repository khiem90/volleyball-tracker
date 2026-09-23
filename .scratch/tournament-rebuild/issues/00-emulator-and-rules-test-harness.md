# 00: Emulator and rules test harness

**What to build:** A developer runs the Auth and Firestore emulators with one command and runs
Firestore rules tests with the normal test command. This is the prefactor every
other ticket leans on: without it nothing below can be verified locally.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] The emulators script starts Auth and Firestore together.
- [x] A missing JDK produces a clear message pointing at where to get one, and the README says the emulators need Java.
- [x] The Firebase rules unit-testing package is installed and rules tests run under vitest against the emulator, skipping cleanly with a message when the emulator is not up.
- [ ] One smoke rules test passes: a signed-out read of an arbitrary document is denied.
- [x] The README documents the emulator flag in the env file and the two commands to run.

## Comments

**2026-09-23, implementation.** Done on branch `claude/rotation-lab-redesign`.

- `npm run emulators` now runs `scripts/check-java.mjs` and then starts Auth and Firestore together. The preflight fails fast with a download pointer when `java` is not on PATH or is older than 21, which is what firebase-tools 15 requires.
- `@firebase/rules-unit-testing` 5.0.2 is installed. `src/__tests__/rules/emulator.ts` probes the Firestore port from `firebase.json`, loads `firestore.rules` into a separate demo project, wipes data before each test, and skips the block with a message when the emulator is down. `firebase.json` has `singleProjectMode` off so that second project id does not log warnings.
- The smoke test lives in `src/__tests__/rules/firestore.rules.test.ts`.

Verified here: the missing-JDK message from both the script and `npm run emulators`; `npm test` runs the 48 existing tests and skips the rules test with the message; typecheck and lint pass.

Not verified here: the smoke test passing against a running emulator. This machine has no JDK (the winget install noted in the spec never landed), so the emulators cannot start. To close the last box, install a JDK 21 or newer, run `npm run emulators`, then `npm test` in another terminal.
