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

- [x] The mark takes a name, a color, and a size, and draws the shield with the name's first letter. The shield's corners are 28% on top and 44% on the bottom, from the prototype.
- [x] The letter color function returns ink or white for any color. For every color in the roster palette its choice gives at least 3 to 1. Tests pin ink on the palette's yellow and white on its indigo.
- [x] The fallback color function returns a palette color for a name, the same one every time. Tests cover a stable result and an empty name.
- [x] Every place that drew a crest draws the mark, with the team's stored color when it has one. A mixed team's mark uses its entry's name and color.
- [x] The shape the screens pass for a team carries a color. The crest field still exists and nothing reads it for drawing.
- [x] The score line takes two sides and two scores in a row size and a court size. It puts the winner or leader in bold and dims the other side, and it shows a "vs" pill when there is no score.
- [x] The score line shows each side's mark and name, and truncates a long name without moving the score off center.
- [x] The color picker, the palette, and the rule that gives a new team the least-used color are unchanged.
- [x] The design-system document describes the mark and the score line.
- [x] The 56 test files outside the design folder pass unedited, apart from new cases added beside the team color tests. Lint and the type checker are clean.

## Comments

- 2026-11-25: Built test-first. Nobody has looked at the mark or the score line in a browser yet. The tests cover the two color rules and which side is bold, and the truncation and the centered score rest on the layout classes alone.
- Ink wins on eight of the ten palette colors. Only indigo and purple get a white letter, so most marks read dark on bright.
- Beyond the criteria: the team shapes and `teamStats` moved to `src/lib` with the old paths left as re-exports, the old crest-and-name row is `TeamName` in `components/shared`, and a readiness reading short of ready is `ink-soft` where it was red. No test file existed for the team colors, so the new cases are `src/__tests__/roster/teamColors.test.ts`, and the bold-side rule has its own file under `src/__tests__/scoreLine/`.
