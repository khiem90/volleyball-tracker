# App redesign

Status: ready-for-agent

Agreed in a grilling session that ran from 2026-11-23 to 2026-11-25. Vocabulary
is in `GLOSSARY.md`. The owner picked the look from nine prototype directions
of Home and the tournament console, then picked the glyphs from three options.
The pictures are in `.scratch/app-redesign/directions/`: `d-matchday.png` is
the chosen direction and `d-icons-home.png` and `d-icons-console.png` show the
glyph options, of which option 1 won. The prototype's code and the pictures
of the other directions are on the throwaway branch `prototype/app-redesign`,
which never reaches `master`.

This spec replaces the matchbook design that `.scratch/tournament-rebuild/spec.md`
introduced and `.scratch/design-consistency/spec.md` finished. It touches no
ADR. No glossary term moves, because the redesign changes how things look and
nothing about what they are.

## Problem Statement

I like everything the app does and I don't like how it looks. The matchbook
theme is cream paper, navy ink, coral accents, square corners, and condensed
uppercase headings. It reads as a printed program, and I want an app that reads
like the scores apps I already use on my phone.

The theme also never looked the way it was drawn. Its two typefaces, Oswald and
Outfit, never applied on any screen, because the stylesheet reads the font
variables one element above where the layout sets them. Every page has been
showing the browser's fallback font since the rebuild.

Teams are shown with one of eight ready-made crests picked by a hash of the
team's name. The crest has nothing to do with the team, and it ignores the
color I chose for that team, which is the one thing I recognize a team by on
the scoring page.

The volleyball tools still wear the look from before matchbook, so the app has
two designs today and would have three after any partial redesign.

## Solution

Every screen takes one new look, called Matchday in the prototype. White cards
with rounded corners sit on a pale grey ground. One green marks the next thing
to tap, anything live, and anything confirmed. Red appears only on destructive
actions. Figtree is the only typeface, and it applies.

A match is one centered line: team, score, team, with the winner in bold and
the loser dimmed. A court on the console is the same line made large, with the
score as the biggest thing on the card. A team's mark is a small shield with
the team's initial on the team's own color. The eight crests go.

The icons keep their meanings and get new drawings in one outline style, with
the active tab drawn filled. The app's crest, wordmark, and home-screen icon
are redrawn to match.

Nothing changes in behavior, copy, routes, the five tabs, or any flow. A
screen's layout may change where the new look needs it. The scoring page keeps
its full-bleed team-color panels. Desktop keeps today's structure. There is one
light theme.

The volleyball tools take the same look, so the app has one design when the
work lands. The work lands all at once: I never open the app and find half of
it redesigned.

## User Stories

### The whole app

1. As an owner, I want every screen to share one look, so that the app feels like one product from sign-in to the final result.
2. As an owner, I want the app to look like the scores apps I already use, so that it feels at home on my phone.
3. As an owner, I want every button, link, and tab to do what it does today, so that I don't have to relearn anything.
4. As an owner, I want every label and message to keep its wording, so that the redesign changes what I see and nothing I read.
5. As an owner, I want the same five tabs in the same order, so that my thumb still finds them.
6. As an owner, I want every link I have saved or shared to open the same page, so that old scorer, spectator, and RSVP links keep working.
7. As an owner, I want the redesign to arrive in one update, so that I never run a tournament in a half-redesigned app.
8. As an owner on a laptop, I want the pages to keep today's desktop structure in the new look, so that the wide layout I know is still there.
9. As an owner, I want one light theme, so that the app looks the same every time I open it.

### Color and type

10. As an owner, I want one green to mean "tap here next", "live", and "confirmed", so that I can find the next action on any screen at a glance.
11. As an owner, I want red to appear only on destructive actions, so that red always means "careful".
12. As an owner, I want the app's typeface to load and apply on every screen, so that the design I approved is the design I get.
13. As an owner, I want headings in sentence case at normal width, so that long tournament and team names fit and read easily.
14. As an owner reading outdoors, I want body text, secondary text, and tab labels to meet the 4.5 to 1 contrast level, so that I can read the app in gym lighting and in sun.
15. As an owner, I want white text on a green button to meet the same contrast level, so that the main button on each screen is the easiest thing to read.
16. As an owner who uses the keyboard, I want a visible focus ring on every control, so that I can see where I am.

### Cards, rows, and controls

