# Design system

The look is the one in `.scratch/app-redesign/spec.md`: white cards on a pale
grey ground, one green for the next thing to tap, red for destructive actions
only, and Figtree throughout. Light only. There is no dark mode and nothing is
added for one.

Read this before touching UI. When this page and `src/app/globals.css`
disagree, the stylesheet wins and this page needs a fix.

The app is part way through the move from the matchbook design. The tokens,
the scales, and the shared pieces below are final, and new UI uses them. A
screen that has not moved yet still writes the old class names, and each of
those now draws the new piece. "Old names" near the end lists them.

## Role tokens

Every color is one of these, defined on `:root` in `src/app/globals.css` and
named for what it does. The utilities are `bg-*`, `text-*`, `border-*`, and
the opacity form, as in `bg-ink/55`. An inline style reads `var(--action)`.

| Token | Value | What it is for |
| --- | --- | --- |
| `ground` | `#f1f3f4` | The page behind the cards. |
| `surface` | `#ffffff` | Cards, headers, the tab bar, dialogs. |
| `ink` | `#15181b` | Primary text and the black pill button. |
| `ink-soft` | `#626971` | Secondary text and inactive tab labels. |
| `line` | `#eceef0` | Dividers inside a card. |
| `fill` | `#f1f3f4` | Grey buttons, chips, date tiles, score pills. |
| `action` | `#087a4d` | The main button, live, confirmed, the active underline. |
| `action-tint` | `#e2f4eb` | The background of a green chip. |
| `danger` | `#cf3f32` | Destructive actions and error messages. |
| `danger-tint` | `#fff7f6` | The background of an error message. |

White (`#ffffff`, `text-white`) is the text on a green, black, or filled red
button.
Team colors are the user's own and are painted as inline styles. They and the
rotation tool's court palette, described near the end, are the two color
sources outside this table.

`src/__tests__/design/tokens.test.ts` reads these values from the stylesheet
and fails when a text pair drops under 4.5 to 1. The pairs are ink on surface
and ground, ink-soft on surface, ground, and fill, white on action, action on
surface and action-tint, white on danger, and danger on danger-tint. Danger
sits at 4.76 to 1 on white, which is why its tint is nearly white. Danger on
`fill` gives 4.28, so red text never goes on a grey button or a grey chip.
The quiet red button is white for that reason.

### What green and red mean

Green is the next thing to tap, anything live, and anything confirmed. Red is
a destructive action, its confirm, and an error message. Nothing else is red:
live is green, a loss is soft ink on fill, and a draft or a completed
tournament is a grey chip.

### The control edge

`line` gives 1.16 to 1 on a white card, too faint to show where a field is.
Form controls use `--control-line` instead, which is `ink-soft` at 75% and
gives 3.27 to 1 on `surface`. It is not a role token and has no utility. The
control classes carry it, and a control built by hand writes
`border-ink-soft/75` for the same edge.

## Radius scale

Four steps, and source uses no other radius. `rounded-full` is for a circle
and `rounded-none` squares a corner off.

| Utility | Size | What it is for |
| --- | --- | --- |
| `rounded-card` | 14px | Cards and dialogs. |
| `rounded-tile` | 10px | Tiles, fields, and other square controls. |
| `rounded-chip` | 8px | Icon backings, the checkbox, small square chips. A status chip is a pill. |
| `rounded-pill` | full | Buttons and status chips. |

A class in the stylesheet or an inline style reads `var(--radius-card)` and
its neighbours.

## Type

Figtree is the only typeface. `src/app/layout.tsx` loads it as a variable font
through `next/font/google` and sets `--font-figtree` on `<html>`, because the
stylesheet's theme reads it on `:root`. Set on `<body>` it is one element too
low, and that is why the old theme's two fonts never applied.

| Utility | Size | What it is for |
| --- | --- | --- |
| `text-page-title` | 28px on a phone, 30px from a tablet's width | A page's title. |
| `text-title` | 16px | A card's title, a row's name, the text in a field, the main button's label. |
| `text-body` | 15px | Body text. |
| `text-label` | 14px | The label of a button or a link, a table cell. |
| `text-caption` | 13px | Secondary text, a chip, a table's column heads. |
| `text-tab` | 10.5px | A tab's label. |
| `text-score` | 44px | A court's score on the console. |

Write words in the case they should read in. No class forces uppercase, and
the `uppercase` utility is not used on headings or labels. A number that
changes in place, such as a score or a count, takes `tabular-nums`.

