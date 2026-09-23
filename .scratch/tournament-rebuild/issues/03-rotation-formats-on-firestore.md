# 03: Rotation formats on Firestore

**What to build:** Win 2 & Out and Two Match Rotation start, play, instant win, and undo through
engine commands applied in transactions, so two courts finishing at once never
lose a result.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Starting a rotation tournament writes the format state and the first matches.
- [ ] Completing a match on one court while another completes on a second court keeps both results; a test runs the two transactions concurrently.
- [ ] Instant win records the result and schedules the next match; undo restores the previous state.
- [ ] Engine tests cover queue advancement, champion streaks, and next-match scheduling for both formats.
