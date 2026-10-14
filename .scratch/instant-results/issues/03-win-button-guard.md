# 03: Win-button guard

**What to build:** A scorer who double-taps a court records one result, not two. After a tap on
either win button, that court's win buttons ignore taps for about half a second. Nothing is shown:
no spinner, no disabled styling, no marker. Other courts are unaffected.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A second tap on either win button of the same court within the guard window does nothing.
- [ ] A tap on another court inside that window records normally.
- [ ] The buttons look the same during the guard as outside it.
- [ ] The guard's length lives in one place and is covered by a pure test of the timing rule.