`cn()` in `src/lib/utils.ts` knows the steps of both scales by name. A new
step goes in the stylesheet and in that list together, or `cn()` takes
`text-title` for a color and drops it beside `text-ink`.

## Shared pieces

The classes are in the components layer of `src/app/globals.css`, so a utility
on the same element wins over them. The components are in
`src/components/shared` and `src/components/ui`.
`src/__tests__/design/sharedClasses.test.ts` reads the classes and holds them
to the numbers on this page.

### Card

A card is a `surface` with a 14px radius, no border, and no shadow. It
separates from the ground by its color alone. Rows inside it are divided by a
`line` rule.

```tsx
import { Card, CardEmpty, CardError, CARD_ROW } from "@/components/shared/Card";

<Card title="Live tournaments" icon="live" meta="2 live">
  <ul className="divide-y divide-line">
    <li>
      <Link href={href} className={`flex items-center gap-3 ${CARD_ROW}`}>...</Link>
    </li>
  </ul>
</Card>
```

- `Card` takes `title`, `icon`, `meta`, `action` with `href`, `className`, and `children`. Without a title it has no head.
- The head shows the glyph on a grey backing, the title, and one thing on the right. `action` and `href` together make a text link there. Otherwise `meta` shows. A `meta` of plain text is written as secondary text, and anything else, such as a chip or a live tag, is drawn as it comes.
- `CARD_ROW` is the class string for a tappable row: 44px at least, 16px side padding, and a hover wash.
- `CardEmpty` says why a card has nothing to show, with one grey button or a control of the page's own under it. `CardError` is an error message in danger. It takes a `className`, so it also serves outside a card.
- The classes behind them are `card`, `card-head`, `card-title`, `card-icon`, and `card-link`. `card-link` is also the text link at a card's foot and a page's way back.

A card fills the height of its grid cell. Add `h-auto` where it should not. A
card clips at its round corners, so a focus ring that reaches past the card's
edge is cut off. `CARD_ROW` and `card-link` draw theirs inside. Anything else
that touches the edge needs `focus-visible:-outline-offset-2`.

### Which button

Five buttons, each a pill at least 44px tall. `<Button>` from
`@/components/ui/button` writes the classes of the first four, so use
whichever reads better in the file. The quiet red button has no variant, so
write its classes.

| Class | Component | Look | Use it for |
| --- | --- | --- | --- |
| `btn btn-action` | `<Button variant="action">` | Green, white label, 52px | The one main action on a screen: Quick match, New tournament, Start, Score. Full width on a phone. |
| `btn btn-ink` | `<Button>` | Black, white label | A row's own action, such as Resume or Add, and a dialog's main action. |
| `btn btn-fill` | `<Button variant="outline">` | Grey, ink label | Secondary actions: Cancel, Back, Swap, Copy, a "won" button. |
| `btn btn-danger` | `<Button variant="destructive">` | Red, white label | The confirm button of a destructive dialog: Delete, Discard, End. |
| `btn btn-danger-quiet` | None | White, red label, the control edge | A destructive action on a row or beside a main action: Remove, Discard, Delete. |

- Green is the main action of a screen or of one card, such as each court's Score button. An action beside a green button is black or grey, never a second green.
- Filled red is for one button at a time, the one that confirms. Remove, Discard, and Delete repeat down a list, and a column of filled red pills reads as an alarm, so on a row the button is the quiet one. It opens the dialog, and the dialog's confirm is filled.
- The quiet red button sits on a card or the ground. Its white fill keeps the red label at 4.76 to 1 on either.
- Hover darkens the button, and the black pill lightens. Pressed goes one step further and the button shrinks a touch. The quiet red button keeps its white fill on hover and turns its edge red, and pressed adds the danger tint. Focus is a 2px ring with a 2px gap, green on the black and grey buttons and ink on the green and both red ones. Disabled is 45% opacity with a cursor that says no.
- A link drawn as a button has no disabled state of its own. Give it `aria-disabled="true"` for the disabled look.
- A button that is only an icon is `<Button size="icon">`, a 44px circle, and carries an `aria-label`.
- A busy button shows `<InlineSpinner />` in place of its glyph and keeps its label.
- Do not shrink a button under 44px, and do not put the grey button on the ground. It is the ground's color and has no edge there. It belongs on a card or in the page header.

### Chip

A status chip is a small pill beside the thing it describes, so the name reads
first and the status second.

```tsx
import { Chip } from "@/components/shared/Chip";
import { TOURNAMENT_STATUS } from "@/lib/tournamentStatus";

<Chip>Draft</Chip>
<Chip tone="action">You're in</Chip>
<Chip live>Live</Chip>

const status = TOURNAMENT_STATUS[tournament.status];
<Chip tone={status.tone} live={status.live}>{status.label}</Chip>
```

