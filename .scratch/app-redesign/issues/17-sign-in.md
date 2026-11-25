# 17: Sign-in

**What to build:** A guest who opens the sign-in screen sees a plain white
page with the wordmark and the form, in place of the old theme's poster. The
ways to sign in, their order, their copy, and where each leads are the same as
today. The main way to sign in is the green main button.

Covers spec story 67.

**Blocked by:** 04

**Status:** ready-for-agent

- [x] The page is a surface with the wordmark above the form, centered on a wide screen and full width on a phone.
- [x] Every way to sign in that exists today is present with its copy unchanged, including continuing as a guest.
- [x] Fields use the shared form controls. Errors show where and when they show today, in danger.
- [x] The main action is the green main button. The provider button keeps the provider's own mark and follows its brand rules.
- [x] A person sent to sign in from a link lands back on that link afterward, as today.
- [x] The loading state while the app checks who is signed in uses the shared spinner on the page ground.
- [x] The sign-in files contain no old-theme name and are on the guard's list of migrated folders.
- [x] The 56 test files outside the design folder pass unedited. Lint and the type checker are clean.
- [ ] The owner has signed out and back in on a phone, and what they flagged is fixed.

## Comments

- Built from source and the guard only. Nobody has looked at the page in a browser yet, at 390px or at 1280px.
- Gone with the poster: the "All Events" stamp beside the heading and the accent color on "Back" and "the Club". The heading's words are unchanged. The crest file is the old one until ticket 19.
- The Google button is the grey button with Google's mark unchanged, in its own colors. Its grey is `fill` (`#f1f3f4`), one step off the `#f2f2f2` Google names for its neutral button.
