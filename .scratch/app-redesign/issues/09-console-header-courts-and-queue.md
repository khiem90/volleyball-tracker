# 09: Console: header, Courts, and Queue

**What to build:** The owner opens a live tournament and sees the console from
direction D. The header shows a back link, the tournament's name with a Live
chip, and its facts, over text tabs with a green underline on the active one.
Each court is a card with the court-size score line: both teams' marks, their
names and notes, and the score between them as the largest thing on the card,
with the leader in bold. A waiting court shows "vs" and a Swap control under
each team. Under every court sit the two "won" buttons and the green scoring
button. The queue is a card of numbered rows with marks, a "Next up" chip on
the first team, and up and down buttons.

The picture is the right half of
`.scratch/app-redesign/directions/d-matchday.png`. A scorer who opens the
console from a scorer link, and a spectator from a spectator link, see the same
design with only their own controls.

Covers spec stories 42 to 49 and 52.

**Blocked by:** 03, 05, 06

**Status:** resolved

- [x] The header uses the shared header block with a back link, the name, a status chip for draft, live, or completed, and the same facts as today.
- [x] The console's tabs are text tabs. The active one has ink text and a green underline. The same tabs show for the same formats and roles as today.
- [x] A live court shows the court-size score line with the leader in bold and each team's notes under its name, such as a champion's streak.
- [x] A waiting court shows "vs" and a 44px Swap control under each team. Swap behaves as today.
- [x] Each court has two grey "won" buttons for an instant win and a green button that opens the scoring page, labeled as today for a live and a waiting court.
- [x] The queue lists teams in order with position, mark, and name. The first row has the "Next up" chip. The up and down buttons are 44px, reorder as today, and are disabled at the ends.
- [x] An empty court, an empty queue, and a tournament that is a draft or completed each show the state they show today, in the new look.
- [x] A scorer and a spectator see the same cards with the controls their link allows.
- [x] The files for the console's header, tabs, courts, and queue contain no old-theme name and are on the guard's list of migrated folders.
- [x] The console tests pass unedited, along with the rest of the suite outside the design folder. Lint and the type checker are clean.
- [x] The owner has looked at Courts on a phone with a live court, a waiting court, and a queue, and what they flagged is fixed.

## Comments

- Not applicable in part, by ruling 1. Court cards and the queue show for the two rotation formats only, and the other formats keep one card of "Live now" and "Up next" rows. The "won" buttons show only with instant win on. The tab strip shows below `lg`, and from `lg` up every section is on screen as today.
- Kept from today where the picture differs: the queue's count is a bare number, not "N waiting", and a court's status word is "Waiting" or "Empty". The word "Completed" is gone from a match row, because the bold winner says it.
- Nobody has looked at this in a browser. The owner check is open.
- Merged on the integration branch `claude/grill-with-docs-redesign-27d048` and through the code review. The one open box is the owner's own look on a phone, so the status is `ready-for-human` until they have had it.
- The owner looked at the app on a phone on 2026-11-27, after the merge, and said it looks good. Nothing was flagged, so the last box is ticked and the ticket is resolved.
