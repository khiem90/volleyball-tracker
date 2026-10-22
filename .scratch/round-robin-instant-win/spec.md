# Instant Win in Round Robin

Status: ready-for-agent

Agreed in a grilling session on 2026-10-22 and built on `claude/festive-fermat-zsq53w`
the same day; the tickets under `issues/` record what landed. Vocabulary is in
`CONTEXT.md`. Results travel through the command queue and are checked by the
Firestore rules as ADR-0003 describes; nothing here changes that.

## Problem Statement

I run Round Robin nights the way I run Win 2 & Out nights: nobody keeps score,
we just know who won. Instant Win exists for exactly that, but only the two
rotation formats offer it. When I create a Round Robin the Results choice is
not there, the Settings tab says "Instant win: Off", and every match has to be
opened on the scoring page and given a made-up score before the standings
move. On a night with fifteen or twenty-eight matches that is a lot of typing
for a result that is one word: who won.

Underneath, the Instant Win setting, the engine command, and the undo toast all
work for any format. Only the creation page hides the setting for Round Robin,
and the console only puts the win buttons on court cards, which Round Robin
does not have.

## Solution

Round Robin reuses the Instant win setting, chosen under Advanced settings when
the tournament is created, with the same help note as the rotation formats plus
one sentence: an instant win counts as 25 to 0.

When it is on, every match on the Schedule tab that is still to be played
carries a button per team, "Reds won" and "Blues won", for the owner and anyone
on the scorer link. A tap records the result at once as 25 to 0 and the
standings move. The row itself still opens the scoring page, so a close match
can be scored point by point whenever someone wants to. In a best-of, each tap
records one game, and the row shows the series count between taps.

A tap offers the same Undo toast a rotation tap does. Undo reopens the match,
or puts a best-of back one game, as long as the result still stands as the tap
made it. A score the owner has corrected since is newer intent, and the undo is
refused rather than applied over it.

The one tap that would complete the tournament, the deciding game of the last
unplayed match, asks first: "This is the last match. Recording Reds as the
winner completes the tournament." Every other tap is instant. A completed
tournament changes nothing afterwards, so this is the only tap that cannot be
taken back, and the only one that gets a confirm.

## User Stories

