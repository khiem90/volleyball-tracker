# 03: Confirm the tap that completes the tournament

**What to build:** When a tap would complete the tournament, the deciding game of the last
unplayed match, the console asks first: "This is the last match", naming the team and saying
that recording it completes the tournament and nothing can be changed after. Confirm records the
tap; cancel drops it. Every other tap records without asking. The tap that completed the
tournament gets no Undo toast entry, since nothing in a completed tournament can be undone.

**Blocked by:** 01

**Status:** resolved

- [x] A pure helper says whether a tap completes the tournament: Round Robin, every other match completed, and this game decides the match (in a best-of, only when the tapped team is one game short).
- [x] The console holds such a tap behind the existing confirm dialog, with the team named in the title's body and on the confirm button.
- [x] The double-tap guard runs before the check, so the confirm cannot open twice.
- [x] No toast entry is pushed when the applied command left the tournament completed.
- [x] Console tests cover the last match, a non-last match, the best-of case, and a rotation format.

## Comments

- 2026-10-22: Landed on `claude/festive-fermat-zsq53w` in commit 66a01be.