17. As an owner, I want related things grouped in white cards on a pale ground, so that I can see where one group ends and the next begins.
18. As an owner, I want each card on Home headed by an icon, a title, and a count, so that I can scan the page by its headings.
19. As an owner, I want every tappable control to be at least 44px tall, so that I can hit it with a thumb while holding a clipboard.
20. As an owner, I want the main action on a screen to be a full-width green button, so that it is the first thing I see.
21. As an owner, I want secondary actions to be quieter grey or black pills, so that they don't compete with the main action.
22. As an owner, I want a status shown as a small chip beside the thing it describes, so that I read the name first and the status second.
23. As an owner, I want disabled controls to look disabled, so that I don't tap something that can't respond.

### Teams

24. As an owner, I want a team shown as a shield with its initial on the team's own color, so that I recognize a team by the color I gave it.
25. As an owner, I want the same mark for a team on Home, the console, History, and the Teams tab, so that a team looks like itself everywhere.
26. As an owner, I want the initial on the mark to stay readable on a yellow team and on an indigo team, so that no color makes its own letter disappear.
27. As an owner, I want a mixed team to get a mark from its entry's name and color, so that mixed teams look like any other team in a tournament.
28. As an owner, I want a team with no color to get a sensible one, so that no mark is ever blank.
29. As an owner, I want the color picker and the way new teams get colors to work as they do today, so that my roster is untouched.
30. As an owner, I want my roster listed with each team's mark and name, so that the Teams tab matches what I see in a tournament.

### Matches and scores

31. As an owner, I want a finished match shown as one centered line of team, score, team, so that I read a result the way I read it in any scores app.
32. As an owner, I want the winner's name and score in bold and the loser's dimmed, so that I see who won without comparing numbers.
33. As an owner, I want the tournament's name and the time above each result on Home, so that I know which event a score belongs to.
34. As a spectator, I want the same score line on the page my spectator link opens, so that the result is as easy to read for me as for the owner.

### Home

35. As an owner, I want Home to open with the title, today's date, and the Quick Match button, so that starting a quick match takes one tap.
36. As an owner, I want my live tournaments listed first with a Resume button on each, so that I get back to a running tournament in one tap.
37. As an owner, I want a live tournament to show how many matches are being scored, so that I know whether courts are busy before I open it.
38. As a signed-in user, I want each of my RSVPs shown with a date tile and my standing, so that I see when I play and whether I am in.
39. As a signed-in user, I want an unread notice flagged on its RSVP row, so that I don't miss a change to an event.
40. As an owner, I want my recent results on Home with a link to History, so that I can check the last few scores without leaving the page.
41. As an owner, I want the tools listed in their own card, so that the volleyball rotations tool is easy to find and out of the way.

### The tournament console

42. As an owner, I want the console's header to show the tournament's name, a Live chip, and its facts, so that I know which tournament I am running.
43. As an owner, I want the console's sections as text tabs with a green underline on the active one, so that I always know which section I am in.
44. As an owner, I want each court as a card with both teams' marks and the score between them at the largest size on the page, so that I can read a court from across the gym.
45. As an owner, I want the leading team's score in bold on a live court, so that I see who is ahead without reading both numbers.
46. As an owner, I want a waiting court to show "vs" between the teams and a Swap control under each, so that I can change who plays before scoring starts.
47. As an owner, I want each team's notes under its name on the court, so that I can see a champion's streak or what a win would mean.
48. As an owner, I want the two "won" buttons and the green scoring button under every court, so that recording an instant win or opening the scoring page is one tap.
49. As an owner, I want the queue as numbered rows with marks, a "Next up" chip on the first team, and up and down buttons, so that I can see and reorder who plays next.
50. As an owner, I want Schedule, Standings, Bracket, Teams, and Settings to use the same cards, rows, and score lines as Courts, so that the console is one design across its tabs.
51. As an owner, I want the bracket to keep its shape and scrolling, so that I can still follow a team's path through it.
52. As a scorer, I want the console my scorer link opens to look the same as the owner's with only my controls, so that I am not confused about what I can do.

### Scoring

53. As a scorer, I want the scoring page to keep its full-bleed team-color panels, so that I can still tell the sides apart from arm's length.
54. As a scorer, I want the scoring page's buttons, menus, and score entry to take the new look, so that the page belongs to the same app as the console.
55. As a scorer, I want the undo toast and the match-complete dialog in the new look, so that the moments around a result match the rest of the app.
56. As a guest, I want a quick match to look the same as a tournament match, so that the app feels complete before I sign in.

### Tournaments, creation, and History

