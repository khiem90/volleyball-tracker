# Win buttons on Schedule rows, Undo toast, and the deciding-tap confirm

Status: resolved

`MatchRow` and `SchedulePanel` take `onInstantWin`; the console passes it for a live Round Robin with Instant win on when the role may score. The instant-win hook records the winner in the undo entry and skips the entry when the tap completed the tournament. `completesTournament` in `src/lib/console.ts` gates a confirm dialog before the deciding tap.

- [x] Pending and live Schedule rows carry the win buttons; the row still opens scoring.
- [x] The undo toast entry names the winner and is skipped for the tap that completed the tournament.
- [x] `completesTournament` gates a confirm dialog before the deciding tap; console tests cover it.

## Comments

- 2026-10-22: Implemented on `claude/festive-fermat-zsq53w`. Engine, console, and creation suites pass (460 tests); the emulator suites were not run.
