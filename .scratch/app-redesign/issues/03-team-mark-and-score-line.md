# 03: Team mark and score line

**What to build:** Wherever the app showed one of the eight crests, it now
shows the team's mark: a small rounded shield with the team's initial on the
team's own color. The owner sees it at once on every screen that shows a team,
because the old crest component now draws the mark. The score line also exists
as a shared component in two sizes, ready for the screens that follow. No
screen uses it yet.

The mark's letter is ink or white, whichever contrasts more with the team's
color. A team or entry with no color gets a palette color picked by a hash of
its name, so the same team always gets the same color and no mark is blank.
Both rules are pure functions in the team colors module.

Covers spec stories 24 to 28, 31, and 32.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] The mark takes a name, a color, and a size, and draws the shield with the name's first letter. The shield's corners are 28% on top and 44% on the bottom, from the prototype.
- [ ] The letter color function returns ink or white for any color. For every color in the roster palette its choice gives at least 3 to 1. Tests pin ink on the palette's yellow and white on its indigo.
- [ ] The fallback color function returns a palette color for a name, the same one every time. Tests cover a stable result and an empty name.
- [ ] Every place that drew a crest draws the mark, with the team's stored color when it has one. A mixed team's mark uses its entry's name and color.
- [ ] The shape the screens pass for a team carries a color. The crest field still exists and nothing reads it for drawing.
- [ ] The score line takes two sides and two scores in a row size and a court size. It puts the winner or leader in bold and dims the other side, and it shows a "vs" pill when there is no score.
- [ ] The score line shows each side's mark and name, and truncates a long name without moving the score off center.
- [ ] The color picker, the palette, and the rule that gives a new team the least-used color are unchanged.
- [ ] The design-system document describes the mark and the score line.
- [ ] The 56 test files outside the design folder pass unedited, apart from new cases added beside the team color tests. Lint and the type checker are clean.

## Comments