57. As an owner, I want my tournaments listed as rows in cards with their format, status, and facts, so that drafts, live tournaments, and completed ones are easy to tell apart.
58. As an owner, I want creating a tournament to use the same cards and controls step by step, so that setup feels like the rest of the app.
59. As an owner, I want picking teams during creation to show each team's mark, so that I choose by color as well as by name.
60. As an owner, I want History to list results as score lines grouped as they are today, so that looking up an old result reads the same as a recent one.
61. As an owner, I want a completed tournament's standings and champion shown in the new look, so that the record of a tournament matches the app I ran it in.

### RSVP

62. As an owner, I want my RSVP lists shown with a date tile, the scheduled time, and counts against capacity, so that I can see how full each list is.
63. As a signed-in user, I want the page my RSVP link opens to make my own standing the most prominent thing, so that I know at once whether I am in or on the waitlist.
64. As an owner, I want the waitlist and held spots drawn as distinct from confirmed RSVPs, so that I can tell them apart without reading every row.
65. As an owner, I want importing an RSVP list into a tournament to use the same rows and marks as creation, so that both ways of adding teams look alike.
66. As a signed-in user, I want notices to read as messages from the owner with their time, so that I can tell what changed and when.

### Sign-in, dialogs, and menus

67. As a guest, I want the sign-in screen to be a plain white page with the wordmark and the form, so that signing in is quick and matches the app behind it.
68. As an owner, I want every dialog centered with a white rounded panel, a plain title, and pill buttons, so that dialogs look like the cards they sit over.
69. As an owner, I want a destructive dialog's confirm button filled red, so that the dangerous choice is the one I can't miss.
70. As an owner, I want menus, selects, toasts, the reload banner, and empty states in the new look, so that no leftover piece of the old theme surprises me.

### Icons and brand

71. As an owner, I want every icon to keep its meaning and take one outline style, so that the icons I know look like they belong to the new design.
72. As an owner, I want the active tab's icon drawn filled and its label in ink, so that the current section stands out in the tab bar.
73. As an owner, I want the app's crest and wordmark redrawn for the new look, so that the header doesn't carry a piece of the old theme.
74. As an owner, I want a new home-screen icon and splash color, so that the installed app matches what opens.

### The volleyball tools

75. As an owner, I want the volleyball rotations tool in the same look, so that opening a tool doesn't feel like leaving the app.
76. As an owner, I want the tool's court diagram, formations, and modals to work as they do today, so that my saved formations and the way I edit them are untouched.

### Keeping it consistent

77. As a maintainer, I want one written design system that lists the tokens, the shared classes, which button to use when, and what is forbidden, so that new UI has one source to follow.
78. As a maintainer, I want the build to fail when source uses a name from the old theme, so that matchbook can't come back in a later change.
79. As a maintainer, I want the build to fail when a token pair drops below its contrast level, so that a color tweak can't make text unreadable.
80. As a maintainer, I want the build to fail when a screen asks for an icon the sprite doesn't have, so that a missing icon is caught before anyone sees a blank square.
81. As a maintainer, I want tokens named by role, so that a dark theme can be added later by changing values and no names.

## Implementation Decisions

### Scope and order

- The redesign changes looks only. No route, data shape, Firestore document, rule, copy string, or flow changes. A screen's layout may change. Any behavior change found necessary along the way is out of this spec and gets its own issue.
- The work happens on one branch in two stages and merges only when every screen is done.
- Stage one adds the foundations beside the old theme: the role tokens, the fonts, the icon drawings, the shared primitives, the dialogs and menus, and the app shell. The old theme's token names resolve to the new values and its shared classes are restyled in place. After stage one every screen shows the new palette, typeface, and controls, though its layout is still the old one.
- Stage two reworks layout one screen group per commit and moves that group's files off the old theme's names. The order is scoring, Quick Match, the console, Home, Tournaments and creation, Teams, History, RSVP, sign-in, the volleyball tools, then the brand marks and the installed-app icon.
- A last step deletes the old names once nothing uses them and sweeps for anything a group didn't cover. The rename is an expand and contract: the new names arrive in stage one, each screen group migrates in stage two, and the old names go at the end.
- Scoring goes first because the chosen direction says least about it. Volleyball goes late because it is the only part still on the pre-matchbook tokens.
- The owner looks at each screen group in the browser when its commit lands. Fixes from that look go in before the next group starts.

### Tokens

- Tokens are named by role and never by color or by theme. No new token, class, component, or asset path contains "matchbook" or the `mb` prefix.
- The role names avoid the old shadcn names the guard test already forbids. In particular the green is `action`, because `accent` is on the forbidden list.
- The values below come from the prototype. Two of them changed after a contrast check: the prototype's green `#0a8a57` gave 4.39 to 1 under white text and its secondary text `#6b727a` gave 4.37 to 1 on the ground color, and both must reach 4.5.

