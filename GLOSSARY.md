# Tournament Tracker

An app for running small sports tournaments from a phone: a roster of teams, tournaments in several formats, live scoring on the court, and share links for helpers and spectators.

## Language

### Teams

**Team**:
A named side that competes. Teams belong to an account's roster and can enter many tournaments, except a mixed team, which belongs to one tournament.
_Avoid_: Club, group, side

**Mixed team**:
A team dealt from the people on a by-person RSVP list when the list is imported. It exists only in the tournament it was made for, is not on the roster, and keeps its players' names. A person entered alone is a mixed team of one. The owner can rename a mixed team and add, remove, or move its players while the tournament is a draft or live.
_Avoid_: Random team, pickup team, temporary team

**Roster**:
All the teams an account has created, kept between tournaments.
_Avoid_: Team directory, team list

**Withdraw**:
Take a team out of a live tournament. Its remaining matches are forfeited and its played results stay. In a bracket its next match is forfeited to the opponent once the opponent is known. In Double Elimination the losers-bracket match it drops into is forfeited as well. In Win 2 & Out and Two Match Rotation, which schedule one match per court at a time, the team leaves the queue or its court instead: a match it is in is abandoned, the team it was playing stays on, and the next team in the queue comes on. A withdrawn team can be added again with its record kept, except in a bracket: in Round Robin its forfeited matches reopen and it gets a match against any team that joined meanwhile; in the rotation formats it rejoins at the back of the queue.
_Avoid_: Remove, delete (for a team in a live tournament)

**Forfeit**:
A match result awarded to one team because the other withdrew or did not play. It counts as a win in standings and does not change point difference.
_Avoid_: Walkover, bye (a bye is a scheduled empty slot, not a forfeit)

**Entry**:
A team's place in one tournament. An entry shows the roster team's current name and color while the tournament is a draft or live, and keeps them as they were once the tournament is completed. A mixed team's entry has no roster team behind it and carries the team's name, color, and players' names itself.
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
A new draft tournament made from an existing one, with the same format, settings, and entries. Also a new RSVP list made from an existing one, with the same by-person or by-team choice and capacity, and with no times, nobody on it, and its RSVP link off.
_Avoid_: Clone, copy, rerun

**Live**:
A tournament that has started and has matches still to play.
_Avoid_: In progress, active, running

**Completed**:
A tournament whose matches are over, either because the format finished or because the owner ended it. Nothing in it changes after that, though its owner can still duplicate it or delete it.
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

**Champion**:
In Win 2 & Out, a team that has just won two matches in a row on a court. It goes to the queue behind the team it beat, and the tournament counts how many times each team has been champion.
_Avoid_: Crown, king of the court

**Swap**:
Trading the places of two teams in a live Win 2 & Out or Two Match Rotation tournament: between two courts, or between a court and the queue. A team keeps its run when it goes to another court, and starts over when it goes to the queue.
_Avoid_: Exchange, edit match, move (for a team changing court)

### Matches

**Match**:
One contest between two teams that produces one result.
_Avoid_: Fixture

**Game**:
One scored leg inside a match played as a series. A match that is not a series has one game.

**Series**:
A match decided over a best-of-N sequence of games.

**Instant Win**:
Recording a match result by tapping the winner, without entering points. It counts as 25 to 0. Offered in Win 2 & Out, Two Match Rotation, and Round Robin when the tournament is set up with it; in a best-of each tap records one game.
_Avoid_: Quick result

**Undo**:
Taking back a result from the toast offered after an instant win. On a court in Win 2 & Out or Two Match Rotation the match is unplayed again, the match it scheduled is removed, and the teams it moved go back where they were; only a court's latest result can be undone, and only while the court has not moved on. In Round Robin an instant win is put back one game, as long as its score has not been corrected since. The tap that would complete a tournament asks for confirmation instead, since a completed tournament cannot be undone into.
_Avoid_: Revert, rollback

**Correction**:
Changing the score of a completed match from Schedule, or from the Bracket tab in a bracket. The owner can correct a Round Robin or bracket result while the tournament is live: the winner follows the new score. In Round Robin a forfeit corrected this way counts as played, and the standings recalculate. In a bracket a new winner goes through in place of the old one, a bye or forfeit the old winner was then given passes to the new one, and a change of winner is refused once the next match has started; a bye or a forfeit has no score to correct. In a best-of the corrected score is the deciding game's, and a change of winner is refused if it would leave the series undecided.
_Avoid_: Edit result, override, undo (for a scored round robin result or a bracket result)

**Quick Match**:
A standalone match between two teams that belongs to no tournament. One left without a result is abandoned and waits on the Quick page until the owner resumes it or discards it. A completed quick match counts in both teams' records.
_Avoid_: Friendly, casual match