The default is `fill` with ink text. `tone="action"` is `action` on
`action-tint`, for what is live or confirmed. `live` makes the chip green and
puts the pulsing live dot before its words. The classes are `chip` and
`chip-action`. No chip is red.

### Date tile

A date tile shows a short month over the day of the month, on `fill` with a
10px radius. It leads a row wherever an RSVP list's scheduled time appears in
a list.

```tsx
import { DateTile } from "@/components/shared/DateTile";

<DateTile at={list.scheduledAt} zone={zone} />
```

`at` is the time in epoch milliseconds and `zone` is the viewer's time zone,
as `deviceZone()` in `src/lib/rsvp.ts` gives it. The month and the day are
read in that zone by `dateTileParts` in `src/lib/dateTile.ts`. The classes are
`date-tile` and `date-tile-month`.

A list with no scheduled time gets `<NoDateTile />` from the same file in the
tile's place: a 44px `fill` square with the `calendar` glyph, so every row's
name starts at the same edge. Home's RSVP rows and the RSVP tab both use it.

### Team mark

A team is drawn as its mark: a small shield with the team's initial on the
team's own color. `TeamMark` in `src/components/shared/TeamMark.tsx` takes a
`name`, a `color`, and a `size` in px (22 by default). Every place that drew
one of the eight crest pictures draws the mark now, and the old `Crest`
component is a wrapper around it until its callers move over.

```tsx
<TeamMark name={team.name} color={team.color} size={22} />
```

- The shield's corners are 28% on top and 44% at the foot. That shape is the
  `.team-mark` class in `src/app/globals.css`, and it is the one radius that
  is not a step of the scale. Do not spell it out anywhere else.
- The letter is the name's first character in capitals, at half the mark's
  size and weight 800. An empty name shows "?".
- The letter is ink or white, whichever contrasts more with the team's
  color. `letterColor(color)` in `src/lib/teamColors.ts` decides. The roster
  palette is bright, and white on its yellow is 1.92 to 1, so most marks
  carry an ink letter and only indigo and purple carry a white one. The
  tests hold every palette color to 3 to 1, the level for a graphic.
- A team with no color gets `fallbackColor(name)`, a palette color picked by
  a hash of the name, so the same team gets the same color on every screen.
  Case and outer spaces do not count. Pass no `color` and the mark does this
  itself. The same function serves anything with a name and no color, such
  as an RSVP by team.
- The mark is `aria-hidden`, so the team's name always sits beside it. A
  mark never stands alone.
- The score line draws it at 22 in a row and 44 on a court.
- Anything else that puts text on a team's color uses `letterColor` too. A
  fixed white letter fails on yellow.

`TeamName` in `src/components/shared/TeamName.tsx` is the mark with the
team's name beside it, cut short when the row runs out of room. It takes a
`team`, the mark's `size`, and `reverse` to put the name first.

The shape a screen passes for a team is `Team` in `src/lib/teamShapes.ts`: a
`name` and an optional `color`. A mixed team's entry carries its own name and
color, so a mark drawn from `entryTeams()` shows a mixed team like any other.

### Score line

`ScoreLine` in `src/components/shared/ScoreLine.tsx` is one match on one
line: a team, the score, the other team. It comes in two sizes. Each screen
that shows a match moves to it as that screen is redesigned, and no match is
drawn by hand after that.

```tsx
<ScoreLine home={home} away={away} homeScore={21} awayScore={15} />
<ScoreLine size="court" home={home} away={away} homeScore={8} awayScore={11} />
```

- `size="row"`, the default, is a result in a list. Each name sits beside a
  22px mark, with the two marks next to the score, and the score is 16px in a
  `fill` chip. It is built from spans, so it can sit inside a link or a
  button.
- `size="court"` is the same line made large for a court on the console.
  Each name sits under a 44px mark and the score is `text-score`, the
  largest type on the page. `homeBelow` and `awayBelow` put a side's notes
  or its swap control under its name.
- The winner or the leader is bold in ink, and the other side's name and
  score are dimmed to `ink-soft`. While the score is level, neither side is
  dimmed.
- Pass `winner` (`"home"` or `"away"`) once a match has one. A forfeit and an
  instant win end with no points played, so the score alone cannot say who
  won. `boldSide()` in `src/lib/scoreLine.ts` holds the rule.
