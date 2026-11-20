---
status: accepted
---

# An RSVP list stands on its own, and a tournament imports a copy

RSVPs shipped as a property of a tournament. The settings sat on the tournament document and the RSVPs in a subcollection under it. That made the owner pick a format and enter teams before knowing who was coming, and the list could never become the tournament's teams. We decided that an RSVP list is its own thing, created before any tournament exists, with its own owner, name, scheduled time, capacity, open time, RSVP link, and notices. A list takes RSVPs by person or by team, as its owner chooses, and the choice locks at the first RSVP. Creating a tournament can import a closed list: the confirmed RSVPs are copied into the tournament's teams once, and the tournament keeps only the id of the list it came from, which the RSVP page uses to offer the tournament to watch. A tournament no longer has RSVP settings or a scheduled time.

## Considered options

- Keep RSVPs on the tournament and add a step that turns the list into entries. Rejected: the owner still has to create the tournament, format and all, before the first RSVP, and a list could feed only that one tournament.
- A live connection, where a withdrawal or a new RSVP after import changes the tournament's teams. Rejected: the owner moves people between mixed teams by hand after import, and a list that keeps writing would undo that work. A live tournament's teams change only through Withdraw.
- Both tournament RSVPs and standalone lists. Rejected: two sets of rules and two pages for one job.

## Consequences

- ADR-0004 still holds, reading "list" where it says "tournament". Standing is derived from arrival order and nothing stores it.
- A list has no status of its own. Its scheduled time, judged by the server's clock, ends it: after that nobody can RSVP or withdraw, and the owner cannot reopen it. Starting the tournament used to do this.
- Someone who withdraws after an import is still in the tournament. The owner takes them out by hand.
- One list can be imported into several tournaments, and deleting a list leaves those tournaments as they are.
- The link is stored on both sides. The tournament holds `rsvpListId`, and the list holds `tournamentIds`, the ids of the tournaments imported from it. The list's copy is there so the RSVP page can read each tournament by its id, with no query across other accounts' tournaments. The save that creates a tournament appends its id to the list in the same batch. Deleting a tournament takes its id off the list in a separate write after the delete, and that write may fail without failing the delete, so an id can outlive its tournament. The page skips an id that leads nowhere.
- A list's id says nothing about who owns it, since any account can create a list under an id it knows, a deleted list's id included. The rules let a watcher into an imported tournament only when the list it names has its RSVP link on and the same owner as the tournament.
- The rules cannot compare one RSVP with another, so a by-team list cannot refuse a second team under a name already taken. Import flags the clash and the owner renames one before saving.
- RSVPs taken on tournaments before this change are discarded with no migration. The owner confirmed they are disposable.
