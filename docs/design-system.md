# Design system

The app is moving from the matchbook design to the look in
`.scratch/app-redesign/spec.md`. The role tokens, the two scales, and the
typeface below are the new foundation, and new UI uses them. The sections
after "Type" still describe the matchbook classes. Those keep working until
each screen moves off them, and their colors now resolve to the role tokens.
Light only. There is no dark mode and nothing is added for one. Read this
before touching UI, and when something here and the stylesheet disagree, the
stylesheet wins and this page needs a fix.

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
| `danger` | `#cf3f32` | Destructive actions only. |
| `danger-tint` | `#fff7f6` | The background of a red chip or notice. |

White (`#ffffff`) is the text on a green or red button. Team colors are the
user's own and are painted as inline styles. They are the one color source
outside this table.

`src/__tests__/design/tokens.test.ts` reads these values from the stylesheet
and fails when a text pair drops under 4.5 to 1. The pairs are ink on surface
and ground, ink-soft on surface, ground, and fill, white on action, action on
surface and action-tint, white on danger, and danger on danger-tint. Danger
sits at 4.76 to 1 on white, which is why its tint is nearly white. A stronger
tint needs a darker danger first.

### The old names

Each matchbook color resolves to a role, so a screen that still uses an old
name already shows the new palette.

| Old token | Role |
| --- | --- |
| `--mb-paper` | `ground` |
| `--mb-paper-bright` | `surface` |
| `--mb-navy` | `ink` |
| `--mb-ink-muted`, `--mb-gold`, `--mb-plum` | `ink-soft` |
| `--mb-rule` | `line` |
| `--mb-coral`, `--mb-green`, `--mb-teal` | `action` |
| `--mb-red` | `danger` |

## Radius scale

Four steps, and source uses no other radius. `rounded-full` is for a circle
and `rounded-none` squares a corner off.

| Utility | Size | What it is for |
| --- | --- | --- |
| `rounded-card` | 14px | Cards and dialogs. |
| `rounded-tile` | 10px | Tiles and square controls. |
| `rounded-chip` | 8px | Small square chips and icon backings. A status chip is a pill. |
| `rounded-pill` | full | Buttons and status chips. |

A class in the stylesheet or an inline style reads `var(--radius-card)` and
its neighbours.

## Type

Figtree is the only typeface. `src/app/layout.tsx` loads it as a variable font
through `next/font/google` and sets `--font-figtree` on `<html>`, because the
stylesheet's theme reads it on `:root`. Set on `<body>` it is one element too
low, and that is why Oswald and Outfit never applied. Scores and other
changing numbers use `tabular-nums`.

| Utility | Size | What it is for |
| --- | --- | --- |
| `text-page-title` | 28px on a phone, 30px from a tablet's width | A page's title. |
| `text-title` | 16px | A card's title and a row's name. |
| `text-body` | 15px | Body text. |
| `text-label` | 14px | The label of a button or a control. |
| `text-caption` | 13px | Secondary text. |
| `text-tab` | 10.5px | A tab's label. |
| `text-score` | 44px | A court's score on the console. |

`cn()` in `src/lib/utils.ts` knows the steps of both scales by name. A new
step goes in the stylesheet and in that list together, or `cn()` takes
`text-title` for a color and drops it beside `text-ink`.

`.matchbook-display` and the `mb-*` classes that carried the old display face
now set Figtree. They still uppercase their text until those classes are
restyled.

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

One shadow exists, `--mb-shadow-panel` (`0 8px 22px rgba(57, 41, 23, 0.08)`),
the soft brown lift under panels, dialogs, menus, the toast, and the
fullscreen bar. `.mb-panel` and `.mb-dialog` carry it; anything else that
needs it takes the `.mb-shadow-panel` class rather than spelling the value
out. Nothing else casts one. Text gets no shadow except the big score
(`.mb-score-text`).

## Component classes

In `src/app/globals.css`, all inside `@layer components` so a utility on the
same element wins:

- Surfaces: `.matchbook-surface`, `.mb-panel`, `.mb-panel-head`, `.mb-panel-link`, `.mb-dialog`.
- Type: `.matchbook-display`, `.mb-kicker`, `.mb-score-text`, `.mb-score-box`, `.mb-table` and `.mb-table-compact`.
- Buttons: `.mb-btn` with one of `.mb-btn-navy`, `.mb-btn-coral`, `.mb-btn-red`, `.mb-btn-outline-navy`, `.mb-btn-outline`, `.mb-btn-outline-red`.
- Fields: `.mb-input` (a wrapper around a bare `<input>`), `.mb-textarea`, `.mb-select-native`, `.mb-search`, `.mb-checkbox`.
- Small pieces: `.mb-live-dot`, `.mb-form-square`, `.mb-spinner`, `.mb-shadow-panel`.

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

To add a glyph, reuse first: 54 ids exist (`manifest.json` lists them, and
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
list, a play-in row) is paper or paper-bright with a 1px rule-color border
(`border border-mb-rule`), the navy border and the 6% wash when selected. Only
a box that is itself the result, like the guest dialog's winner box, takes the
1.5px navy frame. Menus and the toast follow the same
frame: `DropdownMenuContent` and `UndoToast` carry their own colors and
`font-sans` for the same portal reason.

## Forbidden

- The old token classes: `bg-background`, `text-foreground`, `bg-card`, `bg-popover`, `bg-primary`, `text-primary-foreground`, `bg-secondary`, `bg-muted`, `text-muted-foreground`, `bg-accent`, `text-destructive`, `border-border`, `border-input`, `ring-ring`, and every other utility built on `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, or `ring`. `src/__tests__/design/tokens.test.ts` scans every source file outside the volleyball tools and fails on one.
- `lucide-react` and `@heroicons/react`. Both are uninstalled and `eslint.config.mjs` rejects an import of either.
- A radius above 4px on a matchbook surface: `rounded-xl` and up, `rounded-[8px]`, and so on. The same test catches these.
- `dark:` utilities. The design is light only.
- Colors outside the palette: Tailwind's named colors (`slate-500`, `amber-200`), new hex values, oklch literals. Team colors are the exception.
- Black overlays, backdrop blur, gradients, and any shadow other than the panel's.
- One exception to the two rules above: the scoring page's team-color panels (`TeamScorePanel`) sit on the team color, not on paper, so they keep their translucent white controls and the amber Leading/Winner pill with its backdrop blur. Nothing else may use a named Tailwind color or backdrop blur.
- `shadcn add` output as it comes. `components.json` still says `"iconLibrary": "lucide"`, so a generated component imports `lucide-react`; swap those imports for `MbIcon` before it is used, because lint refuses them.

## The legacy token block

The `:root` block at the foot of `src/app/globals.css` (`--background`,
`--primary`, `--border`, and the rest) and the `@theme inline` maps at the top
of the file are not a second palette. Only `src/components/volleyball/` and
`src/app/(shell)/tools/volleyball-rotations/` still read them, plus the base
layer's element defaults, and each one resolves to a matchbook value so those
pages drift toward the design without being redesigned. The block goes with
the volleyball redesign. Nothing new is written against it.
