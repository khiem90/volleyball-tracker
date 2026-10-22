# 02: Undo a Round Robin tap

**What to build:** A tap on a Schedule row pushes the Undo toast, the same one a court tap
pushes, as soon as the result shows on the phone. Undo reopens the match exactly as it was, or
puts a best-of back one game, and the standings follow. The undo is refused, with the usual
"can no longer be undone" notice, when the result no longer stands as the tap made it: the owner
corrected the score, the correction gave the match to the other team, the next game of a best-of
already has points, or the tournament has completed. A forfeit or a bye is never undoable. A tap
the server reverses drops its toast entry.

**Blocked by:** 01

**Status:** resolved

- [x] The undo command carries the winner; the toast entry records it and passes it on; rotation courts ignore it.
- [x] Undo of a single-game tap restores the match to its unplayed state and leaves other matches alone.
- [x] Undo of a best-of puts it back one game at a time, deciding game first.
- [x] Refused after a correction, after a swapped-winner correction, once the next game has points, on a forfeit, on an unplayed match, with a winner not in the match or no winner, and once the tournament is completed.
- [x] A bracket result is still refused by format, and a point-scored Round Robin result is refused.
- [x] Engine tests cover every case above; the toast's failure handling is unchanged.

## Comments

- 2026-10-22: Landed on `claude/festive-fermat-zsq53w` in commit 66a01be.
- 2026-10-22: Reviewed and merged onto the integration branch `claude/sleepy-mendel-xe4rxq`. Code review found that a reversed tap withdrew every undo entry for its match, so in a best-of a reversed game 2 lost game 1's entry although game 1 still stood; a failed write now withdraws only its own entry (17acd19). The bye refusal the checklist claimed is now pinned by an engine test (5178ebf).
