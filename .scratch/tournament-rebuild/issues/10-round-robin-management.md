# 10: Round robin management

**What to build:** On a live Round Robin tournament, adding a team appends its matches, withdrawing
a team forfeits its remaining matches, a completed result can be corrected from
Schedule, and standings show forfeit marks and recalculate.

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] Adding a team appends a match against every active entry.
- [ ] Withdraw turns the team's pending matches into forfeits won by the opponent, with no points for or against.
- [ ] Editing a completed score from Schedule recalculates standings.
- [ ] Standings show a forfeit mark on forfeited results and exclude them from point difference.
- [ ] Engine tests cover add while live, withdraw, edit result, and standings with forfeits.
