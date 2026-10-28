# Design system

The matchbook design is the only design. It is defined by the `mb-*` custom
properties and component classes in `src/app/globals.css`, the icon sprite at
`public/assets/matchbook/icons/sprite.svg`, and the rules on this page. Light
only; there is no dark mode and nothing is added for one. Read this before
touching UI, and when something here and the stylesheet disagree, the
stylesheet wins and this page needs a fix.

## Palette

Every color on a matchbook screen is one of these. The utilities are
`bg-mb-*`, `text-mb-*`, `border-mb-*`, and the opacity form (`bg-mb-navy/55`).

| Token | Value | What it is for |
| --- | --- | --- |
| `--mb-paper` | `#f7f0e4` | The page. `html`, `body`, and `.matchbook-surface` (with the paper-grain texture). |
| `--mb-paper-bright` | `#fffaf1` | Anything that sits on the page: panels, dialogs, menus, fields, chips, the fill of outline buttons. |
| `--mb-navy` | `#07324d` | Ink. Text, borders, the top rule, filled main buttons. At 55% it is the dialog overlay; at 6% (`rgba(7, 50, 77, 0.06)`) it is the hover and selected wash. |
| `--mb-coral` | `#ee4b34` | The accent. The one call to action on a screen, active navigation, link hover, the focus ring, text selection, the `mb-checkbox` tick. |
| `--mb-red` | `#cf3f32` | Danger. The confirm button of a destructive dialog, error text, invalid field borders, the live dot. |
| `--mb-green` | `#16885f` | Good news. A winner, a completed match, a synced state. |
| `--mb-gold` | `#e6a01f` | A highlight. The glyph in a navy panel head, the leader in standings, the history tab's star. |
| `--mb-teal` | `#148f89` | A second status accent, used sparingly: tool cards, standings. |
| `--mb-plum` | `#5a347d` | In the palette, unused by any screen today. Reach for it before inventing a purple. |
| `--mb-ink-muted` | `#5d6c70` | Secondary text: descriptions, kickers, labels, placeholders, table headings. |
| `--mb-rule` | `rgba(7, 50, 77, 0.28)` | Hairlines: table rows, field borders, menu separators, the border of a box inside a dialog. |

White (`#fff`) appears only as the text on a coral or red button. Team colors
are the user's own and are painted as inline styles; they are the one color
source outside this table, and the scoring page's full-bleed team panels are
built on them.

## Type

Two faces, both loaded in `src/app/layout.tsx` through `next/font/google`.

Oswald is the display face. `.matchbook-display` sets it with uppercase and
0.02em tracking, and `.mb-btn`, `.mb-kicker`, `.mb-panel-link`, the table
headings, the score box, and `.mb-select-native` carry it themselves. Dialog
titles, panel titles, buttons, and kickers are display; a sentence of body
text is not.

Outfit is the body face through `--font-sans`. `.matchbook-surface`, `body`,
`.mb-dialog`, and the menu content set it, because dialogs and menus portal to
`<body>` and inherit nothing from the surface.

Known bug (issue 09): `next/font` puts `--font-oswald` and `--font-outfit` on
`<body>` and the stylesheet reads them on `:root`, so neither face applies and
the system sans shows instead. Write styles against the tokens as they are
meant to work; the fix is a layout change, not a style change.

## Radius, borders, and shadow

The corner radius is 4px: `rounded-[4px]`, or nothing, because `.mb-panel`,
`.mb-dialog`, `.mb-btn`, `.mb-input`, and the other classes carry it. The
score box is 3px and the 11px form square is 2px. `rounded-full` is for
circles only: the avatar, the live dot, the scoring page's 56px plus and minus
buttons. Nothing goes above 4px.

Borders are 1.5px navy on panels, dialogs, menus, buttons, swatches, chips,
the avatar ring, and the badge; the panel and the dialog add a 4px top rule.
Hairlines are 1px in the rule color. A field is 1.5px in the rule color and
turns navy on focus. The base layer gives every element a 2px coral outline on
`focus-visible`; a control that hides that outline uses `ring-mb-coral`, and
no other ring color exists.

One shadow exists, `0 8px 22px rgba(57, 41, 23, 0.08)`, the soft brown lift
under panels, dialogs, menus, the toast, and the fullscreen bar. Nothing else
casts one. Text gets no shadow except the big score (`.mb-score-text`).

## Component classes

In `src/app/globals.css`, all inside `@layer components` so a utility on the
same element wins:

- Surfaces: `.matchbook-surface`, `.mb-panel`, `.mb-panel-head`, `.mb-panel-link`, `.mb-dialog`.
- Type: `.matchbook-display`, `.mb-kicker`, `.mb-score-text`, `.mb-score-box`, `.mb-table` and `.mb-table-compact`.
- Buttons: `.mb-btn` with one of `.mb-btn-navy`, `.mb-btn-coral`, `.mb-btn-red`, `.mb-btn-outline-navy`, `.mb-btn-outline`, `.mb-btn-outline-red`.
- Fields: `.mb-input` (a wrapper around a bare `<input>`), `.mb-textarea`, `.mb-select-native`, `.mb-search`, `.mb-checkbox`.
- Small pieces: `.mb-live-dot`, `.mb-form-square`, `.mb-spinner`.

In `src/components`: `MbIcon` (`matchbook/MbIcon.tsx`), `Panel` and
`AddTeamsForm` (`matchbook/`), `Button`, `Badge`, `Avatar`, `Dialog`, and
`DropdownMenu` (`ui/`), and `InlineSpinner`, `PageLoadingSpinner`, and
`DeleteConfirmDialog` (`shared/`). `<Button>` renders the same classes as a
plain `<button className="mb-btn mb-btn-navy">`; use whichever reads better in
the file.