- Leave both scores out, or pass `null`, and the middle is a "vs" pill.
- The two sides are equal columns and a long name is cut short, so the score
  stays in the middle of the line whatever the names' lengths.
- Scores use `tabular-nums`, so a digit holds its place as the score changes.

### Form controls

Every control is a 10px box on `surface` with the control edge. On focus the
edge turns green under a 2px ring. Text in a control is 16px, the size below
which a phone zooms the page when a field takes focus.

| Class | What it is |
| --- | --- |
| `field` | The box around a bare `<input>`. An icon or a small button can sit inside the box beside the input. Put the class on a `<label>` or a `<span>`, not on the input. |
| `field-area` | A `<textarea>`. |
| `field-select` | A native `<select>`. The caller lays a `chevron-down` glyph over its right end. |
| `field-search` | A search box: a glyph and a bare `<input>` of a fixed 9rem width. |
| `field-check` | A checkbox, drawn in the stylesheet so it looks the same on every phone: an 8px-radius box that fills with `action` and a white tick. |

- A label above a control is `text-caption font-medium text-ink-soft`.
- A control with a problem adds `border-danger`, and the message under it is `text-caption font-medium text-danger` with `role="alert"`.
- A disabled control turns `fill` with soft text.
- `field`, `field-select`, and `field-search` are 44px tall. A checkbox is 22px, so its row or its label is the 44px target.
- These controls sit on a card. On the ground the control edge drops just under 3 to 1.

`Choice`, `LinkField`, `MoveToSelect`, `StepButtons`, and `AddTeamsForm` in
`src/components/shared` are built from these.

### Table

`data-table` on a `<table>` gives column heads in soft ink over a `line` rule,
rows divided by `line` rules, and tabular figures. Add `data-table-compact`
for tighter columns with each cell kept on one line. Wrap a wide table in
`overflow-x-auto`.

### Small pieces

- `live-dot` is the 7px green dot that pulses. `<Chip live>` carries one.
- `spinner` is a 16px ring in the color of the text around it. `<InlineSpinner />` draws it. `<PageLoadingSpinner />` is the large one for a page that is loading.
- `FormDots` and `FormLetters` from `@/components/shared/RecentForm` show a team's recent results. A win is green. A loss is soft ink.
- `team-panel-score` is the soft shadow under the white digits on the scoring page's team-color panels. Nothing else has a text shadow.

## The shell

`AppShell` in `src/components/shell` frames every page but sign-in and
scoring. It draws a white top bar, the page, and the tab bar. The tabs, their
order, and which need an account are `SHELL_TABS` in `src/lib/shell.ts`.

### Top bar

A 56px `surface` bar with a `line` rule under it, stuck to the top of the
screen. It holds the brand as a link home and the account button, and from
`lg` up the five tabs as a row between them. Its top padding is the device's
top safe area, so the status bar always sits on white.

The account button is the avatar in a 44px target, and it opens the shared
menu. A guest gets a grey Sign in button there instead.

### Tab bar

Below `lg` the tabs are a bar fixed to the foot of the screen: `surface`, a
`line` rule on top, 60px tall, with the bottom safe area under it. Each tab is
a 22px glyph over a 10.5px label (`text-tab`, weight 600).

- The tab the page sits under is in `ink` and draws its filled glyph. `tabGlyph(tab, active)` in `src/lib/shell.ts` picks the id. The other tabs are in `ink-soft`, which is 5.56 to 1 on the bar. Nothing else marks the open tab in the bar.
- In the `lg` row a tab is a 16px glyph beside a 14px label, and the open tab also has a 3px `action` underline.
- A tab a guest must sign in for carries a 12px `lock`. It sits to the right of the glyph in the bar and after the label in the row, and never on top of the glyph.
- Anything else fixed to the foot of the screen sits above the bar by reading `--tab-bar-space`, which is the bar's height while the bar shows and 0 otherwise.

### Page header

A page inside the shell opens with `PageHeader`: a `surface` block with a
`line` rule under it that reaches the screen's edges and sits against the top
bar. On a phone the brand row and the block read as one white header.

```tsx
import { PageHeader } from "@/components/shell/PageHeader";

<PageHeader
  title="Home"
  line={today}
  action={
    <Link href="/quick-match" className="btn btn-action">
      <Icon id="quick" size={18} />
      Quick match
    </Link>
  }
/>

<PageHeader
  back={{ href: "/competitions", label: "Tournaments" }}
  title={tournament.name}
  status={<Chip live>Live</Chip>}
  line="Win 2 & Out • 8 teams • 2 courts"
>
  <ConsoleTabs />
</PageHeader>
```