**Discard**:
Throw away an abandoned quick match. Its score so far goes with it and it counts toward no team's record.
_Avoid_: Delete, cancel (for a quick match)

### People and access

**Owner**:
The account that created a tournament or an RSVP list. Only the owner can end, delete, rename, or share a tournament, or change its teams. Only the owner can change a list's settings, close it, remove an RSVP from it, post a notice on it, or import it.
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
Someone using the app without signing in. A guest can play a quick match that is not saved and nothing else, apart from what a tournament's scorer or spectator link gives its holder in that tournament.
_Avoid_: Anonymous user

### RSVP

**Scheduled time**:
The date and time the owner says the people on an RSVP list will play, set in the owner's own time zone. A list needs one before its RSVP link can go on. Once it passes, by the server's clock, the list is over: nobody can RSVP or withdraw, and the owner cannot reopen it. A tournament has no scheduled time of its own.
_Avoid_: Start time, started at (the moment the owner actually started a tournament)

**RSVP list**:
A list an account creates on its own, before any tournament exists, to find out who will play. Its owner chooses whether it takes RSVPs by person or by team; a list takes one kind and never both, and the choice locks once the first RSVP arrives. Deleting a list leaves the tournaments imported from it as they are. Called "the list" for short.
_Avoid_: Event, night, sign-up sheet, the RSVP (which is one answer on the list)

**RSVP**:
A signed-in person's answer on an RSVP list that they will play. On a by-person list a person RSVPs as themselves under a name they choose. On a by-team list one person RSVPs a whole team under a team name; teammates do not join it in the app, and one account holds one team per list. An RSVP is either confirmed or waitlisted, in the order it arrived. A person can withdraw an RSVP until the scheduled time, even after RSVPs have closed, and can RSVP again while they are open.
_Avoid_: Registration, sign-up, booking

**Open time**:
The moment, chosen by the owner, from which a list accepts RSVPs. It is one instant for everyone, judged by the server's clock, so nobody can RSVP before anyone else by changing their device's time.
_Avoid_: Release time, go-live

**Capacity**:
The number of confirmed RSVPs a list takes: people on a by-person list, teams on a by-team list. The owner can raise it at any time and lower it no further than the confirmed count.
_Avoid_: Max players, limit, spots (as the setting)

**Waitlist**:
The RSVPs beyond capacity, in arrival order. When a confirmed RSVP is withdrawn or removed, or capacity goes up, the first on the waitlist becomes confirmed and sees that on the RSVP page and on Home.
_Avoid_: Queue (which is the teams waiting for a court), standby, overflow

**Held spot**:
An RSVP the owner adds by name for someone without an account: a person on a by-person list, a team on a by-team list. It takes its place in arrival order like any other RSVP.
_Avoid_: Manual RSVP, placeholder, guest

**Close**:
The owner's action that stops new RSVPs on a list. A closed list can be reopened until its scheduled time. Withdrawals still work after a close. A list must be closed before it is imported.
_Avoid_: Lock, freeze, end (which completes a tournament)

**Import**:
Making a tournament's teams from a closed RSVP list, done by the list's owner while creating the tournament. Import takes the confirmed RSVPs and leaves the waitlist out. It copies the list as it stands, so a later change to the list does not reach the tournament, and one list can be imported into several tournaments. A by-team list gives one roster team per RSVP, reusing a roster team that already has that name. A by-person list is dealt into mixed teams no larger than a size the owner picks, and the owner can move people between teams before saving; a size of one makes each person a team. Two RSVPs under the same team name must be told apart before the tournament is saved. Imported teams can enter alongside teams picked from the roster. The tournament remembers the list it was imported from.
_Avoid_: Transfer, sync, convert

**RSVP link**:
The link that lets a signed-in person see a list's RSVP page: its name, scheduled time, capacity, who is in and who is waiting, and RSVP themselves. Once a tournament imported from the list is live, the same page lets them watch it as a spectator would. The owner can switch the link off, which hides the page.
_Avoid_: Invite link, sign-up link

**Notice**:
A short message the owner posts on an RSVP list for everyone who has RSVP'd, confirmed or waitlisted. It shows on the RSVP page and on Home until read. A list keeps its notices in order; the newest is shown first.
_Avoid_: Announcement, broadcast, email, notification

### Records

**History**:
An account's completed tournaments and past quick matches.
_Avoid_: Summaries, summary, archive

**Home**:
The opening screen: live tournaments to resume, a quick match button, recent results, and the RSVP lists the account is on, each until a day after its scheduled time.
_Avoid_: Dashboard, overview
