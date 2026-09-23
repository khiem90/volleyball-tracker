# 06: Tournament console shell

**What to build:** Opening a tournament shows a console in the matchbook shell: Courts, Schedule,
Standings or Bracket, Teams, and Settings as tabs on a phone and columns on a
desktop. The console knows the roles owner, scorer, and spectator, with only
owner active for now. The Tournaments tab lists Live and Draft; a completed
tournament opens the same console read-only. The old competition detail page is
removed.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Every tab renders for every format from existing data: Standings for Round Robin and rotation formats, Bracket for elimination.
- [ ] Courts shows live matches and the queue for rotation formats, and pending and live matches for the others; tapping a match opens scoring.
- [ ] Settings tab exists with its actions arriving in 07.
- [ ] At 375px the tabs fit without horizontal scroll and no control depends on hover.
- [ ] The Tournaments tab lists Live and Draft only; a completed tournament opens read-only with every action hidden.
- [ ] The old competition detail page is deleted.
