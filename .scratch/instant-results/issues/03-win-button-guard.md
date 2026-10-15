# 03: Win-button guard

**What to build:** A scorer who double-taps a court records one result, not two. After a tap on
either win button, that court's win buttons ignore taps for about half a second. Nothing is shown:
no spinner, no disabled styling, no marker. Other courts are unaffected.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] A second tap on either win button of the same court within the guard window does nothing.
- [x] A tap on another court inside that window records normally.
- [x] The buttons look the same during the guard as outside it.
- [x] The guard's length lives in one place and is covered by a pure test of the timing rule.

## Comments

- 2026-10-15: Implemented test-first on the integration branch `claude/instant-results` (merge 5f37c66); code-review fixes landed in a3ae899. All acceptance boxes ticked; the full suite (572 tests) passes against the emulator.
