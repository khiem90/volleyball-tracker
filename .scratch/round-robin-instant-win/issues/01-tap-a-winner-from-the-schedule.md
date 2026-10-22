# 01: Tap a winner from the Schedule

**What to build:** An owner creating a Round Robin finds the Results choice under Advanced
settings, with the note saying an instant win counts as 25 – 0. With Instant win on, every
Schedule row still to be played carries "Reds won" and "Blues won" buttons for the owner and
scorers. A tap records the match at 25 – 0 on the spot, the standings move, and the row still
opens the scoring page. In a best-of each tap records one game and the row shows the count
between taps. Completed, forfeited, and bye rows carry no buttons; spectators see none. A double
tap records one result. No undo toast and no confirm yet: a wrong tap is corrected by the owner.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Round Robin offers Instant win at creation and keeps it; Duplicate carries it; the Settings tab shows it.
- [x] The help note reads "An instant win counts as 25 – 0." for every format.
- [x] A live Round Robin with Instant win on shows a button per team on pending and in-progress playable rows, to owner and scorers only.
- [x] A tap records 25 – 0 for one game; the deciding game completes the match; the last match completes the tournament.
- [x] The row's link to scoring is unchanged; the buttons sit outside it.
- [x] The double-tap guard is keyed by match for a row without a court.
- [x] Engine tests cover the tap and the series; console tests cover which tournaments and rows offer buttons; the creation test expects Round Robin to keep the setting.

## Comments

- 2026-10-22: Landed on `claude/festive-fermat-zsq53w` in commit 66a01be together with 02 and 03.
- 2026-10-22: Reviewed and merged onto the integration branch `claude/sleepy-mendel-xe4rxq`. Code review: the "counts as 25 – 0" sentence now shows under both Results choices, so the owner reads it before picking (5178ebf); the `completesTournament` helper reuses `seriesInfo` so the best-of arithmetic has one home (90148c8).
