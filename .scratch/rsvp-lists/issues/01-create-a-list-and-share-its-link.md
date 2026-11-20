# 01: Create a list and share its link

**What to build:** The owner opens a new RSVP tab, creates an RSVP list with no
tournament behind it, and shares its link. A list has a name, a by-person or
by-team choice, a capacity, a scheduled time, an open time, and an RSVP link
that is on or off. The tab shows the owner's lists with the upcoming ones
first. The list's page is its RSVP link: the owner sees and edits the settings
there, another signed-in account sees the name, the scheduled time, and the
capacity while the link is on, and "not found" while it is off. Nobody can RSVP
yet; that is ticket 02. Tournament RSVPs keep working untouched until ticket 07.

Covers spec stories 1 to 4, 6 to 8, 11 to 14, 18, and 29.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Lists are stored in their own top-level collection, each with its owner's id, and a list write names only the fields it changes.
- [ ] The rules let a real account create a list as its own owner with a valid by-person or by-team value, let only the owner update or delete it, and refuse the link on with either time missing. Rules tests cover each, including an anonymous identity.
- [ ] The rules let the owner read a list always and any real account read it while the link is on. Rules tests cover a signed-out request, an anonymous identity, and the link turned off.
- [ ] The shell has a fifth tab, RSVP, which needs an account, with an icon drawn into the sprite under the design system's rules. The shell tests cover the tab and the pages under it.
- [ ] The tab lists the owner's lists, upcoming first by scheduled time and then the ones whose scheduled time has passed, with a New list button. The index file has the entry the query needs and the deploy doc notes it.
- [ ] A new-list page collects the name, the by-person or by-team choice, the capacity, both times in the owner's zone, and the link toggle, and shows the first problem when it cannot save.
- [ ] The pure setup problems cover a missing time with the link on, an open time after the scheduled time, and a capacity below one. Pure tests cover each and a valid setup.
- [ ] The list's page shows the owner the settings to edit and the RSVP link with Copy. Another account sees the name, scheduled time, and capacity with the link on, and the shared not-found view with it off. A guest is sent to sign in and back.
- [ ] A data-module test on the emulator creates a list, changes its settings, and reads it as a second account with the link on and off.
- [ ] Every new screen follows the matchbook design system.
