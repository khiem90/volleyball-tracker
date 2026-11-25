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

- [ ] A card is a surface with a 14px radius and no border. Rows inside it are divided by a line rule. Its head takes an icon, a title, and a meta slot.
- [ ] There are four buttons: the green main button at 52px, the black pill for a row's own action, the grey button for secondary actions, and the red button for destructive confirms. Each has hover, pressed, focus, and disabled states.
- [ ] Every button and tappable row is at least 44px tall.
- [ ] A status chip is a pill in fill with ink text, or in action-tint with action text. A live chip carries the live dot.
- [ ] A date tile shows a month over a day number.
- [ ] Inputs, textareas, native selects, search fields, and checkboxes use the role tokens, a 10px radius, and a visible focus ring.
- [ ] Tables use the role tokens and line rules, in both the regular and the compact size.
- [ ] Each old shared class and shared component now draws the matching new piece, so unmigrated screens change look without an edit. The ticket's comments list each old name with the new name that replaces it.
- [ ] The old outline and color button variants map onto the four buttons, and the comments record which maps to which.
- [ ] The design-system document is rewritten for the new look. It covers the palette, the type scale, the radius scale, the four buttons and when to use each, the card, the chip, the date tile, the form controls, and the forbidden list.
- [ ] The 56 test files outside the design folder pass unedited. Lint and the type checker are clean.

## Comments
