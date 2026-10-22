# Instant Win in Round Robin

Status: ready-for-human

Agreed in a grilling session on 2026-10-22. Vocabulary is in `CONTEXT.md`.

## Problem Statement

Instant Win, recording a result by tapping the winner, exists as a tournament
setting and as an engine command, but only the two rotation formats offer it.
The creation page hides the setting for Round Robin and the console only puts
win buttons on court cards, which Round Robin does not have. A Round Robin night
where nobody keeps score still has to open the scoring page for every match and
type a score in.

## Solution

Round Robin reuses the existing Instant Win setting, chosen at creation under
Advanced settings. When it is on, every pending or live row on the Schedule tab
carries two "X won" buttons for the owner and anyone on the scorer link. A tap
records the result as 25 to 0 for one game, so a best-of series takes one tap
per game. The row itself still opens the scoring page, so a match can be scored
point by point whenever someone wants to.

A tap pushes the same Undo toast a rotation tap does. Undo reopens the match,
or puts a series back one game, as long as the result still stands as the tap
made it: a score the owner has corrected since is newer intent and the undo is
refused. The one tap that would complete the tournament asks for confirmation
first instead of offering Undo, since Completed means nothing changes after.

## User Stories

1. As an owner creating a Round Robin, I want the Instant win choice under Advanced settings, so that a night without scorekeeping is set up the same way a rotation night is.
2. As a scorer, I want "X won" buttons on each unplayed Schedule row, so that a result is one tap and I never leave the schedule.
3. As a scorer, I want the row to still open scoring, so that a close match can be scored point by point.
4. As a scorer, I want an Undo toast after a tap, so that a wrong tap is taken back at once.
5. As a scorer in a best-of, I want one tap per game and Undo to put the series back one game, so that the series stays meaningful.
6. As the owner, I want an undo refused once I have corrected that match's score, so that my correction is never wiped by a stale toast.
7. As a scorer, I want the tap that would complete the tournament to ask first, so that the final result is never a mis-tap.
8. As anyone reading the standings, I want an instant win to count as 25 to 0, so that the standings stay explainable and the same as rotation.
9. As a developer, I want the engine's Round Robin undo tested with plain values, so that the series arithmetic is pinned down.

## Implementation Decisions

- `settingsUsedBy` offers `instantWin` for Round Robin as well as the rotation formats. The creation note gains "An instant win counts as 25 – 0." for every format.
- The engine's `undo_result` command carries an optional `winnerId`. For Round Robin the engine reopens the match one game: scores to zero, the winner's game count down by one, the series game back by one, `pending` when no game remains played and `in_progress` otherwise, `winnerId` and `completedAt` removed. Refused unless the match still holds that winner at 25 to 0 (a completed match), or the winner still holds the game and the next game has no points yet (a series in progress). Forfeits and byes are never undoable. `requireLive` still refuses an undo on a completed tournament.
- The undo toast entry carries the winner, and the toast passes it to the command.
- `MatchRow` takes an optional `onInstantWin`; the Schedule tab passes it for pending and in-progress playable rows when the tournament is a Round Robin with Instant win on and the role may score. The buttons sit outside the row's link, which stays the way to scoring.
- `completesTournament` in `src/lib/console.ts` says whether a tap would decide the last unplayed match. The console holds that tap and opens a confirm dialog; the tap runs on confirm. No Undo entry is pushed for a tap that completed the tournament.
- The double-tap guard is keyed by match for Round Robin, since a match has no court.
- No Firestore rules change: scorers already write match results and complete tournaments while a tournament is live.
- Glossary: Instant Win no longer implies rotation only; Undo covers a Round Robin instant win; Correction's "avoid" line narrows to scored results.

## Testing Decisions

- Engine: a Round Robin instant win records 25 to 0 and the standings count it; undo reopens a single-game match, puts a best-of back one game, refuses after a correction, refuses a forfeit, and refuses once the tournament is completed.
- Console: `completesTournament` on the last match, on a non-last match, and inside a series where the tap does not decide.
- Creation: Round Robin keeps `instantWin`.

## Out of Scope

- Instant Win for brackets.
- Switching Instant win on or off after creation.
- An Undo toast for point-scored Round Robin results, which stay with Correction.
- Reopening a completed tournament.
