# Tournament Tracker

An app for running small sports tournaments from a phone: a roster of teams, tournaments in several formats, live scoring on the court, and share links for helpers and spectators.

## Language

### Teams

**Team**:
A named side that competes. Teams belong to an account's roster and can enter many tournaments.
_Avoid_: Club, group, side

**Roster**:
All the teams an account has created, kept between tournaments.
_Avoid_: Team directory, team list

**Withdraw**:
Take a team out of a live tournament. Its remaining matches are forfeited and its played results stay.
_Avoid_: Remove, delete (for a team in a live tournament)

**Forfeit**:
A match result awarded to one team because the other withdrew or did not play. It counts as a win in standings and does not change point difference.
_Avoid_: Walkover, bye (a bye is a scheduled empty slot, not a forfeit)

**Entry**:
A team's place in one tournament. An entry shows the roster team's current name and color while the tournament is a draft or live, and keeps them as they were once the tournament is completed.
_Avoid_: Participant, registration

### Tournaments

**Tournament**:
A run of matches between a chosen set of teams under one format, owned by one account.
_Avoid_: Competition, event, session

**Format**:
The rule set that decides which matches a tournament plays and how it ends. The five formats are Round Robin, Single Elimination, Double Elimination, Win 2 & Out, and Two Match Rotation.
_Avoid_: Type, mode

**Draft**:
A tournament that has been created but not started. Its teams and settings can still change.

**Duplicate**:
A new draft tournament made from an existing one, with the same format, settings, and entries.
_Avoid_: Clone, copy, rerun

**Live**:
A tournament that has started and has matches still to play.
_Avoid_: In progress, active, running

**Completed**:
A tournament whose matches are over, either because the format finished or because the owner ended it.
_Avoid_: Ended, finished, closed

**End**:
The owner's action that moves a tournament to Completed. For Win 2 & Out and Two Match Rotation it is the only way to finish.
_Avoid_: Finish, close, stop

**Court**:
Where one match is played. A tournament with several courts plays several matches at once. Tournaments may display this word as "field" or "table"; Court is the name for the concept.
_Avoid_: Venue

**Standings**:
The ranked table of teams in a tournament.
_Avoid_: Leaderboard, league table, table

**Bracket**:
The tree of matches in a Single or Double Elimination tournament.

**Queue**:
The teams waiting for a court in Win 2 & Out and Two Match Rotation.
_Avoid_: Waiting list, line

### Matches

**Match**:
One contest between two teams that produces one result.
_Avoid_: Fixture

**Game**:
One scored leg inside a match played as a series. A match that is not a series has one game.

**Series**:
A match decided over a best-of-N sequence of games.

**Instant Win**:
Recording a match result by tapping the winner, without entering points.
_Avoid_: Quick result

**Quick Match**:
A standalone match between two teams that belongs to no tournament.
_Avoid_: Friendly, casual match

### People and access

**Owner**:
The account that created a tournament. Only the owner can end, delete, or change its teams.
_Avoid_: Creator, admin

**Scorer**:
Anyone holding a tournament's scorer link. A scorer records results without signing in.
_Avoid_: Admin, editor

**Spectator**:
Anyone holding a tournament's spectator link. A spectator can only watch.
_Avoid_: Viewer

**Scorer link**:
A revocable link that makes its holder a scorer for one tournament.
_Avoid_: Admin token, admin link

**Spectator link**:
A revocable link that makes its holder a spectator for one tournament.
_Avoid_: Share code, view link

**Guest**:
Someone using the app without signing in. A guest can play a quick match that is not saved and nothing else.
_Avoid_: Anonymous user

### Records

**History**:
An account's completed tournaments and past quick matches.
_Avoid_: Summaries, summary, archive

**Home**:
The opening screen: live tournaments to resume, a quick match button, and recent results.
_Avoid_: Dashboard, overview
