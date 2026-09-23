# 13: Share links

**What to build:** From Settings the owner turns a spectator link on or off and regenerates a
scorer link. Opening the scorer link gives the phone a silent identity and the
console with scorer permissions; opening the spectator link shows the console
read-only; a link that is off shows not found.

**Blocked by:** 07

**Status:** ready-for-agent

- [ ] The spectator link opens the read-only console without sign-in and updates live.
- [ ] Turning the spectator link off makes it show not found; a rules test confirms the read is denied.
- [ ] A scorer can score, complete matches, use instant win, reorder the queue, and swap courts, and cannot rename, end, delete, or change teams; rules tests cover both sides.
- [ ] After regenerating the scorer link, a phone on the old link is refused on its next write; a rules test confirms it.
- [ ] Two phones on the scorer link complete matches on different courts at the same time without losing either result.
- [ ] The scorer key is unreadable by anyone but the owner; a rules test confirms it.
