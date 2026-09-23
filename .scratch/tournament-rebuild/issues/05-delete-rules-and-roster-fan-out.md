# 05: Delete rules and roster fan-out

**What to build:** Deleting a team that is in a live tournament is refused and Withdraw is offered
instead. Deleting a team removes its entries from drafts. Renaming or recoloring
a team flows into its draft and live entries and leaves completed tournaments
untouched. The roster gets a select mode with bulk delete.

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [ ] Delete on a team with a live entry shows a refusal that names the tournament and links to Withdraw (Withdraw itself lands in the format management tickets).
- [ ] Deleting a team removes its entry from every draft tournament.
- [ ] Renaming a team updates the entry name on a live tournament's standings; a completed tournament keeps the old name.
- [ ] Select mode lets several teams be chosen and deleted behind one confirm; teams with live entries are skipped and named.
- [ ] A unit test covers which entries a rename touches.
