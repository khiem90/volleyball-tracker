# 04: Cards, buttons, chips, and form controls

**What to build:** The owner opens any screen and its panels are white rounded
cards with no border, its buttons are pills, and its inputs, selects,
checkboxes, tables, and spinners wear the new look. This happens without
editing the screens, because the old theme's shared classes and shared
components are restyled in place. The same pieces are also available under
names without the old theme's prefix, for the screen tickets to move to.

The new pieces are the card with its optional head, the four buttons, the
status chip, the date tile, and the form controls. Their looks come from
direction D in `.scratch/app-redesign/directions/d-matchday.png`.

Covers spec stories 10, 11, 17 to 23, and 77.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] A card is a surface with a 14px radius and no border. Rows inside it are divided by a line rule. Its head takes an icon, a title, and a meta slot.
- [x] There are four buttons: the green main button at 52px, the black pill for a row's own action, the grey button for secondary actions, and the red button for destructive confirms. Each has hover, pressed, focus, and disabled states.
- [x] Every button and tappable row is at least 44px tall.
- [x] A status chip is a pill in fill with ink text, or in action-tint with action text. A live chip carries the live dot.
- [x] A date tile shows a month over a day number.
- [x] Inputs, textareas, native selects, search fields, and checkboxes use the role tokens, a 10px radius, and a visible focus ring.
- [x] Tables use the role tokens and line rules, in both the regular and the compact size.
- [x] Each old shared class and shared component now draws the matching new piece, so unmigrated screens change look without an edit. The ticket's comments list each old name with the new name that replaces it.
- [x] The old outline and color button variants map onto the four buttons, and the comments record which maps to which.
- [x] The design-system document is rewritten for the new look. It covers the palette, the type scale, the radius scale, the four buttons and when to use each, the card, the chip, the date tile, the form controls, and the forbidden list.
- [x] The 56 test files outside the design folder pass unedited. Lint and the type checker are clean.

## Comments

- 2026-11-25: Built test-first. The checks are in `src/__tests__/design/sharedClasses.test.ts`, which reads the stylesheet's rules, plus `dateTile.test.ts` and `tournamentStatus.test.ts`.
- Old class to new class. Each pair is drawn by one rule in `globals.css`, so the two look alike: `mb-panel` to `card`, `mb-panel-head` to `card-head`, `mb-panel-link` to `card-link`, `mb-btn` to `btn`, `mb-input` to `field`, `mb-textarea` to `field-area`, `mb-select-native` to `field-select`, `mb-search` to `field-search`, `mb-checkbox` to `field-check`, `mb-table` to `data-table`, `mb-table-compact` to `data-table-compact`, `mb-live-dot` to `live-dot`, `mb-spinner` to `spinner`, `mb-score-text` to `team-panel-score`.
- Old classes with no new class, restyled in place: `mb-kicker` (write `text-caption font-medium text-ink-soft`), `matchbook-display` (write the type scale's utilities, and `tabular-nums` on a number), `matchbook-surface` (`<body>` sets the ground and ink), `mb-score-box` (a `chip` with `text-ink-soft`). `mb-form-square` and `mb-btn-red` are deleted, since their only users moved. New classes with no old name: `card-title`, `card-icon`, `chip`, `chip-action`, `date-tile`, `date-tile-month`, `form-dot`.
- Old component to new component. The old paths are re-exports: `Panel`, `PanelEmpty`, `PanelError`, `PANEL_ROW` to `Card`, `CardEmpty`, `CardError`, `CARD_ROW` in `components/shared/Card.tsx`. `FormSquares` and `FormLetters` to `FormDots` and `FormLetters` in `components/shared/RecentForm.tsx`. `AddTeamsForm` to `components/shared/AddTeamsForm.tsx`. `TOURNAMENT_STATUS` to `lib/tournamentStatus.ts`. New: `Chip` and `DateTile` in `components/shared`, `dateTileParts` in `lib/dateTile.ts`.
- The buttons. `mb-btn-coral` is `btn-action`, the green main button. `mb-btn-navy` is `btn-ink`, the black pill. `mb-btn-outline-navy` and `mb-btn-outline` are `btn-fill`, the grey button. `mb-btn-outline-red` and `mb-btn-red` are `btn-danger`, the red button. On `<Button>`: `default` is ink, `outline` is fill, `destructive` is danger, and `action` is new.
- Three things differ from a plain reading of the criteria. The 52px belongs to `btn-action` only, and `mb-btn-coral` stays 44px, because the old class also sits in toolbars beside 44px buttons. `Panel` still takes `tone` and ignores it, since a card has one head. The checkbox takes the 8px step, because 10px on a 22px box is a circle.
- Left open. Fields use a new `--control-line` (ink-soft at 75%, 3.27 to 1 on white), which is not in the spec's token table. The grey button and the grey chip have no edge on the ground, so unmigrated mastheads show them as bare text until ticket 06's white header. Red still marks a low readiness bar (`teamStats.ts`) and an away win on Quick Match, for tickets 13 and 08.