- `title` is the page's one `h1`, at `text-page-title` and weight 800.
- `status` is a chip beside the title.
- `line` is a short line of secondary text beside the title. It drops under the title when the two do not fit on one row.
- `action` is the page's main action. On a phone it runs the full width under the title. From `sm` up it sits at the end of the title's row.
- `back` is for a page one level down. The link sits above the title in soft ink with `chevron-left`. On a phone it takes the place of the brand row: the shell hides that row while a back link is on the page, so the account button is one tap back.
- `children` come last, for a tab strip or a filter row.
- `className` is the gap under the block, `mb-4` unless the page says otherwise.

It must be the first thing in the page, with nothing above it and no wrapper
that adds padding, because it pulls itself out through the shell's gutter. It
works only inside `AppShell`, which sets the gutter widths it reads. Grey
buttons and grey chips are the ground's color, so a page's secondary actions
and its status chip belong in this block or on a card.

### Brand

`Brand` from `@/components/shared/Brand` draws the crest and "Tournament
Tracker", and it is the only place either is drawn. `size="bar"` is the top
bar's and `size="page"` is sign-in's. It is not a link, so wrap it in one
where it should lead home. The crest's path is `CREST_SRC` in
`src/lib/assetPaths.ts`.

## Icons

Every icon is a `<symbol>` in `public/assets/matchbook/icons/sprite.svg`,
rendered with `<Icon id="trash" size={14} />` from `@/components/shared/Icon`.
The old name, `MbIcon`, still resolves until every screen has moved off it.
The icon is `aria-hidden`, and a button that is only an icon carries the
`aria-label`. Color comes from `currentColor`, so set a text color on the icon
or its parent. Sizes in use: 14 inside a button or a card's title, 16 in a
row, 18 in a dialog title, 20 for the close and back controls, 24 on the
scoring page. There is no bare tick, and `check` is a circled tick. A left
chevron is `chevron-left`, not a rotated `chevron-right`.

The drawings are the regular weight of Phosphor Icons, copied into the sprite.
Phosphor is MIT licensed and its notice is `PHOSPHOR-LICENSE.txt` beside the
sprite. The app has no icon package and fetches no icon from another host.
Each of the five tab icons also has a filled drawing for the active tab, under
the tab's id plus `-fill`: `overview-fill`, `teams-fill`, `compete-fill`,
`history-fill`, and `rsvp-fill`. No other glyph is filled.

Each id and the Phosphor glyph it draws:

| id | glyph | id | glyph | id | glyph |
| --- | --- | --- | --- | --- | --- |
| `overview` | house | `teams` | users-three | `quick` | lightning |
| `compete` | trophy | `history` | clock-counter-clockwise | `tools` | wrench |
| `settings` | gear | `help` | question | `bell` | bell |
| `plus` | plus | `export` | upload-simple | `import` | download-simple |
| `share` | share-network | `print` | printer | `save` | floppy-disk |
| `search` | magnifying-glass | `filter` | funnel | `calendar` | calendar-blank |
| `clock` | clock | `location` | map-pin | `volleyball` | volleyball |
| `bracket` | tree-structure, mirrored | `chart` | chart-bar | `swap` | arrows-left-right |
| `court` | drawn by hand | `check` | check-circle | `warning` | warning |
| `live` | broadcast | `menu` | list | `chevron-right` | caret-right |
| `chevron-down` | caret-down | `clipboard` | clipboard-text | `star` | star |
| `mail` | envelope-simple | `lock` | lock | `login` | sign-in |
| `cloud` | cloud-arrow-up | `close` | x | `trash` | trash |
| `chevron-left` | caret-left | `flag` | flag | `maximize` | arrows-out-simple |
| `minimize` | arrows-in-simple | `undo` | arrow-u-up-left | `crown` | crown |
| `minus` | minus | `trophy` | trophy | `play` | play |
| `pencil` | pencil-simple | `remove-user` | user-minus | `logout` | sign-out |
| `eye` | eye | `eye-off` | eye-slash | `rsvp` | calendar-check |

To add a glyph, reuse first: `manifest.json` lists the ids and
`/assets/matchbook/preview.html` draws them. If none carries the meaning, copy
the path from Phosphor's regular SVG file into one line before the closing
`</svg>`: `<symbol id="..." viewBox="0 0 256 256"><path fill="currentColor"
d="..."/></symbol>`. If Phosphor has no fitting glyph, draw one on the same
256 grid with `fill="none" stroke="currentColor" stroke-width="16"` and round
caps and joins, which is the weight of Phosphor's outlines. `court` is drawn
that way. The id is listed in three places and all three change together: the
sprite, `iconIds` in `public/assets/matchbook/manifest.json`, and the `ids`
array in `public/assets/matchbook/preview.html`.

