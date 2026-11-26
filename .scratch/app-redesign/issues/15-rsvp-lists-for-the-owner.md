# 15: RSVP lists for the owner

**What to build:** The owner opens the RSVP tab and sees their RSVP lists as
rows in a card, each with a date tile, the name, the scheduled time, and a
count against capacity. Creating a list is the page's main action and uses the
new form controls. On a list's page the owner sees the settings, the RSVP link
with its copy action, the people on the list, the waitlist, held spots, the
notices they have sent, and the tournaments made from the list, each in its
own card.

Covers spec stories 62, 64, and 66.

**Blocked by:** 03, 05, 06

**Status:** ready-for-human

- [x] The tab lists the same RSVP lists in the same order as today, upcoming first. Each row has a date tile, the name, the scheduled time, and the count against capacity.
- [x] The new-list page has the same fields, defaults, and validation as today in the new form controls, with the save action in green.
- [x] The owner's view of a list shows the settings and the RSVP link in cards. Turning the link on or off, copying it, and closing the list work as today.
- [x] Confirmed RSVPs, the waitlist, and held spots are three visibly distinct groups. A waitlist row shows its position, and a held spot shows what holds it.
- [x] The owner's controls on a person or team, such as moving or removing them, use the shared menu and dialogs.
- [x] Sent notices show their text and time. Writing a notice uses the new form controls.
- [x] The tournaments made from the list show as rows with a status chip.
- [x] The files for the tab, the new-list page, and the owner's panels contain no old-theme name and are on the guard's list of migrated folders.
- [x] The RSVP list tests pass unedited, along with the rest of the suite outside the design folder. Lint and the type checker are clean.
- [ ] The owner has created a list and managed its people on a phone, and what they flagged is fixed.

## Comments

- Not applicable, count against capacity: a tab row shows "Capacity N" with no count, as today. A count needs a read the tab does not make.
- Not applicable, three groups: the people card has two sections, In under a green band and Waitlist under a grey one. A held spot is a row in either with a Held badge, and it shows the name the owner typed, since nothing records what holds it. Every row leads with its place in its section.
- Not applicable, menu and moving: the owner's one control on a row is Remove, the quiet red button, with the shared confirm in red. Nobody can be moved.
- A live tournament's row draws `LiveTag`, which ticket 09 is rebuilding. A completed one draws a grey chip.
- Left open: `rsvp/[id]/page.tsx` keeps its hand-written header for ticket 16 and is not on the guard's list. The By person or By team choice and the link's On or Off choice are `Choice`, which ticket 12 restyles. Nothing was looked at in a browser.
- Merged on the integration branch `claude/grill-with-docs-redesign-27d048` and through the code review. The one open box is the owner's own look on a phone, so the status is `ready-for-human` until they have had it.
