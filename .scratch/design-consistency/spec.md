# Design consistency

Status: ready-for-agent

Agreed in a grilling session on 2026-10-28. Vocabulary is in `CONTEXT.md`. The
rebuild spec (`.scratch/tournament-rebuild/spec.md`) introduced the matchbook
design and stopped short of the dialogs, the toast, and a few icons. This spec
finishes that job and writes the design system down so it stays finished.
Nothing here touches ADR-0001 (per-account Firestore storage) or ADR-0002
(link-based scorer access).

## Problem Statement

I run the app on my phone and most of it looks like one product: cream paper,
navy ink, coral accents, condensed uppercase headings, square corners. Then I
tap Delete on a tournament and a different app pops up. The dialog has big
rounded corners, a grey overlay, a red heading, pill buttons, and a different
icon set. The same happens when I end a tournament, start one, correct a
result, withdraw a team, delete teams, edit a team, confirm a match result,
finish a guest match, sign out, or undo an instant win. The undo toast is a
frosted white card. The scoring page's own buttons are right, but their icons
come from a different drawer than the icons on every other page.

Nobody wrote the design down. The only definition is a stylesheet, and the old
stylesheet is still there beside it, so every new piece of UI is a coin toss
between the two. The volleyball tools were deliberately left on the old look
until their own redesign, but their modals use the same black overlay and
rounded frame as the stale dialogs, which makes them look like a third thing.

## Solution

Every dialog, menu, toast, and control on a matchbook screen uses the matchbook
design. A dialog is a centered paper panel with the navy frame and the thick
top rule, a navy condensed uppercase title, muted body text, a navy X to close,
and 44px matchbook buttons in the footer, under a navy-tinted overlay. A
destructive confirm fills its confirm button in the matchbook red and keeps its
title navy. The undo toast is a navy bar with paper text and a coral Undo, like
the reload banner. Every icon in the app comes from the one matchbook sprite,
and the two third-party icon libraries are gone. Focus rings and text
selection are coral.

The old stylesheet's tokens stay only because the volleyball tools still read
them, and each one now resolves to a matchbook value, so those pages drift
toward the design without being touched. Their three modals get the matchbook
frame and overlay, and nothing else about them changes. The dead legacy classes
are deleted.

A one-page design-system document lists the tokens, the matchbook classes,
which button to use when, and what is forbidden. A lint rule and a source scan
enforce the forbidden list so the drift cannot come back.

Nothing changes in behavior, copy, or flow. The scoring page's team-color
panels keep their full-bleed look.

## User Stories

### Dialogs

1. As an owner, I want the delete-tournament dialog to look like the rest of the app, so that I don't feel I've been handed off to a different product at the riskiest moment.
2. As an owner, I want the end-tournament dialog in the matchbook design, so that ending a tournament feels like part of running one.
3. As an owner, I want the start-tournament dialog, including its play-in team picker, in the matchbook design, so that the chosen rows read as selected in the app's own colors instead of a translucent red.
4. As an owner, I want the correction dialog fully in the matchbook design, so that its already-matchbook fields are not framed by an old-style shell.
5. As an owner, I want the withdraw-team confirm in the matchbook design, so that withdrawing looks as deliberate as the rest of the console.
6. As an owner, I want the scorer-link regenerate confirm and the close-court confirm in the matchbook design, so that every console confirm looks the same.
7. As an owner, I want the delete-teams dialog and the "team is in a live tournament" refusal in the matchbook design, so that roster housekeeping matches the Teams page around it.
8. As an owner, I want the team form in the matchbook design, so that naming a team and picking its color feels like the inline add form beside it.
9. As an owner, I want the team form's color swatches as navy-bordered squares with a check on the chosen one, so that they match how team colors appear elsewhere.
10. As an owner, I want the team form's preview to be a flat block of the team's color with the name on it, so that I still see the result without the old gradient.
11. As an owner or scorer, I want the match-complete confirm on the scoring page in the matchbook design, so that confirming a result looks like the scoring controls I just used.
12. As a guest, I want the guest-match-complete dialog in the matchbook design with the same information and buttons, so that the sign-in offer looks like the app I'd be signing in to.
13. As a signed-in user, I want the sign-out confirm in the matchbook design, so that the account menu and its confirm match.
14. As an owner, I want the discard confirm for an abandoned quick match in the matchbook design, so that Quick Match's dialogs match its page.
15. As a phone user, I want dialogs centered with the same side margins they have now, so that nothing moves to a bottom sheet I'd have to learn to dismiss.
16. As a phone user, I want every dialog button and the close control to stay at least 44px tall, so that the redesign loses none of the touch targets the shell polish gave me.
17. As a user, I want the dialog overlay tinted navy rather than black, so that the paper behind it stays warm instead of going grey.
18. As a user, I want a destructive dialog's title in navy and only its confirm button in red, so that the heading reads as a question and the button as the warning.
19. As a keyboard or screen-reader user, I want dialogs and menus to keep their focus trapping, escape handling, and labelling, so that the restyle costs me nothing.