The guard test in `src/__tests__/design/tokens.test.ts` fails when source asks
for an id the sprite lacks, when one of the 54 ids goes missing, and when a
drawing leaves the grid, the weight, or `currentColor`. The sprite's URL
carries a hash of the file, so an installed copy of the app fetches a changed
sprite instead of its cached one.

## The dialog

`src/components/ui/dialog.tsx` is the one dialog. It opens in the middle of
the screen on a phone and on a desktop alike, as a white card over the page
dimmed with `bg-ink/55`. Radix keeps the focus trap, Escape, the labelling,
and the return of focus to the control that opened the dialog.
`DialogContent` draws the overlay, the frame, the fade and zoom, and the close
control.

- The frame is the `dialog` class: `surface`, a 14px radius, 24px of padding, no border, and no shadow. The dimmed page is what sets it apart.
- The title is `text-title` in bold ink, written in the case it should read in, with an 18px glyph before it. It stays ink on a destructive dialog, where only the confirm button is red.
- The description is `text-body` in soft ink. Pass it no color.
- The close control is a 44px circle in the top right corner, drawn by `DialogContent`. `DialogHeader` keeps the title clear of it.
- The footer stacks its buttons full width on a phone with the main action on top, and puts them side by side from `sm`, each `sm:flex-1`.

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>
        <Icon id="trash" size={18} className="shrink-0" />
        Delete this tournament?
      </DialogTitle>
      <DialogDescription>What happens, in one or two sentences.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" className="sm:flex-1" onClick={onCancel}>Cancel</Button>
      <Button variant="destructive" className="sm:flex-1" onClick={onConfirm} disabled={isBusy}>
        {isBusy ? <InlineSpinner /> : <Icon id="trash" size={14} />}
        Delete
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Which button in a dialog

| Button | Component | Use it for |
| --- | --- | --- |
| Grey | `<Button variant="outline">` | Cancel, and any other way out that changes nothing. |
| Black | `<Button>` | The main action of a dialog that destroys nothing: Save, Start, Confirm result. |
| Red | `<Button variant="destructive">` | The confirm of a dialog that deletes, discards, removes, or ends something. |

A dialog's main action is the black pill and never the green one. Green is the
next step on the screen itself, and the dialog is a question about a step the
user has already taken. The green button is also 52px tall, and a footer's
buttons are all 44px so Cancel and the main action sit level.

`ConfirmDialog` in `src/components/console/ConfirmDialog.tsx` is the recipe
with a title, a sentence, and two buttons filled in. Its confirm is red by
default. Pass `tone="plain"` for the black pill when the action destroys
nothing, such as regenerating a schedule.

A dialog, a menu, and the toast each open in a portal on `<body>`, outside the
page, so each sets its own ink and font. `dialog`, `menu`, and `ink-bar` do
that, and a floating piece built by hand adds `font-sans`.

## Menus

`src/components/ui/dropdown-menu.tsx` is the one menu. Radix keeps the arrow
keys, Escape, and the return of focus to the trigger.