### Which button

- The main action: `mb-btn mb-btn-navy`, or `<Button>`. Save, Add, Start, Sign in, a dialog's confirm.
- The one call to action on a screen: `mb-btn mb-btn-coral`. New tournament, Start a quick match, Undo in the toast. At most one per screen.
- Cancel and secondary actions: `mb-btn mb-btn-outline-navy`, or `<Button variant="outline">`. Every dialog's Cancel, Back, Keep playing.
- A light inline action beside content: `mb-btn mb-btn-outline` (coral outline). Copy a link, the add-teams form's second action, a row's small action.
- Destructive: `mb-btn mb-btn-red`, or `<Button variant="destructive">`, only as the confirm of a destructive dialog. A row action that opens that dialog is `mb-btn mb-btn-outline-red` (Discard, Delete).
- A text link in a panel head: `.mb-panel-link`.

Every button is at least 44px tall through `.mb-btn`; do not shrink it. A busy
button shows `<InlineSpinner />` in place of its glyph and keeps its label.

## Icons

Every icon is a `<symbol>` in `public/assets/matchbook/icons/sprite.svg`,
rendered with `<MbIcon id="trash" size={14} />`. It is `aria-hidden`; a button
that is only an icon carries the `aria-label`. Color comes from `currentColor`,
so set `text-mb-*` on the icon or its parent. Sizes in use: 14 inside a
button, 16 in a panel title or a row, 18 in a dialog title, 20 for the close
and back controls, 24 on the scoring page. There is no bare tick; `check` is a
circled tick. A left chevron is `chevron-left`, not a rotated `chevron-right`.

To add a glyph, reuse first: 53 ids exist (`manifest.json` lists them, and
`/assets/matchbook/preview.html` draws them). If none carries the meaning,
draw one in the sprite's style: a 24px grid (`viewBox="0 0 24 24"`), 1.8px
stroke (2px for `plus`, `minus`, and the chevrons), `stroke-linecap="round"`
and `stroke-linejoin="round"`, `fill="none" stroke="currentColor"`, and only a
dot as a filled shape. One `<symbol id="..." viewBox="0 0 24 24">` on one line
before the closing `</svg>`, like the neighbours. The id is listed in three
places and all three change together: the sprite, `iconIds` in
`public/assets/matchbook/manifest.json`, and the `ids` array in
`public/assets/matchbook/preview.html`. Show the drawing beside the icon it
replaces before committing it. The service worker precaches the sprite, so an
installed browser sees a new glyph after the update banner.

## The dialog

`src/components/ui/dialog.tsx` is the one dialog. `DialogContent` draws the
navy overlay (`bg-mb-navy/55`), the `.mb-dialog` frame (paper-bright, 1.5px
navy border, 4px top rule, 4px radius, the panel shadow, navy ink and the
body font because it portals outside the surface), the fade and zoom, and the
close control (sprite `close` at 20px, navy, 44px hit area, top right). Radix
keeps the focus trap, Escape, and the labelling.

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>
        <MbIcon id="trash" size={18} className="shrink-0" />
        Delete this tournament?
      </DialogTitle>
      <DialogDescription>What happens, in one or two sentences.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" className="sm:flex-1" onClick={onCancel}>Cancel</Button>
      <Button variant="destructive" className="sm:flex-1" onClick={onConfirm} disabled={isBusy}>
        {isBusy ? <InlineSpinner /> : <MbIcon id="trash" size={14} />}
        Delete
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

The title is display face, navy, with a leading glyph at 18px; it stays navy
on a destructive dialog, where only the confirm button is red. The description
is body text in the muted ink; pass it no color. The footer stacks the buttons
full width on a phone with the main action on top and puts them side by side
from `sm`, each `sm:flex-1`. A box inside a dialog (a score block, a kept-teams
list, a play-in row) is paper or paper-bright with a rule-color border, the
navy border and the 6% wash when selected. Menus and the toast follow the same
frame: `DropdownMenuContent` and `UndoToast` carry their own colors and
`font-sans` for the same portal reason.

## Forbidden

- The old token classes: `bg-background`, `text-foreground`, `bg-card`, `bg-popover`, `bg-primary`, `text-primary-foreground`, `bg-secondary`, `bg-muted`, `text-muted-foreground`, `bg-accent`, `text-destructive`, `border-border`, `border-input`, `ring-ring`, and every other utility built on `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, or `ring`. `src/__tests__/design/tokens.test.ts` scans every source file outside the volleyball tools and fails on one.
- `lucide-react` and `@heroicons/react`. Both are uninstalled and `eslint.config.mjs` rejects an import of either.
- A radius above 4px on a matchbook surface: `rounded-xl` and up, `rounded-[8px]`, and so on. The same test catches these.
- `dark:` utilities. The design is light only.
- Colors outside the palette: Tailwind's named colors (`slate-500`, `amber-200`), new hex values, oklch literals. Team colors are the exception.
- Black overlays, backdrop blur, gradients, and any shadow other than the panel's.

## The legacy token block

The `:root` block at the foot of `src/app/globals.css` (`--background`,
`--primary`, `--border`, and the rest) and the `@theme inline` maps at the top
of the file are not a second palette. Only `src/components/volleyball/` and
`src/app/(shell)/tools/volleyball-rotations/` still read them, plus the base
layer's element defaults, and each one resolves to a matchbook value so those
pages drift toward the design without being redesigned. The block goes with
the volleyball redesign. Nothing new is written against it.
