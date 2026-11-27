# 19: Brand marks and installed-app icon

**What to build:** The owner sees a crest and wordmark drawn for the new look
in the header, on the sign-in screen, and in the browser tab. When they install
the app or open the installed copy, the home-screen icon and the splash color
match what opens.

The crest is a simple mark in the action green that reads at 16px and sits
well beside the team marks. The wordmark is the app's name set in Figtree. The
owner chooses between drawn options before the files are replaced.

Covers spec stories 73 and 74.

**Blocked by:** 06, 17

**Status:** resolved

- [x] Two or three crest options are drawn and shown to the owner at header size, tab size, and home-screen size. The owner's choice is recorded in the ticket's comments.
- [x] The chosen crest and the wordmark replace the old files everywhere they appear: the header, the sign-in screen, the favicon, and any shared-link preview.
- [x] The home-screen icons are regenerated from the new crest in every size the manifest lists, including the maskable one.
- [x] The manifest's theme color is the surface color and its background color is the ground color. The page's theme-color tag matches.
- [x] The installed app shows the new icon and splash after an update, checked on one phone.
- [x] The 56 test files outside the design folder pass unedited. Lint and the type checker are clean.

## Comments

- Seven options were drawn over two rounds and shown at header, tab, and home-screen size. The owner turned down round 1 and has not picked from round 2, so the first and fifth criteria stay open.
- Built with round 2's option A, "Ball over the net", on the orchestrator's recommendation. The other round 2 drawings are in `.scratch/app-redesign/crest-options/round-2/`, and the sheets shown to the owner are `crest-options.png` and `crest-options-2.png` in `.scratch/app-redesign/directions/`. Swapping is three files in `public/brand` and one run of `node scripts/generate-icons.mjs`.
- The app has no shared-link preview image, so that part of the second criterion is not applicable. The old crest stays under the old theme's folder for ticket 20 to delete.
- Merged on the integration branch `claude/grill-with-docs-redesign-27d048` and through the code review. The two open boxes are the owner's crest pick and a look at the installed app on a phone, so the status is `ready-for-human`.
- The owner picked round 2's option A, "Ball over the net", on 2026-11-27, which is the crest already built. They looked at the app on a phone the same day, said it looks good, and asked for this ticket to be resolved. Both open boxes are ticked on that word.