```tsx
<DropdownMenu>
  <DropdownMenuTrigger aria-label="Tournament actions">...</DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onSelect={onDuplicate}>
      <Icon id="clipboard" size={16} />
      Duplicate
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem variant="destructive" onSelect={onDelete}>
      <Icon id="trash" size={16} />
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

- The content is the `menu` class with `lift`: `surface`, a 10px radius, and 4px of padding around the rows.
- A row is `menu-item`: 44px tall, 14px semibold ink, an 8px radius, and a 16px glyph before the words. The row under the pointer or the arrow keys is washed with `fill`. A keyboard user also gets the focus ring, drawn inside the row.
- A destructive row takes `variant="destructive"`, which adds `menu-item-danger`: red text, and white on red once the row has the focus. Red text fails on the grey wash, and the danger tint is too near white to show on a white menu.
- `DropdownMenuLabel` is text that heads the menu, such as who is signed in. `DropdownMenuSeparator` is a `line` rule.
- A menu holds actions. A status or a choice between values is a chip or a form control.

## The toast and the reload banner

Both are an `ink-bar`: ink ground, white text, and one green button. The
`ink-bar` class also turns every focus ring inside it white, because the green
button's own ring is ink and cannot be seen on ink.

- The undo toast (`src/components/UndoToast.tsx`) floats at the foot of the screen with a 14px radius and `lift`. Its `bottom` adds `--tab-bar-space` and the safe-area inset, so it sits above the phone tab bar and the home indicator. Anything else fixed to the foot of the screen does the same.
- The reload banner (`src/components/shell/UpdateBanner.tsx`) is a strip in the flow under the top bar or the scoring header. It covers nothing and needs no offset.
- The button on a bar is `btn btn-action min-h-11 text-label`: the green button at 44px, since the bar is not the place for the 52px one.
- The dismiss control is a 44px circle with a white glyph, washed `bg-white/15` on hover.
- One toast shows at a time. The app has no toast for success or for an error. An error is a `CardError` beside what failed.

## The lift

`lift` is the one shadow: a hairline and a soft drop, both mixed from ink. It
goes on what floats over a page that is not dimmed, which is the menu, the
undo toast, and the scoring page's fullscreen bar. A card has no shadow, and
neither does the dialog, because the overlay already sets it apart.

## Avatar and badge

- `Avatar` in `src/components/ui/avatar.tsx` is the account's picture: a 36px circle in `fill` showing the photo, or else the initial in bold ink. It has no ring. It sits on a `surface`, since on the ground a `fill` circle has no edge.
- `Badge` in `src/components/ui/badge.tsx` is a small grey pill with ink text, drawn by the `chip` class. It marks a row with a word, such as "Held" or "You". For a status use `Chip`, which also has the green tone and the live dot.

## Old names

Each old class is drawn by the same rule as its new name, so the two look
alike. Each old component is a re-export of the new one. A screen moves by
swapping the names, and the old ones are deleted when nothing uses them. In a
folder on the guard's migrated list, an old name fails the build.

| Old | New |
| --- | --- |
| `mb-panel` | `card` |
| `mb-panel-head` | `card-head` |
| `mb-panel-link` | `card-link` |
| `mb-btn` | `btn` |
| `mb-btn-coral` | `btn-action`. The old class stays 44px tall, and the new one is 52px. |
| `mb-btn-navy` | `btn-ink` |
| `mb-btn-outline-navy`, `mb-btn-outline` | `btn-fill` |
| `mb-btn-outline-red` | `btn-danger-quiet` |
| `mb-dialog` | `dialog`. Nothing writes it by hand any more: every dialog is the shared `Dialog`. |
| `mb-shadow-panel` | `lift` |
| `mb-input` | `field` |
| `mb-textarea` | `field-area` |
| `mb-select-native` | `field-select` |
| `mb-search` | `field-search` |
| `mb-checkbox` | `field-check` |
| `mb-table`, `mb-table-compact` | `data-table`, `data-table-compact` |
| `mb-live-dot` | `live-dot` |
| `mb-spinner` | `spinner` |
| `mb-score-text` | `team-panel-score` |
| `mb-score-box` | `chip` with `text-ink-soft` |
| `mb-kicker` | `text-caption font-medium text-ink-soft` |
| `matchbook-display` | No class. The type scale's utilities, and `tabular-nums` on a number. |
| `matchbook-surface` | No class. `<body>` sets the ground and the ink. |
| `mb-form-square` | `form-dot`, through `FormDots` |
| `Panel`, `PanelEmpty`, `PanelError`, `PANEL_ROW` from `@/components/matchbook/Panel` | `Card`, `CardEmpty`, `CardError`, `CARD_ROW` from `@/components/shared/Card`. `Panel` still accepts `tone` and ignores it. |
| `FormSquares`, `FormLetters` from `@/components/matchbook/Panel` | `FormDots`, `FormLetters` from `@/components/shared/RecentForm` |
| `AddTeamsForm` from `@/components/matchbook/AddTeamsForm` | The same name from `@/components/shared/AddTeamsForm` |
| `TOURNAMENT_STATUS` from `@/components/matchbook/tournamentStatus` | The same name from `@/lib/tournamentStatus` |
| `Crest` from `@/components/matchbook/Panel` | `TeamMark` from `@/components/shared/TeamMark`, which takes a `name` and a `color` |
| The `Mb` shapes from `@/components/matchbook/types` | The same shapes without the prefix from `@/lib/teamShapes` |
| `@/components/matchbook/teamStats` | `@/lib/teamStats` |
| `MbIcon` | `Icon` from `@/components/shared/Icon` |

The old color tokens resolve to roles: `--mb-paper` to `ground`,
`--mb-paper-bright` to `surface`, `--mb-navy` to `ink`, `--mb-ink-muted`,
`--mb-gold`, and `--mb-plum` to `ink-soft`, `--mb-rule` to `line`,
`--mb-coral`, `--mb-green`, and `--mb-teal` to `action`, and `--mb-red` to
`danger`.

## Forbidden

- The old token classes: `bg-background`, `text-foreground`, `bg-card`, `bg-popover`, `bg-primary`, `text-primary-foreground`, `bg-secondary`, `bg-muted`, `text-muted-foreground`, `bg-accent`, `text-destructive`, `border-border`, `border-input`, `ring-ring`, and every other utility built on `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, or `ring`. `src/__tests__/design/tokens.test.ts` scans every source file and the stylesheet and fails on one. None of them is defined any more, so one that slipped through would draw nothing.
- The old theme's names in new code: the `mb-` prefix, `Mb` on a component or a type, "matchbook", and the two old font names. The same test fails on one in any folder or file on its migrated list.
- A radius off the scale. On the migrated list only `rounded-card`, `rounded-tile`, `rounded-chip`, `rounded-pill`, `rounded-full`, and `rounded-none` pass. Everywhere else the test fails on `rounded-md` and up and on an arbitrary radius above 4px. The old radius scale is gone, so those names are Tailwind's own sizes now, and a bare `rounded` or `rounded-sm` is 4px.
- `dark:` utilities. The design is light only.
- Colors outside the role tokens: Tailwind's named colors (`slate-500`, `amber-200`), new hex values, oklch literals. Team colors and the court's palette are the exceptions.
- Red on anything that is not a destructive action or an error. No red for live, for a loss, or for a status.
- A border or a shadow on a card, and red text on `fill`.
- A filled red button on a row of a list. That one is `btn-danger-quiet`.
- A shadow other than `lift`, and `lift` on anything that does not float over the page.
- The green button in a dialog's footer.
- Forced uppercase, by a class or by the `uppercase` utility on a heading or a label.
- A tappable control under 44px tall.
- `lucide-react` and `@heroicons/react`. Both are uninstalled and `eslint.config.mjs` rejects an import of either.
- Black overlays, backdrop blur, and gradients. The one exception is the scoring page's team-color panels (`TeamScorePanel`), which sit on the team color and keep their translucent white controls and the amber Leading and Winner pill with its backdrop blur.
- `shadcn add` output as it comes. `components.json` still says `"iconLibrary": "lucide"`, so a generated component imports `lucide-react`. Swap those imports for `Icon` before it is used, because lint refuses them.