```
ground        #f1f3f4   the page behind the cards
surface       #ffffff   cards, headers, the tab bar, dialogs
ink           #15181b   primary text, the black pill button
ink-soft      #626971   secondary text, inactive tab labels
line          #eceef0   dividers inside a card
fill          #f1f3f4   grey buttons, chips, date tiles, score pills
action        #087a4d   the main button, live, confirmed, active underline
action-tint   #e2f4eb   the background of a green chip
danger        #cf3f32   destructive actions only
```

- `danger` needs a tint for its chip and dialog uses. Its value is chosen in stage one so that `danger` text on it reaches 4.5 to 1.
- The radius scale is 14px for cards and dialogs, 10px for tiles and square controls, 8px for small chips and icon backings, and a full pill for buttons and status chips. Source uses the scale's names and never an arbitrary radius.
- Cards carry no border. A card separates from the ground by its color, and rows inside a card separate by a `line` divider.
- Figtree is the only typeface, loaded as a variable font with the weights the design uses. The font variable is set on the same element the stylesheet reads it from, which is the defect behind issue 09 of the design-consistency work. That issue closes as resolved by this spec.
- Scores use tabular figures so digits don't shift as a score changes.
- The type scale from the prototype is 28 to 30px for a page title, 16px for a card title and a row's name, 13 to 15px for body and secondary text, 10.5px for tab labels, and 44px for a court's score on the console.
- Tappable controls are at least 44px tall. The main button is 52px.
- There is one light theme. The `dark:` variant stays forbidden.

### Shared primitives

- The shared building blocks are restyled in place and also offered under names without the theme's prefix. They keep their props, so a screen group moves to the new names by changing its imports and class names.
- A card is a surface with an optional head. The head takes an icon, a title, and a meta slot, which holds a count or a live indicator.
- A score line is one component with two sizes. The row size is the result line on Home and in History. The court size is the console's court. Both take two sides and two scores and mark the winner or leader. This is the one new component the direction calls for, and every place that shows a match uses it.
- The team mark replaces the crest component. It takes a name, a color, and a size, and draws a rounded shield with the name's first letter. The shield's shape from the prototype is a radius of 28% on the top corners and 44% on the bottom corners.
- The mark's letter is ink or white, whichever contrasts more with the team's color. The roster palette holds bright colors, and white on its yellow gives 1.92 to 1, so a fixed white letter is not an option. The choice is a pure function in the team colors module.
- A team or entry with no color gets a palette color picked by a hash of its name, so the same team always gets the same color. The app has no single display fallback today, and the crests were picked the same way. The color picker, the palette, and the least-used rule for new teams don't change.
- Buttons come in four kinds: the green main button, the black pill for a row's own action such as Resume, the grey button for secondary actions, and the red button for destructive confirms. The design-system document says which to use when.
- A status chip is a pill in `fill` with ink text, or in `action-tint` with `action` text for live and confirmed states.
- A date tile shows a month over a day number. RSVP rows use it wherever an RSVP list's scheduled time appears in a list.
- Dialogs stay centered and keep the recipe's structure and focus handling from the design-consistency work. The panel becomes a white card with a 14px radius, a sentence-case title, and pill buttons in the footer.

### Icons

- The app keeps one sprite and the icon component's interface. All 54 ids keep their names, so no screen changes which icon it asks for.
- The drawings are replaced with glyphs from Phosphor's regular weight, which is MIT licensed. The files are copied into the sprite. The app gains no icon package and fetches no icon at run time.
- The five tab icons also get a filled drawing, used for the active tab. These are the only filled glyphs.
- An id with no fitting Phosphor glyph is drawn by hand in the same weight on the same grid.
- The prototype mapped these ids, and the rest follow the same judgment: overview to house, teams to users-three, compete to trophy, history to clock-counter-clockwise, rsvp to calendar-check, quick to lightning, live to broadcast, calendar to calendar-blank, tools to wrench, swap to arrows-left-right, and the chevrons to carets.
- The sprite's version stamp changes so installed copies fetch the new drawings.
- The lint rule that forbids `lucide-react` and `@heroicons/react` stays, with its message pointing at the renamed component.

### Shell

- The tab bar is a white bar with a `line` rule on top. The active tab has ink text and a filled icon. Inactive tabs use `ink-soft`.
- A top-level page has a white header block with the wordmark, the account button, the page title, and the page's main action. A page one level down has a back link in place of the wordmark row.
- Desktop keeps today's shell structure and breakpoints with the new tokens.