### Toast, menu, spinner, icons

20. As an owner, I want the undo toast after an instant win to be a navy bar with paper text and a coral Undo, so that it reads as a notice from the app rather than a floating card from somewhere else.
21. As a user, I want the account menu's sign-out item to use the matchbook icon set, so that the one already-matchbook menu has no stray icon.
22. As a user, I want a saving or deleting button to show a small spinner in the button's own text color, so that the busy state looks the same on a navy, coral, or red button.
23. As a user, I want every icon in the app drawn in the same style and stroke weight, so that nothing looks pasted in.
24. As an owner or scorer, I want the scoring page's back, flag, fullscreen, and undo icons from the matchbook sprite, so that the scoring header matches the shell.
25. As an owner or scorer, I want the fullscreen control bar with the same square corners as every other matchbook control, so that fullscreen scoring doesn't look like an older version.
26. As a user, I want the focus ring and text selection in coral, so that keyboard focus and selected text match the app's accent instead of the old red.

### Volleyball tools

27. As a volleyball user, I want the formation editor, the share dialog, and the delete overlay on My Formations to open in the matchbook frame and overlay, so that the only part of the app not yet redesigned still opens dialogs that look like the rest.
28. As a volleyball user, I want the rest of the volleyball tools left as they are, so that nothing changes in a part of the app that has its own redesign coming.
29. As a volleyball user, I want the old tokens the volleyball pages read to resolve to matchbook colors and radii, so that the pages look closer to the rest of the app without anyone redesigning them.

### Maintainers and agents

30. As a maintainer, I want one page that says what the design system is, so that I don't have to read the stylesheet to find out.
31. As a maintainer, I want that page linked from the project instructions, so that an agent starting a session reads it before touching UI.
32. As a maintainer, I want the page to name which button class to use for primary, secondary, outline, and destructive actions, so that a new dialog doesn't invent a fifth.
33. As a maintainer, I want the page to list what is forbidden (the old token classes, the two icon libraries, the big radii, dark-mode utilities), so that a review has something to point at.
34. As a maintainer, I want lint to fail on an import of either old icon library, so that they cannot come back by habit.
35. As a maintainer, I want a test that fails when an old token class appears outside the volleyball tools, so that a dialog cannot quietly be restyled back.
36. As a maintainer, I want the old token block marked as volleyball-only legacy with a note on when it goes, so that nobody treats it as a second palette.
37. As a maintainer, I want the dead legacy classes and the unused button, badge, and dialog variants deleted, so that there is one way to build each control.
38. As a maintainer, I want both icon libraries removed from the dependencies, so that the bundle carries one icon set.
39. As a maintainer, I want the existing test suite to pass unchanged, so that I know the restyle changed nothing underneath.
40. As a maintainer, I want each surface group delivered as its own commit on one branch, so that I can review dialogs, then the toast, then icons, without one diff that touches everything.
41. As a maintainer, I want to see the new sprite glyphs beside the icons they replace before they are committed, so that I can object to a drawing rather than a diff.
42. As a maintainer, I want any bug or refactor found along the way filed as an issue rather than fixed in passing, so that the restyle stays a restyle.

## Implementation Decisions

### What "the current design" means

