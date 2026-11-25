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

**Status:** ready-for-agent

- [ ] Two or three crest options are drawn and shown to the owner at header size, tab size, and home-screen size. The owner's choice is recorded in the ticket's comments.
- [ ] The chosen crest and the wordmark replace the old files everywhere they appear: the header, the sign-in screen, the favicon, and any shared-link preview.
- [ ] The home-screen icons are regenerated from the new crest in every size the manifest lists, including the maskable one.
- [ ] The manifest's theme color is the surface color and its background color is the ground color. The page's theme-color tag matches.
- [ ] The installed app shows the new icon and splash after an update, checked on one phone.
- [ ] The 56 test files outside the design folder pass unedited. Lint and the type checker are clean.

## Comments