1. As an owner creating a Round Robin, I want the Instant win choice under Advanced settings, so that a night without scorekeeping is set up the same way a rotation night is.
2. As an owner creating a Round Robin, I want the help note to say an instant win counts as 25 to 0, so that I know what the standings will show before I pick it.
3. As an owner, I want the Settings tab to show "Instant win: On" for a Round Robin set up with it, so that scorers can see which kind of night it is.
4. As an owner, I want Duplicate to carry the Instant win choice into the new draft, so that a weekly league is set up once.
5. As a scorer, I want "Reds won" and "Blues won" buttons on each unplayed Schedule row, so that a result is one tap and I never leave the schedule.
6. As a scorer, I want the row itself to still open the scoring page, so that a close match can be scored point by point.
7. As a scorer, I want the result to show on the row the moment I tap, so that I can look back up at the court without waiting on the network.
8. As a scorer, I want the standings to move the moment I tap, so that the table on the wall is always current.
9. As a scorer, I want the win buttons on a match that is being scored point by point too, so that a match abandoned mid-game can still be given a result from the schedule.
10. As a scorer, I want no win buttons on a completed, forfeited, or bye row, so that a finished result cannot be overwritten by a stray tap.
11. As a scorer, I want a double tap on a row to record one result and not two, so that the next game of a best-of is never recorded by accident.
12. As a scorer, I want an Undo toast after a tap, so that a wrong tap is taken back at once without finding the owner.
13. As a scorer, I want Undo to work on a tap the server has not confirmed yet, so that fixing a mistake is never slower than making it.
14. As a scorer, I want Undo to reopen the match exactly as it was, with "vs" on the row and the standings back, so that nothing of the wrong result lingers.
15. As a scorer in a best-of, I want one tap per game, so that a 2–1 series is still a 2–1 series.
16. As a scorer in a best-of, I want the row to show the game count between taps, so that I know which game comes next.
17. As a scorer in a best-of, I want Undo to put the series back one game, so that a wrong tap on game two does not throw away game one.
18. As a scorer, I want an undo of an earlier tap in a best-of refused once the next game has points on the board, so that an undo never lands on top of a game in play.
19. As the owner, I want an undo refused once I have corrected that match's score, so that my correction is never wiped by a stale toast on someone else's phone.
20. As the owner, I want an undo refused when my correction gave the match to the other team, so that a toast from before the correction cannot reopen a result I settled.
21. As the owner, I want to correct an instant win from Schedule like any other result, so that a tapped 25 to 0 can be given the real score afterwards.
22. As a scorer, I want the tap that would complete the tournament to ask first, so that the final result is never a mis-tap.
23. As a scorer, I want the confirm to name the team I tapped, so that I can see what I am about to record.
24. As a scorer, I want no Undo toast for the tap that completed the tournament, so that I am never offered an undo that would be refused.
25. As a scorer, I want every tap that does not complete the tournament to record without a confirm, so that the night keeps its pace.
26. As a scorer, I want a tap that is reversed by the server, because the rules refused it or the link went stale, to come off the row and its undo entry to disappear, so that I never undo a result that no longer exists.
27. As a scorer, I want a reversed tap reported on the console's error line, so that there is one place to look when something did not take.
28. As a spectator, I want to see tapped results and the standings as they land, with no buttons, so that watching is unaffected.
29. As anyone reading the standings, I want an instant win to count as 25 to 0, so that the standings are the same as a rotation night's and a tapped win is explainable.
30. As a scorer in a best-of, I want each tapped game to count 25 to 0 in points for and against, so that a best-of counts the same whether tapped or scored.
31. As the owner, I want a withdrawn team's remaining matches forfeited as before, with no win buttons on them, so that Instant win changes nothing about withdrawal.
32. As the owner, I want a team added to a live Round Robin to get its matches with win buttons like the rest, so that a late team is scored the same way.
33. As the owner, I want a Round Robin with Instant win off to look exactly as it does today, so that nothing changes for leagues that keep score.
34. As the owner, I want a rotation tournament to be unaffected, so that the court cards and their undo keep working as they do.
35. As the owner, I want a bracket to be unaffected, so that Instant win stays off there.
36. As a developer, I want the engine's Round Robin undo tested with plain values, so that the series arithmetic is pinned down.
37. As a developer, I want the engine untouched beyond the undo command, so that the instant win itself keeps its one code path for every format.
38. As a developer, I want no Firestore rules change, so that scorer access stays exactly what ADR-0002 and ADR-0003 describe.

## Implementation Decisions

### The setting

- The creation page's table of which settings a format uses offers Instant win for Round Robin as well as the rotation formats, so the Results choice appears under Advanced settings and the chosen value is stored. Brackets still do not use it.
- The note under the choice gains "An instant win counts as 25 – 0." for every format, since rotation already records that score.
- The setting is chosen at creation only, like every other setting. Duplicate carries it over.

### The engine

- The instant win command is unchanged: it completes one game at 25 to 0 and settles the format, which in Round Robin means finishing the tournament when every match is played.
- The undo command gains an optional winner, the team the instant win was given to. For a rotation court the winner is ignored and the court's undo record decides, as today.
- In Round Robin the undo puts the match back one game: both scores to zero, the winner's game count down by one, the series game back by one, and the match pending when no game remains played and in progress otherwise. The winner and completion time are removed. Matches are independent, so nothing else moves.
- The undo is refused, with the existing "can no longer be undone" error, unless the result still stands as the tap made it: on a completed match, the named winner at 25 to 0; on a series in progress, the named winner still holding a game and the next game with no points yet. A forfeit, a bye, an unplayed match, a winner not in the match, or no winner at all are refused. The existing live check refuses an undo on a completed tournament.
- A corrected score fails the 25 to 0 check and is left alone; a correction that gave the match to the other team at the same score fails the winner check. That is why the command carries the winner rather than relying on the score.
- Nothing in the engine knows about the confirm step: the console decides when to ask.

### The undo toast