### Scoring

- The team-color panels stay full-bleed and keep their layout. Text and controls on a panel keep whatever contrast handling they have today. Only the page's own chrome changes: its header, buttons, menus, and dialogs.

### Volleyball tools

- The tools move onto the role tokens and the shared primitives. The legacy token block is deleted with them, along with their exemption in the guard test.
- The court diagram keeps its geometry. Its colors come from the role tokens.
- Nothing about formations, rotations, or their storage changes.

### Brand and installed app

- The crest and wordmark are redrawn for the new look and replace the old files. The eight team crests, the paper textures, and the theme's standalone token file and preview page are deleted.
- The asset folder that carries the theme's name is renamed, and every reference follows.
- The web manifest's theme and background colors become `surface` and `ground`. The home-screen icons are regenerated from the new crest.

### Documents and guards

- The design-system document is rewritten for the new look in stage one and corrected at the end of stage two. It covers the palette, the type scale, the radius scale, the four buttons, the card, the score line, the team mark, the chip, the date tile, the dialog recipe, the icon list, and the forbidden list.
- The project instructions' design-system paragraph is rewritten to match.
- The guard test's radius rule changes from a 4px cap to the named scale. Its bans on the old shadcn utilities and on `dark:` stay. It gains a ban on the old theme's names.

## Testing Decisions

A good test here checks something a person would notice if it broke, through
the same door the app uses, and keeps passing when the markup is rearranged.
Looks can't be asserted that way, so the tests cover what can be checked from
source and from pure functions, and the owner's eye covers the rest one screen
group at a time. No screenshot tests are added.

The codebase has 57 test files and none renders a component. All of them test
logic through module interfaces. That shapes the seams below.

- **The existing suite, unedited.** The 56 test files outside the design folder pass at every commit without a change to any of them. They can't see the UI, so they prove the narrower claim that no logic moved. A commit that needs to edit one of them has left this spec's scope.
- **The design guard.** This is the existing seam and it takes most of the new checks. It reads source text and fails on forbidden names. Prior art is the current guard test, which scans every source file and also tests its own patterns against sample strings. It gains four things:
  - a ban on the `mb` prefix, the word "matchbook", and the two old font names, applied to each screen group's folders as the group migrates and to the whole source at the end;
  - the radius rule rewritten for the named scale, with arbitrary radii forbidden, applied the same way;
  - a sprite check, that every icon id written in source exists in the sprite and that all 54 ids are still present;
  - a contrast check, which reads the token values from the stylesheet and asserts 4.5 to 1 for ink on surface and ground, ink-soft on surface, ground, and fill, white on action, action on surface and action-tint, white on danger, and danger on its tint.
- The guard's volleyball exemption is removed in the commit that moves the tools over, and the test's own sample strings are updated in the same commit as each rule.
- **The team mark's colors.** Two pure functions in the team colors module, the letter color and the fallback color, tested beside the existing team color tests. The fallback returns the same palette color for the same name every time. For every color in the roster palette the chosen letter color gives at least 3 to 1, which is the level for a graphic, since the team's name always sits next to its mark. The test also pins the two cases that motivated the rule: ink on the palette's yellow and white on its indigo.

Lint and the type checker run clean at every commit, as today.

## Out of Scope

- Any change to behavior, copy, routes, data, rules, or flows.
- A dark theme. The role names leave room for one.
- New features, including any the Mobbin research suggested, such as avatars on RSVP rows.
- A color picker redesign or a change to the roster palette.
- Team logos or uploaded images.
- Changes to the bracket's layout logic or the scoring page's panel layout.
- Screenshot or visual regression testing.
- Animation and motion design beyond what exists today.
- Performance work, apart from not making anything slower.

## Further Notes

- The prototype used its own darker team colors. The real roster palette is brighter, so marks will look more saturated than in the pictures. That is expected, and it is why the letter color rule exists.
- The prototype's chevrons and inactive tab labels used greys that fall under 4.5 to 1. Tab labels move to `ink-soft`. Chevrons that only decorate a row that is already a link may stay light.
- Research for the direction came from sports and event apps on Mobbin. FotMob and Apple Sports shaped the centered score line. Light themes were the minority among scores apps there, and the owner chose light on purpose.
- The untracked `.claude/launch.json` holds the dev server command used for the prototype and is not part of this work.
- The breakdown into issue files follows this spec and lives under `.scratch/app-redesign/issues/`.
