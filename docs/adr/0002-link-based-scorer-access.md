---
status: accepted
---

# Scorers act through a revocable link, without signing in

Helpers keeping score on a court will not create an account, and rotation formats with several courts need several phones scoring at once. The old admin token was a Math.random string stored in plain text in a document every spectator could read. We decided that each tournament has two revocable links: a scorer link whose holder can record results, use instant win, reorder the queue, and swap courts, and a spectator link whose holder can only watch. Ending, deleting, renaming, and changing a tournament's teams stay with the owner.

## Considered options

- Owner-only scoring. Rejected: it makes multi-court nights impossible from one phone.
- Named collaborators who sign in. Rejected: the people holding the phone at the net will not sign in.

## Consequences

- Anyone who obtains a scorer link can score until the owner regenerates it. The link is the credential.
- The scorer secret must never be readable through the spectator path, so it cannot live in the same document spectators read.
- The last result of a round robin or a bracket completes the tournament, so a scorer may mark one of those completed with a winner from its teams. The rules cannot check that every match was played, so someone who writes to Firestore directly with a scorer link could complete a round robin or a bracket early. The rotation formats finish only through End, which stays with the owner. Regenerating the link stops it.
