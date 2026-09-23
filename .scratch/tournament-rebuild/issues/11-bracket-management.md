# 11: Bracket management

**What to build:** On Single and Double Elimination tournaments, withdrawing a team advances its
opponent by forfeit, a completed result can be corrected until the dependent
match has started, adding a team after start is refused, brackets with a team
count that is not a power of two complete on their own, and completed
double-elimination matches no longer open a Start dialog.

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] Withdraw forfeits the team's next match and advances the opponent.
- [ ] Editing a completed result is allowed until the dependent match has started, then refused with the reason shown.
- [ ] Adding a team after start is refused with the reason shown.
- [ ] A five-team and a six-team single elimination tournament complete when the final ends.
- [ ] Tapping a completed double-elimination match opens its result, not a Start dialog.
- [ ] Engine tests cover withdraw, edit-until-started, the add refusal, and completion for power-of-two and non-power-of-two counts.
