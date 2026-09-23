# 09: Rotation management

**What to build:** On a live Win 2 & Out or Two Match Rotation tournament, the owner can add a team
to the queue, withdraw a team, change the number of courts, swap teams between
courts, and reorder the queue with tap controls.

**Blocked by:** 03, 06

**Status:** ready-for-agent

- [ ] Adding a team while live appends it to the queue.
- [ ] Withdraw removes the team from the queue or its court; the court's other team stays in place.
- [ ] Reducing courts sends the removed court's teams to the front of the queue; increasing courts fills from the queue.
- [ ] Swap and reorder work with tap controls; no drag is required.
- [ ] Engine tests cover each command.
