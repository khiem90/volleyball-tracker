# Undo a Round Robin instant win in the engine

Status: resolved

`undo_result` gains an optional `winnerId`. For Round Robin the engine reopens the match one game and refuses when the result no longer stands as the tap made it (corrected score, forfeit, bye, points on the next game). Tests in `src/__tests__/engine/`.

- [x] `undo_result` carries the winner; the engine reopens a Round Robin match one game.
- [x] Refused after a correction, on a forfeit or bye, with points on the next game, and once the tournament is completed.
- [x] Engine tests in `roundRobinInstantWin.test.ts`.

## Comments

- 2026-10-22: Implemented on `claude/festive-fermat-zsq53w`. Engine, console, and creation suites pass (460 tests); the emulator suites were not run.
