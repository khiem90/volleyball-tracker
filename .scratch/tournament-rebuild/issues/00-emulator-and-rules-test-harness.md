# 00: Emulator and rules test harness

**What to build:** A developer runs the Auth and Firestore emulators with one command and runs
Firestore rules tests with the normal test command. This is the prefactor every
other ticket leans on: without it nothing below can be verified locally.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The emulators script starts Auth and Firestore together.
- [ ] A missing JDK produces a clear message pointing at where to get one, and the README says the emulators need Java.
- [ ] The Firebase rules unit-testing package is installed and rules tests run under vitest against the emulator, skipping cleanly with a message when the emulator is not up.
- [ ] One smoke rules test passes: a signed-out read of an arbitrary document is denied.
- [ ] The README documents the emulator flag in the env file and the two commands to run.
