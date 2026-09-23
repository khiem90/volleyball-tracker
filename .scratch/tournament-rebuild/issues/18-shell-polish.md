# 18: Shell polish

**What to build:** Page headers wrap instead of clipping at phone width, matchbook styles sit in a
Tailwind layer so utilities win, primary controls across the app meet 44px, and
a new deploy shows a reload banner instead of reloading the app on its own.

**Blocked by:** 15

**Status:** ready-for-agent

- [ ] No page header or button row overflows a 375px viewport.
- [ ] Utility classes on matchbook elements take effect; the existing important-flag workarounds are removed.
- [ ] An audit of primary controls finds none under 44px.
- [ ] A newly deployed version shows a reload banner and never reloads mid-scoring on its own.