The matchbook design is the design system. Its definition is the matchbook
custom properties and the matchbook component classes in the global
stylesheet, the Oswald display face for condensed uppercase text, the Outfit
body face, 4px radii, 1.5px navy borders, the paper-grain surface, and the
matchbook icon sprite. The design is light only.

### Scope of screens

Every screen the rebuild spec redesigned is in scope, which means every dialog,
menu, and toast those screens open, including the scoring page's dialogs and
controls. Volleyball tool content is out of scope except as noted below.

### Primitives are restyled in place

The Radix-backed primitives (dialog, dropdown menu, button, input, avatar,
badge, color picker) keep their behavior and are restyled to matchbook where
they are defined, so every importer picks up the design at once and no period
exists where two dialog styles coexist. Variants, sizes, and exports with no
importer are deleted. The volleyball rotation controls import the button and
the badge, so they pick up the restyle without being edited.

### The matchbook dialog

- Panel. Paper-bright background, 1.5px navy border with the 4px top rule, 4px
  radius, the panel's soft brown shadow, centered on the screen with the same
  side margins as today. Since the dialog portals outside the matchbook
  surface, the content element sets its own colors and font and does not rely
  on the page.
- Overlay. Navy at roughly 55% opacity, not black.
- Title. Display face, uppercase, navy. Never red, including on destructive
  dialogs. An optional leading icon from the sprite.
- Description. Body face, the muted ink color.
- Close. The sprite's close glyph in navy, 44px hit area, top right.
- Footer. Matchbook buttons at 44px, full width on phone, side by side
  otherwise. Cancel is the navy outline button. The main action is the filled
  navy button, or the new filled red button on a destructive confirm.
- Open and close animation stays the fade and slight zoom the dialogs already
  have.

### New matchbook pieces

- A filled red button class, white text on the matchbook red, with the same
  hover, disabled, and 44px rules as the other filled buttons.
- A small inline spinner, the page spinner's ring at about 16px drawn in the
  current text color, for busy buttons.
- Fourteen sprite glyphs in the sprite's own style (24px grid, 1.8px stroke,
  round joins): close, trash, undo, flag, minus, logout, trophy, pencil, play,
  maximize, minimize, chevron-left, crown, and remove-user. Where an existing
  glyph already carries the meaning it is reused instead: the warning triangle
  for the "team in a live tournament" refusal, the compete glyph for the
  trophy where that reads better. The new glyphs are shown beside the icons
  they replace before they are committed.

### Surface-by-surface

- The four confirm dialogs (generic confirm, delete confirm, end tournament,
  delete teams with its refusal) are restyled in place. They are the same
  shape and could be one component; merging them is filed as a follow-up issue
  and not done here.
- Start tournament: the play-in team rows use the paper-bright background, the
  rule color for borders, and a navy border with a light navy wash for the
  selected row.
- Correct result: the shell is restyled; its fields already use the matchbook
  input.
- Team form: matchbook input for the name, swatches as navy-bordered squares
  with a check on the chosen one, a flat preview block of the team color
  carrying the name, matchbook buttons.
- Match complete: team color chips lose their rounded corners and shadows and
  take the navy border; the winner line uses navy and the muted ink.
- Guest match complete: rebuilt as a matchbook panel with the same content and
  buttons. The glass card, the amber gradient, the emerald box, the teal
  gradient button, and the motion entrance go. It opens with the standard
  dialog animation.
- Undo toast: a navy bar with paper text, a coral Undo button, and a paper X
  to dismiss, in the shape of the reload banner.
- Account menu: already matchbook; its sign-out icon moves to the sprite and
  its confirm is the restyled generic confirm.
- Scoring page: the header and fullscreen bar swap their icons for sprite
  glyphs; the fullscreen bar takes the 4px radius and the panel shadow; the
  team-color panels are left exactly as they are apart from their icons; the
  legacy score-text rule moves into the components layer under a matchbook
  name.
- Volleyball: the formation editor modal, the share dialog, and the inline
  delete overlay on My Formations take the navy overlay, the matchbook panel
  frame, and the sprite close glyph. Their contents are not touched.

### The stylesheet

- The matchbook block is the design system. It gains the filled red button and
  the moved score-text rule.
