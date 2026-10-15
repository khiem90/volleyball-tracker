# 06: Offline results land in order

**What to build:** A scorer whose phone has lost its signal keeps recording results and the console
keeps moving. When the connection returns, the queued results land in the order they were tapped
and are checked against what landed meanwhile, exactly like any other result. A reconnecting phone
can no longer overwrite results from other phones.

**Blocked by:** 05

**Status:** resolved

- [x] With the network disabled, several Instant Wins across courts show at once and the queue holds them in order.
- [x] On reconnect they land in tap order and the documents match what the phone showed.
- [x] A queued result on a court another phone recorded meanwhile is reversed with the notice; results on untouched courts land silently.
- [x] Emulator tests disable and re-enable the network to cover both outcomes.
- [x] The release note mentions that offline results are now checked on reconnect.

## Comments

- 2026-10-15: Implemented test-first on the integration branch `claude/instant-results` (merge 5737f4c); code-review fixes landed in a3ae899. All acceptance boxes ticked; the full suite (572 tests) passes against the emulator.