## The court's palette

The rotation tool tells seven player roles apart by color, and two kinds of
overlap line. Those nine colors live in `src/lib/volleyball/constants.ts` as
hex values and are painted as inline styles and SVG attributes, the same way
a team color is. Nothing else reads them.

| Name | Value | What it is |
| --- | --- | --- |
| `PLAYER_COLORS.S` | `#d40924` | Setter, white label. |
| `PLAYER_COLORS.OPP` | `#0f74c5` | Opposite, white label. |
| `PLAYER_COLORS.OH1` | `#1e7729` | Outside hitter 1, white label. |
| `PLAYER_COLORS.OH2` | `#71c575` | Outside hitter 2, ink label. |
| `PLAYER_COLORS.MB1` | `#ef7926` | Middle blocker 1, ink label. |
| `PLAYER_COLORS.MB2` | `#fdbc6f` | Middle blocker 2, ink label. |
| `PLAYER_COLORS.L` | `#9543c6` | Libero, white label. |
| `OVERLAP_COLORS["front-back"]` | `#2563eb` | The dashed front and back overlap line, and its name in the help. |
| `OVERLAP_COLORS["left-right"]` | `#c2410c` | The dotted left and right overlap line, and its name in the help. |

Each player's label is ink or white, whichever `letterColor` in
`src/lib/teamColors.ts` picks for the color under it.
`src/__tests__/volleyball/courtColors.test.ts` fails when a label drops under
4.5 to 1 on its color, when two roles share a color, or when an overlap color
drops under 4.5 to 1 on white.

Everything else on the court is a role token: the floor is `fill`, the lines
and the arrows are `ink-soft`, the net and a selected player's ring are `ink`.
The setter's red is the hue the tool has always given that role. It marks a
player and is not the `danger` token, so the rule that red means a
destructive action or an error does not reach it.

The controls around the court share four class strings from
`src/components/volleyball/styles.ts`. A button that is one of a set, or a
switch, is `toggleClass`: filled with ink when it is on. A tile that picks a
formation is `choiceTileClass`: the green tint and a green edge when chosen.
