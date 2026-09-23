# 07: Console settings actions

**What to build:** From the Settings tab the owner can rename a tournament, duplicate it into a new
draft, end it in any format, and delete it.

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] Rename updates the name everywhere it appears.
- [ ] Duplicate creates a new draft with the same entries and settings and opens it.
- [ ] End moves a Live tournament to Completed, freezes standings, and works for every format; the tournament then shows in the completed list.
- [ ] Delete removes the tournament and its matches and returns to the Tournaments tab.
- [ ] Engine tests cover End and every status transition.
