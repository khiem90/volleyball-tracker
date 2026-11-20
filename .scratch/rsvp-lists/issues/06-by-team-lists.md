# 06: By-team lists

**What to build:** A list created as by-team takes teams. One person, the
captain, RSVPs a whole team under a team name, and teammates do nothing in the
app. Capacity counts teams, the waitlist holds teams, and a held spot is a team
the owner adds by name. The page says "teams" wherever a by-person list says
"people". The by-person or by-team choice locks once the first RSVP arrives.
The account remembers its last team name apart from its last person name, so
each kind of list prefills its own.

Covers spec stories 5, 31 to 38, and the by-team half of 41.

**Blocked by:** 03, 05

**Status:** ready-for-agent

- [ ] On a by-team list the RSVP dialog asks for a team name and the optional note, and an account holds one team per list.
- [ ] The page's headings, counts, standing, and empty states read in teams on a by-team list and in people on a by-person list. The wording comes from one pure function with tests for both.
- [ ] The account's own document stores a remembered team name beside the remembered person name, and the rules allow those two fields and nothing else. A rules test covers both fields and a third.
- [ ] A by-team RSVP prefills from the remembered team name, and a by-person RSVP from the remembered person name. Pure tests cover both.
- [ ] The pure setup problems refuse a change of by-person or by-team once the list has an RSVP, and the page shows the choice read-only with a line saying why. A pure test covers it.
- [ ] Add held spot on a by-team list asks for a team name.
- [ ] Home's row for a by-team list reads as the team being in or waiting.
- [ ] A data-module test on the emulator RSVPs a team, checks the remembered team name leaves the person name alone, and promotes a waitlisted team when capacity goes up.
