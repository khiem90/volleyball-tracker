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

**Status:** ready-for-agent

- [ ] The tab lists the same RSVP lists in the same order as today, upcoming first. Each row has a date tile, the name, the scheduled time, and the count against capacity.
- [ ] The new-list page has the same fields, defaults, and validation as today in the new form controls, with the save action in green.
- [ ] The owner's view of a list shows the settings and the RSVP link in cards. Turning the link on or off, copying it, and closing the list work as today.
- [ ] Confirmed RSVPs, the waitlist, and held spots are three visibly distinct groups. A waitlist row shows its position, and a held spot shows what holds it.
- [ ] The owner's controls on a person or team, such as moving or removing them, use the shared menu and dialogs.
- [ ] Sent notices show their text and time. Writing a notice uses the new form controls.
- [ ] The tournaments made from the list show as rows with a status chip.
- [ ] The files for the tab, the new-list page, and the owner's panels contain no old-theme name and are on the guard's list of migrated folders.
- [ ] The RSVP list tests pass unedited, along with the rest of the suite outside the design folder. Lint and the type checker are clean.
- [ ] The owner has created a list and managed its people on a phone, and what they flagged is fixed.

## Comments