- An undo entry carries the winner, and the toast passes it to the undo command. Entries for rotation courts carry it too and the engine ignores it there.
- The instant win hook pushes the entry as soon as the win is applied locally, as the instant-results work decided, and withdraws it if the write fails. It pushes no entry when the applied command left the tournament completed.
- The toast's depth, five entries, is unchanged. An older Round Robin tap pushed out of the toast is no longer undoable; the owner corrects it instead.

### The console

- A pure helper says whether the Schedule tab offers win buttons: a live Round Robin with Instant win on, to a role that may score. A second helper says which rows take them: a match still to be played with both teams known, so never a completed, forfeited, or bye row.
- The match row takes an optional instant win handler and, when given one, ends in a button per team beneath the row body. The buttons sit outside the row's link, which stays the way to the scoring page. The buttons use the court card's wording and styling: "Reds won".
- A pure helper says whether a tap would complete the tournament: Round Robin, every other match completed, and this game decides the match, which in a best-of means the tapped team is one game short. The console holds such a tap and opens the existing confirm dialog, titled "This is the last match", naming the team and saying that recording it completes the tournament and nothing can be changed after. Confirm records the tap; cancel drops it.
- The double-tap guard from the instant-results work is keyed by court on a court card and by match on a Schedule row, since a Round Robin match has no court. The guard runs before the confirm check, so the confirm cannot be opened twice.
- A refused or reversed tap lands on the console's error line as today, and the undo entry for it is withdrawn.

### Data and rules

- No document shape changes. An instant win is a completed match at 25 to 0 like any other, and an undo is a match update that clears the result, which the rules already allow a scorer while the tournament is live.
- No rules change. A scorer may already complete a tournament; the confirm step guards that tap on the phone.

### Vocabulary

- Instant Win: now says it counts as 25 to 0, is offered in the rotation formats and Round Robin, and records one game per tap in a best-of.
- Undo: now covers a Round Robin instant win, put back one game while its score has not been corrected, and says the tap that would complete a tournament asks for confirmation instead.
- Correction: its "avoid undo" line narrows to scored Round Robin results and brackets.

## Testing Decisions

A good test exercises what a person or another module can observe: the match and tournament after a command, which commands are refused and with what message, and what a pure helper answers for a given tournament and matches. No test reaches into a component or asserts on how the toast stores its entries.

Three seams, all existing, and one is the engine suite that every format rule already uses:

- **Engine**, tested with plain values through the command runner, as the undo and round robin suites do. Cases: a tap records 25 to 0 and the standings count it; a best-of takes one tap per game and completes on the deciding one; the last tap completes the tournament; undo reopens a single-game match exactly and leaves other matches alone; undo puts a best-of back one game at a time; undo is refused after a correction, after a correction that swapped the winner, once the next game has points, on a forfeit, on an unplayed match, with a winner not in the match or no winner, and once the tournament is completed; a bracket result is still refused by format.
- **Console helpers**, pure, as the existing console suite tests access and the tap guard. Cases: the "completes the tournament" check on the last match, on a non-last match, inside a best-of where only the deciding tap counts, and never outside Round Robin; the Schedule's offer of win buttons by format, status, setting, and role; which rows take a button across pending, in-progress, and completed.
- **Creation**, pure, as the existing suite tests which settings a format keeps. Case: Round Robin keeps Instant win.

No component or hook tests are added; the repo has none, and the row, the confirm, and the toast entry are thin over the helpers above. The emulator-backed rules and tournament suites are untouched because no rule or document shape changes.

## Out of Scope

- Instant Win for Single or Double Elimination.
- Switching Instant win on or off after a tournament is created.
- An Undo toast for point-scored Round Robin results, which stay with Correction.
- Reopening a completed tournament, by undo or otherwise.
- A different score than 25 to 0, or a win that carries no points.
- Win buttons on the scoring page.
- Changing the toast's depth or the tap guard's length.

## Further Notes

- The confirm reuses the console's confirm dialog, whose button is styled as destructive. If that reads too alarming for "This is the last match", it is a one-line tone change.
- In a tournament that mixes tapped and scored results, a tapped win moves point difference by 25, more than most scored wins. The help note's sentence is there so the owner picks with that in mind.
- A game of a best-of tapped on one phone and then scored by points on another is handled by the refusals above: the undo of the tapped game is refused once the next game has points, and refused by score once the match is completed by points.
