# Offer Instant win for Round Robin at creation

Status: resolved

`settingsUsedBy("round_robin").instantWin` becomes true, so the creation page shows the Results choice and `setupSettings` keeps it. The note under the choice gains "An instant win counts as 25 – 0." for every format. Update the creation test that expected Round Robin to drop it.

- [x] `settingsUsedBy` offers Instant win for Round Robin; `setupSettings` keeps it.
- [x] The creation note says an instant win counts as 25 – 0.
- [x] Creation test updated.

## Comments

- 2026-10-22: Implemented on `claude/festive-fermat-zsq53w`. Engine, console, and creation suites pass (460 tests); the emulator suites were not run.