- The old token block stays, marked in a comment as legacy that only the
  volleyball tools read and that goes with their redesign. Each token resolves
  to a matchbook value: the background to paper, the card and popover to
  paper-bright, the foreground to navy, the primary to navy with paper-bright
  foreground, the destructive to the matchbook red, the muted foreground to
  the muted ink, the accent to a light navy wash, the border to the rule
  color, the ring to coral, and the base radius to 4px so the derived radii
  follow.
- Deleted: the glass card, the playful button classes, the red and teal
  gradient button classes, the soft shadow classes, the unused team blue and
  orange tokens, and the sidebar tokens that point at nothing.
- The base layer's focus-visible outline and selection color become coral.
  The press scale on buttons stays.
- There is no dark mode and nothing is added for one.

### Dependencies

Both third-party icon libraries are removed. The animation utility library and
Radix stay. The motion library stays because the scoring page and the
volleyball tools use it; only the guest dialog stops using it.

### Documentation and guard rails

- A one-page design-system document under the docs folder, linked from the
  project instructions: the palette and what each color is for, the type
  faces, radius and border rules, the component classes and when to reach for
  each button, the icon sprite and how to add a glyph, the dialog recipe, and
  the forbidden list (old token classes, the two icon libraries, radii above
  4px on matchbook surfaces, dark-mode utilities, new colors outside the
  palette).
- Lint forbids importing either icon library.
- A source-scan test fails if an old token class appears in source outside the
  volleyball component folder and the volleyball page tree.

### Delivery

One branch off master, one commit per ticket. Eight tickets under `issues/`:
the dialog foundation proven on Delete tournament, then the console dialogs,
the roster dialogs, the scoring page, the guest match complete, the undo toast
and account menu, and the volleyball modal frames, all of which can run in
parallel once the foundation lands, and last the contract with its guard
rails. Each ticket adds only the sprite glyphs its surface needs and shows
them beside the icons they replace before committing. No pull request until
asked.

## Testing Decisions

A good test drives a public seam with realistic inputs and asserts what a user
would observe. For this work the observable is visual, and the rebuild spec
decided that screens are verified in the browser at phone width rather than
by component tests. That stands.

Behavior guard. The existing suites (the tournament engine, the Firestore
rules against the emulator, and the pure-module tests beside them) must pass
unchanged. No test imports a dialog, the toast, or a primitive today, and none
is added to.

New static seam. One lint rule forbids importing the two old icon libraries,
and both packages are uninstalled, so a reintroduction fails lint and install.
One vitest file reads every source file outside the volleyball component
folder and the volleyball page tree and fails if it finds an old token class.
The list of forbidden classes lives in that one file. It renders nothing. Prior
art is the shell suite's pure-module tests: one file, one list, assertions on
plain values.

Acceptance. Each dialog, the toast, the account menu, and the scoring page's
controls are opened in the browser pane at 375x812 against the emulators and
compared to the matchbook screens around them. The check for each surface
covers: paper panel with navy frame, navy title, navy-tinted overlay, 44px
controls, sprite icons, and no visible old token. The volleyball modals are
checked for frame and overlay only.

## Out of Scope

- Redesigning volleyball tool content: the rotation controls, court, legend,
  help accordion, formation picker, and the insides of the formation editor
  and share dialog.
- Dark mode.
- Bottom-sheet dialogs on phone.
- Merging the four confirm dialogs into one component. Filed as a follow-up.
- Any change to copy, flows, or what a dialog does on confirm.
- Screenshot or visual-regression tests.
- Removing the old token block entirely. It goes with the volleyball redesign.
- A pull request. The work lands on a branch until asked.

## Further Notes

- The old destructive token and the old primary token were the same red, which
  is why old dialogs read every heading as an error. Mapping primary to navy
  and destructive to the matchbook red fixes that for the volleyball pages
  too.
- The sprite has 37 glyphs today and already covers plus, check, warning,
  chevron-right, and chevron-down, so several old icons map to existing
  glyphs without drawing.
- The account menu is the one overlay already in matchbook and is the pattern
  to copy for the dropdown; no dialog carries matchbook classes yet, so the
  dialog recipe above is the first.
- The rebuild spec's shell-polish ticket already brought every control to
  44px, including the old dialogs' buttons and close control. This work must
  not regress that.
