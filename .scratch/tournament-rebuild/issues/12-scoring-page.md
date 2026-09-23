# 12: Scoring page

**What to build:** Scoring works in portrait and landscape with no rotate prompt, keeps the screen
awake, treats fullscreen as a bonus that never breaks on iPhone, uses controls a
thumb can hit, and says Completed when a match is over.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Portrait and landscape are both usable at phone sizes and no rotate dialog appears.
- [ ] The wake lock is requested when scoring starts and released on leaving the page.
- [ ] On a browser without the Fullscreen API the fullscreen button is hidden.
- [ ] Score controls are at least 44px; a completed match shows Completed and explains why taps do nothing.
- [ ] Back returns to the tournament console, or to the Quick page for a quick match.
